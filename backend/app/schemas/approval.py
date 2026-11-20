"""Pydantic schemas for Event Approvals."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class ApprovalDecisionRequest(BaseModel):
    """Payload for submitting an approval or rejection decision."""
    comments: Optional[str] = Field(None, description="Decision notes or rejection justification")


class ApprovalItemResponse(BaseModel):
    """Serialized pending approval item."""
    approval_id: int
    event_id: int
    event_title: str
    club_id: int
    club_name: Optional[str] = None
    current_level: int
    required_level: int
    required_role: str
    start_time: datetime
    budget_allocated: Decimal
    created_by: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApprovalHistoryItem(BaseModel):
    """Historical decision entry for an event."""
    approval_id: int
    event_id: int
    approver_id: UUID
    approver_name: Optional[str] = None
    role_name: Optional[str] = None
    level: int
    status: str
    comments: Optional[str] = None
    decided_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApprovalActionResponse(BaseModel):
    """Result returned after processing an approval or rejection."""
    status: str
    approval_id: Optional[int] = None
    event_id: int
    level_processed: int
    decision: str
    event_status: str
    message: str
