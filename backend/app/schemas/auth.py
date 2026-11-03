"""Authentication and RBAC Pydantic schemas.

Validates login credentials, serializes tokens, and serializes user profile
information safely without ever exposing password hashes.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, ConfigDict


class LoginRequest(BaseModel):
    """Schema for user credential validation on login."""
    email: str = Field(..., description="Registered campus email address", min_length=3, max_length=254)
    password: str = Field(..., description="Plaintext password", min_length=1)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class TokenResponse(BaseModel):
    """Schema for successful authentication response."""
    access_token: str = Field(..., description="JWT bearer token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Seconds until expiration")
    role: str = Field(..., description="Assigned role name")


class UserProfileResponse(BaseModel):
    """Schema for permitted user profile data returned by /auth/me.

    Explicitly excludes password_hash and internal security secrets.
    """
    user_id: UUID
    email: str
    full_name: str
    role: str
    permissions: List[str]
    department_id: Optional[int] = None
    student_id: Optional[str] = None
    phone: Optional[str] = None
    profile_photo_url: Optional[str] = None
    status: str
    is_email_verified: bool
    points: int
    last_login_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
