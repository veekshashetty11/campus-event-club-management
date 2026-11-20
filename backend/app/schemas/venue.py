"""Pydantic schemas for Venue and Equipment booking endpoints."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


# ── Venue Schemas ─────────────────────────────────────────────


class VenueResponse(BaseModel):
    venue_id: int
    name: str
    building: Optional[str] = None
    floor: Optional[str] = None
    room_number: Optional[str] = None
    capacity: int
    has_av_equipment: bool
    has_wifi: bool
    is_accessible: bool
    amenities: Optional[List[str]] = None
    photo_url: Optional[str] = None
    hourly_rate: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VenueBookingRequest(BaseModel):
    event_id: Optional[int] = Field(default=None, ge=1, description="Associated event ID")
    start_time: datetime = Field(..., description="Booking start (timezone-aware)")
    end_time: datetime = Field(..., description="Booking end (timezone-aware)")
    notes: Optional[str] = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_times(self) -> "VenueBookingRequest":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class VenueBookingResponse(BaseModel):
    booking_id: int
    venue_id: int
    venue_name: Optional[str] = None
    event_id: Optional[int] = None
    booked_by: UUID
    start_time: datetime
    end_time: datetime
    status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class VenueAvailabilityResponse(BaseModel):
    venue_id: int
    venue_name: str
    is_available: bool
    conflicting_bookings: List[VenueBookingResponse]


# ── Equipment Schemas ─────────────────────────────────────────


class EquipmentResponse(BaseModel):
    equipment_id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    quantity_total: int
    quantity_available: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class EquipmentBookingRequest(BaseModel):
    event_id: Optional[int] = Field(default=None, ge=1)
    quantity: int = Field(default=1, ge=1, description="Number of units to book")
    start_time: datetime = Field(..., description="Booking start (timezone-aware)")
    end_time: datetime = Field(..., description="Booking end (timezone-aware)")
    notes: Optional[str] = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_times(self) -> "EquipmentBookingRequest":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class EquipmentBookingResponse(BaseModel):
    booking_id: int
    equipment_id: int
    equipment_name: Optional[str] = None
    event_id: Optional[int] = None
    booked_by: UUID
    quantity: int
    start_time: datetime
    end_time: datetime
    status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
