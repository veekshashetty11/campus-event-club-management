"""Main API router aggregating all versioned route modules."""

from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.auth import router as auth_router

api_router = APIRouter()

# Include health & readiness endpoints
api_router.include_router(health_router)

# Include authentication & RBAC endpoints
api_router.include_router(auth_router)
