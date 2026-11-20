"""Pydantic schemas for Budgets, Expenses, Sponsors, and Notifications."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


# ── Club Budget Schemas ───────────────────────────────────────────────────────

class ClubBudgetCreate(BaseModel):
    event_id: Optional[int] = Field(None, gt=0, description="Optional linked event ID")
    fiscal_year: int = Field(..., ge=2000, le=2100, description="Fiscal year (e.g. 2025)")
    allocated_amount: Decimal = Field(..., ge=0, description="Total allocated budget amount")

    model_config = ConfigDict(from_attributes=True)


class ClubBudgetResponse(BaseModel):
    budget_id: int
    club_id: int
    event_id: Optional[int]
    fiscal_year: int
    allocated_amount: Decimal
    spent_amount: Decimal
    remaining_amount: Decimal
    approved_by: Optional[UUID]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClubBudgetSummary(BaseModel):
    club_id: int
    total_allocated: Decimal
    total_spent: Decimal
    total_remaining: Decimal
    budget_count: int


# ── Expense Schemas ───────────────────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    event_id: Optional[int] = Field(None, gt=0, description="Optional event this expense is for")
    category: str = Field(..., min_length=1, max_length=100, description="Expense category")
    description: str = Field(..., min_length=1, description="Expense description")
    amount: Decimal = Field(..., gt=0, description="Expense amount")
    receipt_url: Optional[str] = Field(None, description="URL to uploaded receipt")

    model_config = ConfigDict(from_attributes=True)


class ExpenseRejectRequest(BaseModel):
    reason: str = Field(..., min_length=1, description="Reason for rejection")


class ExpenseResponse(BaseModel):
    expense_id: int
    club_id: int
    event_id: Optional[int]
    submitted_by: UUID
    category: str
    description: str
    amount: Decimal
    receipt_url: Optional[str]
    status: str
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Sponsor Schemas ───────────────────────────────────────────────────────────

class SponsorResponse(BaseModel):
    sponsor_id: int
    name: str
    contact_email: Optional[str]
    contact_phone: Optional[str]
    website: Optional[str]
    logo_url: Optional[str]
    description: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EventSponsorCreate(BaseModel):
    sponsor_id: int = Field(..., gt=0, description="ID of the sponsor to attach")
    sponsorship_amount: Optional[Decimal] = Field(None, ge=0, description="Sponsorship amount")
    sponsorship_type: Optional[str] = Field(None, max_length=80, description="Type of sponsorship")
    notes: Optional[str] = Field(None, description="Additional notes")

    model_config = ConfigDict(from_attributes=True)


class EventSponsorResponse(BaseModel):
    event_sponsor_id: int
    event_id: int
    sponsor_id: int
    sponsorship_amount: Optional[Decimal]
    sponsorship_type: Optional[str]
    notes: Optional[str]
    created_at: datetime
    sponsor: Optional[SponsorResponse] = None

    model_config = ConfigDict(from_attributes=True)


# ── Notification Schemas ──────────────────────────────────────────────────────

class NotificationResponse(BaseModel):
    notification_id: int
    user_id: UUID
    title: str
    body: str
    type: str
    reference_type: Optional[str]
    reference_id: Optional[str]
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedNotificationsResponse(BaseModel):
    items: List[NotificationResponse]
    total: int
    page: int
    limit: int
    pages: int


class UnreadCountResponse(BaseModel):
    unread_count: int
