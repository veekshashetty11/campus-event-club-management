"""Pydantic schemas for Attendance, Feedback, and Certificate endpoints."""

from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


# ── Attendance ────────────────────────────────────────────────────────────────

class CheckInRequest(BaseModel):
    ticket_code: Optional[UUID] = None
    user_id: Optional[UUID] = None
    check_in_method: Optional[str] = Field(default="manual", max_length=30)

    @field_validator("ticket_code", "user_id", mode="before")
    @classmethod
    def at_least_one(cls, v):
        return v


class AttendanceRecord(BaseModel):
    attendance_id: int
    event_id: int
    user_id: UUID
    checked_in_at: datetime
    check_in_method: Optional[str]
    points_awarded: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    model_config = {"from_attributes": True}


class AttendanceStats(BaseModel):
    event_id: int
    total_registered: int
    checked_in: int
    absent: int


# ── Feedback ──────────────────────────────────────────────────────────────────

class FeedbackSubmitRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    is_anonymous: bool = False


class FeedbackRecord(BaseModel):
    feedback_id: int
    event_id: int
    user_id: Optional[UUID]  # None when anonymous
    rating: int
    comment: Optional[str]
    is_anonymous: bool
    created_at: datetime
    user_name: Optional[str] = None

    model_config = {"from_attributes": True}


class FeedbackSummary(BaseModel):
    event_id: int
    total_count: int
    average_rating: Optional[float]
    rating_distribution: Dict[int, int]  # {1: n, 2: n, ...}


# ── Certificates ──────────────────────────────────────────────────────────────

class CertificateRecord(BaseModel):
    certificate_id: int
    event_id: int
    user_id: UUID
    certificate_url: Optional[str]
    verification_hash: Optional[str]
    issued_at: datetime
    is_valid: bool
    event_title: Optional[str] = None
    user_name: Optional[str] = None

    model_config = {"from_attributes": True}


class CertificateVerifyResponse(BaseModel):
    certificate_id: int
    is_valid: bool
    event_id: int
    event_title: Optional[str]
    issued_at: datetime
    verification_hash: Optional[str]


class CertificateGenerateResult(BaseModel):
    generated: int
    skipped: int
    certificates: List[CertificateRecord]
