"""Main API router aggregating all versioned route modules."""

from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.events import router as events_router
from app.api.approvals import router as approvals_router, events_approval_router
from app.api.registrations import (
    events_registration_router,
    users_registration_router,
    maintenance_router,
)

api_router = APIRouter()

# Include health & readiness endpoints
api_router.include_router(health_router)

# Include authentication & RBAC endpoints
api_router.include_router(auth_router)

# Include event management endpoints
api_router.include_router(events_router)

# Include approval workflow endpoints
api_router.include_router(approvals_router)
api_router.include_router(events_approval_router)

# Include event registration and waitlist endpoints
api_router.include_router(events_registration_router)
api_router.include_router(users_registration_router)

# Include maintenance endpoints
api_router.include_router(maintenance_router)
