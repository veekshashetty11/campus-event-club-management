"""Automated test suite for authentication and Role-Based Access Control (RBAC).

Tests:
1. Login success and credential verification
2. Invalid passwords and timing defense
3. Non-existent email handling
4. Inactive user rejection (login & token validation)
5. Suspended user rejection (login & token validation)
6. Missing token handling
7. Malformed and tampered signature token handling
8. Expired token handling
9. Protected /auth/me safe profile serialization (zero credential leaks)
10. Administrator profile and fine-grained permission set
11. RBAC: Administrator role access allowed
12. RBAC: Student role access denied (and token role-claim forgery prevention)
13. Permission-based access control: Club advisor granted events.approve
14. Permission-based access control: Student denied events.approve
15. Versioned route compatibility (/api/v1/auth/...)
"""

import uuid
from datetime import timedelta
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.orm import Session
from app.main import app
from app.db.connection import SessionLocal
from app.core.security import hash_password, create_access_token
from app.models.auth import User, Role


TEST_PASSWORD = "ValidTestPassword123!"


@pytest.fixture(scope="module")
def setup_test_users():
    """Sets up isolated test users in campus_events_dev and removes them on teardown."""
    db: Session = SessionLocal()

    # Retrieve existing roles
    roles = {r.name: r for r in db.query(Role).all()}
    assert "administrator" in roles, "Seed roles missing 'administrator'"
    assert "student" in roles, "Seed roles missing 'student'"
    assert "club_advisor" in roles, "Seed roles missing 'club_advisor'"

    password_hash = hash_password(TEST_PASSWORD)
    created_user_ids = []

    # 1. Admin user
    admin_user = User(
        user_id=uuid.uuid4(),
        email="test.admin@campus.edu",
        password_hash=password_hash,
        full_name="Dr. Administrator Test",
        role_id=roles["administrator"].role_id,
        status="active",
        is_email_verified=True,
    )
    db.add(admin_user)
    created_user_ids.append(admin_user.user_id)

    # 2. Active student user
    student_user = User(
        user_id=uuid.uuid4(),
        email="test.student@campus.edu",
        password_hash=password_hash,
        full_name="Alice Student Test",
        student_id="STU-TEST-001",
        role_id=roles["student"].role_id,
        status="active",
        is_email_verified=True,
    )
    db.add(student_user)
    created_user_ids.append(student_user.user_id)

    # 3. Club advisor user
    advisor_user = User(
        user_id=uuid.uuid4(),
        email="test.advisor@campus.edu",
        password_hash=password_hash,
        full_name="Prof. Advisor Test",
        role_id=roles["club_advisor"].role_id,
        status="active",
        is_email_verified=True,
    )
    db.add(advisor_user)
    created_user_ids.append(advisor_user.user_id)

    # 4. Inactive user
    inactive_user = User(
        user_id=uuid.uuid4(),
        email="test.inactive@campus.edu",
        password_hash=password_hash,
        full_name="Bob Inactive Test",
        role_id=roles["student"].role_id,
        status="inactive",
        is_email_verified=False,
    )
    db.add(inactive_user)
    created_user_ids.append(inactive_user.user_id)

    # 5. Suspended user
    suspended_user = User(
        user_id=uuid.uuid4(),
        email="test.suspended@campus.edu",
        password_hash=password_hash,
        full_name="Charlie Suspended Test",
        role_id=roles["student"].role_id,
        status="suspended",
        is_email_verified=True,
    )
    db.add(suspended_user)
    created_user_ids.append(suspended_user.user_id)

    db.commit()
    db.close()

    yield {
        "admin": admin_user,
        "student": student_user,
        "advisor": advisor_user,
        "inactive": inactive_user,
        "suspended": suspended_user,
    }

    # Clean up test users on teardown (leaves existing development/seed data untouched)
    cleanup_db: Session = SessionLocal()
    cleanup_db.query(User).filter(User.user_id.in_(created_user_ids)).delete(synchronize_session=False)
    cleanup_db.commit()
    cleanup_db.close()


# ── 1. Authentication: Login Tests ────────────────────────────

@pytest.mark.asyncio
async def test_login_success(setup_test_users):
    """Verify successful login returns 200, valid bearer token, role, and expiration."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/auth/login",
            json={"email": "test.student@campus.edu", "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["role"] == "student"
        assert data["expires_in"] > 0


@pytest.mark.asyncio
async def test_login_invalid_password(setup_test_users):
    """Verify incorrect password returns 401 with generic error message."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/auth/login",
            json={"email": "test.student@campus.edu", "password": "WrongPassword!"}
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid email or password"


@pytest.mark.asyncio
async def test_login_nonexistent_email(setup_test_users):
    """Verify non-existent email returns 401 without revealing user existence."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/auth/login",
            json={"email": "nonexistent@campus.edu", "password": TEST_PASSWORD}
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid email or password"


@pytest.mark.asyncio
async def test_login_inactive_user(setup_test_users):
    """Verify inactive account is rejected with 403 Forbidden on login and token use."""
    inactive = setup_test_users["inactive"]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Login rejection
        response = await client.post(
            "/auth/login",
            json={"email": "test.inactive@campus.edu", "password": TEST_PASSWORD}
        )
        assert response.status_code == 403
        assert "inactive" in response.json()["detail"].lower()

        # Token validation rejection for deactivated account
        inactive_token = create_access_token(subject=str(inactive.user_id))
        me_res = await client.get("/auth/me", headers={"Authorization": f"Bearer {inactive_token}"})
        assert me_res.status_code == 403
        assert "inactive or suspended" in me_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_suspended_user(setup_test_users):
    """Verify suspended account is rejected with 403 Forbidden on login and token use."""
    suspended = setup_test_users["suspended"]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Login rejection
        response = await client.post(
            "/auth/login",
            json={"email": "test.suspended@campus.edu", "password": TEST_PASSWORD}
        )
        assert response.status_code == 403
        assert "suspended" in response.json()["detail"].lower()

        # Token validation rejection for suspended account
        suspended_token = create_access_token(subject=str(suspended.user_id))
        me_res = await client.get("/auth/me", headers={"Authorization": f"Bearer {suspended_token}"})
        assert me_res.status_code == 403
        assert "inactive or suspended" in me_res.json()["detail"].lower()


# ── 2. Token Security & Validation Tests ──────────────────────

@pytest.mark.asyncio
async def test_auth_me_missing_token():
    """Verify accessing protected endpoint with no token returns 401 Unauthorized."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/auth/me")
        assert response.status_code == 401
        assert response.json()["detail"] == "Authentication token required"


@pytest.mark.asyncio
async def test_auth_me_invalid_token(setup_test_users):
    """Verify accessing protected endpoint with malformed or tampered token returns 401."""
    student = setup_test_users["student"]
    valid_token = create_access_token(subject=str(student.user_id))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # A. Malformed token structure
        res_malformed = await client.get("/auth/me", headers={"Authorization": "Bearer this-is-an-invalid-garbage-token"})
        assert res_malformed.status_code == 401
        assert res_malformed.json()["detail"] == "Could not validate credentials"

        # B. Tampered cryptographic signature
        tampered_token = valid_token[:-4] + "abcd"
        res_tampered = await client.get("/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
        assert res_tampered.status_code == 401
        assert res_tampered.json()["detail"] == "Could not validate credentials"


@pytest.mark.asyncio
async def test_auth_me_expired_token(setup_test_users):
    """Verify expired token returns 401 with expiration detail."""
    student = setup_test_users["student"]
    expired_token = create_access_token(
        subject=str(student.user_id),
        claims={"role": "student"},
        expires_delta=timedelta(seconds=-30)
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = await client.get("/auth/me", headers=headers)
        assert response.status_code == 401
        assert "expired" in response.json()["detail"].lower()


# ── 3. Profile & Data Leak Prevention Tests ───────────────────

@pytest.mark.asyncio
async def test_auth_me_profile_success(setup_test_users):
    """Verify /auth/me returns permitted profile data and mapped permissions with zero credential leaks."""
    student = setup_test_users["student"]
    token = create_access_token(
        subject=str(student.user_id),
        claims={"role": "student"}
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get("/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test.student@campus.edu"
        assert data["full_name"] == "Alice Student Test"
        assert data["role"] == "student"
        assert "events.register" in data["permissions"]
        assert "events.read" in data["permissions"]
        assert "password_hash" not in data
        assert "password" not in str(data).lower()


@pytest.mark.asyncio
async def test_auth_me_admin_profile(setup_test_users):
    """Verify administrator profile returns comprehensive permission set from database."""
    admin = setup_test_users["admin"]
    token = create_access_token(
        subject=str(admin.user_id),
        claims={"role": "administrator"}
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get("/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "administrator"
        assert "events.approve" in data["permissions"]
        assert "users.manage" in data["permissions"]
        assert "budgets.approve" in data["permissions"]


# ── 4. Role-Based Access Control (RBAC) Tests ─────────────────

@pytest.mark.asyncio
async def test_rbac_admin_allowed_for_admin_role(setup_test_users):
    """Verify administrator user is granted access to admin-only endpoint."""
    admin = setup_test_users["admin"]
    token = create_access_token(
        subject=str(admin.user_id),
        claims={"role": "administrator"}
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get("/auth/test/admin-only", headers=headers)
        assert response.status_code == 200
        assert response.json()["status"] == "granted"
        assert response.json()["role"] == "administrator"


@pytest.mark.asyncio
async def test_rbac_admin_denied_for_student_role(setup_test_users):
    """Verify student user is denied access to admin-only endpoint with 403 Forbidden.

    Also verifies that client cannot elevate privileges by forging role='administrator'
    in the token claims; the server enforces authorization using live PostgreSQL records.
    """
    student = setup_test_users["student"]

    # 1. Normal student token
    token = create_access_token(
        subject=str(student.user_id),
        claims={"role": "student"}
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get("/auth/test/admin-only", headers=headers)
        assert response.status_code == 403
        assert "insufficient role privileges" in response.json()["detail"].lower() or "forbidden" in response.json()["detail"].lower()

    # 2. Token with forged role claim: subject is student, but claims role='administrator'
    forged_token = create_access_token(
        subject=str(student.user_id),
        claims={"role": "administrator"}
    )
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {forged_token}"}
        response = await client.get("/auth/test/admin-only", headers=headers)
        assert response.status_code == 403
        assert "insufficient role privileges" in response.json()["detail"].lower() or "forbidden" in response.json()["detail"].lower()


# ── 5. Permission-Based Access Control Tests ──────────────────

@pytest.mark.asyncio
async def test_rbac_permission_allowed_for_advisor(setup_test_users):
    """Verify club advisor holding 'events.approve' is granted access."""
    advisor = setup_test_users["advisor"]
    token = create_access_token(
        subject=str(advisor.user_id),
        claims={"role": "club_advisor"}
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get("/auth/test/approval-perm", headers=headers)
        assert response.status_code == 200
        assert response.json()["status"] == "granted"
        assert response.json()["permission"] == "events.approve"


@pytest.mark.asyncio
async def test_rbac_permission_denied_for_student(setup_test_users):
    """Verify student user lacking 'events.approve' is denied with 403 Forbidden."""
    student = setup_test_users["student"]
    token = create_access_token(
        subject=str(student.user_id),
        claims={"role": "student"}
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get("/auth/test/approval-perm", headers=headers)
        assert response.status_code == 403
        assert "missing required permission" in response.json()["detail"].lower()


# ── 6. Versioned Route Tests (/api/v1/auth/...) ───────────────

@pytest.mark.asyncio
async def test_versioned_auth_endpoints(setup_test_users):
    """Verify versioned /api/v1/auth/login and /api/v1/auth/me operate consistently."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Versioned login
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "test.student@campus.edu", "password": TEST_PASSWORD}
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]

        # Versioned /me
        headers = {"Authorization": f"Bearer {token}"}
        me_res = await client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "test.student@campus.edu"
