"""Equipment Booking API Router.

Endpoints:
- GET  /equipment                              — list available equipment
- GET  /equipment/bookings/my                  — list caller's equipment bookings
- GET  /equipment/{equipment_id}               — equipment details
- POST /equipment/{equipment_id}/book          — book equipment
- PATCH /equipment/bookings/{booking_id}/cancel — cancel booking (restores qty)
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.connection import get_db
from app.models.auth import User
from app.models.event import Equipment, EquipmentBooking
from app.schemas.venue import (
    EquipmentBookingRequest,
    EquipmentBookingResponse,
    EquipmentResponse,
)

router = APIRouter(prefix="/equipment", tags=["Equipment"])


def _build_equip_booking_response(booking: EquipmentBooking) -> EquipmentBookingResponse:
    return EquipmentBookingResponse(
        booking_id=booking.booking_id,
        equipment_id=booking.equipment_id,
        equipment_name=booking.equipment.name if booking.equipment else None,
        event_id=booking.event_id,
        booked_by=booking.booked_by,
        quantity=booking.quantity,
        start_time=booking.start_time,
        end_time=booking.end_time,
        status=booking.status,
        notes=booking.notes,
        created_at=booking.created_at,
    )


def _is_admin(user: User) -> bool:
    return bool(user.role and user.role.name in ("administrator", "student_affairs"))


# ── GET /equipment/bookings/my  (must come BEFORE /{equipment_id})

@router.get(
    "/bookings/my",
    response_model=List[EquipmentBookingResponse],
    summary="List My Equipment Bookings",
)
def list_my_equipment_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bookings = (
        db.query(EquipmentBooking)
        .filter(EquipmentBooking.booked_by == current_user.user_id)
        .order_by(EquipmentBooking.start_time.desc())
        .all()
    )
    return [_build_equip_booking_response(b) for b in bookings]


# ── GET /equipment

@router.get(
    "",
    response_model=List[EquipmentResponse],
    summary="List Available Equipment",
)
def list_equipment(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.query(Equipment)
        .filter(Equipment.is_active == True, Equipment.quantity_available > 0)  # noqa: E712
        .order_by(Equipment.name)
        .all()
    )
    return items


# ── GET /equipment/{equipment_id}

@router.get(
    "/{equipment_id}",
    response_model=EquipmentResponse,
    summary="Get Equipment Details",
)
def get_equipment(
    equipment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(Equipment).filter(Equipment.equipment_id == equipment_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Equipment {equipment_id} not found")
    return item


# ── POST /equipment/{equipment_id}/book

@router.post(
    "/{equipment_id}/book",
    response_model=EquipmentBookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Book Equipment",
)
def book_equipment(
    equipment_id: int,
    payload: EquipmentBookingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Lock the row for update to avoid race conditions on quantity_available
    item = (
        db.query(Equipment)
        .filter(Equipment.equipment_id == equipment_id, Equipment.is_active == True)  # noqa: E712
        .with_for_update()
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Equipment {equipment_id} not found or inactive")

    if payload.start_time < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_time cannot be in the past")

    if item.quantity_available < payload.quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Insufficient available quantity: requested {payload.quantity}, available {item.quantity_available}",
        )

    item.quantity_available -= payload.quantity

    booking = EquipmentBooking(
        equipment_id=equipment_id,
        event_id=payload.event_id,
        booked_by=current_user.user_id,
        quantity=payload.quantity,
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
    except Exception:
        db.rollback()
        raise

    return _build_equip_booking_response(booking)


# ── PATCH /equipment/bookings/{booking_id}/cancel

@router.patch(
    "/bookings/{booking_id}/cancel",
    response_model=EquipmentBookingResponse,
    summary="Cancel an Equipment Booking",
)
def cancel_equipment_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(EquipmentBooking).filter(EquipmentBooking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Booking {booking_id} not found")

    if booking.booked_by != current_user.user_id and not _is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorised to cancel this booking")

    if booking.status == "cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking is already cancelled")

    # Restore quantity with row-level lock
    item = (
        db.query(Equipment)
        .filter(Equipment.equipment_id == booking.equipment_id)
        .with_for_update()
        .first()
    )
    if item:
        item.quantity_available += booking.quantity

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

    return _build_equip_booking_response(booking)
