"""Pydantic schemas for Badges, User Badges, and Leaderboard endpoints."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


# ── Badge ─────────────────────────────────────────────────────────────────────

class BadgeOut(BaseModel):
    badge_id: int
    name: str
    description: Optional[str]
    icon_url: Optional[str]
    criteria_type: Optional[str]
    criteria_value: Optional[str]
    points_required: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── User Badge ────────────────────────────────────────────────────────────────

class UserBadgeOut(BaseModel):
    user_badge_id: int
    user_id: UUID
    badge_id: int
    awarded_at: datetime
    awarded_by: Optional[UUID]
    notes: Optional[str]
    badge: Optional[BadgeOut] = None

    model_config = {"from_attributes": True}


# ── Award Badge Request ───────────────────────────────────────────────────────

class AwardBadgeRequest(BaseModel):
    user_id: UUID
    notes: Optional[str] = Field(None, max_length=500)


# ── Leaderboard ───────────────────────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: UUID
    full_name: str
    points: int
    badge_count: int
