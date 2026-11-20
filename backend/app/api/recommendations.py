"""AI-based Event Recommendation API.

Implements personalized event and club recommendations using pure SQL + Python
scoring logic — no external ML libraries required.

Endpoints:
- GET /recommendations/events          — top 10 personalised upcoming events
- GET /recommendations/events/similar/{event_id} — up to 5 similar events
- GET /recommendations/clubs           — top 5 clubs to join
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.api.deps import get_current_user
from app.models.auth import User
from app.models.event import Club, ClubMember, Event, EventCategory, EventRegistration, Venue
from app.schemas.recommendations import (
    RecommendedEventResponse,
    RecommendedEventsResponse,
    SimilarEventResponse,
    SimilarEventsResponse,
    RecommendedClubResponse,
    RecommendedClubsResponse,
)

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _build_event_response(event: Event, score: int) -> RecommendedEventResponse:
    return RecommendedEventResponse(
        event_id=event.event_id,
        title=event.title,
        description=event.description,
        start_time=event.start_time,
        end_time=event.end_time,
        status=event.status,
        is_public=event.is_public,
        tags=event.tags,
        registered_count=event.registered_count,
        max_capacity=event.max_capacity,
        club_id=event.club_id,
        club_name=event.club.name if event.club else None,
        category_id=event.category_id,
        category_name=event.category.name if event.category else None,
        venue_id=event.venue_id,
        venue_name=event.venue.name if event.venue else None,
        banner_url=event.banner_url,
        score=score,
    )


def _build_similar_response(event: Event, score: int) -> SimilarEventResponse:
    return SimilarEventResponse(
        event_id=event.event_id,
        title=event.title,
        description=event.description,
        start_time=event.start_time,
        end_time=event.end_time,
        status=event.status,
        tags=event.tags,
        registered_count=event.registered_count,
        max_capacity=event.max_capacity,
        club_id=event.club_id,
        club_name=event.club.name if event.club else None,
        category_id=event.category_id,
        category_name=event.category.name if event.category else None,
        venue_id=event.venue_id,
        venue_name=event.venue.name if event.venue else None,
        banner_url=event.banner_url,
        score=score,
    )


# ---------------------------------------------------------------------------
# Scoring helpers
# ---------------------------------------------------------------------------

def _get_user_history(db: Session, user_id) -> dict:
    """
    Returns a dict with:
      - top_category_id: int | None  (most-registered category)
      - registered_event_ids: set[int]
      - attended_tags: set[str]      (union of tags from past registered events)
      - member_club_ids: set[int]
    """
    # Events the user is registered for (any non-cancelled status)
    reg_rows = (
        db.query(EventRegistration.event_id)
        .filter(
            EventRegistration.user_id == user_id,
            EventRegistration.status.notin_(["cancelled"]),
        )
        .all()
    )
    registered_event_ids = {r.event_id for r in reg_rows}

    attended_tags: set = set()
    top_category_id: Optional[int] = None

    if registered_event_ids:
        past_events = (
            db.query(Event)
            .filter(Event.event_id.in_(registered_event_ids))
            .all()
        )
        # Collect tags
        for ev in past_events:
            if ev.tags:
                attended_tags.update(ev.tags)

        # Find top category by frequency
        cat_counts: dict = {}
        for ev in past_events:
            if ev.category_id:
                cat_counts[ev.category_id] = cat_counts.get(ev.category_id, 0) + 1
        if cat_counts:
            top_category_id = max(cat_counts, key=lambda k: cat_counts[k])

    # Active club memberships
    mem_rows = (
        db.query(ClubMember.club_id)
        .filter(ClubMember.user_id == user_id, ClubMember.is_active == True)
        .all()
    )
    member_club_ids = {r.club_id for r in mem_rows}

    return {
        "registered_event_ids": registered_event_ids,
        "attended_tags": attended_tags,
        "top_category_id": top_category_id,
        "member_club_ids": member_club_ids,
    }


def _score_event(event: Event, history: dict, user_department_id: Optional[int]) -> int:
    score = 0

    # +3 if user is an active member of the event's club
    if event.club_id in history["member_club_ids"]:
        score += 3

    # +2 if the event's category matches user's top registered category
    if history["top_category_id"] and event.category_id == history["top_category_id"]:
        score += 2

    # +2 if the event shares tags with events user previously registered for
    if event.tags and history["attended_tags"]:
        overlap = set(event.tags) & history["attended_tags"]
        if overlap:
            score += 2

    # +1 if the event's club is in the user's department
    if user_department_id and event.club and event.club.department_id == user_department_id:
        score += 1

    return score


# ---------------------------------------------------------------------------
# GET /recommendations/events
# ---------------------------------------------------------------------------

@router.get(
    "/events",
    response_model=RecommendedEventsResponse,
    summary="Get personalised event recommendations",
    status_code=status.HTTP_200_OK,
)
def get_recommended_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return top 10 personalised upcoming events ranked by a scoring heuristic."""
    now = _now_utc()

    # Candidate events: approved/published, upcoming, public, not full
    candidates_q = (
        db.query(Event)
        .filter(
            Event.status.in_(["approved", "published"]),
            Event.start_time > now,
            Event.is_public == True,
        )
    )
    candidates: List[Event] = candidates_q.all()

    # Filter out full events
    candidates = [
        e for e in candidates
        if e.max_capacity is None or e.registered_count < e.max_capacity
    ]

    # Get user history
    history = _get_user_history(db, current_user.user_id)

    # Filter out events user is already registered for
    candidates = [
        e for e in candidates
        if e.event_id not in history["registered_event_ids"]
    ]

    is_new_user = not history["registered_event_ids"] and not history["member_club_ids"]

    if is_new_user:
        # Fallback for new users: sort by popularity
        candidates.sort(key=lambda e: (-e.registered_count, e.start_time))
        scored = [(e, 0) for e in candidates[:10]]
    else:
        # Score each candidate
        scored = [
            (e, _score_event(e, history, current_user.department_id))
            for e in candidates
        ]
        # Sort by score DESC, start_time ASC
        scored.sort(key=lambda x: (-x[1], x[0].start_time))
        scored = scored[:10]

    events_out = [_build_event_response(e, s) for e, s in scored]
    return RecommendedEventsResponse(total=len(events_out), events=events_out)


# ---------------------------------------------------------------------------
# GET /recommendations/events/similar/{event_id}
# ---------------------------------------------------------------------------

@router.get(
    "/events/similar/{event_id}",
    response_model=SimilarEventsResponse,
    summary="Get similar events for a given event",
    status_code=status.HTTP_200_OK,
)
def get_similar_events(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return up to 5 events similar to the given event."""
    now = _now_utc()

    source = db.query(Event).filter(Event.event_id == event_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    source_tags = set(source.tags or [])

    # Candidate pool: all events that have not ended, excluding source
    candidates: List[Event] = (
        db.query(Event)
        .filter(
            Event.event_id != event_id,
            Event.end_time > now,
        )
        .all()
    )

    def _similarity(e: Event) -> int:
        sc = 0
        # +3 same category
        if source.category_id and e.category_id == source.category_id:
            sc += 3
        # +2 per matching tag
        if source_tags and e.tags:
            overlap = source_tags & set(e.tags)
            sc += 2 * len(overlap)
        # +1 same club
        if e.club_id == source.club_id:
            sc += 1
        # +1 same venue
        if source.venue_id and e.venue_id == source.venue_id:
            sc += 1
        return sc

    scored = [(e, _similarity(e)) for e in candidates]
    # Only keep events with at least some similarity
    scored = [(e, s) for e, s in scored if s > 0]
    scored.sort(key=lambda x: (-x[1], x[0].start_time))
    scored = scored[:5]

    events_out = [_build_similar_response(e, s) for e, s in scored]
    return SimilarEventsResponse(
        source_event_id=event_id,
        total=len(events_out),
        events=events_out,
    )


# ---------------------------------------------------------------------------
# GET /recommendations/clubs
# ---------------------------------------------------------------------------

@router.get(
    "/clubs",
    response_model=RecommendedClubsResponse,
    summary="Get recommended clubs to join",
    status_code=status.HTTP_200_OK,
)
def get_recommended_clubs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return top 5 clubs the user is not yet a member of, ranked by relevance."""
    # Clubs the user is already a member of
    already_member_rows = (
        db.query(ClubMember.club_id)
        .filter(ClubMember.user_id == current_user.user_id, ClubMember.is_active == True)
        .all()
    )
    already_member_ids = {r.club_id for r in already_member_rows}

    # Active clubs user is NOT a member of
    candidate_clubs: List[Club] = (
        db.query(Club)
        .filter(
            Club.status.in_(["active", "approved"]),
            Club.club_id.notin_(already_member_ids) if already_member_ids else True,
        )
        .all()
    )

    # --- User category history ---
    history = _get_user_history(db, current_user.user_id)
    past_category_ids: set = set()
    if history["registered_event_ids"]:
        past_events = (
            db.query(Event.category_id)
            .filter(
                Event.event_id.in_(history["registered_event_ids"]),
                Event.category_id.isnot(None),
            )
            .all()
        )
        past_category_ids = {r.category_id for r in past_events}

    # --- Department peers: users in same department ---
    dept_peer_ids: set = set()
    if current_user.department_id:
        peer_rows = (
            db.query(User.user_id)
            .filter(
                User.department_id == current_user.department_id,
                User.user_id != current_user.user_id,
            )
            .all()
        )
        dept_peer_ids = {r.user_id for r in peer_rows}

    # Build a mapping of club_id -> set of active member user_ids for peer scoring
    # Only load memberships for candidate clubs to avoid huge queries
    candidate_club_ids = [c.club_id for c in candidate_clubs]

    club_member_map: dict = {}
    if candidate_club_ids:
        mem_rows = (
            db.query(ClubMember.club_id, ClubMember.user_id)
            .filter(
                ClubMember.club_id.in_(candidate_club_ids),
                ClubMember.is_active == True,
            )
            .all()
        )
        for row in mem_rows:
            club_member_map.setdefault(row.club_id, set()).add(row.user_id)

    # Club categories: categories of events hosted by each candidate club
    club_category_map: dict = {}
    if candidate_club_ids:
        cat_rows = (
            db.query(Event.club_id, Event.category_id)
            .filter(
                Event.club_id.in_(candidate_club_ids),
                Event.category_id.isnot(None),
            )
            .all()
        )
        for row in cat_rows:
            club_category_map.setdefault(row.club_id, set()).add(row.category_id)

    # Club member counts
    club_member_count: dict = {cid: len(members) for cid, members in club_member_map.items()}

    def _score_club(club: Club) -> int:
        sc = 0
        # +2 if same department
        if current_user.department_id and club.department_id == current_user.department_id:
            sc += 2
        # +1 per dept peer who is a member
        members = club_member_map.get(club.club_id, set())
        peer_members = members & dept_peer_ids
        sc += len(peer_members)
        # +3 if club hosted events in categories user has attended
        club_cats = club_category_map.get(club.club_id, set())
        if past_category_ids and club_cats & past_category_ids:
            sc += 3
        return sc

    scored = [(c, _score_club(c)) for c in candidate_clubs]
    scored.sort(key=lambda x: -x[1])
    scored = scored[:5]

    clubs_out = [
        RecommendedClubResponse(
            club_id=c.club_id,
            name=c.name,
            short_name=c.short_name,
            description=c.description,
            logo_url=c.logo_url,
            department_id=c.department_id,
            status=c.status,
            member_count=club_member_count.get(c.club_id, 0),
            score=s,
        )
        for c, s in scored
    ]
    return RecommendedClubsResponse(total=len(clubs_out), clubs=clubs_out)
