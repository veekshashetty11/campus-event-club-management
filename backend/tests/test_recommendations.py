"""Automated test suite for AI Recommendations API endpoints."""

import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.orm import Session
from app.main import app
from app.db.connection import SessionLocal
from app.core.security import hash_password, create_access_token
from app.models.auth import User, Role
from app.models.event import Club, Venue, EventCategory, Event

@pytest.fixture(scope="module")
def setup_recommendation_context():
    db: Session = SessionLocal()
    roles = {r.name: r for r in db.query(Role).all()}
    tag = uuid.uuid4().hex[:6]

    student = User(
        user_id=uuid.uuid4(),
        email=f"rec_student_{tag}@campus.edu",
        password_hash=hash_password("Password123!"),
        full_name=f"Rec Student {tag}",
        role_id=roles["student"].role_id,
        status="active",
        is_email_verified=True,
    )
    admin = User(
        user_id=uuid.uuid4(),
        email=f"rec_admin_{tag}@campus.edu",
        password_hash=hash_password("Password123!"),
        full_name=f"Rec Admin {tag}",
        role_id=roles["administrator"].role_id,
        status="active",
        is_email_verified=True,
    )
    db.add_all([student, admin])
    db.commit()

    club = Club(
        name=f"AI Innovators {tag}",
        short_name=f"AII_{tag}",
        description="AI research society",
        status="active",
        president_id=admin.user_id,
    )
    venue = Venue(
        name=f"Innovation Lab {tag}",
        building="Research Complex",
        capacity=80,
        is_active=True,
    )
    cat = EventCategory(
        name=f"Artificial Intelligence {tag}",
        description="AI & Machine Learning",
    )
    db.add_all([club, venue, cat])
    db.commit()

    now = datetime.now(timezone.utc)
    ev = Event(
        title=f"Hands-On Deep Learning {tag}",
        description="Build neural networks from scratch",
        start_time=now + timedelta(days=3),
        end_time=now + timedelta(days=3, hours=4),
        registration_deadline=now + timedelta(days=2),
        max_capacity=50,
        registered_count=5,
        status="published",
        is_public=True,
        tags=["ai", "deep-learning", "neural-nets"],
        club_id=club.club_id,
        category_id=cat.category_id,
        venue_id=venue.venue_id,
        created_by=admin.user_id,
    )
    db.add(ev)
    db.commit()

    token = create_access_token(subject=str(student.user_id), claims={"role": "student"})

    ctx = {
        "student": student,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
        "event": ev,
        "club": club,
        "venue": venue,
        "cat": cat,
    }

    yield ctx

    cleanup_db = SessionLocal()
    cleanup_db.query(Event).filter(Event.event_id == ev.event_id).delete(synchronize_session=False)
    cleanup_db.query(Club).filter(Club.club_id == club.club_id).delete(synchronize_session=False)
    cleanup_db.query(Venue).filter(Venue.venue_id == venue.venue_id).delete(synchronize_session=False)
    cleanup_db.query(EventCategory).filter(EventCategory.category_id == cat.category_id).delete(synchronize_session=False)
    cleanup_db.query(User).filter(User.user_id.in_([student.user_id, admin.user_id])).delete(synchronize_session=False)
    cleanup_db.commit()
    cleanup_db.close()


@pytest.mark.asyncio
async def test_get_recommended_events_unauthenticated():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/recommendations/events")
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_recommended_events(setup_recommendation_context):
    ctx = setup_recommendation_context
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/recommendations/events", headers=ctx["headers"])
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        assert "total" in data
        assert isinstance(data["events"], list)


@pytest.mark.asyncio
async def test_get_similar_events(setup_recommendation_context):
    ctx = setup_recommendation_context
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/recommendations/events/similar/{ctx['event'].event_id}",
            headers=ctx["headers"],
        )
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        assert data["source_event_id"] == ctx["event"].event_id


@pytest.mark.asyncio
async def test_get_recommended_clubs(setup_recommendation_context):
    ctx = setup_recommendation_context
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/recommendations/clubs", headers=ctx["headers"])
        assert response.status_code == 200
        data = response.json()
        assert "clubs" in data
        assert "total" in data
