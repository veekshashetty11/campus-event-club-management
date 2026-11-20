"""Pydantic response schemas for the Recommendations API."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class RecommendedEventResponse(BaseModel):
    """A single recommended event with its relevance score."""

    event_id: int
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    status: str
    is_public: bool
    tags: Optional[List[str]] = None
    registered_count: int
    max_capacity: Optional[int] = None
    club_id: int
    club_name: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    venue_id: Optional[int] = None
    venue_name: Optional[str] = None
    banner_url: Optional[str] = None
    score: int = Field(description="Relevance score used for ranking")

    class Config:
        from_attributes = True


class RecommendedEventsResponse(BaseModel):
    """Paginated list of recommended events."""

    total: int
    events: List[RecommendedEventResponse]


class SimilarEventResponse(BaseModel):
    """A single similar event with its similarity score."""

    event_id: int
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    status: str
    tags: Optional[List[str]] = None
    registered_count: int
    max_capacity: Optional[int] = None
    club_id: int
    club_name: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    venue_id: Optional[int] = None
    venue_name: Optional[str] = None
    banner_url: Optional[str] = None
    score: int = Field(description="Similarity score used for ranking")

    class Config:
        from_attributes = True


class SimilarEventsResponse(BaseModel):
    """List of similar events for a given source event."""

    source_event_id: int
    total: int
    events: List[SimilarEventResponse]


class RecommendedClubResponse(BaseModel):
    """A single recommended club with its relevance score."""

    club_id: int
    name: str
    short_name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    department_id: Optional[int] = None
    status: str
    member_count: Optional[int] = None
    score: int = Field(description="Relevance score used for ranking")

    class Config:
        from_attributes = True


class RecommendedClubsResponse(BaseModel):
    """List of recommended clubs to join."""

    total: int
    clubs: List[RecommendedClubResponse]
