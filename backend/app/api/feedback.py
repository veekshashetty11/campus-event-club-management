"""Event Feedback API endpoints.

Routes:
  POST /events/{event_id}/feedback         — Submit feedback (registered/attended only)
  GET  /events/{event_id}/feedback         — List feedback (admin/coordinator only)
  GET  /events/{event_id}/feedback/summary — Aggregate stats (public to authenticated users)
"""

from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.api.deps import get_current_user, require_permissions
from app.models.auth import User
from app.models.event import Attendance, Event, EventRegistration, Feedback
from app.schemas.attendance import FeedbackRecord, FeedbackSubmitRequest, FeedbackSummary

router = APIRouter(prefix="/events", tags=["Feedback"])

_ADMIN_ROLES = {"administrator", "event_coordinator", "student_affairs"}


def _get_event_or_404(db: Session, event_id: int) -> Event:
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event {event_id} not found")
    return event


# ── POST /events/{event_id}/feedback ─────────────────────────────────────────

@router.post(
    "/{event_id}/feedback",
    response_model=FeedbackRecord,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Feedback",
)
def submit_feedback(
    event_id: int,
    payload: FeedbackSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit 1-5 star feedback. User must be registered (or attended) and can only submit once."""
    _get_event_or_404(db, event_id)

    # Verify user is registered or has attended
    registered = (
        db.query(EventRegistration)
        .filter(
            EventRegistration.event_id == event_id,
            EventRegistration.user_id == current_user.user_id,
            EventRegistration.status.in_(["registered", "attended"]),
        )
        .first()
    )
    attended = (
        db.query(Attendance)
        .filter(
            Attendance.event_id == event_id,
            Attendance.user_id == current_user.user_id,
        )
        .first()
    )

    if not registered and not attended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only registered or attending users may submit feedback",
        )

    # Check one-per-event uniqueness
    existing = (
        db.query(Feedback)
        .filter(Feedback.event_id == event_id, Feedback.user_id == current_user.user_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already submitted feedback for this event")

    db.execute(
        text("SELECT set_config('app.current_user_id', :uid, true)"),
        {"uid": str(current_user.user_id)},
    )

    fb = Feedback(
        event_id=event_id,
        user_id=current_user.user_id,
        rating=payload.rating,
        comment=payload.comment,
        is_anonymous=payload.is_anonymous,
    )
    db.add(fb)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Feedback already submitted")

    db.refresh(fb)

    return FeedbackRecord(
        feedback_id=fb.feedback_id,
        event_id=fb.event_id,
        user_id=None if fb.is_anonymous else fb.user_id,
        rating=fb.rating,
        comment=fb.comment,
        is_anonymous=fb.is_anonymous,
        created_at=fb.created_at,
        user_name=None if fb.is_anonymous else (fb.user.full_name if fb.user else None),
    )


# ── GET /events/{event_id}/feedback ──────────────────────────────────────────

@router.get(
    "/{event_id}/feedback",
    response_model=List[FeedbackRecord],
    summary="List Event Feedback",
)
def list_feedback(
    event_id: int,
    current_user: User = Depends(require_permissions("events.read")),
    db: Session = Depends(get_db),
):
    """List feedback for an event. Anonymous entries hide user identity."""
    _get_event_or_404(db, event_id)

    user_role = current_user.role.name if current_user.role else ""
    if user_role not in _ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or coordinator access required")

    records = (
        db.query(Feedback)
        .filter(Feedback.event_id == event_id)
        .order_by(Feedback.created_at.desc())
        .all()
    )

    return [
        FeedbackRecord(
            feedback_id=r.feedback_id,
            event_id=r.event_id,
            user_id=None if r.is_anonymous else r.user_id,
            rating=r.rating,
            comment=r.comment,
            is_anonymous=r.is_anonymous,
            created_at=r.created_at,
            user_name=None if r.is_anonymous else (r.user.full_name if r.user else None),
        )
        for r in records
    ]


# ── GET /events/{event_id}/feedback/summary ───────────────────────────────────

@router.get(
    "/{event_id}/feedback/summary",
    response_model=FeedbackSummary,
    summary="Feedback Summary",
)
def feedback_summary(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_event_or_404(db, event_id)

    agg = (
        db.query(func.count(Feedback.feedback_id), func.avg(Feedback.rating))
        .filter(Feedback.event_id == event_id)
        .one()
    )
    total_count, avg_rating = agg

    # Rating distribution {1..5}
    dist_rows = (
        db.query(Feedback.rating, func.count(Feedback.feedback_id))
        .filter(Feedback.event_id == event_id)
        .group_by(Feedback.rating)
        .all()
    )
    distribution: Dict[int, int] = {r: 0 for r in range(1, 6)}
    for rating, cnt in dist_rows:
        distribution[rating] = cnt

    return FeedbackSummary(
        event_id=event_id,
        total_count=total_count or 0,
        average_rating=round(float(avg_rating), 2) if avg_rating is not None else None,
        rating_distribution=distribution,
    )
