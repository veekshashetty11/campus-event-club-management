"""Pydantic schemas package."""

from app.schemas.auth import LoginRequest, TokenResponse, UserProfileResponse
from app.schemas.event import (
    EventCreateRequest,
    EventUpdateRequest,
    EventResponse,
    PaginatedEventsResponse,
    EventSubmitResponse,
)
from app.schemas.approval import (
    ApprovalDecisionRequest,
    ApprovalItemResponse,
    ApprovalHistoryItem,
    ApprovalActionResponse,
)
from app.schemas.registration import (
    RegistrationRequest,
    RegistrationResponse,
    WaitlistEntryResponse,
    RegistrationActionResult,
    UserRegistrationItem,
    PaginatedRegistrationsResponse,
)

__all__ = [
    "LoginRequest",
    "TokenResponse",
    "UserProfileResponse",
    "EventCreateRequest",
    "EventUpdateRequest",
    "EventResponse",
    "PaginatedEventsResponse",
    "EventSubmitResponse",
    "ApprovalDecisionRequest",
    "ApprovalItemResponse",
    "ApprovalHistoryItem",
    "ApprovalActionResponse",
    "RegistrationRequest",
    "RegistrationResponse",
    "WaitlistEntryResponse",
    "RegistrationActionResult",
    "UserRegistrationItem",
    "PaginatedRegistrationsResponse",
]
