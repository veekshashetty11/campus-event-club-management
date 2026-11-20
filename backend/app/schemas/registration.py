"""Pydantic schemas for Event Registrations and Waitlist."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class RegistrationRequest(BaseModel):
    """Payload for registering for an event."""
    dietary_preferences: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=500)


class RegistrationResponse(BaseModel):
    """Event registration details."""
    registration_id: int
    event_id: int
    user_id: UUID
    status: str
    registered_at: datetime
    ticket_code: UUID
    dietary_preferences: Optional[str] = None
    notes: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class WaitlistEntryResponse(BaseModel):
    """Waitlist queue entry details."""
    waitlist_id: int
    event_id: int
    user_id: UUID
    position: int
    status: str
    joined_at: datetime
    promoted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RegistrationActionResult(BaseModel):
    """Response returned upon registering or waitlisting for an event."""
    status: str
    type: str  # 'registered' or 'waitlisted'
    registration_id: Optional[int] = None
    waitlist_id: Optional[int] = None
    position: Optional[int] = None
    ticket_code: Optional[UUID] = None
    message: str


class UserRegistrationItem(BaseModel):
    """Summary of a user's registration across events."""
    registration_id: int
    event_id: int
    event_title: str
    event_status: str
    start_time: datetime
    end_time: datetime
    venue_name: Optional[str] = None
    status: str
    ticket_code: UUID
    registered_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedRegistrationsResponse(BaseModel):
    """Paginated list of attendee registrations."""
    items: List[RegistrationResponse]
    total: int
    page: int
    limit: int
    pages: int
