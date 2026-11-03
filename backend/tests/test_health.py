"""Automated test suite for health and database readiness probes.

Tests liveness, readiness against campus_events_dev, simulated database failures,
isolation from database during liveness checks, and credential security.
"""

from unittest.mock import patch
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_root_endpoint():
    """Verify root endpoint returns 200 and valid navigation metadata."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == settings.APP_NAME
        assert data["environment"] == settings.APP_ENV
        assert data["health_url"] == "/health"
        assert data["readiness_url"] == "/health/ready"


@pytest.mark.asyncio
async def test_health_liveness_endpoint():
    """Verify GET /health returns 200 and {'status': 'ok'}."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_health_does_not_query_database():
    """Verify GET /health does not invoke check_db_connectivity or query the database."""
    transport = ASGITransport(app=app)
    with patch("app.api.health.check_db_connectivity") as mock_check:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health")
            assert response.status_code == 200
            assert response.json() == {"status": "ok"}
            mock_check.assert_not_called()


@pytest.mark.asyncio
async def test_health_ready_success():
    """Verify GET /health/ready returns 200 and {'status': 'ready', 'database': 'connected'} when DB is connected."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health/ready")
        assert response.status_code == 200
        assert response.json() == {
            "status": "ready",
            "database": "connected"
        }


@pytest.mark.asyncio
async def test_health_ready_failure_simulation():
    """Verify GET /health/ready returns 503 and {'status': 'not_ready', 'database': 'unavailable'} when DB fails."""
    transport = ASGITransport(app=app)
    with patch("app.api.health.check_db_connectivity", return_value=(False, "Database connection unavailable")):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health/ready")
            assert response.status_code == 503
            assert response.json() == {
                "status": "not_ready",
                "database": "unavailable"
            }


@pytest.mark.asyncio
async def test_health_ready_no_credential_leak():
    """Verify error responses never expose credentials, usernames, connection strings, or stack traces."""
    transport = ASGITransport(app=app)
    # Simulate an error with sensitive exception info
    with patch("app.api.health.check_db_connectivity", return_value=(False, "postgresql+psycopg://secret_user:super_secret_pw@db.internal:5432/campus_events_dev")):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health/ready")
            assert response.status_code == 503
            data = response.json()
            assert data == {
                "status": "not_ready",
                "database": "unavailable"
            }
            raw_text = response.text.lower()
            assert "secret" not in raw_text
            assert "password" not in raw_text
            assert "super_secret_pw" not in raw_text
            assert "db.internal" not in raw_text
            assert "5432" not in raw_text
            assert "traceback" not in raw_text


@pytest.mark.asyncio
async def test_api_v1_versioned_health_endpoints():
    """Verify versioned /api/v1/health and /api/v1/health/ready endpoints work consistently."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Liveness
        res_live = await client.get(f"{settings.API_V1_PREFIX}/health")
        assert res_live.status_code == 200
        assert res_live.json() == {"status": "ok"}

        # Readiness
        res_ready = await client.get(f"{settings.API_V1_PREFIX}/health/ready")
        assert res_ready.status_code == 200
        assert res_ready.json() == {
            "status": "ready",
            "database": "connected"
        }
