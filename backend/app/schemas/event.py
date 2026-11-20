"""Pydantic schemas for Event Management.

Defines request/response models with validation rules matching the database constraints.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict


class EventCreateRequest(BaseModel):
    """Payload for creating a new event in draft status."""
    club_id: int = Field(..., gt=0, description="ID of the sponsoring club")
    category_id: Optional[int] = Field(None, gt=0, description="Optional event category ID")
    series_id: Optional[int] = Field(None, gt=0, description="Optional recurring event series ID")
    venue_id: Optional[int] = Field(None, gt=0, description="Optional physical venue ID")
    title: str = Field(..., min_length=3, max_length=250, description="Event title")
    description: Optional[str] = Field(None, description="Detailed markdown/text description")
    banner_url: Optional[str] = Field(None, description="Image URL for event banner")
    start_time: datetime = Field(..., description="Event start timestamp with timezone")
    end_time: datetime = Field(..., description="Event end timestamp with timezone")
    registration_deadline: Optional[datetime] = Field(None, description="Optional deadline for attendee registration")
    max_capacity: Optional[int] = Field(None, gt=0, description="Maximum attendee capacity (NULL for unlimited)")
    is_public: bool = Field(default=True, description="Publicly visible on the campus calendar")
    requires_approval: bool = Field(default=False, description="Flag indicating if workflow approval is required")
    budget_allocated: Decimal = Field(default=Decimal("0.00"), ge=0, description="Allocated budget amount")
    tags: Optional[List[str]] = Field(None, description="Array of topical tags")
    points_on_time: Optional[int] = Field(default=10, ge=0, description="Points awarded for on-time check-in")
    points_late: Optional[int] = Field(default=5, ge=0, description="Points awarded for late check-in")

    @field_validator("title")
    @classmethod
    def strip_title(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 3:
            raise ValueError("Title must be at least 3 characters after trimming whitespace.")
        return cleaned

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        cleaned = [tag.strip() for tag in v if tag and tag.strip()]
        return cleaned if cleaned else None

    @model_validator(mode="after")
    def validate_event_times(self) -> "EventCreateRequest":
        if self.end_time <= self.start_time:
            raise ValueError("Event end_time must be strictly after start_time.")
        if self.registration_deadline is not None and self.registration_deadline > self.start_time:
            raise ValueError("registration_deadline must be earlier than or equal to start_time.")
        return self


class EventUpdateRequest(BaseModel):
    """Payload for partial updates to an event.

    Users cannot directly update status to approved or pending_approval,
    registered_count, or current_approval_level.
    """
    category_id: Optional[int] = Field(None, gt=0)
    series_id: Optional[int] = Field(None, gt=0)
    venue_id: Optional[int] = Field(None, gt=0)
    title: Optional[str] = Field(None, min_length=3, max_length=250)
    description: Optional[str] = None
    banner_url: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    registration_deadline: Optional[datetime] = None
    max_capacity: Optional[int] = Field(None, gt=0)
    is_public: Optional[bool] = None
    requires_approval: Optional[bool] = None
    budget_allocated: Optional[Decimal] = Field(None, ge=0)
    tags: Optional[List[str]] = None
    points_on_time: Optional[int] = Field(None, ge=0)
    points_late: Optional[int] = Field(None, ge=0)

    @field_validator("title")
    @classmethod
    def strip_title(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if len(cleaned) < 3:
            raise ValueError("Title must be at least 3 characters after trimming whitespace.")
        return cleaned

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        cleaned = [tag.strip() for tag in v if tag and tag.strip()]
        return cleaned if cleaned else None

    @model_validator(mode="after")
    def validate_times_if_both_present(self) -> "EventUpdateRequest":
        if self.start_time is not None and self.end_time is not None:
            if self.end_time <= self.start_time:
                raise ValueError("Event end_time must be strictly after start_time.")
        if self.start_time is not None and self.registration_deadline is not None:
            if self.registration_deadline > self.start_time:
                raise ValueError("registration_deadline must be earlier than or equal to start_time.")
        return self


class EventResponse(BaseModel):
    """Serialized event representation."""
    event_id: int
    club_id: int
    category_id: Optional[int] = None
    series_id: Optional[int] = None
    venue_id: Optional[int] = None
    created_by: UUID
    title: str
    description: Optional[str] = None
    banner_url: Optional[str] = None
    start_time: datetime
    end_time: datetime
    registration_deadline: Optional[datetime] = None
    max_capacity: Optional[int] = None
    registered_count: int
    waitlist_count: int
    is_public: bool
    requires_approval: bool
    status: str
    budget_allocated: Decimal
    tags: Optional[List[str]] = None
    points_on_time: Optional[int] = 10
    points_late: Optional[int] = 5
    current_approval_level: int
    created_at: datetime
    updated_at: datetime

    # Denormalized/joined helper fields for client convenience
    club_name: Optional[str] = None
    category_name: Optional[str] = None
    venue_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedEventsResponse(BaseModel):
    """Paginated list of events."""
    items: List[EventResponse]
    total: int
    page: int
    limit: int
    pages: int


class EventSubmitResponse(BaseModel):
    """Response returned upon successfully submitting an event for approval."""
    event_id: int
    status: str
    requires_approval: bool
    current_approval_level: int
    message: str
