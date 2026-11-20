"""Badges, User Badges, and Leaderboard API endpoints."""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, text
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_roles
from app.db.connection import get_db
from app.models.auth import User
from app.models.event import Badge, UserBadge
from app.schemas.badges import (
    AwardBadgeRequest,
    BadgeOut,
    LeaderboardEntry,
    UserBadgeOut,
)

router = APIRouter(tags=["Badges & Leaderboard"])


# ── GET /badges ───────────────────────────────────────────────────────────────

@router.get("/badges", response_model=List[BadgeOut], summary="List all active badges")
def list_badges(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Badge).filter(Badge.is_active.is_(True)).order_by(Badge.name).all()


# ── GET /users/me/badges ──────────────────────────────────────────────────────

@router.get("/users/me/badges", response_model=List[UserBadgeOut], summary="Current user's earned badges")
def my_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(UserBadge)
        .options(joinedload(UserBadge.badge))
        .filter(UserBadge.user_id == current_user.user_id)
        .order_by(UserBadge.awarded_at.desc())
        .all()
    )


# ── GET /users/{user_id}/badges ───────────────────────────────────────────────

@router.get("/users/{user_id}/badges", response_model=List[UserBadgeOut], summary="Get a user's earned badges")
def user_badges(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    target = db.query(User).filter(User.user_id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return (
        db.query(UserBadge)
        .options(joinedload(UserBadge.badge))
        .filter(UserBadge.user_id == user_id)
        .order_by(UserBadge.awarded_at.desc())
        .all()
    )


# ── POST /badges/{badge_id}/award ─────────────────────────────────────────────

@router.post(
    "/badges/{badge_id}/award",
    response_model=UserBadgeOut,
    status_code=status.HTTP_201_CREATED,
    summary="Manually award a badge to a user (admin only)",
)
def award_badge(
    badge_id: int,
    body: AwardBadgeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    badge = db.query(Badge).filter(Badge.badge_id == badge_id, Badge.is_active.is_(True)).first()
    if not badge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Badge not found or inactive")

    target = db.query(User).filter(User.user_id == body.user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")

    # Prevent duplicate award
    existing = (
        db.query(UserBadge)
        .filter(UserBadge.user_id == body.user_id, UserBadge.badge_id == badge_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already has this badge")

    db.execute(
        text("SELECT set_config('app.current_user_id', :uid, true)"),
        {"uid": str(current_user.user_id)},
    )

    ub = UserBadge(
        user_id=body.user_id,
        badge_id=badge_id,
        awarded_by=current_user.user_id,
        notes=body.notes,
    )
    db.add(ub)
    db.commit()
    db.refresh(ub)
    db.refresh(ub, attribute_names=["badge"])
    return ub


# ── GET /leaderboard ──────────────────────────────────────────────────────────

@router.get("/leaderboard", response_model=List[LeaderboardEntry], summary="Top N users by points")
def leaderboard(
    limit: int = Query(default=20, ge=1, le=100),
    department_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    badge_count_subq = (
        db.query(
            UserBadge.user_id,
            func.count(UserBadge.user_badge_id).label("badge_count"),
        )
        .group_by(UserBadge.user_id)
        .subquery()
    )

    query = (
        db.query(
            User.user_id,
            User.full_name,
            User.points,
            func.coalesce(badge_count_subq.c.badge_count, 0).label("badge_count"),
        )
        .outerjoin(badge_count_subq, User.user_id == badge_count_subq.c.user_id)
        .filter(User.status == "active")
    )

    if department_id is not None:
        query = query.filter(User.department_id == department_id)

    rows = query.order_by(User.points.desc()).limit(limit).all()

    return [
        LeaderboardEntry(
            rank=idx + 1,
            user_id=row.user_id,
            full_name=row.full_name,
            points=row.points,
            badge_count=row.badge_count,
        )
        for idx, row in enumerate(rows)
    ]
