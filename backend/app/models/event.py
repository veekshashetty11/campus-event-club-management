"""SQLAlchemy ORM models for events, clubs, venues, and categories.

Maps directly to existing PostgreSQL tables without modifying schema:
- clubs
- club_members
- venues
- event_categories
- event_series
- events
- event_approvals
"""

import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import (
    Column, Integer, SmallInteger, String, Text, Boolean, Date, DateTime, Numeric,
    ForeignKey, func, text
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, TSVECTOR
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.db.base import Base
from app.models.auth import User, Role


class Club(Base):
    __tablename__ = "clubs"

    club_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    department_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    short_name: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    founded_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    president_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )
    faculty_advisor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )
    contact_email: Mapped[Optional[str]] = mapped_column(String(254), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    max_members: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    president: Mapped[Optional[User]] = relationship("User", foreign_keys=[president_id])
    faculty_advisor: Mapped[Optional[User]] = relationship("User", foreign_keys=[faculty_advisor_id])
    members: Mapped[List["ClubMember"]] = relationship("ClubMember", back_populates="club")
    events: Mapped[List["Event"]] = relationship("Event", back_populates="club")


class ClubMember(Base):
    __tablename__ = "club_members"

    membership_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    club_id: Mapped[int] = mapped_column(Integer, ForeignKey("clubs.club_id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    member_role: Mapped[str] = mapped_column(String(30), default="member", nullable=False)
    joined_at: Mapped[date] = mapped_column(Date, server_default=func.current_date(), nullable=False)
    left_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    club: Mapped[Club] = relationship("Club", back_populates="members")
    user: Mapped[User] = relationship("User", foreign_keys=[user_id])


class Venue(Base):
    __tablename__ = "venues"

    venue_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    building: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    floor: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    room_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    has_av_equipment: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_wifi: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_accessible: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    amenities: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    hourly_rate: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=Decimal("0.00"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    events: Mapped[List["Event"]] = relationship("Event", back_populates="venue")


class EventCategory(Base):
    __tablename__ = "event_categories"

    category_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color_hex: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    events: Mapped[List["Event"]] = relationship("Event", back_populates="category")


class EventSeries(Base):
    __tablename__ = "event_series"

    series_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    club_id: Mapped[int] = mapped_column(Integer, ForeignKey("clubs.club_id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recurrence_rule: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Event(Base):
    __tablename__ = "events"

    event_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    club_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("clubs.club_id", ondelete="RESTRICT"), nullable=False
    )
    category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("event_categories.category_id", ondelete="SET NULL"), nullable=True
    )
    series_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("event_series.series_id", ondelete="SET NULL"), nullable=True
    )
    venue_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("venues.venue_id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    banner_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    registration_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    max_capacity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    registered_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    waitlist_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="draft", nullable=False)
    budget_allocated: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)
    search_vector = mapped_column(TSVECTOR, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    points_on_time: Mapped[Optional[int]] = mapped_column(Integer, default=10, nullable=True)
    points_late: Mapped[Optional[int]] = mapped_column(Integer, default=5, nullable=True)
    current_approval_level: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)

    club: Mapped[Club] = relationship("Club", back_populates="events", lazy="joined")
    creator: Mapped[User] = relationship("User", foreign_keys=[created_by], lazy="joined")
    category: Mapped[Optional[EventCategory]] = relationship("EventCategory", back_populates="events", lazy="joined")
    venue: Mapped[Optional[Venue]] = relationship("Venue", back_populates="events", lazy="joined")
    approvals: Mapped[List["EventApproval"]] = relationship("EventApproval", back_populates="event")


class EventApproval(Base):
    __tablename__ = "event_approvals"

    approval_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("events.event_id", ondelete="CASCADE"), nullable=False
    )
    approver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False
    )
    role_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("roles.role_id", ondelete="SET NULL"), nullable=True
    )
    level: Mapped[int] = mapped_column(SmallInteger, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    event: Mapped[Event] = relationship("Event", back_populates="approvals")
    approver: Mapped[User] = relationship("User", foreign_keys=[approver_id])
    role: Mapped[Optional[Role]] = relationship("Role", foreign_keys=[role_id])


class EventRegistration(Base):
    __tablename__ = "event_registrations"

    registration_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("events.event_id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="registered", nullable=False)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    checked_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ticket_code: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), default=uuid.uuid4, server_default=text("gen_random_uuid()"), unique=True, nullable=False
    )
    dietary_preferences: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    event: Mapped[Event] = relationship("Event")
    user: Mapped[User] = relationship("User")


class EventWaitlist(Base):
    __tablename__ = "event_waitlist"

    waitlist_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("events.event_id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="waiting", nullable=False)
    promoted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    event: Mapped[Event] = relationship("Event")
    user: Mapped[User] = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"

    notification_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(30), default="info", nullable=False)
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped[User] = relationship("User")

