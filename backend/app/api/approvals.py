"""Event Approvals API Router.

Implements Phase 7 Multilevel Event Approval Workflow:
1. Sequential 3-level approval hierarchy:
   Level 1: Club Advisor (club_advisor)
   Level 2: Student Affairs (student_affairs)
   Level 3: Administrator (administrator)
2. APIs:
   - GET /approvals/pending: list pending events for the current approver
   - GET /approvals/{approval_id}: retrieve approval details
   - POST /approvals/{approval_id}/approve: approve event at current level
   - POST /approvals/{approval_id}/reject: reject event at current level with reason
   - GET /events/{event_id}/approval-history: retrieve decision history for an event
"""

from typing import List, Optional, Tuple
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.connection import get_db
from app.api.deps import get_current_user, require_permissions
from app.models.auth import User, Role
from app.models.event import Event, Club, ClubMember, EventApproval, Venue, VenueBooking
from app.schemas.approval import (
    ApprovalDecisionRequest,
    ApprovalItemResponse,
    ApprovalHistoryItem,
    ApprovalActionResponse,
)
from app.api.events import is_user_authorized_for_club, is_user_authorized_for_event

router = APIRouter(prefix="/approvals", tags=["Approvals"])
events_approval_router = APIRouter(prefix="/events", tags=["Approvals"])


def get_expected_role_for_level(level: int) -> str:
    """Returns the role name mandated for a given sequential approval level."""
    if level == 1:
        return "club_advisor"
    elif level == 2:
        return "student_affairs"
    elif level == 3:
        return "administrator"
    return ""


def resolve_event_and_approval(db: Session, identifier: int) -> Tuple[Event, Optional[EventApproval]]:
    """Resolves an Event from either an approval_id or direct event_id."""
    # 1. Try finding by event_id first
    event = db.query(Event).filter(Event.event_id == identifier).first()
    if event:
        approval = (
            db.query(EventApproval)
            .filter(EventApproval.event_id == event.event_id)
            .order_by(EventApproval.level.desc())
            .first()
        )
        return event, approval

    # 2. Try finding by approval_id
    approval = db.query(EventApproval).filter(EventApproval.approval_id == identifier).first()
    if approval:
        event = db.query(Event).filter(Event.event_id == approval.event_id).first()
        if event:
            return event, approval

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Approval target with identifier {identifier} not found",
    )


def process_approval_decision(
    db: Session,
    event: Event,
    current_user: User,
    decision: str,
    comments: Optional[str] = None,
) -> ApprovalActionResponse:
    """Core transactionally atomic approval processor enforcing all business rules and RBAC."""
    user_role = current_user.role.name if current_user.role else ""

    # 1. Self-approval prevention
    if event.created_by == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Approvers cannot approve or reject their own events",
        )

    # 2. Event lifecycle state checks
    if event.status == "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event has already been fully approved",
        )
    if event.status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve or reject an event that has already been rejected",
        )
    if event.status in ["completed", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot process approval for an event in '{event.status}' status",
        )
    if event.status != "pending_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Event is not in pending_approval status (current status: '{event.status}')",
        )

    # 3. Determine expected level and role
    expected_level = event.current_approval_level + 1
    expected_role = get_expected_role_for_level(expected_level)

    if not expected_role or expected_level > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid approval level {expected_level} for event",
        )

    # 4. Enforce role for current stage
    if user_role != expected_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: role '{user_role}' is not authorized for level-{expected_level} approval. Required role: '{expected_role}'",
        )

    # 5. For Level 1 (club_advisor), verify advisor is assigned to this club
    if expected_level == 1:
        is_club_advisor = (
            (event.club and event.club.faculty_advisor_id == current_user.user_id)
            or is_user_authorized_for_club(db, current_user, event.club_id)
        )
        if not is_club_advisor and user_role != "administrator":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized as the advisor for this club",
            )

    # 6. Rejection reason requirement
    if decision == "rejected":
        if not comments or not comments.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A rejection reason is required",
            )

    # 7. Prevent duplicate approval at the same level
    duplicate = (
        db.query(EventApproval)
        .filter(
            EventApproval.event_id == event.event_id,
            EventApproval.approver_id == current_user.user_id,
            EventApproval.level == expected_level,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Approver has already submitted a decision at level {expected_level}",
        )

    # 8. Delegate atomic transition to stored procedure fn_process_event_approval
    try:
        # Set audit user context
        db.execute(
            text("SELECT set_config('app.current_user_id', :uid, true)"),
            {"uid": str(current_user.user_id)},
        )

        raw_result = db.execute(
            text("""
                SELECT fn_process_event_approval(
                    :event_id,
                    :approver_id,
                    :decision,
                    :comments
                )
            """),
            {
                "event_id": event.event_id,
                "approver_id": str(current_user.user_id),
                "decision": decision,
                "comments": comments.strip() if comments else None,
            },
        ).scalar()

        if not raw_result or raw_result.get("status") == "error":
            error_msg = raw_result.get("message", "Approval processing failed") if raw_result else "Unknown error"
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

        # After Administrator final approval (Level 3), ensure a pending venue booking exists for the Venue Manager queue
        if decision == "approved" and expected_level == 3:
            existing_booking = db.query(VenueBooking).filter(VenueBooking.event_id == event.event_id).first()
            if not existing_booking:
                target_venue_id = event.venue_id
                if not target_venue_id:
                    first_venue = db.query(Venue).filter(Venue.is_active == True).first()
                    target_venue_id = first_venue.venue_id if first_venue else 1

                pending_booking = VenueBooking(
                    venue_id=target_venue_id,
                    event_id=event.event_id,
                    booked_by=event.created_by,
                    start_time=event.start_time,
                    end_time=event.end_time,
                    status="pending",
                    notes=f"Venue reservation requested for finally approved event: {event.title}",
                )
                db.add(pending_booking)
            elif existing_booking.status != "confirmed":
                existing_booking.status = "pending"

        db.commit()
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to execute approval transition",
        ) from exc

    return ApprovalActionResponse(
        status="success",
        approval_id=raw_result.get("approval_id"),
        event_id=event.event_id,
        level_processed=raw_result.get("level_processed", expected_level),
        decision=decision,
        event_status=raw_result.get("event_status", event.status),
        message=raw_result.get("message", f"Event successfully {decision} at level {expected_level}."),
    )


# ── 1. GET /approvals/pending ─────────────────────────────────

@router.get(
    "/pending",
    response_model=List[ApprovalItemResponse],
    summary="List Pending Approvals",
    description="Retrieves events awaiting approval at the authenticated user's current workflow level.",
)
def list_pending_approvals(
    current_user: User = Depends(require_permissions("events.approve")),
    db: Session = Depends(get_db),
):
    user_role = current_user.role.name if current_user.role else ""

    # Map role -> workflow level
    role_to_level = {
        "club_advisor": 1,
        "student_affairs": 2,
        "administrator": 3,
    }

    if user_role not in role_to_level:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your role is not an authorized approver role",
        )

    target_level = role_to_level[user_role]
    required_approval_stage = target_level - 1  # 0 for level 1, 1 for level 2, 2 for level 3

    # Query events pending at this level
    query = db.query(Event).filter(
        Event.status == "pending_approval",
        Event.current_approval_level == required_approval_stage,
        Event.created_by != current_user.user_id,  # Cannot approve own events
    )

    # For club_advisor, only events of supervised clubs
    if user_role == "club_advisor":
        supervised_club_ids = [
            c.club_id
            for c in db.query(Club.club_id)
            .filter(Club.faculty_advisor_id == current_user.user_id)
            .all()
        ]
        officer_club_ids = [
            m.club_id
            for m in db.query(ClubMember.club_id)
            .filter(
                ClubMember.user_id == current_user.user_id,
                ClubMember.is_active == True,
                ClubMember.member_role.in_(["faculty_advisor", "officer", "president"]),
            )
            .all()
        ]
        allowed_clubs = set(supervised_club_ids + officer_club_ids)
        query = query.filter(Event.club_id.in_(list(allowed_clubs)))

    pending_events = query.order_by(Event.created_at.asc()).all()

    items = []
    for e in pending_events:
        items.append(
            ApprovalItemResponse(
                approval_id=e.event_id,
                event_id=e.event_id,
                event_title=e.title,
                club_id=e.club_id,
                club_name=e.club.name if e.club else None,
                current_level=e.current_approval_level,
                required_level=target_level,
                required_role=get_expected_role_for_level(target_level),
                start_time=e.start_time,
                budget_allocated=e.budget_allocated,
                created_by=e.created_by,
                created_at=e.created_at,
            )
        )
    return items


# ── 2. GET /approvals/{approval_id} ───────────────────────────

@router.get(
    "/{approval_id}",
    response_model=ApprovalItemResponse,
    summary="Get Approval Details",
    description="Retrieves pending approval item details by approval or event ID.",
)
def get_approval_details(
    approval_id: int,
    current_user: User = Depends(require_permissions("events.approve")),
    db: Session = Depends(get_db),
):
    event, _ = resolve_event_and_approval(db, approval_id)
    next_level = event.current_approval_level + 1

    return ApprovalItemResponse(
        approval_id=event.event_id,
        event_id=event.event_id,
        event_title=event.title,
        club_id=event.club_id,
        club_name=event.club.name if event.club else None,
        current_level=event.current_approval_level,
        required_level=next_level if next_level <= 3 else 3,
        required_role=get_expected_role_for_level(next_level if next_level <= 3 else 3),
        start_time=event.start_time,
        budget_allocated=event.budget_allocated,
        created_by=event.created_by,
        created_at=event.created_at,
    )


# ── 3. POST /approvals/{approval_id}/approve ──────────────────

@router.post(
    "/{approval_id}/approve",
    response_model=ApprovalActionResponse,
    summary="Approve Event",
    description="Submits an approval decision at the caller's assigned workflow stage.",
)
def approve_event(
    approval_id: int,
    payload: Optional[ApprovalDecisionRequest] = None,
    current_user: User = Depends(require_permissions("events.approve")),
    db: Session = Depends(get_db),
):
    event, _ = resolve_event_and_approval(db, approval_id)
    comments = payload.comments if payload else None
    return process_approval_decision(db, event, current_user, "approved", comments)


# ── 4. POST /approvals/{approval_id}/reject ───────────────────

@router.post(
    "/{approval_id}/reject",
    response_model=ApprovalActionResponse,
    summary="Reject Event",
    description="Rejects an event with mandatory justification, immediately halting the approval workflow.",
)
def reject_event(
    approval_id: int,
    payload: ApprovalDecisionRequest,
    current_user: User = Depends(require_permissions("events.approve")),
    db: Session = Depends(get_db),
):
    event, _ = resolve_event_and_approval(db, approval_id)
    return process_approval_decision(db, event, current_user, "rejected", payload.comments)


# ── 5. GET /events/{event_id}/approval-history ────────────────

@events_approval_router.get(
    "/{event_id}/approval-history",
    response_model=List[ApprovalHistoryItem],
    summary="Get Event Approval History",
    description="Retrieves the sequential audit trail of approval and rejection decisions for an event.",
)
def get_event_approval_history(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found",
        )

    # Check authorization: admins, advisors, student affairs, or event creator/club leaders
    user_role = current_user.role.name if current_user.role else ""
    is_authorized = (
        user_role in ["administrator", "student_affairs", "club_advisor"]
        or is_user_authorized_for_event(db, current_user, event)
    )
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this event's approval history",
        )

    history = (
        db.query(EventApproval)
        .filter(EventApproval.event_id == event_id)
        .order_by(EventApproval.level.asc(), EventApproval.decided_at.asc())
        .all()
    )

    items = []
    for h in history:
        approver_name = h.approver.full_name if h.approver else None
        role_name = h.role.name if h.role else None
        items.append(
            ApprovalHistoryItem(
                approval_id=h.approval_id,
                event_id=h.event_id,
                approver_id=h.approver_id,
                approver_name=approver_name,
                role_name=role_name,
                level=h.level,
                status=h.status,
                comments=h.comments,
                decided_at=h.decided_at,
                created_at=h.created_at,
            )
        )
    return items


# Direct alias routes on /events/{event_id}/approve and /events/{event_id}/reject
@events_approval_router.post(
    "/{event_id}/approve",
    response_model=ApprovalActionResponse,
    summary="Approve Event via Event ID",
)
def approve_event_via_event_id(
    event_id: int,
    payload: Optional[ApprovalDecisionRequest] = None,
    current_user: User = Depends(require_permissions("events.approve")),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event with id {event_id} not found")
    comments = payload.comments if payload else None
    return process_approval_decision(db, event, current_user, "approved", comments)


@events_approval_router.post(
    "/{event_id}/reject",
    response_model=ApprovalActionResponse,
    summary="Reject Event via Event ID",
)
def reject_event_via_event_id(
    event_id: int,
    payload: ApprovalDecisionRequest,
    current_user: User = Depends(require_permissions("events.approve")),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event with id {event_id} not found")
    return process_approval_decision(db, event, current_user, "rejected", payload.comments)
