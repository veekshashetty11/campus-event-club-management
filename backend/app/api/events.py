"""Event Management API Router.

Implements the first event-management milestone:
- GET /events: list events with pagination and filters
- GET /events/{event_id}: retrieve event details
- POST /events: create an event with permission and ownership checks
- PATCH /events/{event_id}: update an event with ownership and authorization checks
- POST /events/{event_id}/submit: submit an event for sequential workflow approval
"""

import math
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session
from app.db.connection import get_db
from app.api.deps import get_current_user, require_permissions
from app.models.auth import User
from app.models.event import Event, Club, ClubMember, Venue, EventCategory
from app.schemas.event import (
    EventCreateRequest,
    EventUpdateRequest,
    EventResponse,
    PaginatedEventsResponse,
    EventSubmitResponse,
)

router = APIRouter(prefix="/events", tags=["Events"])


def is_user_authorized_for_club(db: Session, user: User, club_id: int) -> bool:
    """Verifies whether the user has leadership authority over a specific club.

    Administrators have global authority.
    For other roles, verifies direct club presidency or active leadership membership.
    """
    if user.role and user.role.name == "administrator":
        return True

    club = db.query(Club).filter(Club.club_id == club_id).first()
    if not club:
        return False

    if club.president_id == user.user_id:
        return True

    # Check active officer / leadership roles in club_members
    membership = (
        db.query(ClubMember)
        .filter(
            ClubMember.club_id == club_id,
            ClubMember.user_id == user.user_id,
            ClubMember.is_active == True,
            ClubMember.member_role.in_(["president", "co_president", "officer", "faculty_advisor"]),
        )
        .first()
    )
    return membership is not None


def is_user_authorized_for_event(db: Session, user: User, event: Event) -> bool:
    """Verifies whether the user has authority to modify or submit a specific event.

    Authority granted to:
    - Administrators (global)
    - The event creator
    - Sponsoring club president or active leadership members
    """
    if user.role and user.role.name == "administrator":
        return True
    if event.created_by == user.user_id:
        return True
    return is_user_authorized_for_club(db, user, event.club_id)


def build_event_response(event: Event) -> EventResponse:
    """Transforms an Event ORM model into an EventResponse schema with denormalized names."""
    return EventResponse(
        event_id=event.event_id,
        club_id=event.club_id,
        category_id=event.category_id,
        series_id=event.series_id,
        venue_id=event.venue_id,
        created_by=event.created_by,
        title=event.title,
        description=event.description,
        banner_url=event.banner_url,
        start_time=event.start_time,
        end_time=event.end_time,
        registration_deadline=event.registration_deadline,
        max_capacity=event.max_capacity,
        registered_count=event.registered_count,
        waitlist_count=event.waitlist_count,
        is_public=event.is_public,
        requires_approval=event.requires_approval,
        status=event.status,
        budget_allocated=event.budget_allocated,
        tags=event.tags,
        points_on_time=event.points_on_time,
        points_late=event.points_late,
        current_approval_level=event.current_approval_level,
        created_at=event.created_at,
        updated_at=event.updated_at,
        club_name=event.club.name if event.club else None,
        category_name=event.category.name if event.category else None,
        venue_name=event.venue.name if event.venue else None,
    )


# ── 1. GET /events — List Events with Pagination and Filters ─

@router.get(
    "",
    response_model=PaginatedEventsResponse,
    summary="List Events",
    description="Retrieves a paginated list of events matching query filters and caller visibility permissions.",
)
def list_events(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    status_filter: Optional[str] = Query(default=None, alias="status", description="Filter by event status"),
    club_id: Optional[int] = Query(default=None, ge=1, description="Filter by club ID"),
    category_id: Optional[int] = Query(default=None, ge=1, description="Filter by category ID"),
    venue_id: Optional[int] = Query(default=None, ge=1, description="Filter by venue ID"),
    is_public: Optional[bool] = Query(default=None, description="Filter by public visibility"),
    start_time_from: Optional[datetime] = Query(default=None, description="Filter events starting on or after"),
    start_time_to: Optional[datetime] = Query(default=None, description="Filter events starting on or before"),
    search: Optional[str] = Query(default=None, min_length=1, max_length=100, description="Search title and description"),
    current_user: User = Depends(require_permissions("events.read")),
    db: Session = Depends(get_db),
):
    query = db.query(Event)

    # Visibility filtering based on role:
    # Admins and student affairs / advisors can view all events.
    # Other users (students, club presidents) can only view public approved/published events,
    # plus events they created or events belonging to clubs they manage.
    user_role = current_user.role.name if current_user.role else ""
    if user_role not in ["administrator", "student_affairs", "club_advisor"]:
        # Find club IDs where the user is president or active officer
        managed_club_ids = [
            c.club_id for c in db.query(Club.club_id).filter(Club.president_id == current_user.user_id).all()
        ]
        officer_club_ids = [
            m.club_id
            for m in db.query(ClubMember.club_id)
            .filter(
                ClubMember.user_id == current_user.user_id,
                ClubMember.is_active == True,
                ClubMember.member_role.in_(["president", "co_president", "officer", "faculty_advisor"]),
            )
            .all()
        ]
        authorized_club_ids = set(managed_club_ids + officer_club_ids)

        visibility_conditions = [
            (Event.is_public == True) & (Event.status.in_(["approved", "published", "ongoing", "completed"])),
            Event.created_by == current_user.user_id,
        ]
        if authorized_club_ids:
            visibility_conditions.append(Event.club_id.in_(list(authorized_club_ids)))

        query = query.filter(or_(*visibility_conditions))

    # Apply explicit user query filters
    if status_filter:
        query = query.filter(Event.status == status_filter)
    if club_id:
        query = query.filter(Event.club_id == club_id)
    if category_id:
        query = query.filter(Event.category_id == category_id)
    if venue_id:
        query = query.filter(Event.venue_id == venue_id)
    if is_public is not None:
        query = query.filter(Event.is_public == is_public)
    if start_time_from:
        query = query.filter(Event.start_time >= start_time_from)
    if start_time_to:
        query = query.filter(Event.start_time <= start_time_to)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Event.title.ilike(search_pattern),
                Event.description.ilike(search_pattern),
            )
        )

    total = query.with_entities(func.count(Event.event_id)).scalar() or 0
    pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit

    events = (
        query.order_by(Event.start_time.asc(), Event.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = [build_event_response(e) for e in events]
    return PaginatedEventsResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


# ── 2. GET /events/{event_id} — Retrieve Event Details ───────

@router.get(
    "/{event_id}",
    response_model=EventResponse,
    summary="Get Event Details",
    description="Retrieves complete event details by ID, enforcing visibility checks.",
)
def get_event(
    event_id: int,
    current_user: User = Depends(require_permissions("events.read")),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found",
        )

    # Visibility check for unpublished/draft events
    user_role = current_user.role.name if current_user.role else ""
    if user_role not in ["administrator", "student_affairs", "club_advisor"]:
        is_visible = (
            (event.is_public and event.status in ["approved", "published", "ongoing", "completed"])
            or event.created_by == current_user.user_id
            or is_user_authorized_for_club(db, current_user, event.club_id)
        )
        if not is_visible:
            # Return 404 to avoid leaking existence of private/draft events
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Event with id {event_id} not found",
            )

    return build_event_response(event)


# ── 3. POST /events — Create Event ────────────────────────────

@router.post(
    "",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Event",
    description="Proposes and drafts a new campus event. Enforces club authorization, venue capacity, and initial draft status.",
)
def create_event(
    payload: EventCreateRequest,
    current_user: User = Depends(require_permissions("events.create")),
    db: Session = Depends(get_db),
):
    # 1. Validate club existence and active status
    club = db.query(Club).filter(Club.club_id == payload.club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Club with id {payload.club_id} does not exist",
        )
    if club.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Club '{club.name}' is {club.status} and cannot host new events",
        )

    # 2. Enforce club ownership / authorization
    if not is_user_authorized_for_club(db, current_user, payload.club_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to create events for this club",
        )

    # 3. Validate category if provided
    if payload.category_id is not None:
        category = db.query(EventCategory).filter(EventCategory.category_id == payload.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with id {payload.category_id} does not exist",
            )
        if not category.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category '{category.name}' is inactive",
            )

    # 4. Validate venue if provided
    if payload.venue_id is not None:
        venue = db.query(Venue).filter(Venue.venue_id == payload.venue_id).first()
        if not venue:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Venue with id {payload.venue_id} does not exist",
            )
        if not venue.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Venue '{venue.name}' is inactive and cannot be selected",
            )
        if payload.max_capacity is not None and payload.max_capacity > venue.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Event max capacity ({payload.max_capacity}) exceeds venue capacity ({venue.capacity})",
            )

    # 5. Timing sanity check: start_time cannot be in the past
    now = datetime.now(timezone.utc)
    if payload.start_time < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event start_time cannot be in the past",
        )

    # 6. Instantiate new Event in draft status (workflow cannot be bypassed)
    new_event = Event(
        club_id=payload.club_id,
        category_id=payload.category_id,
        series_id=payload.series_id,
        venue_id=payload.venue_id,
        created_by=current_user.user_id,
        title=payload.title,
        description=payload.description,
        banner_url=payload.banner_url,
        start_time=payload.start_time,
        end_time=payload.end_time,
        registration_deadline=payload.registration_deadline,
        max_capacity=payload.max_capacity,
        registered_count=0,
        waitlist_count=0,
        is_public=payload.is_public,
        requires_approval=payload.requires_approval,
        status="draft",  # Always begins in draft status; never bypasses approval
        budget_allocated=payload.budget_allocated,
        tags=payload.tags,
        points_on_time=payload.points_on_time,
        points_late=payload.points_late,
        current_approval_level=0,
    )

    try:
        # Parameterized set_config for audit log trigger actor
        db.execute(
            text("SELECT set_config('app.current_user_id', :uid, true)"),
            {"uid": str(current_user.user_id)},
        )
        db.add(new_event)
        db.commit()
        db.refresh(new_event)
    except Exception:
        db.rollback()
        raise

    return build_event_response(new_event)


# ── 4. PATCH /events/{event_id} — Update Event ───────────────

@router.patch(
    "/{event_id}",
    response_model=EventResponse,
    summary="Update Event",
    description="Updates event fields with authorization and state checks. Does not permit bypassing approval workflow.",
)
def update_event(
    event_id: int,
    payload: EventUpdateRequest,
    current_user: User = Depends(require_permissions("events.update")),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found",
        )

    # 1. Authorization check
    if not is_user_authorized_for_event(db, current_user, event):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this event",
        )

    # 2. Workflow state check: cannot edit completed or cancelled events
    if event.status in ["completed", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update event in '{event.status}' status",
        )

    # Cannot modify event while under active approval review
    if event.status == "pending_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update an event while it is pending approval. Wait for review or withdraw it.",
        )

    # 3. Timing cross-validation against existing values
    effective_start = payload.start_time if payload.start_time is not None else event.start_time
    effective_end = payload.end_time if payload.end_time is not None else event.end_time
    effective_deadline = (
        payload.registration_deadline
        if payload.registration_deadline is not None
        else event.registration_deadline
    )

    if effective_end <= effective_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event end_time must be strictly after start_time",
        )
    if effective_deadline is not None and effective_deadline > effective_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="registration_deadline must be earlier than or equal to start_time",
        )

    # 4. Venue & capacity validation
    effective_venue_id = payload.venue_id if payload.venue_id is not None else event.venue_id
    effective_max_capacity = payload.max_capacity if payload.max_capacity is not None else event.max_capacity

    if effective_venue_id is not None:
        venue = db.query(Venue).filter(Venue.venue_id == effective_venue_id).first()
        if not venue:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Venue with id {effective_venue_id} does not exist",
            )
        if not venue.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Venue '{venue.name}' is inactive",
            )
        if effective_max_capacity is not None and effective_max_capacity > venue.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Event max capacity ({effective_max_capacity}) exceeds venue capacity ({venue.capacity})",
            )

    # 5. Category validation
    if payload.category_id is not None:
        category = db.query(EventCategory).filter(EventCategory.category_id == payload.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with id {payload.category_id} does not exist",
            )
        if not category.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category '{category.name}' is inactive",
            )

    # 6. Apply partial field updates
    if payload.title is not None:
        event.title = payload.title
    if payload.description is not None:
        event.description = payload.description
    if payload.banner_url is not None:
        event.banner_url = payload.banner_url
    if payload.start_time is not None:
        event.start_time = payload.start_time
    if payload.end_time is not None:
        event.end_time = payload.end_time
    if payload.registration_deadline is not None:
        event.registration_deadline = payload.registration_deadline
    if payload.max_capacity is not None:
        event.max_capacity = payload.max_capacity
    if payload.is_public is not None:
        event.is_public = payload.is_public
    if payload.requires_approval is not None:
        event.requires_approval = payload.requires_approval
    if payload.budget_allocated is not None:
        event.budget_allocated = payload.budget_allocated
    if payload.tags is not None:
        event.tags = payload.tags
    if payload.points_on_time is not None:
        event.points_on_time = payload.points_on_time
    if payload.points_late is not None:
        event.points_late = payload.points_late
    if payload.category_id is not None:
        event.category_id = payload.category_id
    if payload.series_id is not None:
        event.series_id = payload.series_id
    if payload.venue_id is not None:
        event.venue_id = payload.venue_id

    event.updated_at = func.now()

    try:
        db.execute(
            text("SELECT set_config('app.current_user_id', :uid, true)"),
            {"uid": str(current_user.user_id)},
        )
        db.commit()
        db.refresh(event)
    except Exception:
        db.rollback()
        raise

    return build_event_response(event)


# ── 5. POST /events/{event_id}/submit — Submit for Approval ──

@router.post(
    "/{event_id}/submit",
    response_model=EventSubmitResponse,
    summary="Submit Event for Approval",
    description="Submits a draft or rejected event into the sequential multi-level approval workflow.",
)
def submit_event(
    event_id: int,
    current_user: User = Depends(require_permissions("events.update")),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found",
        )

    # 1. Authorization check
    if not is_user_authorized_for_event(db, current_user, event):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to submit this event for approval",
        )

    # 2. Workflow status checks
    if event.status == "pending_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event is already pending approval",
        )
    if event.status in ["approved", "published", "ongoing", "completed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Event has already been {event.status}",
        )
    if event.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit a cancelled event",
        )

    # 3. Timing check: cannot submit an event whose start_time has passed
    now = datetime.now(timezone.utc)
    if event.start_time < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit an event with a start time in the past",
        )

    # 4. Advance status to pending_approval and reset approval level to 0
    event.requires_approval = True
    event.status = "pending_approval"
    event.current_approval_level = 0
    event.updated_at = func.now()

    try:
        db.execute(
            text("SELECT set_config('app.current_user_id', :uid, true)"),
            {"uid": str(current_user.user_id)},
        )
        db.commit()
        db.refresh(event)
    except Exception:
        db.rollback()
        raise

    return EventSubmitResponse(
        event_id=event.event_id,
        status=event.status,
        requires_approval=event.requires_approval,
        current_approval_level=event.current_approval_level,
        message="Event successfully submitted for approval",
    )
