"""Health and readiness check endpoints.

Provides liveness and database readiness probes for monitoring,
container health checks, and frontend status indicators.
"""

from fastapi import APIRouter, status, Response
from typing import Dict
from app.db.connection import check_db_connectivity

router = APIRouter(tags=["Health & Monitoring"])


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Application Health Probe",
    description="Confirms that the FastAPI application process is running. Does NOT query PostgreSQL."
)
def health_check() -> Dict[str, str]:
    """Lightweight liveness check returning status 'ok' without database overhead."""
    return {"status": "ok"}


@router.get(
    "/health/ready",
    summary="Database Readiness Probe",
    description="Checks live database connectivity using a safe probe (SELECT 1). Returns 200 if connected, 503 if unavailable."
)
def readiness_check(response: Response) -> Dict[str, str]:
    """Tests live connectivity to PostgreSQL without leaking credentials or stack traces."""
    is_connected, _ = check_db_connectivity()

    if is_connected:
        response.status_code = status.HTTP_200_OK
        return {
            "status": "ready",
            "database": "connected"
        }

    response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "not_ready",
        "database": "unavailable"
    }
