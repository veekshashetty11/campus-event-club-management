"""Main API router aggregating all versioned route modules."""

from fastapi import APIRouter
from app.api.health import router as health_router

api_router = APIRouter()

# Include health & readiness endpoints under API prefix
api_router.include_router(health_router)
