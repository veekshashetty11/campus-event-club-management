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
from app.api.venues import router as venues_router
from app.api.equipment import router as equipment_router
from app.api.attendance import router as attendance_router
from app.api.feedback import router as feedback_router
from app.api.certificates import (
    events_router as certificates_events_router,
    certificates_router,
    users_router as certificates_users_router,
)
from app.api.budgets import clubs_budget_router, expenses_router, sponsors_router
from app.api.notifications import router as notifications_router
from app.api.badges import router as badges_router
from app.api.analytics import router as analytics_router
from app.api.recommendations import router as recommendations_router

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

# Include venue & equipment booking endpoints
api_router.include_router(venues_router)
api_router.include_router(equipment_router)

# Include attendance, feedback, and certificate endpoints
api_router.include_router(attendance_router)
api_router.include_router(feedback_router)
api_router.include_router(certificates_events_router)
api_router.include_router(certificates_router)
api_router.include_router(certificates_users_router)

# Include budgets, expenses, and sponsorship endpoints
api_router.include_router(clubs_budget_router)
api_router.include_router(expenses_router)
api_router.include_router(sponsors_router)

# Include notifications endpoints
api_router.include_router(notifications_router)

# Include badges & analytics endpoints
api_router.include_router(badges_router)
api_router.include_router(analytics_router)

# Include recommendations endpoints
api_router.include_router(recommendations_router)
