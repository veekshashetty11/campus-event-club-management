"""End-to-End Automated Test Suite for Post-Final-Approval Event Lifecycle.

Tests:
1. Full 4-Stage Approval to Venue Manager Pipeline:
   - Coordinator submits event.
   - Level 1 (Advisor) approves.
   - Level 2 (Student Affairs) approves.
   - Level 3 (Administrator) gives final approval.
   - Verifies event status is 'approved' and pending venue booking exists.
2. Venue Manager Visibility:
   - GET /venues/bookings/pending returns the approved event awaiting venue sign-off.
3. Pre-Publication Guard:
   - Event must NOT appear in public student browse events prior to venue confirmation.
4. Venue Manager Approval / Allocation:
   - POST /venues/bookings/{booking_id}/approve confirms booking and transitions event status to 'published'.
   - Double-booking conflict detection returns 409 Conflict.
5. Student Portal Discovery & Registration:
   - GET /events returns the published event with venue details.
   - GET /events/{id} returns full event metadata.
   - POST /events/{id}/register registers student via fn_register_for_event.
   - Verifies registration record is persisted in PostgreSQL.
   - Duplicate registration rejected with 409 Conflict.
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
from app.models.event import Event, Club, Venue, VenueBooking, EventRegistration

TEST_PASSWORD = "LifecyclePassword123!"


TEST_EMAILS = [
    "lifecycle.coord@campus.edu",
    "lifecycle.advisor@campus.edu",
    "lifecycle.affairs@campus.edu",
    "lifecycle.admin@campus.edu",
    "lifecycle.venue@campus.edu",
    "lifecycle.student@campus.edu",
]

TEST_VENUES = ["Lifecycle Main Hall A", "Lifecycle Seminar Room B"]
TEST_CLUB = "Lifecycle Robotics Society"


@pytest.fixture
def setup_lifecycle_context():
    """Sets up isolated test users, club, venues, and auth tokens.

    Cleans up stale data from prior runs before creating fresh records,
    so the test is idempotent across repeated executions.
    """
    db: Session = SessionLocal()

    # ── Pre-cleanup: remove stale data from previous runs ──────────────────────
    # Must delete in dependency order: registrations → events → club members
    # → club → venue bookings → venues → users
    stale_users = db.query(User).filter(User.email.in_(TEST_EMAILS)).all()
    stale_user_ids = [u.user_id for u in stale_users]

    if stale_user_ids:
        db.execute(text(
            "DELETE FROM event_registrations WHERE user_id = ANY(:ids)"
        ), {"ids": stale_user_ids})
        db.execute(text(
            "DELETE FROM event_approvals WHERE approver_id = ANY(:ids)"
        ), {"ids": stale_user_ids})

    stale_clubs = db.query(Club).filter(Club.name == TEST_CLUB).all()
    stale_club_ids = [c.club_id for c in stale_clubs]
    if stale_club_ids:
        stale_event_ids = [
            row[0] for row in db.execute(
                text("SELECT event_id FROM events WHERE club_id = ANY(:ids)"),
                {"ids": stale_club_ids}
            ).fetchall()
        ]
        if stale_event_ids:
            db.execute(text(
                "DELETE FROM venue_bookings WHERE event_id = ANY(:ids)"
            ), {"ids": stale_event_ids})
            db.execute(text(
                "DELETE FROM event_approvals WHERE event_id = ANY(:ids)"
            ), {"ids": stale_event_ids})
            db.execute(text(
                "DELETE FROM event_registrations WHERE event_id = ANY(:ids)"
            ), {"ids": stale_event_ids})
            db.execute(text(
                "DELETE FROM events WHERE event_id = ANY(:ids)"
            ), {"ids": stale_event_ids})
        db.execute(text(
            "DELETE FROM club_members WHERE club_id = ANY(:ids)"
        ), {"ids": stale_club_ids})
        db.execute(text(
            "DELETE FROM clubs WHERE club_id = ANY(:ids)"
        ), {"ids": stale_club_ids})

    stale_venues = db.query(Venue).filter(Venue.name.in_(TEST_VENUES)).all()
    stale_venue_ids = [v.venue_id for v in stale_venues]
    if stale_venue_ids:
        db.execute(text(
            "DELETE FROM venue_bookings WHERE venue_id = ANY(:ids)"
        ), {"ids": stale_venue_ids})
        db.execute(text(
            "DELETE FROM venues WHERE venue_id = ANY(:ids)"
        ), {"ids": stale_venue_ids})

    if stale_user_ids:
        db.execute(text(
            "DELETE FROM users WHERE user_id = ANY(:ids)"
        ), {"ids": stale_user_ids})

    db.commit()
    # ── End pre-cleanup ────────────────────────────────────────────────────────

    roles = {r.name: r for r in db.query(Role).all()}
    password_hash = hash_password(TEST_PASSWORD)

    # 1. Users
    coordinator = User(
        user_id=uuid.uuid4(),
        email="lifecycle.coord@campus.edu",
        password_hash=password_hash,
        full_name="Casey Coordinator",
        role_id=roles["event_coordinator"].role_id,
        status="active",
        is_email_verified=True,
    )
    advisor = User(
        user_id=uuid.uuid4(),
        email="lifecycle.advisor@campus.edu",
        password_hash=password_hash,
        full_name="Prof. Lifecycle Advisor",
        role_id=roles["club_advisor"].role_id,
        status="active",
        is_email_verified=True,
    )
    affairs = User(
        user_id=uuid.uuid4(),
        email="lifecycle.affairs@campus.edu",
        password_hash=password_hash,
        full_name="Dean Lifecycle Affairs",
        role_id=roles["student_affairs"].role_id,
        status="active",
        is_email_verified=True,
    )
    admin = User(
        user_id=uuid.uuid4(),
        email="lifecycle.admin@campus.edu",
        password_hash=password_hash,
        full_name="Dr. Lifecycle Admin",
        role_id=roles["administrator"].role_id,
        status="active",
        is_email_verified=True,
    )
    venue_manager = User(
        user_id=uuid.uuid4(),
        email="lifecycle.venue@campus.edu",
        password_hash=password_hash,
        full_name="Morgan Lifecycle Venue",
        role_id=roles["venue_manager"].role_id if "venue_manager" in roles else roles["administrator"].role_id,
        status="active",
        is_email_verified=True,
    )
    student = User(
        user_id=uuid.uuid4(),
        email="lifecycle.student@campus.edu",
        password_hash=password_hash,
        full_name="Riley Student",
        role_id=roles["student"].role_id,
        status="active",
        is_email_verified=True,
    )

    db.add_all([coordinator, advisor, affairs, admin, venue_manager, student])
    db.commit()

    # 2. Club
    club = Club(
        name="Lifecycle Robotics Society",
        short_name="LRS",
        status="active",
        president_id=coordinator.user_id,
        faculty_advisor_id=advisor.user_id,
    )
    db.add(club)
    db.commit()

    # 3. Venues
    venue_a = Venue(
        name="Lifecycle Main Hall A",
        building="Main Academic Complex",
        capacity=200,
        hourly_rate=Decimal("100.00"),
        is_active=True,
    )
    venue_b = Venue(
        name="Lifecycle Seminar Room B",
        building="Science Block",
        capacity=50,
        hourly_rate=Decimal("40.00"),
        is_active=True,
    )
    db.add_all([venue_a, venue_b])
    db.commit()

    tokens = {
        "coord": create_access_token(subject=str(coordinator.user_id), claims={"role": "event_coordinator"}),
        "advisor": create_access_token(subject=str(advisor.user_id), claims={"role": "club_advisor"}),
        "affairs": create_access_token(subject=str(affairs.user_id), claims={"role": "student_affairs"}),
        "admin": create_access_token(subject=str(admin.user_id), claims={"role": "administrator"}),
        "venue": create_access_token(subject=str(venue_manager.user_id), claims={"role": "venue_manager"}),
        "student": create_access_token(subject=str(student.user_id), claims={"role": "student"}),
    }

    yield {
        "db": db,
        "tokens": tokens,
        "coordinator": coordinator,
        "advisor": advisor,
        "affairs": affairs,
        "admin": admin,
        "venue_manager": venue_manager,
        "student": student,
        "club": club,
        "venue_a": venue_a,
        "venue_b": venue_b,
    }

    # ── Post-test teardown: clean up all data created by this run ─────────────
    try:
        user_ids = [
            coordinator.user_id, advisor.user_id, affairs.user_id,
            admin.user_id, venue_manager.user_id, student.user_id,
        ]
        club_ids = [club.club_id]
        venue_ids = [venue_a.venue_id, venue_b.venue_id]

        event_ids = [
            row[0] for row in db.execute(
                text("SELECT event_id FROM events WHERE club_id = ANY(:ids)"),
                {"ids": club_ids}
            ).fetchall()
        ]
        if event_ids:
            db.execute(text("DELETE FROM venue_bookings WHERE event_id = ANY(:ids)"), {"ids": event_ids})
            db.execute(text("DELETE FROM event_registrations WHERE event_id = ANY(:ids)"), {"ids": event_ids})
            db.execute(text("DELETE FROM event_approvals WHERE event_id = ANY(:ids)"), {"ids": event_ids})
            db.execute(text("DELETE FROM events WHERE event_id = ANY(:ids)"), {"ids": event_ids})

        db.execute(text("DELETE FROM venue_bookings WHERE venue_id = ANY(:ids)"), {"ids": venue_ids})
        db.execute(text("DELETE FROM venues WHERE venue_id = ANY(:ids)"), {"ids": venue_ids})
        db.execute(text("DELETE FROM club_members WHERE club_id = ANY(:ids)"), {"ids": club_ids})
        db.execute(text("DELETE FROM clubs WHERE club_id = ANY(:ids)"), {"ids": club_ids})
        db.execute(text("DELETE FROM event_approvals WHERE approver_id = ANY(:ids)"), {"ids": user_ids})
        db.execute(text("DELETE FROM users WHERE user_id = ANY(:ids)"), {"ids": user_ids})
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


@pytest.mark.anyio
async def test_end_to_end_post_approval_lifecycle(setup_lifecycle_context):
    ctx = setup_lifecycle_context
    tokens = ctx["tokens"]
    club = ctx["club"]
    venue_a = ctx["venue_a"]
    db: Session = ctx["db"]

    start = datetime.now(timezone.utc) + timedelta(days=10)
    end = start + timedelta(hours=3)
    deadline = start - timedelta(days=2)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Coordinator creates event
        create_resp = await client.post(
            "/events",
            json={
                "club_id": club.club_id,
                "venue_id": venue_a.venue_id,
                "title": "Autonomous Drone Grand Prix 2026",
                "description": "High-speed obstacle course competition for autonomous aerial robots.",
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
                "registration_deadline": deadline.isoformat(),
                "max_capacity": 50,
                "is_public": True,
                "requires_approval": True,
                "budget_allocated": "5000.00",
            },
            headers={"Authorization": f"Bearer {tokens['coord']}"},
        )
        assert create_resp.status_code == 201, create_resp.text
        event_id = create_resp.json()["event_id"]

        # Step 2: Coordinator submits event for approval
        sub_resp = await client.post(
            f"/events/{event_id}/submit",
            headers={"Authorization": f"Bearer {tokens['coord']}"},
        )
        assert sub_resp.status_code == 200, sub_resp.text
        assert sub_resp.json()["status"] == "pending_approval"

        # Step 3: Advisor approves (Level 1)
        adv_resp = await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "Excellent robotics safety checklist. Approved."},
            headers={"Authorization": f"Bearer {tokens['advisor']}"},
        )
        assert adv_resp.status_code == 200, adv_resp.text
        assert adv_resp.json()["level_processed"] == 1

        # Step 4: Student Affairs approves (Level 2)
        aff_resp = await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "Campus security and airspace guidelines met. Level 2 approved."},
            headers={"Authorization": f"Bearer {tokens['affairs']}"},
        )
        assert aff_resp.status_code == 200, aff_resp.text
        assert aff_resp.json()["level_processed"] == 2

        # Step 5: Administrator gives Final Approval (Level 3)
        adm_resp = await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "Executive institutional approval granted. Forwarded to Venue Manager."},
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        assert adm_resp.status_code == 200, adm_resp.text
        assert adm_resp.json()["level_processed"] == 3
        assert adm_resp.json()["event_status"] == "approved"

        # Step 6: Verify event is in Venue Manager pending bookings queue
        v_pending = await client.get(
            "/venues/bookings/pending",
            headers={"Authorization": f"Bearer {tokens['venue']}"},
        )
        assert v_pending.status_code == 200, v_pending.text
        pending_items = v_pending.json()
        matching_booking = next((b for b in pending_items if b["event_id"] == event_id), None)
        assert matching_booking is not None, f"Event {event_id} not found in venue pending bookings: {pending_items}"
        assert matching_booking["status"] == "pending"
        booking_id = matching_booking["booking_id"]

        # Step 7: Pre-publication check: Student browse events must NOT show the event before venue is confirmed
        pub_check = await client.get(
            "/events",
            params={"status": "published"},
            headers={"Authorization": f"Bearer {tokens['student']}"},
        )
        assert pub_check.status_code == 200
        published_event_ids = [e["event_id"] for e in pub_check.json()["items"]]
        assert event_id not in published_event_ids, "Event appeared in student portal before venue confirmation!"

        # Step 8: Venue Manager approves the venue booking
        v_approve = await client.post(
            f"/venues/bookings/{booking_id}/approve",
            headers={"Authorization": f"Bearer {tokens['venue']}"},
        )
        assert v_approve.status_code == 200, v_approve.text
        assert v_approve.json()["status"] == "confirmed"

        # Step 9: Verify event status transitioned to 'published' in database
        db_event = db.query(Event).filter(Event.event_id == event_id).first()
        db.refresh(db_event)
        assert db_event.status == "published"
        assert db_event.venue_id == venue_a.venue_id

        # Step 10: Verify event now appears in Student Browse Events
        student_events = await client.get(
            "/events",
            headers={"Authorization": f"Bearer {tokens['student']}"},
        )
        assert student_events.status_code == 200
        items = student_events.json()["items"]
        found_event = next((e for e in items if e["event_id"] == event_id), None)
        assert found_event is not None, f"Published event {event_id} not found in student events list!"
        assert found_event["status"] == "published"
        assert found_event["venue_name"] == venue_a.name

        # Step 11: Student opens event details
        detail_resp = await client.get(
            f"/events/{event_id}",
            headers={"Authorization": f"Bearer {tokens['student']}"},
        )
        assert detail_resp.status_code == 200
        assert detail_resp.json()["title"] == "Autonomous Drone Grand Prix 2026"

        # Step 12: Student registers for the event
        reg_resp = await client.post(
            f"/events/{event_id}/register",
            json={"dietary_preferences": "Vegetarian", "notes": "Bringing custom drone transmitter"},
            headers={"Authorization": f"Bearer {tokens['student']}"},
        )
        assert reg_resp.status_code == 200, reg_resp.text
        reg_data = reg_resp.json()
        assert reg_data["status"] == "success"
        assert reg_data["type"] == "registered"
        assert reg_data["ticket_code"] is not None

        # Step 13: Verify registration row is persisted in PostgreSQL
        reg_row = (
            db.query(EventRegistration)
            .filter(
                EventRegistration.event_id == event_id,
                EventRegistration.user_id == ctx["student"].user_id,
            )
            .first()
        )
        assert reg_row is not None
        assert reg_row.status == "registered"
        assert reg_row.dietary_preferences == "Vegetarian"

        # Step 14: Duplicate registration is rejected (409 Conflict)
        dup_reg = await client.post(
            f"/events/{event_id}/register",
            headers={"Authorization": f"Bearer {tokens['student']}"},
        )
        assert dup_reg.status_code == 409

        # Step 15: Conflict check on venue booking: Attempting a duplicate confirmed booking on the same venue and time window fails
        conflict_booking_resp = await client.post(
            f"/venues/{venue_a.venue_id}/book",
            json={
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
                "notes": "Conflicting reservation attempt",
            },
            headers={"Authorization": f"Bearer {tokens['coord']}"},
        )
        assert conflict_booking_resp.status_code == 409
