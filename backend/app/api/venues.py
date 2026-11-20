"""Venue Booking API Router.

Endpoints:
- GET  /venues                        — list active venues with filters
- GET  /venues/bookings/my            — list caller's venue bookings
- GET  /venues/{venue_id}             — venue details
- GET  /venues/{venue_id}/availability — check availability in a time range
- POST /venues/{venue_id}/book        — book a venue (requires events.create)
- PATCH /venues/bookings/{booking_id}/cancel — cancel a booking
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_permissions
from app.db.connection import get_db
from app.models.auth import User
from app.models.event import Venue, VenueBooking
from app.schemas.venue import (
    VenueAvailabilityResponse,
    VenueBookingRequest,
    VenueBookingResponse,
    VenueResponse,
)

router = APIRouter(prefix="/venues", tags=["Venues"])


def _build_booking_response(booking: VenueBooking) -> VenueBookingResponse:
    return VenueBookingResponse(
        booking_id=booking.booking_id,
        venue_id=booking.venue_id,
        venue_name=booking.venue.name if booking.venue else None,
        event_id=booking.event_id,
        booked_by=booking.booked_by,
        start_time=booking.start_time,
        end_time=booking.end_time,
        status=booking.status,
        notes=booking.notes,
        created_at=booking.created_at,
    )


def _is_admin(user: User) -> bool:
    return bool(user.role and user.role.name in ("administrator", "student_affairs"))


# ── GET /venues/bookings/my  (must come BEFORE /{venue_id} to avoid route clash)

@router.get(
    "/bookings/my",
    response_model=List[VenueBookingResponse],
    summary="List My Venue Bookings",
)
def list_my_venue_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bookings = (
        db.query(VenueBooking)
        .filter(VenueBooking.booked_by == current_user.user_id)
        .order_by(VenueBooking.start_time.desc())
        .all()
    )
    return [_build_booking_response(b) for b in bookings]


# ── GET /venues

@router.get(
    "",
    response_model=List[VenueResponse],
    summary="List Active Venues",
)
def list_venues(
    capacity_min: Optional[int] = Query(default=None, ge=1, description="Minimum seating capacity"),
    has_av_equipment: Optional[bool] = Query(default=None),
    has_wifi: Optional[bool] = Query(default=None),
    is_accessible: Optional[bool] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Venue).filter(Venue.is_active == True)  # noqa: E712
    if capacity_min is not None:
        query = query.filter(Venue.capacity >= capacity_min)
    if has_av_equipment is not None:
        query = query.filter(Venue.has_av_equipment == has_av_equipment)
    if has_wifi is not None:
        query = query.filter(Venue.has_wifi == has_wifi)
    if is_accessible is not None:
        query = query.filter(Venue.is_accessible == is_accessible)

    return query.order_by(Venue.name).all()


# ── GET /venues/{venue_id}

@router.get(
    "/{venue_id}",
    response_model=VenueResponse,
    summary="Get Venue Details",
)
def get_venue(
    venue_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    venue = db.query(Venue).filter(Venue.venue_id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Venue {venue_id} not found")
    return venue


# ── GET /venues/{venue_id}/availability

@router.get(
    "/{venue_id}/availability",
    response_model=VenueAvailabilityResponse,
    summary="Check Venue Availability",
)
def check_venue_availability(
    venue_id: int,
    start_time: datetime = Query(..., description="Range start (ISO 8601, timezone-aware)"),
    end_time: datetime = Query(..., description="Range end (ISO 8601, timezone-aware)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    venue = db.query(Venue).filter(Venue.venue_id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Venue {venue_id} not found")

    if end_time <= start_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_time must be after start_time")

    # Find confirmed bookings that overlap the queried range
    conflicts = (
        db.query(VenueBooking)
        .filter(
            VenueBooking.venue_id == venue_id,
            VenueBooking.status == "confirmed",
            VenueBooking.start_time < end_time,
            VenueBooking.end_time > start_time,
        )
        .all()
    )

    return VenueAvailabilityResponse(
        venue_id=venue_id,
        venue_name=venue.name,
        is_available=len(conflicts) == 0,
        conflicting_bookings=[_build_booking_response(b) for b in conflicts],
    )


# ── POST /venues/{venue_id}/book

@router.post(
    "/{venue_id}/book",
    response_model=VenueBookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Book a Venue",
)
def book_venue(
    venue_id: int,
    payload: VenueBookingRequest,
    current_user: User = Depends(require_permissions("events.create")),
    db: Session = Depends(get_db),
):
    venue = db.query(Venue).filter(Venue.venue_id == venue_id, Venue.is_active == True).first()  # noqa: E712
    if not venue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Venue {venue_id} not found or inactive")

    if payload.start_time < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_time cannot be in the past")

    booking = VenueBooking(
        venue_id=venue_id,
        event_id=payload.event_id,
        booked_by=current_user.user_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        status="confirmed",
        notes=payload.notes,
    )

    try:
        db.execute(
            text("SELECT set_config('app.current_user_id', :uid, true)"),
            {"uid": str(current_user.user_id)},
        )
        db.add(booking)
        db.commit()
        db.refresh(booking)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Venue is already booked for the requested time slot (time conflict detected)",
        )

    return _build_booking_response(booking)


# ── PATCH /venues/bookings/{booking_id}/cancel

@router.patch(
    "/bookings/{booking_id}/cancel",
    response_model=VenueBookingResponse,
    summary="Cancel a Venue Booking",
)
def cancel_venue_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(VenueBooking).filter(VenueBooking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Booking {booking_id} not found")

    # Only owner or admin may cancel
    if booking.booked_by != current_user.user_id and not _is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorised to cancel this booking")

    if booking.status == "cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking is already cancelled")

    booking.status = "cancelled"
    try:
        db.execute(
            text("SELECT set_config('app.current_user_id', :uid, true)"),
            {"uid": str(current_user.user_id)},
        )
        db.commit()
        db.refresh(booking)
    except Exception:
        db.rollback()
        raise

    return _build_booking_response(booking)
