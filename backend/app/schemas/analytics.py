"""Pydantic schemas for Analytics and Audit Log endpoints."""

from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel


# ── Event Analytics ───────────────────────────────────────────────────────────

class EventStatusCount(BaseModel):
    status: str
    count: int


class EventsSummary(BaseModel):
    total_events: int
    by_status: List[EventStatusCount]
    avg_registrations_per_event: float


class EventStats(BaseModel):
    event_id: int
    title: str
    total_registrations: int
    waitlist_count: int
    attendance_count: int
    avg_feedback_rating: Optional[float]
    total_expenses: float


# ── Club Analytics ────────────────────────────────────────────────────────────

class ClubSummaryEntry(BaseModel):
    club_id: int
    club_name: str
    total_events: int
    avg_attendance: float


class ClubsSummary(BaseModel):
    clubs: List[ClubSummaryEntry]


# ── User Engagement ───────────────────────────────────────────────────────────

class UserEngagementEntry(BaseModel):
    user_id: UUID
    full_name: str
    events_attended: int
    total_points: int


class UsersEngagement(BaseModel):
    top_users: List[UserEngagementEntry]


# ── Audit Log ─────────────────────────────────────────────────────────────────

class AuditLogEntry(BaseModel):
    log_id: int
    table_name: Optional[str]
    operation: Optional[str]
    record_id: Optional[str]
    old_data: Optional[dict]
    new_data: Optional[dict]
    changed_by: Optional[str]
    changed_at: datetime

    model_config = {"from_attributes": True}


class AuditLogPage(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[AuditLogEntry]
