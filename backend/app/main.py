"""FastAPI Application Entry Point.

Initializes the FastAPI application, mounts middleware (CORS),
registers versioned routers and health endpoints, and manages engine lifecycles.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.db.connection import engine, check_db_connectivity
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.router import api_router

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager: verifies DB readiness on boot and disposes pool on shutdown."""
    logger.info(f"Starting {settings.APP_NAME} in '{settings.APP_ENV}' mode...")
    logger.info(f"Configured CORS origins: {settings.cors_origins_list}")

    # Synchronous probe on startup
    connected, error = check_db_connectivity()
    if connected:
        logger.info(f"Database connection verified successfully -> target: {settings.database_name}")
    else:
        logger.warning(f"Database connection warning on startup: {error}")

    yield

    logger.info("Shutting down application and disposing database connection pool...")
    engine.dispose()
    logger.info("Database connection pool cleanly closed.")


def create_app() -> FastAPI:
    """Factory function to build and configure the FastAPI application."""
    app = FastAPI(
        title=settings.APP_NAME,
        description="RESTful API for the Campus Event & Club Management System",
        version="1.0.0",
        docs_url="/docs" if settings.DEBUG or settings.APP_ENV != "production" else None,
        redoc_url="/redoc" if settings.DEBUG or settings.APP_ENV != "production" else None,
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
        lifespan=lifespan,
    )

    # Configure CORS strictly via environment settings (no wildcard '*' by default)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Mount health router at root for direct /health and /health/ready access
    app.include_router(health_router)

    # Mount auth router at root for direct /auth/login and /auth/me access
    app.include_router(auth_router)

    # Mount API v1 router for versioned routes (/api/v1/...)
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    @app.get(
        "/",
        tags=["Root"],
        summary="API Root",
        status_code=status.HTTP_200_OK
    )
    def root():
        return {
            "name": settings.APP_NAME,
            "version": "1.0.0",
            "environment": settings.APP_ENV,
            "docs_url": "/docs",
            "health_url": "/health",
            "readiness_url": "/health/ready",
            "auth_login_url": "/auth/login",
            "auth_me_url": "/auth/me",
        }

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request, exc):
        """Sanitizes unhandled exceptions to prevent stack trace leaks in responses."""
        logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal Server Error",
                "message": "An unexpected error occurred. Please contact the administrator."
            }
        )

    return app


app = create_app()
