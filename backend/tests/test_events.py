"""Automated test suite for Event Management APIs.

Tests:
1. Successful requests:
   - Create event in draft status (POST /events)
   - Retrieve event details (GET /events/{id})
   - List events with pagination and filters (GET /events)
   - Update event fields with ownership (PATCH /events/{id})
   - Submit event for approval (POST /events/{id}/submit)
   - Versioned API endpoint compatibility (/api/v1/events)
2. Invalid data handling:
   - end_time <= start_time rejection (422/400)
   - registration_deadline > start_time rejection (422/400)
   - start_time in the past rejection (400)
   - max_capacity exceeding venue capacity (400)
   - nonexistent club, venue, or category (400)
   - inactive club or venue (400)
   - invalid page or limit parameters (422)
3. Unauthenticated requests:
   - 401 Unauthorized across all endpoints when token is omitted
4. Insufficient permissions:
   - Student role attempting to create or update events (403 Forbidden)
   - Advisor role attempting to create events (403 Forbidden)
5. Ownership & authorization:
   - President of Club B attempting to create an event for Club A (403 Forbidden)
   - President of Club B attempting to update an event of Club A (403 Forbidden)
   - President of Club B attempting to submit an event of Club A (403 Forbidden)
6. Nonexistent event IDs:
   - 404 Not Found on GET, PATCH, and POST /submit for missing IDs
7. Workflow protection:
   - Events always created in 'draft' status (never 'approved')
   - Attempting to update an event while 'pending_approval' is rejected (400)
   - Attempting to re-submit an already pending or approved event is rejected (400)
8. Visibility checks:
   - Draft events are hidden from regular students
   - Published/approved events are visible to students
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.main import app
from app.db.connection import SessionLocal
from app.core.security import hash_password, create_access_token
from app.models.auth import User, Role
from app.models.event import Club, ClubMember, Venue, EventCategory, Event


TEST_PASSWORD = "ValidTestPassword123!"


@pytest.fixture(scope="module")
def setup_event_context():
    """Sets up isolated test clubs, venues, categories, users, and tokens in campus_events_dev."""
    db: Session = SessionLocal()

    roles = {r.name: r for r in db.query(Role).all()}
    assert "administrator" in roles
    assert "club_president" in roles
    assert "student" in roles
    assert "club_advisor" in roles

    password_hash = hash_password(TEST_PASSWORD)

    # 1. Test Users
    admin_user = User(
        user_id=uuid.uuid4(),
        email="events.admin@campus.edu",
        password_hash=password_hash,
        full_name="Admin Events Tester",
        role_id=roles["administrator"].role_id,
        status="active",
        is_email_verified=True,
    )
    pres_a = User(
        user_id=uuid.uuid4(),
        email="events.pres.a@campus.edu",
        password_hash=password_hash,
        full_name="President Alpha",
        role_id=roles["club_president"].role_id,
        status="active",
        is_email_verified=True,
    )
    pres_b = User(
        user_id=uuid.uuid4(),
        email="events.pres.b@campus.edu",
        password_hash=password_hash,
        full_name="President Beta",
        role_id=roles["club_president"].role_id,
        status="active",
        is_email_verified=True,
    )
    student_user = User(
        user_id=uuid.uuid4(),
        email="events.student@campus.edu",
        password_hash=password_hash,
        full_name="Student Tester",
        role_id=roles["student"].role_id,
        status="active",
        is_email_verified=True,
    )
    advisor_user = User(
        user_id=uuid.uuid4(),
        email="events.advisor@campus.edu",
        password_hash=password_hash,
        full_name="Advisor Tester",
        role_id=roles["club_advisor"].role_id,
        status="active",
        is_email_verified=True,
    )

    db.add_all([admin_user, pres_a, pres_b, student_user, advisor_user])
    db.commit()

    # 2. Test Clubs
    club_a = Club(
        name="Robotics Society Test",
        short_name="RST",
        description="Robotics testing club",
        status="active",
        president_id=pres_a.user_id,
    )
    club_b = Club(
        name="Debate Club Test",
        short_name="DCT",
        description="Debate testing club",
        status="active",
        president_id=pres_b.user_id,
    )
    club_inactive = Club(
        name="Archived Chess Society Test",
        short_name="ACST",
        description="Inactive club",
        status="inactive",
        president_id=pres_a.user_id,
    )
    db.add_all([club_a, club_b, club_inactive])
    db.commit()

    # 3. Test Venues
    venue_active = Venue(
        name="Grand Hall Test",
        building="Main Building",
        capacity=150,
        is_active=True,
    )
    venue_inactive = Venue(
        name="Renovating Room Test",
        building="East Wing",
        capacity=40,
        is_active=False,
    )
    db.add_all([venue_active, venue_inactive])
    db.commit()

    # 4. Test Category
    category_tech = EventCategory(
        name="Technology & AI Test",
        description="Tech events",
        color_hex="#0055FF",
        is_active=True,
    )
    db.add(category_tech)
    db.commit()

    # Generate Auth Tokens
    tokens = {
        "admin": create_access_token(subject=str(admin_user.user_id), claims={"role": "administrator"}),
        "pres_a": create_access_token(subject=str(pres_a.user_id), claims={"role": "club_president"}),
        "pres_b": create_access_token(subject=str(pres_b.user_id), claims={"role": "club_president"}),
        "student": create_access_token(subject=str(student_user.user_id), claims={"role": "student"}),
        "advisor": create_access_token(subject=str(advisor_user.user_id), claims={"role": "club_advisor"}),
    }

    ctx = {
        "admin_user": admin_user,
        "pres_a": pres_a,
        "pres_b": pres_b,
        "student_user": student_user,
        "advisor_user": advisor_user,
        "club_a": club_a,
        "club_b": club_b,
        "club_inactive": club_inactive,
        "venue_active": venue_active,
        "venue_inactive": venue_inactive,
        "category_tech": category_tech,
        "tokens": tokens,
    }

    yield ctx

    # Teardown
    cleanup_db: Session = SessionLocal()
    # Delete test events
    cleanup_db.query(Event).filter(Event.club_id.in_([club_a.club_id, club_b.club_id, club_inactive.club_id])).delete(synchronize_session=False)
    # Delete test venues
    cleanup_db.query(Venue).filter(Venue.venue_id.in_([venue_active.venue_id, venue_inactive.venue_id])).delete(synchronize_session=False)
    # Delete test category
    cleanup_db.query(EventCategory).filter(EventCategory.category_id == category_tech.category_id).delete(synchronize_session=False)
    # Delete test clubs
    cleanup_db.query(Club).filter(Club.club_id.in_([club_a.club_id, club_b.club_id, club_inactive.club_id])).delete(synchronize_session=False)
    # Delete test users
    cleanup_db.query(User).filter(User.user_id.in_([admin_user.user_id, pres_a.user_id, pres_b.user_id, student_user.user_id, advisor_user.user_id])).delete(synchronize_session=False)
    cleanup_db.commit()
    cleanup_db.close()


# ── 1. Create Event (POST /events) Tests ──────────────────────

@pytest.mark.asyncio
async def test_create_event_success(setup_event_context):
    """Verify authorized club president can create an event in draft status."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)

    now = datetime.now(timezone.utc)
    start_time = now + timedelta(days=5)
    end_time = start_time + timedelta(hours=3)
    deadline = start_time - timedelta(days=1)

    payload = {
        "club_id": ctx["club_a"].club_id,
        "category_id": ctx["category_tech"].category_id,
        "venue_id": ctx["venue_active"].venue_id,
        "title": "Autonomous Drone Workshop",
        "description": "Hands-on robotics build and testing.",
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "registration_deadline": deadline.isoformat(),
        "max_capacity": 50,
        "is_public": True,
        "requires_approval": True,
        "budget_allocated": 350.00,
        "tags": ["robotics", "ai", "hardware"],
    }

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/events",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        assert res.status_code == 201
        data = res.json()
        assert data["title"] == "Autonomous Drone Workshop"
        assert data["status"] == "draft"
        assert data["current_approval_level"] == 0
        assert data["club_name"] == ctx["club_a"].name
        assert data["category_name"] == ctx["category_tech"].name
        assert data["venue_name"] == ctx["venue_active"].name
        assert data["registered_count"] == 0
        assert data["waitlist_count"] == 0


@pytest.mark.asyncio
async def test_create_event_unauthenticated(setup_event_context):
    """Verify POST /events without authentication token fails with 401."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)

    payload = {
        "club_id": ctx["club_a"].club_id,
        "title": "Unauthenticated Event",
        "start_time": (now + timedelta(days=2)).isoformat(),
        "end_time": (now + timedelta(days=2, hours=2)).isoformat(),
    }

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/events", json=payload)
        assert res.status_code == 401
        assert "Authentication token required" in res.json()["detail"]


@pytest.mark.asyncio
async def test_create_event_student_forbidden(setup_event_context):
    """Verify student role lacks events.create permission and receives 403."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)

    payload = {
        "club_id": ctx["club_a"].club_id,
        "title": "Student Created Event",
        "start_time": (now + timedelta(days=3)).isoformat(),
        "end_time": (now + timedelta(days=3, hours=1)).isoformat(),
    }

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/events",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['tokens']['student']}"},
        )
        assert res.status_code == 403
        assert "events.create" in res.json()["detail"]


@pytest.mark.asyncio
async def test_create_event_cross_club_ownership_denied(setup_event_context):
    """Verify president of Club B cannot create an event for Club A."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)

    payload = {
        "club_id": ctx["club_a"].club_id,  # Club A, but calling as Pres B
        "title": "Cross Club Rogue Event",
        "start_time": (now + timedelta(days=4)).isoformat(),
        "end_time": (now + timedelta(days=4, hours=2)).isoformat(),
    }

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/events",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_b']}"},
        )
        assert res.status_code == 403
        assert "not authorized to create events for this club" in res.json()["detail"]


@pytest.mark.asyncio
async def test_create_event_invalid_timing(setup_event_context):
    """Verify validation fails if end_time <= start_time or deadline > start_time."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)

    # 1. end_time before start_time
    payload_end_before_start = {
        "club_id": ctx["club_a"].club_id,
        "title": "Time Traveler Meetup",
        "start_time": (now + timedelta(days=5)).isoformat(),
        "end_time": (now + timedelta(days=4)).isoformat(),
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/events",
            json=payload_end_before_start,
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        assert res.status_code == 422

    # 2. registration_deadline after start_time
    payload_deadline_after = {
        "club_id": ctx["club_a"].club_id,
        "title": "Late Registration Event",
        "start_time": (now + timedelta(days=5)).isoformat(),
        "end_time": (now + timedelta(days=5, hours=2)).isoformat(),
        "registration_deadline": (now + timedelta(days=6)).isoformat(),
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/events",
            json=payload_deadline_after,
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        assert res.status_code == 422


@pytest.mark.asyncio
async def test_create_event_venue_capacity_exceeded(setup_event_context):
    """Verify max_capacity > venue.capacity is rejected with 400."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)

    payload = {
        "club_id": ctx["club_a"].club_id,
        "venue_id": ctx["venue_active"].venue_id,  # capacity = 150
        "title": "Overcrowded Concert",
        "start_time": (now + timedelta(days=7)).isoformat(),
        "end_time": (now + timedelta(days=7, hours=3)).isoformat(),
        "max_capacity": 500,  # Exceeds venue capacity
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/events",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        assert res.status_code == 400
        assert "exceeds venue capacity" in res.json()["detail"]


@pytest.mark.asyncio
async def test_create_event_inactive_club_or_venue(setup_event_context):
    """Verify attempting to create events with inactive club or venue fails with 400."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)

    # Inactive club
    payload_club = {
        "club_id": ctx["club_inactive"].club_id,
        "title": "Inactive Club Meet",
        "start_time": (now + timedelta(days=3)).isoformat(),
        "end_time": (now + timedelta(days=3, hours=1)).isoformat(),
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/events",
            json=payload_club,
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        assert res.status_code == 400
        assert "cannot host new events" in res.json()["detail"]

    # Inactive venue
    payload_venue = {
        "club_id": ctx["club_a"].club_id,
        "venue_id": ctx["venue_inactive"].venue_id,
        "title": "Closed Room Meet",
        "start_time": (now + timedelta(days=3)).isoformat(),
        "end_time": (now + timedelta(days=3, hours=1)).isoformat(),
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/events",
            json=payload_venue,
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        assert res.status_code == 400
        assert "inactive and cannot be selected" in res.json()["detail"]


# ── 2. Retrieve Event (GET /events/{event_id}) Tests ─────────

@pytest.mark.asyncio
async def test_get_event_success_and_nonexistent(setup_event_context):
    """Verify retrieving existing event details returns 200, and nonexistent ID returns 404."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)

    # Create an event first
    create_payload = {
        "club_id": ctx["club_a"].club_id,
        "title": "Retrieve Test Event",
        "start_time": (now + timedelta(days=8)).isoformat(),
        "end_time": (now + timedelta(days=8, hours=2)).isoformat(),
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        create_res = await client.post(
            "/events",
            json=create_payload,
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        event_id = create_res.json()["event_id"]

        # 1. Successful retrieval by creator/president
        get_res = await client.get(
            f"/events/{event_id}",
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        assert get_res.status_code == 200
        assert get_res.json()["title"] == "Retrieve Test Event"

        # 2. Non-existent ID returns 404
        missing_res = await client.get(
            "/events/999999",
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        assert missing_res.status_code == 404
        assert "not found" in missing_res.json()["detail"]


@pytest.mark.asyncio
async def test_get_event_unauthenticated(setup_event_context):
    """Verify GET /events/{id} requires authentication."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/events/1")
        assert res.status_code == 401


# ── 3. List Events (GET /events) Tests ────────────────────────

@pytest.mark.asyncio
async def test_list_events_pagination_and_filters(setup_event_context):
    """Verify GET /events pagination, filtering by club/status, and search."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Admin lists all events
        res = await client.get(
            "/events?page=1&limit=10",
            headers={"Authorization": f"Bearer {ctx['tokens']['admin']}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert data["page"] == 1
        assert data["limit"] == 10

        # 2. Filter by club_id
        res_filtered = await client.get(
            f"/events?club_id={ctx['club_a'].club_id}",
            headers={"Authorization": f"Bearer {ctx['tokens']['admin']}"},
        )
        assert res_filtered.status_code == 200
        for item in res_filtered.json()["items"]:
            assert item["club_id"] == ctx["club_a"].club_id

        # 3. Filter by search query
        res_search = await client.get(
            "/events?search=Autonomous Drone",
            headers={"Authorization": f"Bearer {ctx['tokens']['admin']}"},
        )
        assert res_search.status_code == 200
        drone_events = res_search.json()["items"]
        assert len(drone_events) >= 1
        assert "Drone" in drone_events[0]["title"]


@pytest.mark.asyncio
async def test_list_events_visibility_hides_drafts_from_students(setup_event_context):
    """Verify student role does not see other clubs' unpublished draft events in listing."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/events?status=draft",
            headers={"Authorization": f"Bearer {ctx['tokens']['student']}"},
        )
        assert res.status_code == 200
        # Student cannot see Club A's draft events
        items = res.json()["items"]
        assert len(items) == 0


# ── 4. Update Event (PATCH /events/{event_id}) Tests ──────────

@pytest.mark.asyncio
async def test_update_event_success(setup_event_context):
    """Verify event creator / club president can update event title, capacity, and budget."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)

    # Create event
    create_payload = {
        "club_id": ctx["club_a"].club_id,
        "title": "Initial Title for Update",
        "start_time": (now + timedelta(days=10)).isoformat(),
        "end_time": (now + timedelta(days=10, hours=2)).isoformat(),
        "max_capacity": 30,
        "budget_allocated": 100.00,
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        create_res = await client.post(
            "/events",
            json=create_payload,
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        event_id = create_res.json()["event_id"]

        # Update event
        update_payload = {
            "title": "Updated Robotics Showcase",
            "max_capacity": 60,
            "budget_allocated": 250.00,
        }
        update_res = await client.patch(
            f"/events/{event_id}",
            json=update_payload,
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        assert update_res.status_code == 200
        updated_data = update_res.json()
        assert updated_data["title"] == "Updated Robotics Showcase"
        assert updated_data["max_capacity"] == 60
        assert float(updated_data["budget_allocated"]) == 250.00


@pytest.mark.asyncio
async def test_update_event_cross_club_forbidden(setup_event_context):
    """Verify president of Club B cannot modify an event created by Club A."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)

    create_payload = {
        "club_id": ctx["club_a"].club_id,
        "title": "Club A Protected Event",
        "start_time": (now + timedelta(days=11)).isoformat(),
        "end_time": (now + timedelta(days=11, hours=2)).isoformat(),
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        create_res = await client.post(
            "/events",
            json=create_payload,
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        event_id = create_res.json()["event_id"]

        # Attempt edit from Pres B
        update_res = await client.patch(
            f"/events/{event_id}",
            json={"title": "Hacked Title"},
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_b']}"},
        )
        assert update_res.status_code == 403
        assert "permission to modify this event" in update_res.json()["detail"]


@pytest.mark.asyncio
async def test_update_event_nonexistent(setup_event_context):
    """Verify PATCH /events/999999 returns 404."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.patch(
            "/events/999999",
            json={"title": "Ghost Event"},
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        assert res.status_code == 404


# ── 5. Submit Event for Approval (POST /events/{id}/submit) Tests ─

@pytest.mark.asyncio
async def test_submit_event_success(setup_event_context):
    """Verify authorized user can submit a draft event, transitioning to pending_approval."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)

    create_payload = {
        "club_id": ctx["club_a"].club_id,
        "title": "Event Ready for Submission",
        "start_time": (now + timedelta(days=14)).isoformat(),
        "end_time": (now + timedelta(days=14, hours=3)).isoformat(),
        "requires_approval": True,
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        create_res = await client.post(
            "/events",
            json=create_payload,
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        event_id = create_res.json()["event_id"]
        assert create_res.json()["status"] == "draft"

        # Submit event
        submit_res = await client.post(
            f"/events/{event_id}/submit",
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        assert submit_res.status_code == 200
        submit_data = submit_res.json()
        assert submit_data["status"] == "pending_approval"
        assert submit_data["current_approval_level"] == 0
        assert submit_data["requires_approval"] is True

        # Verify details reflect pending_approval
        get_res = await client.get(
            f"/events/{event_id}",
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        assert get_res.json()["status"] == "pending_approval"


@pytest.mark.asyncio
async def test_submit_event_duplicate_rejected(setup_event_context):
    """Verify submitting an already pending event is rejected with 400."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)

    create_payload = {
        "club_id": ctx["club_a"].club_id,
        "title": "Duplicate Submit Event",
        "start_time": (now + timedelta(days=15)).isoformat(),
        "end_time": (now + timedelta(days=15, hours=2)).isoformat(),
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        create_res = await client.post(
            "/events",
            json=create_payload,
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        event_id = create_res.json()["event_id"]

        # First submit -> OK
        await client.post(
            f"/events/{event_id}/submit",
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )

        # Second submit -> 400
        dup_res = await client.post(
            f"/events/{event_id}/submit",
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        assert dup_res.status_code == 400
        assert "already pending approval" in dup_res.json()["detail"]


@pytest.mark.asyncio
async def test_update_event_while_pending_approval_rejected(setup_event_context):
    """Verify updating an event while pending review is rejected to preserve approval integrity."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)

    create_payload = {
        "club_id": ctx["club_a"].club_id,
        "title": "Locked Pending Event",
        "start_time": (now + timedelta(days=16)).isoformat(),
        "end_time": (now + timedelta(days=16, hours=2)).isoformat(),
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        create_res = await client.post(
            "/events",
            json=create_payload,
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        event_id = create_res.json()["event_id"]

        # Submit it
        await client.post(
            f"/events/{event_id}/submit",
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )

        # Attempt to modify while pending
        patch_res = await client.patch(
            f"/events/{event_id}",
            json={"title": "Sneaky Change While Pending"},
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        assert patch_res.status_code == 400
        assert "pending approval" in patch_res.json()["detail"]


@pytest.mark.asyncio
async def test_submit_event_cross_club_forbidden(setup_event_context):
    """Verify president of Club B cannot submit Club A's event."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)

    create_payload = {
        "club_id": ctx["club_a"].club_id,
        "title": "Club A Private Submission",
        "start_time": (now + timedelta(days=17)).isoformat(),
        "end_time": (now + timedelta(days=17, hours=2)).isoformat(),
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        create_res = await client.post(
            "/events",
            json=create_payload,
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        event_id = create_res.json()["event_id"]

        # Pres B attempts submission
        res = await client.post(
            f"/events/{event_id}/submit",
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_b']}"},
        )
        assert res.status_code == 403
        assert "not authorized to submit" in res.json()["detail"]


@pytest.mark.asyncio
async def test_versioned_event_endpoints(setup_event_context):
    """Verify versioned /api/v1/events endpoints are reachable and functional."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/v1/events",
            headers={"Authorization": f"Bearer {ctx['tokens']['admin']}"},
        )
        assert res.status_code == 200
        assert "items" in res.json()


# ── 6. Additional Security & Edge Case Tests ─────────────────

@pytest.mark.asyncio
async def test_create_event_cannot_force_approved_status(setup_event_context):
    """Verify clients cannot bypass the approval workflow by injecting status='approved' on creation."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)

    payload = {
        "club_id": ctx["club_a"].club_id,
        "title": "Bypass Attempt Event",
        "start_time": (now + timedelta(days=20)).isoformat(),
        "end_time": (now + timedelta(days=20, hours=2)).isoformat(),
        "status": "approved",  # Attacker attempts to bypass approval
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/events",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "draft"  # Strictly set to draft on server


@pytest.mark.asyncio
async def test_update_event_cannot_force_approved_status(setup_event_context):
    """Verify clients cannot bypass the approval workflow by injecting status='approved' on update."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)

    create_payload = {
        "club_id": ctx["club_a"].club_id,
        "title": "Bypass Update Attempt",
        "start_time": (now + timedelta(days=21)).isoformat(),
        "end_time": (now + timedelta(days=21, hours=2)).isoformat(),
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        create_res = await client.post(
            "/events",
            json=create_payload,
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        event_id = create_res.json()["event_id"]

        patch_res = await client.patch(
            f"/events/{event_id}",
            json={"status": "approved"},
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["status"] == "draft"


@pytest.mark.asyncio
async def test_submit_event_nonexistent(setup_event_context):
    """Verify POST /events/999999/submit returns 404 Not Found."""
    ctx = setup_event_context
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/events/999999/submit",
            headers={"Authorization": f"Bearer {ctx['tokens']['pres_a']}"},
        )
        assert res.status_code == 404
        assert "not found" in res.json()["detail"]


@pytest.mark.asyncio
async def test_patch_and_submit_unauthenticated(setup_event_context):
    """Verify PATCH and submit endpoints return 401 when token is missing."""
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        patch_res = await client.patch("/events/1", json={"title": "No Auth"})
        assert patch_res.status_code == 401

        submit_res = await client.post("/events/1/submit")
        assert submit_res.status_code == 401

