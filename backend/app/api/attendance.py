"""Attendance check-in and stats API endpoints.

Routes:
  POST /events/{event_id}/check-in       — Check in an attendee (event leadership / admin)
  GET  /events/{event_id}/attendance     — List attendance records (admin/coordinator/leader)
  GET  /events/{event_id}/attendance/stats — Summary stats
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.api.deps import get_current_user, require_permissions
from app.api.events import is_user_authorized_for_event
from app.models.auth import User
from app.models.event import Attendance, Event, EventRegistration
from app.schemas.attendance import (
    AttendanceRecord,
    AttendanceStats,
    CheckInRequest,
)

router = APIRouter(prefix="/events", tags=["Attendance"])

_ADMIN_ROLES = {"administrator", "event_coordinator", "student_affairs", "club_advisor"}


def _get_event_or_404(db: Session, event_id: int) -> Event:
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event {event_id} not found")
    return event


# ── POST /events/{event_id}/check-in ─────────────────────────────────────────

@router.post(
    "/{event_id}/check-in",
    response_model=AttendanceRecord,
    status_code=status.HTTP_201_CREATED,
    summary="Check In Attendee",
)
def check_in_attendee(
    event_id: int,
    payload: CheckInRequest,
    current_user: User = Depends(require_permissions("events.read")),
    db: Session = Depends(get_db),
):
    """Check in an attendee by ticket_code or user_id. Awards points based on on-time vs late."""
    event = _get_event_or_404(db, event_id)

    # Authorisation: admin roles or event leadership
    user_role = current_user.role.name if current_user.role else ""
    if user_role not in _ADMIN_ROLES and not is_user_authorized_for_event(db, current_user, event):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorised to check in attendees")

    if not payload.ticket_code and not payload.user_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide ticket_code or user_id",
        )

    # Locate the registration
    query = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.status == "registered",
    )
    if payload.ticket_code:
        query = query.filter(EventRegistration.ticket_code == payload.ticket_code)
    else:
        query = query.filter(EventRegistration.user_id == payload.user_id)

    reg = query.first()
    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active registration found with the supplied identifier",
        )

    if reg.checked_in_at is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Attendee already checked in")

    # Determine points
    now = datetime.now(timezone.utc)
    grace_cutoff = event.start_time + timedelta(minutes=15)
    # Ensure start_time is offset-aware for comparison
    start_aware = event.start_time
    if start_aware.tzinfo is None:
        start_aware = start_aware.replace(tzinfo=timezone.utc)
    grace_cutoff = start_aware + timedelta(minutes=15)

    points = (event.points_on_time or 10) if now <= grace_cutoff else (event.points_late or 5)

    # Audit context
    db.execute(
        text("SELECT set_config('app.current_user_id', :uid, true)"),
        {"uid": str(current_user.user_id)},
    )

    # Insert attendance record
    attendance = Attendance(
        event_id=event_id,
        user_id=reg.user_id,
        checked_in_at=now,
        check_in_method=payload.check_in_method or "manual",
        points_awarded=points,
    )
    db.add(attendance)

    # Mark registration checked_in_at
    reg.checked_in_at = now

    # Increment user points
    db.execute(
        text("UPDATE users SET points = COALESCE(points, 0) + :pts WHERE user_id = :uid"),
        {"pts": points, "uid": str(reg.user_id)},
    )

    db.commit()
    db.refresh(attendance)

    return AttendanceRecord(
        attendance_id=attendance.attendance_id,
        event_id=attendance.event_id,
        user_id=attendance.user_id,
        checked_in_at=attendance.checked_in_at,
        check_in_method=attendance.check_in_method,
        points_awarded=attendance.points_awarded,
        user_name=reg.user.full_name if reg.user else None,
        user_email=reg.user.email if reg.user else None,
    )


# ── GET /events/{event_id}/attendance ────────────────────────────────────────

@router.get(
    "/{event_id}/attendance",
    response_model=List[AttendanceRecord],
    summary="List Attendance Records",
)
def list_attendance(
    event_id: int,
    current_user: User = Depends(require_permissions("events.read")),
    db: Session = Depends(get_db),
):
    event = _get_event_or_404(db, event_id)

    user_role = current_user.role.name if current_user.role else ""
    if user_role not in _ADMIN_ROLES and not is_user_authorized_for_event(db, current_user, event):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorised to view attendance")

    records = (
        db.query(Attendance)
        .filter(Attendance.event_id == event_id)
        .order_by(Attendance.checked_in_at.asc())
        .all()
    )

    return [
        AttendanceRecord(
            attendance_id=r.attendance_id,
            event_id=r.event_id,
            user_id=r.user_id,
            checked_in_at=r.checked_in_at,
            check_in_method=r.check_in_method,
            points_awarded=r.points_awarded,
            user_name=r.user.full_name if r.user else None,
            user_email=r.user.email if r.user else None,
        )
        for r in records
    ]


# ── GET /events/{event_id}/attendance/stats ───────────────────────────────────

@router.get(
    "/{event_id}/attendance/stats",
    response_model=AttendanceStats,
    summary="Attendance Stats",
)
def attendance_stats(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_event_or_404(db, event_id)

    total_registered = (
        db.query(func.count(EventRegistration.registration_id))
        .filter(
            EventRegistration.event_id == event_id,
            EventRegistration.status == "registered",
        )
        .scalar()
        or 0
    )

    checked_in = (
        db.query(func.count(Attendance.attendance_id))
        .filter(Attendance.event_id == event_id)
        .scalar()
        or 0
    )

    return AttendanceStats(
        event_id=event_id,
        total_registered=total_registered,
        checked_in=checked_in,
        absent=max(0, total_registered - checked_in),
    )
