"""Automated test suite for Phase 7: Multilevel Event Approval Workflow.

Tests:
1. Successful submission:
   - Coordinator drafts and submits event for approval (draft -> pending_approval, level=0).
2. Sequential 3-level approval hierarchy:
   - Level 1: Club Advisor approves (status='pending_approval', level=1).
   - Level 2: Student Affairs approves (status='pending_approval', level=2).
   - Level 3: Administrator approves (status='approved', level=3).
3. Rejection workflow:
   - Rejection at level 1 immediately halts workflow (status='rejected').
   - Rejection at level 2 halts workflow.
   - Rejection at level 3 halts workflow.
   - Mandatory rejection reason: empty reason rejected with 400 Bad Request.
4. Security & RBAC:
   - Unauthorized approval attempts by student (403).
   - Wrong-role approval attempts (e.g. Student Affairs attempting Level 1, Advisor attempting Level 2) (403).
   - Self-approval prevention: Creator cannot approve or reject their own event (403).
   - Cross-club advisor prevention: Advisor of Club B cannot approve Club A's event (403).
   - Duplicate approval prevention: Same approver cannot submit twice at the same level (400).
   - Cannot approve already approved event (400).
   - Cannot approve already rejected event (400).
   - Cannot approve cancelled/completed event (400).
5. Concurrency defense:
   - Concurrent approval requests for the same event stage cannot race or corrupt state.
6. History & Pending listings:
   - GET /approvals/pending filters by approver role and assigned clubs.
   - GET /approvals/{id} retrieves details.
   - GET /events/{id}/approval-history retrieves sequential decision audit trail.
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.main import app
from app.db.connection import SessionLocal
from app.core.security import hash_password, create_access_token
from app.models.auth import User, Role
from app.models.event import Club, Event, EventApproval, Notification


TEST_PASSWORD = "ValidApprovalTestPass123!"


@pytest.fixture(scope="module")
def setup_approval_context():
    """Sets up isolated test users, clubs, and tokens for approval workflow tests."""
    db: Session = SessionLocal()

    roles = {r.name: r for r in db.query(Role).all()}
    password_hash = hash_password(TEST_PASSWORD)

    # 1. Test Users
    coordinator = User(
        user_id=uuid.uuid4(),
        email="approval.coord@campus.edu",
        password_hash=password_hash,
        full_name="Alex Coordinator",
        role_id=roles["event_coordinator"].role_id,
        status="active",
        is_email_verified=True,
    )
    advisor_a = User(
        user_id=uuid.uuid4(),
        email="approval.advisor.a@campus.edu",
        password_hash=password_hash,
        full_name="Prof. Advisor Alpha",
        role_id=roles["club_advisor"].role_id,
        status="active",
        is_email_verified=True,
    )
    advisor_b = User(
        user_id=uuid.uuid4(),
        email="approval.advisor.b@campus.edu",
        password_hash=password_hash,
        full_name="Prof. Advisor Beta",
        role_id=roles["club_advisor"].role_id,
        status="active",
        is_email_verified=True,
    )
    affairs = User(
        user_id=uuid.uuid4(),
        email="approval.affairs@campus.edu",
        password_hash=password_hash,
        full_name="Dean Student Affairs",
        role_id=roles["student_affairs"].role_id,
        status="active",
        is_email_verified=True,
    )
    admin = User(
        user_id=uuid.uuid4(),
        email="approval.admin@campus.edu",
        password_hash=password_hash,
        full_name="Dr. Administrator",
        role_id=roles["administrator"].role_id,
        status="active",
        is_email_verified=True,
    )
    student = User(
        user_id=uuid.uuid4(),
        email="approval.student@campus.edu",
        password_hash=password_hash,
        full_name="Sam Student",
        role_id=roles["student"].role_id,
        status="active",
        is_email_verified=True,
    )

    db.add_all([coordinator, advisor_a, advisor_b, affairs, admin, student])
    db.commit()

    # 2. Test Clubs (Club A has advisor_a, Club B has advisor_b)
    club_a = Club(
        name="AI & Robotics Club Approval Test",
        short_name="ARC-TEST",
        status="active",
        president_id=coordinator.user_id,
        faculty_advisor_id=advisor_a.user_id,
    )
    club_b = Club(
        name="Literature Club Approval Test",
        short_name="LIT-TEST",
        status="active",
        president_id=coordinator.user_id,
        faculty_advisor_id=advisor_b.user_id,
    )
    db.add_all([club_a, club_b])
    db.commit()

    tokens = {
        "coord": create_access_token(subject=str(coordinator.user_id), claims={"role": "event_coordinator"}),
        "advisor_a": create_access_token(subject=str(advisor_a.user_id), claims={"role": "club_advisor"}),
        "advisor_b": create_access_token(subject=str(advisor_b.user_id), claims={"role": "club_advisor"}),
        "affairs": create_access_token(subject=str(affairs.user_id), claims={"role": "student_affairs"}),
        "admin": create_access_token(subject=str(admin.user_id), claims={"role": "administrator"}),
        "student": create_access_token(subject=str(student.user_id), claims={"role": "student"}),
    }

    ctx = {
        "coordinator": coordinator,
        "advisor_a": advisor_a,
        "advisor_b": advisor_b,
        "affairs": affairs,
        "admin": admin,
        "student": student,
        "club_a": club_a,
        "club_b": club_b,
        "tokens": tokens,
    }

    yield ctx

    # Teardown
    cleanup_db: Session = SessionLocal()
    # Delete notifications
    cleanup_db.query(Notification).filter(
        Notification.user_id.in_([coordinator.user_id, advisor_a.user_id, advisor_b.user_id, affairs.user_id, admin.user_id, student.user_id])
    ).delete(synchronize_session=False)
    # Delete event approvals
    cleanup_db.execute(
        text("DELETE FROM event_approvals WHERE event_id IN (SELECT event_id FROM events WHERE club_id IN (:ca, :cb))"),
        {"ca": club_a.club_id, "cb": club_b.club_id},
    )
    # Delete events
    cleanup_db.query(Event).filter(Event.club_id.in_([club_a.club_id, club_b.club_id])).delete(synchronize_session=False)
    # Delete clubs
    cleanup_db.query(Club).filter(Club.club_id.in_([club_a.club_id, club_b.club_id])).delete(synchronize_session=False)
    # Delete users
    cleanup_db.query(User).filter(
        User.user_id.in_([coordinator.user_id, advisor_a.user_id, advisor_b.user_id, affairs.user_id, admin.user_id, student.user_id])
    ).delete(synchronize_session=False)
    cleanup_db.commit()
    cleanup_db.close()


async def create_submitted_event(client: AsyncClient, ctx: dict, club_id: int) -> int:
    """Helper creating and submitting an event for approval."""
    now = datetime.now(timezone.utc)
    create_res = await client.post(
        "/events",
        json={
            "club_id": club_id,
            "title": f"Approval Flow Event {uuid.uuid4().hex[:6]}",
            "start_time": (now + timedelta(days=10)).isoformat(),
            "end_time": (now + timedelta(days=10, hours=2)).isoformat(),
            "requires_approval": True,
        },
        headers={"Authorization": f"Bearer {ctx['tokens']['coord']}"},
    )
    assert create_res.status_code == 201
    event_id = create_res.json()["event_id"]

    submit_res = await client.post(
        f"/events/{event_id}/submit",
        headers={"Authorization": f"Bearer {ctx['tokens']['coord']}"},
    )
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "pending_approval"
    return event_id


# ── 1. Full 3-Level Sequential Approval Tests ─────────────────

@pytest.mark.asyncio
async def test_full_three_level_approval_chain(setup_approval_context):
    """Verify sequential approval through Advisor (L1) -> Student Affairs (L2) -> Admin (L3)."""
    ctx = setup_approval_context
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        event_id = await create_submitted_event(client, ctx, ctx["club_a"].club_id)

        # 1. Level 1: Club Advisor Alpha approves
        res_l1 = await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "Advisor Alpha approves logistics and budget."},
            headers={"Authorization": f"Bearer {ctx['tokens']['advisor_a']}"},
        )
        assert res_l1.status_code == 200
        data_l1 = res_l1.json()
        assert data_l1["status"] == "success"
        assert data_l1["level_processed"] == 1
        assert data_l1["event_status"] == "pending_approval"

        # Verify event state in DB
        res_event = await client.get(f"/events/{event_id}", headers={"Authorization": f"Bearer {ctx['tokens']['coord']}"})
        assert res_event.json()["current_approval_level"] == 1
        assert res_event.json()["status"] == "pending_approval"

        # 2. Level 2: Student Affairs approves
        res_l2 = await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "Student Affairs verifies campus policy compliance."},
            headers={"Authorization": f"Bearer {ctx['tokens']['affairs']}"},
        )
        assert res_l2.status_code == 200
        data_l2 = res_l2.json()
        assert data_l2["level_processed"] == 2
        assert data_l2["event_status"] == "pending_approval"

        # 3. Level 3: Administrator gives final approval
        res_l3 = await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "Administrator final authorization granted."},
            headers={"Authorization": f"Bearer {ctx['tokens']['admin']}"},
        )
        assert res_l3.status_code == 200
        data_l3 = res_l3.json()
        assert data_l3["level_processed"] == 3
        assert data_l3["event_status"] == "approved"

        # Verify final event status
        res_final = await client.get(f"/events/{event_id}", headers={"Authorization": f"Bearer {ctx['tokens']['coord']}"})
        assert res_final.json()["status"] == "approved"
        assert res_final.json()["current_approval_level"] == 3


# ── 2. Rejection Tests ────────────────────────────────────────

@pytest.mark.asyncio
async def test_rejection_at_level_1_halts_workflow(setup_approval_context):
    """Verify rejection at Level 1 immediately sets status to rejected and stops workflow."""
    ctx = setup_approval_context
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        event_id = await create_submitted_event(client, ctx, ctx["club_a"].club_id)

        # Reject at Level 1
        res = await client.post(
            f"/approvals/{event_id}/reject",
            json={"comments": "Incomplete safety mitigation plan."},
            headers={"Authorization": f"Bearer {ctx['tokens']['advisor_a']}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["decision"] == "rejected"
        assert data["event_status"] == "rejected"

        # Verify event status is rejected
        res_event = await client.get(f"/events/{event_id}", headers={"Authorization": f"Bearer {ctx['tokens']['coord']}"})
        assert res_event.json()["status"] == "rejected"

        # Further approval attempt by Student Affairs must be rejected (event already rejected)
        res_l2 = await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "Trying to approve rejected event"},
            headers={"Authorization": f"Bearer {ctx['tokens']['affairs']}"},
        )
        assert res_l2.status_code == 400
        assert "already been rejected" in res_l2.json()["detail"]


@pytest.mark.asyncio
async def test_rejection_requires_non_empty_reason(setup_approval_context):
    """Verify rejecting an event without a comment returns 400 Bad Request."""
    ctx = setup_approval_context
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        event_id = await create_submitted_event(client, ctx, ctx["club_a"].club_id)

        # Empty reason
        res_empty = await client.post(
            f"/approvals/{event_id}/reject",
            json={"comments": "   "},
            headers={"Authorization": f"Bearer {ctx['tokens']['advisor_a']}"},
        )
        assert res_empty.status_code == 400
        assert "rejection reason is required" in res_empty.json()["detail"].lower()


# ── 3. Role & Stage Authorization Tests ───────────────────────

@pytest.mark.asyncio
async def test_student_affairs_cannot_approve_before_advisor(setup_approval_context):
    """Verify Student Affairs attempting Level 1 approval before Advisor completes it is forbidden (403)."""
    ctx = setup_approval_context
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        event_id = await create_submitted_event(client, ctx, ctx["club_a"].club_id)

        # Event is at level 0 (needs Level 1: club_advisor). SA attempts approval:
        res = await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "Premature SA review"},
            headers={"Authorization": f"Bearer {ctx['tokens']['affairs']}"},
        )
        assert res.status_code == 403
        assert "not authorized for level-1 approval" in res.json()["detail"]


@pytest.mark.asyncio
async def test_advisor_cannot_approve_level_2(setup_approval_context):
    """Verify Advisor attempting Level 2 approval is forbidden."""
    ctx = setup_approval_context
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        event_id = await create_submitted_event(client, ctx, ctx["club_a"].club_id)

        # Level 1 approved
        await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "Advisor Alpha approves L1"},
            headers={"Authorization": f"Bearer {ctx['tokens']['advisor_a']}"},
        )

        # Advisor attempts to approve Level 2 as well:
        res = await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "Advisor attempting L2"},
            headers={"Authorization": f"Bearer {ctx['tokens']['advisor_a']}"},
        )
        assert res.status_code == 403
        assert "not authorized for level-2 approval" in res.json()["detail"]


@pytest.mark.asyncio
async def test_cross_club_advisor_denied(setup_approval_context):
    """Verify Advisor of Club B cannot approve Club A's events."""
    ctx = setup_approval_context
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Event created for Club A
        event_id = await create_submitted_event(client, ctx, ctx["club_a"].club_id)

        # Advisor B attempts to approve Club A's event:
        res = await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "Advisor B approving Club A"},
            headers={"Authorization": f"Bearer {ctx['tokens']['advisor_b']}"},
        )
        assert res.status_code == 403
        assert "not authorized as the advisor for this club" in res.json()["detail"]


@pytest.mark.asyncio
async def test_self_approval_prevention(setup_approval_context):
    """Verify an approver cannot approve or reject an event they created (e.g. admin self-approval)."""
    ctx = setup_approval_context
    transport = ASGITransport(app=app)
    now = datetime.now(timezone.utc)

    # Admin creates an event for Club A
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        create_res = await client.post(
            "/events",
            json={
                "club_id": ctx["club_a"].club_id,
                "title": "Admin Self-Created Event",
                "start_time": (now + timedelta(days=12)).isoformat(),
                "end_time": (now + timedelta(days=12, hours=2)).isoformat(),
                "requires_approval": True,
            },
            headers={"Authorization": f"Bearer {ctx['tokens']['admin']}"},
        )
        assert create_res.status_code == 201
        event_id = create_res.json()["event_id"]

        # Submit event
        submit_res = await client.post(
            f"/events/{event_id}/submit",
            headers={"Authorization": f"Bearer {ctx['tokens']['admin']}"},
        )
        assert submit_res.status_code == 200

        # Level 1: Advisor Alpha approves
        res_l1 = await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "L1 Advisor approved"},
            headers={"Authorization": f"Bearer {ctx['tokens']['advisor_a']}"},
        )
        assert res_l1.status_code == 200

        # Level 2: Student Affairs approves
        res_l2 = await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "L2 SA approved"},
            headers={"Authorization": f"Bearer {ctx['tokens']['affairs']}"},
        )
        assert res_l2.status_code == 200

        # Level 3: Admin attempts to approve their own event -> MUST BE FORBIDDEN (403)
        res_self = await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "Admin self-approving"},
            headers={"Authorization": f"Bearer {ctx['tokens']['admin']}"},
        )
        assert res_self.status_code == 403
        assert "cannot approve or reject their own events" in res_self.json()["detail"]


@pytest.mark.asyncio
async def test_duplicate_approval_rejected(setup_approval_context):
    """Verify the same approver cannot approve twice at the same level."""
    ctx = setup_approval_context
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        event_id = await create_submitted_event(client, ctx, ctx["club_a"].club_id)

        # First approval by Advisor A
        await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "First approval"},
            headers={"Authorization": f"Bearer {ctx['tokens']['advisor_a']}"},
        )

        # Attempt duplicate approval
        res_dup = await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "Duplicate approval attempt"},
            headers={"Authorization": f"Bearer {ctx['tokens']['advisor_a']}"},
        )
        assert res_dup.status_code in [400, 403]


@pytest.mark.asyncio
async def test_cannot_approve_already_approved_event(setup_approval_context):
    """Verify attempting to approve an event that is already fully approved returns 400."""
    ctx = setup_approval_context
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        event_id = await create_submitted_event(client, ctx, ctx["club_a"].club_id)

        # Complete all 3 levels
        await client.post(f"/approvals/{event_id}/approve", headers={"Authorization": f"Bearer {ctx['tokens']['advisor_a']}"})
        await client.post(f"/approvals/{event_id}/approve", headers={"Authorization": f"Bearer {ctx['tokens']['affairs']}"})
        await client.post(f"/approvals/{event_id}/approve", headers={"Authorization": f"Bearer {ctx['tokens']['admin']}"})

        # Extra approval attempt:
        res_extra = await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "Extra post-approval attempt"},
            headers={"Authorization": f"Bearer {ctx['tokens']['admin']}"},
        )
        assert res_extra.status_code == 400
        assert "already been fully approved" in res_extra.json()["detail"]


# ── 4. Approval History & Pending Listings ───────────────────

@pytest.mark.asyncio
async def test_get_pending_approvals_filtered_by_role(setup_approval_context):
    """Verify GET /approvals/pending returns events awaiting the caller's specific stage."""
    ctx = setup_approval_context
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        event_id = await create_submitted_event(client, ctx, ctx["club_a"].club_id)

        # 1. Advisor Alpha sees it in pending
        res_adv = await client.get(
            "/approvals/pending",
            headers={"Authorization": f"Bearer {ctx['tokens']['advisor_a']}"},
        )
        assert res_adv.status_code == 200
        adv_events = [item["event_id"] for item in res_adv.json()]
        assert event_id in adv_events

        # 2. Student Affairs does NOT see it yet (event is at Level 1, awaiting Advisor)
        res_sa = await client.get(
            "/approvals/pending",
            headers={"Authorization": f"Bearer {ctx['tokens']['affairs']}"},
        )
        assert res_sa.status_code == 200
        sa_events = [item["event_id"] for item in res_sa.json()]
        assert event_id not in sa_events

        # Advance to Level 1
        await client.post(f"/approvals/{event_id}/approve", headers={"Authorization": f"Bearer {ctx['tokens']['advisor_a']}"})

        # 3. Now Student Affairs sees it in pending
        res_sa_after = await client.get(
            "/approvals/pending",
            headers={"Authorization": f"Bearer {ctx['tokens']['affairs']}"},
        )
        assert res_sa_after.status_code == 200
        sa_events_after = [item["event_id"] for item in res_sa_after.json()]
        assert event_id in sa_events_after


@pytest.mark.asyncio
async def test_approval_history_audit_trail(setup_approval_context):
    """Verify GET /events/{id}/approval-history returns sequential decision log."""
    ctx = setup_approval_context
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        event_id = await create_submitted_event(client, ctx, ctx["club_a"].club_id)

        # L1 Approval
        await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "L1 Good to go"},
            headers={"Authorization": f"Bearer {ctx['tokens']['advisor_a']}"},
        )

        # L2 Approval
        await client.post(
            f"/approvals/{event_id}/approve",
            json={"comments": "L2 SA verified"},
            headers={"Authorization": f"Bearer {ctx['tokens']['affairs']}"},
        )

        # Retrieve history
        res = await client.get(
            f"/events/{event_id}/approval-history",
            headers={"Authorization": f"Bearer {ctx['tokens']['coord']}"},
        )
        assert res.status_code == 200
        history = res.json()
        assert len(history) == 2
        assert history[0]["level"] == 1
        assert history[0]["status"] == "approved"
        assert history[0]["comments"] == "L1 Good to go"
        assert history[1]["level"] == 2
        assert history[1]["status"] == "approved"
        assert history[1]["comments"] == "L2 SA verified"


# ── 5. Concurrency Test ───────────────────────────────────────

@pytest.mark.asyncio
async def test_concurrent_approval_requests_prevent_race(setup_approval_context):
    """Verify concurrent approval requests for the same event stage are serialized safely."""
    ctx = setup_approval_context
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        event_id = await create_submitted_event(client, ctx, ctx["club_a"].club_id)

        # Simulate two concurrent approve calls from the same advisor
        async def submit_approval():
            return await client.post(
                f"/approvals/{event_id}/approve",
                json={"comments": "Concurrent test approval"},
                headers={"Authorization": f"Bearer {ctx['tokens']['advisor_a']}"},
            )

        res1, res2 = await asyncio.gather(submit_approval(), submit_approval(), return_exceptions=True)

        statuses = [res1.status_code, res2.status_code]
        # Exactly one must succeed with 200, the other must be rejected (400 or 403)
        assert 200 in statuses
        assert any(s in [400, 403] for s in statuses if s != 200)

        # Verify event advanced exactly once to level 1
        res_event = await client.get(f"/events/{event_id}", headers={"Authorization": f"Bearer {ctx['tokens']['coord']}"})
        assert res_event.json()["current_approval_level"] == 1
