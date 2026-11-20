"""Notifications API.

Endpoints:
- GET  /notifications              — list current user's notifications (paginated, is_read filter)
- POST /notifications/{id}/read    — mark notification as read
- POST /notifications/read-all     — mark all as read
- GET  /notifications/unread-count — return unread count

Also exposes:
  create_notification(db, user_id, title, body, type, reference_type, reference_id)
  — importable helper used by other modules.
"""

import math
import uuid as _uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.api.deps import get_current_user
from app.models.auth import User
from app.models.event import Notification
from app.schemas.budget import (
    NotificationResponse,
    PaginatedNotificationsResponse,
    UnreadCountResponse,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ── Helper ────────────────────────────────────────────────────────────────────

def create_notification(
    db: Session,
    user_id: _uuid.UUID,
    title: str,
    body: str,
    type: str = "info",
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
) -> Notification:
    """Create and persist a notification for a user. Safe to call within an open transaction."""
    notif = Notification(
        user_id=user_id,
        title=title,
        body=body,
        type=type,
        reference_type=reference_type,
        reference_id=reference_id,
        is_read=False,
    )
    db.add(notif)
    db.flush()   # make notification_id available without committing caller's tx
    return notif


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="Get Unread Notification Count",
)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = (
        db.query(func.count(Notification.notification_id))
        .filter(
            Notification.user_id == current_user.user_id,
            Notification.is_read == False,
        )
        .scalar()
        or 0
    )
    return UnreadCountResponse(unread_count=count)


@router.get(
    "",
    response_model=PaginatedNotificationsResponse,
    summary="List Notifications",
)
def list_notifications(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    is_read: Optional[bool] = Query(default=None, description="Filter by read status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Notification).filter(Notification.user_id == current_user.user_id)
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)

    total = query.with_entities(func.count(Notification.notification_id)).scalar() or 0
    pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit

    items = (
        query.order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return PaginatedNotificationsResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.post(
    "/read-all",
    summary="Mark All Notifications as Read",
    status_code=status.HTTP_200_OK,
)
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    updated = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.user_id,
            Notification.is_read == False,
        )
        .all()
    )
    for notif in updated:
        notif.is_read = True
        notif.read_at = now
    try:
        db.execute(text("SELECT set_config('app.current_user_id', :uid, true)"), {"uid": str(current_user.user_id)})
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"marked_read": len(updated)}


@router.post(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark Notification as Read",
)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = (
        db.query(Notification)
        .filter(
            Notification.notification_id == notification_id,
            Notification.user_id == current_user.user_id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    if not notif.is_read:
        notif.is_read = True
        notif.read_at = datetime.now(timezone.utc)
        try:
            db.execute(text("SELECT set_config('app.current_user_id', :uid, true)"), {"uid": str(current_user.user_id)})
            db.commit()
            db.refresh(notif)
        except Exception:
            db.rollback()
            raise
    return notif
