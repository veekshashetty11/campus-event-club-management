"""Analytics, Reporting, and Audit Log API endpoints."""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.connection import get_db
from app.models.auth import User
from app.models.event import AuditLog, Attendance, Club, Event, EventRegistration, EventWaitlist, Feedback
from app.schemas.analytics import (
    AuditLogEntry,
    AuditLogPage,
    ClubSummaryEntry,
    ClubsSummary,
    EventStats,
    EventStatusCount,
    EventsSummary,
    UserEngagementEntry,
    UsersEngagement,
)

router = APIRouter(tags=["Analytics & Audit"])

ANALYTICS_ROLES = ("admin", "student_affairs")


def _require_analytics(current_user: User = Depends(get_current_user)) -> User:
    """Allow admin or student_affairs roles."""
    role = current_user.role.name if current_user.role else ""
    if role not in ANALYTICS_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: analytics access requires admin or student_affairs role",
        )
    return current_user


# ── GET /analytics/events/summary ─────────────────────────────────────────────

@router.get(
    "/analytics/events/summary",
    response_model=EventsSummary,
    summary="Summary of events by status and avg registrations",
)
def events_summary(
    db: Session = Depends(get_db),
    _: User = Depends(_require_analytics),
):
    # Total events by status
    rows = (
        db.query(Event.status, func.count(Event.event_id).label("count"))
        .group_by(Event.status)
        .all()
    )
    total = sum(r.count for r in rows)
    by_status = [EventStatusCount(status=r.status, count=r.count) for r in rows]

    # Avg registrations per event
    avg_row = db.query(func.avg(Event.registered_count)).scalar()
    avg_reg = float(avg_row) if avg_row is not None else 0.0

    return EventsSummary(total_events=total, by_status=by_status, avg_registrations_per_event=avg_reg)


# ── GET /analytics/events/{event_id}/stats ────────────────────────────────────

@router.get(
    "/analytics/events/{event_id}/stats",
    response_model=EventStats,
    summary="Detailed stats for a specific event",
)
def event_stats(
    event_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_analytics),
):
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    reg_count = (
        db.query(func.count(EventRegistration.registration_id))
        .filter(
            EventRegistration.event_id == event_id,
            EventRegistration.status.in_(["registered", "attended"]),
        )
        .scalar()
        or 0
    )

    waitlist_count = (
        db.query(func.count(EventWaitlist.waitlist_id))
        .filter(EventWaitlist.event_id == event_id, EventWaitlist.status == "waiting")
        .scalar()
        or 0
    )

    attendance_count = (
        db.query(func.count(Attendance.attendance_id))
        .filter(Attendance.event_id == event_id)
        .scalar()
        or 0
    )

    avg_rating = (
        db.query(func.avg(Feedback.rating))
        .filter(Feedback.event_id == event_id)
        .scalar()
    )
    avg_rating_val = float(avg_rating) if avg_rating is not None else None

    # Revenue from club_expenses — query raw to avoid import coupling
    revenue_row = db.execute(
        text("SELECT COALESCE(SUM(amount), 0) FROM club_expenses WHERE event_id = :eid AND status = 'approved'"),
        {"eid": event_id},
    ).scalar()
    revenue = float(revenue_row) if revenue_row is not None else 0.0

    return EventStats(
        event_id=event_id,
        title=event.title,
        total_registrations=reg_count,
        waitlist_count=waitlist_count,
        attendance_count=attendance_count,
        avg_feedback_rating=avg_rating_val,
        total_expenses=revenue,
    )


# ── GET /analytics/clubs/summary ─────────────────────────────────────────────

@router.get(
    "/analytics/clubs/summary",
    response_model=ClubsSummary,
    summary="Events per club and avg attendance per club",
)
def clubs_summary(
    db: Session = Depends(get_db),
    _: User = Depends(_require_analytics),
):
    # Events per club
    event_counts = (
        db.query(Event.club_id, func.count(Event.event_id).label("total_events"))
        .group_by(Event.club_id)
        .subquery()
    )

    # Avg attendance per club (via events)
    attendance_per_event = (
        db.query(Event.club_id, func.avg(
            db.query(func.count(Attendance.attendance_id))
            .filter(Attendance.event_id == Event.event_id)
            .correlate(Event)
            .scalar_subquery()
        ).label("avg_attendance"))
        .group_by(Event.club_id)
        .subquery()
    )

    rows = (
        db.query(
            Club.club_id,
            Club.name,
            func.coalesce(event_counts.c.total_events, 0).label("total_events"),
            func.coalesce(attendance_per_event.c.avg_attendance, 0).label("avg_attendance"),
        )
        .outerjoin(event_counts, Club.club_id == event_counts.c.club_id)
        .outerjoin(attendance_per_event, Club.club_id == attendance_per_event.c.club_id)
        .order_by(Club.name)
        .all()
    )

    entries = [
        ClubSummaryEntry(
            club_id=r.club_id,
            club_name=r.name,
            total_events=r.total_events,
            avg_attendance=float(r.avg_attendance) if r.avg_attendance else 0.0,
        )
        for r in rows
    ]
    return ClubsSummary(clubs=entries)


# ── GET /analytics/users/engagement ──────────────────────────────────────────

@router.get(
    "/analytics/users/engagement",
    response_model=UsersEngagement,
    summary="Top 10 most active users by event attendance (admin only)",
)
def users_engagement(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    rows = (
        db.query(
            User.user_id,
            User.full_name,
            func.count(Attendance.attendance_id).label("events_attended"),
            User.points,
        )
        .join(Attendance, Attendance.user_id == User.user_id)
        .group_by(User.user_id, User.full_name, User.points)
        .order_by(func.count(Attendance.attendance_id).desc())
        .limit(10)
        .all()
    )

    top_users = [
        UserEngagementEntry(
            user_id=r.user_id,
            full_name=r.full_name,
            events_attended=r.events_attended,
            total_points=r.points,
        )
        for r in rows
    ]
    return UsersEngagement(top_users=top_users)


# ── GET /audit-log ────────────────────────────────────────────────────────────

@router.get(
    "/audit-log",
    response_model=AuditLogPage,
    summary="Paginated audit log entries (admin only)",
)
def audit_log(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    table_name: Optional[str] = Query(default=None),
    operation: Optional[str] = Query(default=None),
    since: Optional[datetime] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    query = db.query(AuditLog)

    if table_name:
        query = query.filter(AuditLog.table_name == table_name)
    if operation:
        query = query.filter(AuditLog.operation == operation.upper())
    if since:
        query = query.filter(AuditLog.changed_at >= since)

    total = query.count()
    items = (
        query.order_by(AuditLog.changed_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return AuditLogPage(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )
