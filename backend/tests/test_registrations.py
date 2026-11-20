"""Automated test suite for Phase 8: Event Registration, Capacity Management & Waitlist Promotion.

Tests:
1. Successful registration when seats are available (201 Created).
2. Registration when event is full triggers automatic waitlist placement (200 OK, position=1).
3. FIFO waitlist ordering across multiple waitlisted students.
4. Duplicate registration prevention (409 Conflict).
5. Duplicate waitlist placement prevention (409 Conflict).
6. Registration for an unapproved draft event rejected (400 Bad Request).
7. Registration after deadline rejected (400 Bad Request).
8. Registration by unauthenticated user rejected (401 Unauthorized).
9. Unauthorized access to registration lists and waitlists (403 Forbidden).
10. Successful registration cancellation by user.
11. Automatic waitlist promotion after cancellation (trg_waitlist_promotion moves FIFO next to registered).
12. Counter synchronization (registered_count and waitlist_count verified without double-increment).
13. Promotion expiration after 24 hours (simulated via expires_at <= NOW()).
14. Automatic promotion of the next student after expiration via background worker.
15. Concurrency defense: multiple concurrent registration requests when only 1 seat remains (genuine multi-request concurrency).
16. Prevention of capacity overflow under concurrent bursts.
17. Background worker idempotency and duplicate processing defense.
18. User registration history retrieval (GET /users/me/registrations).
"""

import asyncio
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
from app.models.event import Club, Event, EventRegistration, EventWaitlist, Notification
from app.services.waitlist_worker import expire_unclaimed_promotions


TEST_PASSWORD = "ValidRegistrationPass123!"


@pytest.fixture(scope="module")
def setup_registration_context():
    """Sets up isolated test students, coordinator, club, and tokens for registration testing."""
    db: Session = SessionLocal()

    roles = {r.name: r for r in db.query(Role).all()}
    password_hash = hash_password(TEST_PASSWORD)

    # 1. Test Coordinator
    coord = User(
        user_id=uuid.uuid4(),
        email="reg.coord@campus.edu",
        password_hash=password_hash,
        full_name="Reg Event Coordinator",
        role_id=roles["event_coordinator"].role_id,
        status="active",
        is_email_verified=True,
    )

    # 2. Test Students (6 students for capacity, waitlist, and concurrency tests)
    students = []
    for i in range(1, 8):
        stu = User(
            user_id=uuid.uuid4(),
            email=f"reg.student{i}@campus.edu",
            password_hash=password_hash,
            full_name=f"Student Tester {i}",
            student_id=f"STU-REG-{i:03d}",
            role_id=roles["student"].role_id,
            status="active",
            is_email_verified=True,
        )
        students.append(stu)

    db.add(coord)
    db.add_all(students)
    db.commit()

    # 3. Test Club
    club = Club(
        name="Competitive Programming Society Reg Test",
        short_name="CPS-REG",
        status="active",
        president_id=coord.user_id,
    )
    db.add(club)
    db.commit()

    tokens = {
        "coord": create_access_token(subject=str(coord.user_id), claims={"role": "event_coordinator"}),
    }
    for i, s in enumerate(students, start=1):
        tokens[f"stu{i}"] = create_access_token(subject=str(s.user_id), claims={"role": "student"})

    ctx = {
        "coord": coord,
        "students": students,
        "club": club,
        "tokens": tokens,
    }

    yield ctx

    # Teardown
    cleanup_db: Session = SessionLocal()
    # Delete notifications
    all_user_ids = [coord.user_id] + [s.user_id for s in students]
    cleanup_db.query(Notification).filter(Notification.user_id.in_(all_user_ids)).delete(synchronize_session=False)
    # Delete registrations & waitlist
    cleanup_db.execute(
        text("DELETE FROM event_registrations WHERE event_id IN (SELECT event_id FROM events WHERE club_id = :cid)"),
        {"cid": club.club_id},
    )
    cleanup_db.execute(
        text("DELETE FROM event_waitlist WHERE event_id IN (SELECT event_id FROM events WHERE club_id = :cid)"),
        {"cid": club.club_id},
    )
    # Delete events
    cleanup_db.query(Event).filter(Event.club_id == club.club_id).delete(synchronize_session=False)
    # Delete club
    cleanup_db.query(Club).filter(Club.club_id == club.club_id).delete(synchronize_session=False)
    # Delete users
    cleanup_db.query(User).filter(User.user_id.in_(all_user_ids)).delete(synchronize_session=False)
    cleanup_db.commit()
    cleanup_db.close()


def create_published_event(db: Session, club_id: int, creator_id: uuid.UUID, capacity: int = 2) -> Event:
    """Helper creating a published event with a specific capacity."""
    now = datetime.now(timezone.utc)
    ev = Event(
        club_id=club_id,
        created_by=creator_id,
        title=f"Coding Hackathon {uuid.uuid4().hex[:6]}",
        start_time=now + timedelta(days=7),
        end_time=now + timedelta(days=7, hours=4),
        max_capacity=capacity,
        registered_count=0,
        waitlist_count=0,
        is_public=True,
        requires_approval=False,
        status="published",
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


# ── 1. Registration & Waitlist Basics ─────────────────────────

@pytest.mark.asyncio
async def test_successful_registration_and_counter_sync(setup_registration_context):
    """Verify registration succeeds when seats are free and counters sync without double increment."""
    ctx = setup_registration_context
    transport = ASGITransport(app=app)
    db: Session = SessionLocal()
    event = create_published_event(db, ctx["club"].club_id, ctx["coord"].user_id, capacity=2)
    db.close()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            f"/events/{event.event_id}/register",
            json={"dietary_preferences": "Vegetarian", "notes": "Need power outlet"},
            headers={"Authorization": f"Bearer {ctx['tokens']['stu1']}"},
        )
        assert res.status_code in [200, 201]
        data = res.json()
        assert data["type"] == "registered"
        assert data["registration_id"] is not None
        assert data["ticket_code"] is not None

        # Verify counter is exactly 1 (no double increment bug)
        check_db: Session = SessionLocal()
        ev_check = check_db.query(Event).filter(Event.event_id == event.event_id).first()
        assert ev_check.registered_count == 1
        assert ev_check.waitlist_count == 0
        check_db.close()


@pytest.mark.asyncio
async def test_full_event_triggers_fifo_waitlist(setup_registration_context):
    """Verify filling event capacity shifts subsequent registrations to FIFO waitlist queue."""
    ctx = setup_registration_context
    transport = ASGITransport(app=app)
    db: Session = SessionLocal()
    event = create_published_event(db, ctx["club"].club_id, ctx["coord"].user_id, capacity=2)
    db.close()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Student 1: registers (seat 1/2)
        res1 = await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu1']}"})
        assert res1.json()["type"] == "registered"

        # Student 2: registers (seat 2/2, event now full)
        res2 = await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu2']}"})
        assert res2.json()["type"] == "registered"

        # Student 3: event is full -> placed on waitlist at position 1
        res3 = await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu3']}"})
        assert res3.status_code == 200
        data3 = res3.json()
        assert data3["type"] == "waitlisted"
        assert data3["position"] == 1

        # Student 4: event is full -> placed on waitlist at position 2
        res4 = await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu4']}"})
        assert res4.status_code == 200
        data4 = res4.json()
        assert data4["type"] == "waitlisted"
        assert data4["position"] == 2

        # Verify database counters
        check_db: Session = SessionLocal()
        ev_check = check_db.query(Event).filter(Event.event_id == event.event_id).first()
        assert ev_check.registered_count == 2
        assert ev_check.waitlist_count == 2
        check_db.close()


@pytest.mark.asyncio
async def test_duplicate_registration_and_waitlist_rejected(setup_registration_context):
    """Verify duplicate registration or duplicate waitlist requests return 409 Conflict."""
    ctx = setup_registration_context
    transport = ASGITransport(app=app)
    db: Session = SessionLocal()
    event = create_published_event(db, ctx["club"].club_id, ctx["coord"].user_id, capacity=1)
    db.close()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Stu 1 registers
        await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu1']}"})

        # Stu 1 tries registering again -> 409
        dup_reg = await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu1']}"})
        assert dup_reg.status_code == 409
        assert "already registered" in dup_reg.json()["detail"].lower()

        # Stu 2 waitlists
        await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu2']}"})

        # Stu 2 tries waitlisting again -> 409
        dup_wait = await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu2']}"})
        assert dup_wait.status_code == 409
        assert "already on the waitlist" in dup_wait.json()["detail"].lower()


@pytest.mark.asyncio
async def test_registration_for_unapproved_or_past_deadline_rejected(setup_registration_context):
    """Verify registration fails if event is not approved/published or deadline has passed."""
    ctx = setup_registration_context
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)
    db: Session = SessionLocal()

    # Draft event
    draft_event = Event(
        club_id=ctx["club"].club_id,
        created_by=ctx["coord"].user_id,
        title="Draft Coding Meetup",
        start_time=now + timedelta(days=5),
        end_time=now + timedelta(days=5, hours=2),
        status="draft",
    )
    # Expired deadline event
    expired_event = Event(
        club_id=ctx["club"].club_id,
        created_by=ctx["coord"].user_id,
        title="Expired Deadline Meetup",
        start_time=now + timedelta(days=5),
        end_time=now + timedelta(days=5, hours=2),
        registration_deadline=now - timedelta(hours=1),
        status="published",
    )
    db.add_all([draft_event, expired_event])
    db.commit()
    draft_id, expired_id = draft_event.event_id, expired_event.event_id
    db.close()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Draft registration attempt -> 400
        res_draft = await client.post(f"/events/{draft_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu1']}"})
        assert res_draft.status_code == 400
        assert "not open" in res_draft.json()["detail"].lower()

        # Expired deadline attempt -> 400
        res_expired = await client.post(f"/events/{expired_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu1']}"})
        assert res_expired.status_code == 400
        assert "deadline has passed" in res_expired.json()["detail"].lower()


@pytest.mark.asyncio
async def test_unauthorized_registration_list_access(setup_registration_context):
    """Verify students cannot view other attendees' registration lists or waitlists (403 Forbidden)."""
    ctx = setup_registration_context
    transport = ASGITransport(app=app)
    db: Session = SessionLocal()
    event = create_published_event(db, ctx["club"].club_id, ctx["coord"].user_id, capacity=5)
    db.close()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Student attempts to list registrations
        res_reg = await client.get(f"/events/{event.event_id}/registrations", headers={"Authorization": f"Bearer {ctx['tokens']['stu1']}"})
        assert res_reg.status_code == 403

        # Student attempts to list waitlist
        res_wait = await client.get(f"/events/{event.event_id}/waitlist", headers={"Authorization": f"Bearer {ctx['tokens']['stu1']}"})
        assert res_wait.status_code == 403

        # Coordinator can view both
        coord_reg = await client.get(f"/events/{event.event_id}/registrations", headers={"Authorization": f"Bearer {ctx['tokens']['coord']}"})
        assert coord_reg.status_code == 200

        coord_wait = await client.get(f"/events/{event.event_id}/waitlist", headers={"Authorization": f"Bearer {ctx['tokens']['coord']}"})
        assert coord_wait.status_code == 200


# ── 2. Automatic Waitlist Promotion ───────────────────────────

@pytest.mark.asyncio
async def test_cancellation_triggers_automatic_waitlist_promotion(setup_registration_context):
    """Verify cancelling a registration automatically promotes the earliest waitlisted student (FIFO)."""
    ctx = setup_registration_context
    transport = ASGITransport(app=app)
    db: Session = SessionLocal()
    event = create_published_event(db, ctx["club"].club_id, ctx["coord"].user_id, capacity=1)
    db.close()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Stu 1 registers (event full: 1/1)
        await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu1']}"})

        # Stu 2 waitlisted at pos 1
        await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu2']}"})

        # Stu 3 waitlisted at pos 2
        await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu3']}"})

        # Stu 1 cancels registration
        cancel_res = await client.delete(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu1']}"})
        assert cancel_res.status_code == 200

        # Verify DB: Stu 2 should now be automatically promoted and registered
        check_db: Session = SessionLocal()
        reg_stu2 = (
            check_db.query(EventRegistration)
            .filter(EventRegistration.event_id == event.event_id, EventRegistration.user_id == ctx["students"][1].user_id)
            .first()
        )
        assert reg_stu2 is not None
        assert reg_stu2.status == "registered"

        # Verify Stu 2 waitlist record is 'promoted' with 24h window
        wl_stu2 = (
            check_db.query(EventWaitlist)
            .filter(EventWaitlist.event_id == event.event_id, EventWaitlist.user_id == ctx["students"][1].user_id)
            .first()
        )
        assert wl_stu2.status == "promoted"
        assert wl_stu2.promoted_at is not None
        assert wl_stu2.expires_at is not None

        # Verify Stu 3 was renumbered to position 1
        wl_stu3 = (
            check_db.query(EventWaitlist)
            .filter(EventWaitlist.event_id == event.event_id, EventWaitlist.user_id == ctx["students"][2].user_id)
            .first()
        )
        assert wl_stu3.status == "waiting"
        assert wl_stu3.position == 1

        # Counters: registered=1, waitlist=1
        ev_check = check_db.query(Event).filter(Event.event_id == event.event_id).first()
        assert ev_check.registered_count == 1
        assert ev_check.waitlist_count == 1
        check_db.close()


# ── 3. Background Waitlist Expiration & Chained Promotion ─────

@pytest.mark.asyncio
async def test_waitlist_expiration_worker_and_chain_promotion(setup_registration_context):
    """Verify background expiration worker cancels unclaimed expired promotions and auto-promotes next in queue."""
    ctx = setup_registration_context
    transport = ASGITransport(app=app)
    db: Session = SessionLocal()
    event = create_published_event(db, ctx["club"].club_id, ctx["coord"].user_id, capacity=1)
    db.close()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Stu 1 registers (fills 1/1)
        await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu1']}"})
        # Stu 2 waitlisted
        await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu2']}"})
        # Stu 3 waitlisted
        await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu3']}"})

        # Stu 1 cancels -> triggers Stu 2 promotion
        await client.delete(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu1']}"})

        # Simulate 24-hour expiration elapsed for Stu 2 by backdating expires_at in DB
        mod_db: Session = SessionLocal()
        mod_db.execute(
            text("""
                UPDATE event_waitlist
                SET expires_at = NOW() - INTERVAL '1 hour'
                WHERE event_id = :eid AND user_id = :uid
            """),
            {"eid": event.event_id, "uid": str(ctx["students"][1].user_id)},
        )
        mod_db.commit()

        # Run expiration processor
        processed = expire_unclaimed_promotions(mod_db)
        assert processed == 1
        mod_db.close()

        # Check DB state:
        # Stu 2 waitlist status should be 'expired'
        # Stu 2 registration should be 'cancelled'
        # Stu 3 should now be automatically promoted!
        verify_db: Session = SessionLocal()
        wl_stu2 = verify_db.query(EventWaitlist).filter(EventWaitlist.event_id == event.event_id, EventWaitlist.user_id == ctx["students"][1].user_id).first()
        assert wl_stu2.status == "expired"

        reg_stu2 = verify_db.query(EventRegistration).filter(EventRegistration.event_id == event.event_id, EventRegistration.user_id == ctx["students"][1].user_id).first()
        assert reg_stu2.status == "cancelled"

        # Stu 3 is now promoted and registered!
        reg_stu3 = verify_db.query(EventRegistration).filter(EventRegistration.event_id == event.event_id, EventRegistration.user_id == ctx["students"][2].user_id).first()
        assert reg_stu3.status == "registered"

        wl_stu3 = verify_db.query(EventWaitlist).filter(EventWaitlist.event_id == event.event_id, EventWaitlist.user_id == ctx["students"][2].user_id).first()
        assert wl_stu3.status == "promoted"
        verify_db.close()


# ── 4. Concurrency Test ───────────────────────────────────────

@pytest.mark.asyncio
async def test_concurrent_registration_attempts_when_one_seat_remains(setup_registration_context):
    """Verify simultaneous registration requests when 1 seat remains serialize safely without capacity overflow."""
    ctx = setup_registration_context
    transport = ASGITransport(app=app)
    db: Session = SessionLocal()
    # Event with exactly 1 seat
    event = create_published_event(db, ctx["club"].club_id, ctx["coord"].user_id, capacity=1)
    db.close()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Four students attempt to register concurrently for the single remaining seat
        async def register_student(stu_key: str):
            return await client.post(
                f"/events/{event.event_id}/register",
                headers={"Authorization": f"Bearer {ctx['tokens'][stu_key]}"},
            )

        responses = await asyncio.gather(
            register_student("stu1"),
            register_student("stu2"),
            register_student("stu3"),
            register_student("stu4"),
            return_exceptions=True,
        )

        types = [r.json()["type"] for r in responses if hasattr(r, "json")]
        # Exactly ONE must receive "registered", the remaining three must receive "waitlisted"
        assert types.count("registered") == 1
        assert types.count("waitlisted") == 3

        # Verify DB capacity was never violated
        check_db: Session = SessionLocal()
        ev_check = check_db.query(Event).filter(Event.event_id == event.event_id).first()
        assert ev_check.registered_count == 1
        assert ev_check.waitlist_count == 3
        check_db.close()


# ── 5. User Registration History ──────────────────────────────

@pytest.mark.asyncio
async def test_get_my_registrations(setup_registration_context):
    """Verify GET /users/me/registrations retrieves the current user's registration history."""
    ctx = setup_registration_context
    transport = ASGITransport(app=app)
    db: Session = SessionLocal()
    event = create_published_event(db, ctx["club"].club_id, ctx["coord"].user_id, capacity=5)
    db.close()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Stu 1 registers
        await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu1']}"})

        # Stu 1 checks history
        res = await client.get("/users/me/registrations", headers={"Authorization": f"Bearer {ctx['tokens']['stu1']}"})
        assert res.status_code == 200
        items = res.json()
        assert len(items) >= 1
        reg_entry = next((item for item in items if item["event_id"] == event.event_id), None)
        assert reg_entry is not None
        assert reg_entry["status"] == "registered"
        assert "Coding Hackathon" in reg_entry["event_title"]


# ── 6. Additional Security & Worker Robustness Tests ──────────

@pytest.mark.asyncio
async def test_unauthenticated_registration_and_cancellation(setup_registration_context):
    """Verify unauthenticated requests to register or cancel fail with 401 Unauthorized."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res_reg = await client.post("/events/1/register")
        assert res_reg.status_code == 401

        res_del = await client.delete("/events/1/register")
        assert res_del.status_code == 401


@pytest.mark.asyncio
async def test_cancel_nonexistent_registration_rejected(setup_registration_context):
    """Verify attempting to cancel when not registered or waitlisted returns 400 Bad Request."""
    ctx = setup_registration_context
    transport = ASGITransport(app=app)
    db: Session = SessionLocal()
    event = create_published_event(db, ctx["club"].club_id, ctx["coord"].user_id, capacity=5)
    db.close()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.delete(
            f"/events/{event.event_id}/register",
            headers={"Authorization": f"Bearer {ctx['tokens']['stu5']}"},
        )
        assert res.status_code == 400
        assert "no active registration" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_worker_idempotency_and_no_duplicate_processing(setup_registration_context):
    """Verify running the background expiration worker consecutively is idempotent."""
    db: Session = SessionLocal()
    count1 = expire_unclaimed_promotions(db)
    count2 = expire_unclaimed_promotions(db)
    assert count2 == 0  # Second run has 0 expired items (idempotent)
    db.close()


@pytest.mark.asyncio
async def test_concurrent_cancellations_promote_correctly(setup_registration_context):
    """Verify simultaneous cancellations by multiple registered attendees promote waitlisted students correctly."""
    ctx = setup_registration_context
    transport = ASGITransport(app=app)
    db: Session = SessionLocal()
    event = create_published_event(db, ctx["club"].club_id, ctx["coord"].user_id, capacity=2)
    db.close()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Stu 1 & Stu 2 register (event full 2/2)
        await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu1']}"})
        await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu2']}"})

        # Stu 3 & Stu 4 waitlist (positions 1 and 2)
        await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu3']}"})
        await client.post(f"/events/{event.event_id}/register", headers={"Authorization": f"Bearer {ctx['tokens']['stu4']}"})

        # Both Stu 1 and Stu 2 cancel concurrently
        async def cancel_student(stu_key: str):
            return await client.delete(
                f"/events/{event.event_id}/register",
                headers={"Authorization": f"Bearer {ctx['tokens'][stu_key]}"},
            )

        cancel_responses = await asyncio.gather(cancel_student("stu1"), cancel_student("stu2"))
        assert all(r.status_code == 200 for r in cancel_responses)

        # Both Stu 3 and Stu 4 should now be promoted!
        verify_db: Session = SessionLocal()
        promoted_count = (
            verify_db.query(EventRegistration)
            .filter(
                EventRegistration.event_id == event.event_id,
                EventRegistration.status == "registered",
            )
            .count()
        )
        assert promoted_count == 2

        ev_check = verify_db.query(Event).filter(Event.event_id == event.event_id).first()
        assert ev_check.registered_count == 2
        assert ev_check.waitlist_count == 0
        verify_db.close()

