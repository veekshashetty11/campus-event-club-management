"""Authentication and RBAC API endpoints.

Handles user login with bcrypt credential verification, JWT issuance,
and the /auth/me profile endpoint.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.db.connection import get_db
from app.core.config import settings
from app.core.security import verify_password, create_access_token
from app.models.auth import User, Role
from app.schemas.auth import LoginRequest, TokenResponse, UserProfileResponse
from app.api.deps import get_current_user, require_roles, require_permissions

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User Login",
    description="Validates email and password, updates last login timestamp, and issues a JWT access token."
)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
) -> TokenResponse:
    """Validates user credentials and issues a signed JWT access token."""
    # Look up user by normalized email with eager-loaded role
    user = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.email == credentials.email)
        .first()
    )

    # Safe credential check (constant-time behavior)
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Account status verification
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive or suspended",
        )

    # Update last login timestamp
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    # Generate JWT access token with user identification and role claim
    role_name = user.role.name if user.role else "student"
    token = create_access_token(
        subject=str(user.user_id),
        claims={
            "email": user.email,
            "role": role_name
        }
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        role=role_name
    )


@router.get(
    "/me",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Current Authenticated User Profile",
    description="Returns profile and assigned permissions for the currently authenticated user. Never exposes password hash."
)
def get_me(
    current_user: User = Depends(get_current_user)
) -> UserProfileResponse:
    """Returns profile and permission set for the token holder."""
    perms = []
    if current_user.role and current_user.role.permissions:
        perms = [p.code for p in current_user.role.permissions]

    return UserProfileResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.name if current_user.role else "none",
        permissions=sorted(perms),
        department_id=current_user.department_id,
        student_id=current_user.student_id,
        phone=current_user.phone,
        profile_photo_url=current_user.profile_photo_url,
        status=current_user.status,
        is_email_verified=current_user.is_email_verified,
        points=current_user.points,
        last_login_at=current_user.last_login_at,
        created_at=current_user.created_at,
    )


# ── RBAC Verification Test Endpoints ─────────────────────────

@router.get(
    "/test/admin-only",
    status_code=status.HTTP_200_OK,
    summary="RBAC Test: Administrator Role Required",
    description="Accessible only to users with the 'administrator' role."
)
def test_admin_only_endpoint(
    current_user: User = Depends(require_roles("administrator"))
):
    return {
        "status": "granted",
        "role": current_user.role.name,
        "user_id": str(current_user.user_id)
    }


@router.get(
    "/test/approval-perm",
    status_code=status.HTTP_200_OK,
    summary="RBAC Test: 'events.approve' Permission Required",
    description="Accessible only to users with the 'events.approve' permission."
)
def test_approval_permission_endpoint(
    current_user: User = Depends(require_permissions("events.approve"))
):
    return {
        "status": "granted",
        "permission": "events.approve",
        "user_id": str(current_user.user_id)
    }
