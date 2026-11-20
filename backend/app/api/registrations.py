"""Event Registration & Waitlist API Router.

Implements Phase 8:
- POST /events/{event_id}/register: register authenticated student via fn_register_for_event
- GET /events/{event_id}/registrations/me: current user's registration/waitlist status
- GET /events/{event_id}/registrations: list registrations for authorized leaders
- DELETE /events/{event_id}/register: cancel user registration, triggering auto waitlist promotion
- GET /events/{event_id}/waitlist: list ordered waitlist queue for authorized leaders
- GET /users/me/registrations: current user's event registration history
- POST /maintenance/expire-waitlist: triggers immediate waitlist expiration processing
"""

import math
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, text
from sqlalchemy.orm import Session
from app.db.connection import get_db
from app.api.deps import get_current_user, require_permissions
from app.models.auth import User
from app.models.event import Event, Club, EventRegistration, EventWaitlist
from app.schemas.registration import (
    RegistrationRequest,
    RegistrationResponse,
    WaitlistEntryResponse,
    RegistrationActionResult,
    UserRegistrationItem,
    PaginatedRegistrationsResponse,
)
from app.api.events import is_user_authorized_for_event
from app.services.waitlist_worker import expire_unclaimed_promotions

events_registration_router = APIRouter(prefix="/events", tags=["Registrations"])
users_registration_router = APIRouter(prefix="/users", tags=["Registrations"])
maintenance_router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


# ── 1. POST /events/{event_id}/register ───────────────────────

@events_registration_router.post(
    "/{event_id}/register",
    response_model=RegistrationActionResult,
    summary="Register for Event",
    description="Registers the authenticated student or places them on the waitlist via fn_register_for_event.",
)
def register_for_event(
    event_id: int,
    payload: Optional[RegistrationRequest] = None,
    current_user: User = Depends(require_permissions("events.register")),
    db: Session = Depends(get_db),
):
    # Verify event existence
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found",
        )

    # Set audit user context
    db.execute(
        text("SELECT set_config('app.current_user_id', :uid, true)"),
        {"uid": str(current_user.user_id)},
    )

    # Invoke database function fn_register_for_event
    raw_result = db.execute(
        text("SELECT fn_register_for_event(:event_id, :user_id)"),
        {
            "event_id": event_id,
            "user_id": str(current_user.user_id),
        },
    ).scalar()

    if not raw_result or raw_result.get("status") == "error":
        error_msg = raw_result.get("message", "Registration failed") if raw_result else "Unknown error"
        db.rollback()

        # Map to precise HTTP status codes
        if "already registered" in error_msg.lower() or "already on the waitlist" in error_msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=error_msg)
        if "not open" in error_msg.lower() or "deadline" in error_msg.lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    # If preferences provided and registered, save them
    ticket_code = None
    reg_id = raw_result.get("registration_id")
    if reg_id:
        reg = db.query(EventRegistration).filter(EventRegistration.registration_id == reg_id).first()
        if reg:
            ticket_code = reg.ticket_code
            if payload:
                if payload.dietary_preferences:
                    reg.dietary_preferences = payload.dietary_preferences
                if payload.notes:
                    reg.notes = payload.notes
                db.flush()

    db.commit()

    return RegistrationActionResult(
        status=raw_result.get("status", "success"),
        type=raw_result.get("type", "registered"),
        registration_id=raw_result.get("registration_id"),
        waitlist_id=raw_result.get("waitlist_id"),
        position=raw_result.get("position"),
        ticket_code=ticket_code,
        message=raw_result.get("message", "Registration processed."),
    )


# ── 2. GET /events/{event_id}/registrations/me ───────────────

@events_registration_router.get(
    "/{event_id}/registrations/me",
    summary="Get My Event Registration",
    description="Retrieves the current user's registration or waitlist status for this event.",
)
def get_my_event_registration(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check registration first
    reg = (
        db.query(EventRegistration)
        .filter(
            EventRegistration.event_id == event_id,
            EventRegistration.user_id == current_user.user_id,
            EventRegistration.status != "cancelled",
        )
        .first()
    )
    if reg:
        return {
            "type": "registration",
            "registration_id": reg.registration_id,
            "event_id": reg.event_id,
            "status": reg.status,
            "registered_at": reg.registered_at,
            "ticket_code": reg.ticket_code,
            "dietary_preferences": reg.dietary_preferences,
            "notes": reg.notes,
        }

    # Check waitlist
    waitlist = (
        db.query(EventWaitlist)
        .filter(
            EventWaitlist.event_id == event_id,
            EventWaitlist.user_id == current_user.user_id,
            EventWaitlist.status.in_(["waiting", "promoted"]),
        )
        .first()
    )
    if waitlist:
        return {
            "type": "waitlist",
            "waitlist_id": waitlist.waitlist_id,
            "event_id": waitlist.event_id,
            "position": waitlist.position,
            "status": waitlist.status,
            "joined_at": waitlist.joined_at,
            "promoted_at": waitlist.promoted_at,
            "expires_at": waitlist.expires_at,
        }

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="You are not registered or waitlisted for this event",
    )


# ── 3. GET /events/{event_id}/registrations ───────────────────

@events_registration_router.get(
    "/{event_id}/registrations",
    response_model=PaginatedRegistrationsResponse,
    summary="List Event Registrations",
    description="Lists attendee registrations for authorized club leaders, coordinators, and administrators.",
)
def list_event_registrations(
    event_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_permissions("events.read")),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event with id {event_id} not found")

    # Enforce authorization
    user_role = current_user.role.name if current_user.role else ""
    if user_role not in ["administrator", "event_coordinator", "student_affairs", "club_advisor"]:
        if not is_user_authorized_for_event(db, current_user, event):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view attendee registrations for this event",
            )

    query = db.query(EventRegistration).filter(EventRegistration.event_id == event_id)
    if status_filter:
        query = query.filter(EventRegistration.status == status_filter)

    total = query.with_entities(func.count(EventRegistration.registration_id)).scalar() or 0
    pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit

    records = query.order_by(EventRegistration.registered_at.asc()).offset(offset).limit(limit).all()

    items = []
    for r in records:
        items.append(
            RegistrationResponse(
                registration_id=r.registration_id,
                event_id=r.event_id,
                user_id=r.user_id,
                status=r.status,
                registered_at=r.registered_at,
                ticket_code=r.ticket_code,
                dietary_preferences=r.dietary_preferences,
                notes=r.notes,
                user_name=r.user.full_name if r.user else None,
                user_email=r.user.email if r.user else None,
            )
        )

    return PaginatedRegistrationsResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


# ── 4. DELETE /events/{event_id}/register ─────────────────────

@events_registration_router.delete(
    "/{event_id}/register",
    summary="Cancel Registration",
    description="Cancels the current user's registration or waitlist entry, automatically triggering waitlist promotion.",
)
def cancel_registration(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)

    # Set audit user context
    db.execute(
        text("SELECT set_config('app.current_user_id', :uid, true)"),
        {"uid": str(current_user.user_id)},
    )

    # 1. Check for active registration
    reg = (
        db.query(EventRegistration)
        .filter(
            EventRegistration.event_id == event_id,
            EventRegistration.user_id == current_user.user_id,
            EventRegistration.status == "registered",
        )
        .first()
    )

    if reg:
        reg.status = "cancelled"
        reg.cancelled_at = now
        reg.cancellation_reason = "Cancelled by user"
        db.commit()
        return {"status": "success", "message": "Registration successfully cancelled."}

    # 2. Check for waiting waitlist entry
    waitlist = (
        db.query(EventWaitlist)
        .filter(
            EventWaitlist.event_id == event_id,
            EventWaitlist.user_id == current_user.user_id,
            EventWaitlist.status == "waiting",
        )
        .first()
    )

    if waitlist:
        waitlist.status = "cancelled"
        # Renumber remaining entries
        db.query(EventWaitlist).filter(
            EventWaitlist.event_id == event_id,
            EventWaitlist.status == "waiting",
            EventWaitlist.position > waitlist.position,
        ).update(
            {"position": EventWaitlist.position - 1},
            synchronize_session=False,
        )
        db.commit()
        return {"status": "success", "message": "Waitlist entry successfully cancelled."}

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="No active registration or waitlist entry found to cancel",
    )


# ── 5. GET /events/{event_id}/waitlist ────────────────────────

@events_registration_router.get(
    "/{event_id}/waitlist",
    response_model=List[WaitlistEntryResponse],
    summary="List Event Waitlist",
    description="Retrieves the ordered waitlist queue for authorized leaders.",
)
def list_event_waitlist(
    event_id: int,
    current_user: User = Depends(require_permissions("events.read")),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event with id {event_id} not found")

    user_role = current_user.role.name if current_user.role else ""
    if user_role not in ["administrator", "event_coordinator", "student_affairs", "club_advisor"]:
        if not is_user_authorized_for_event(db, current_user, event):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view the waitlist for this event",
            )

    entries = (
        db.query(EventWaitlist)
        .filter(EventWaitlist.event_id == event_id, EventWaitlist.status == "waiting")
        .order_by(EventWaitlist.position.asc())
        .all()
    )

    return [
        WaitlistEntryResponse(
            waitlist_id=w.waitlist_id,
            event_id=w.event_id,
            user_id=w.user_id,
            position=w.position,
            status=w.status,
            joined_at=w.joined_at,
            promoted_at=w.promoted_at,
            expires_at=w.expires_at,
            user_name=w.user.full_name if w.user else None,
            user_email=w.user.email if w.user else None,
        )
        for w in entries
    ]


# ── 6. GET /users/me/registrations ────────────────────────────

@users_registration_router.get(
    "/me/registrations",
    response_model=List[UserRegistrationItem],
    summary="My Registered Events",
    description="Retrieves all event registrations for the authenticated user.",
)
def get_my_registrations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    registrations = (
        db.query(EventRegistration)
        .filter(EventRegistration.user_id == current_user.user_id)
        .order_by(EventRegistration.registered_at.desc())
        .all()
    )

    items = []
    for r in registrations:
        items.append(
            UserRegistrationItem(
                registration_id=r.registration_id,
                event_id=r.event_id,
                event_title=r.event.title if r.event else "",
                event_status=r.event.status if r.event else "",
                start_time=r.event.start_time if r.event else datetime.now(timezone.utc),
                end_time=r.event.end_time if r.event else datetime.now(timezone.utc),
                venue_name=r.event.venue.name if r.event and r.event.venue else None,
                status=r.status,
                ticket_code=r.ticket_code,
                registered_at=r.registered_at,
            )
        )
    return items


# ── 7. POST /maintenance/expire-waitlist ──────────────────────

@maintenance_router.post(
    "/expire-waitlist",
    summary="Trigger Waitlist Expiration Processing",
    description="Processes expired 24-hour waitlist promotions immediately and promotes next waiting users.",
)
def trigger_waitlist_expiration(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_role = current_user.role.name if current_user.role else ""
    if user_role not in ["administrator", "student_affairs"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator or Student Affairs access required")

    processed = expire_unclaimed_promotions(db)
    return {"status": "success", "processed_expirations": processed}
