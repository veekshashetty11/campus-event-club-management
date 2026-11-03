"""Database connection and session management module.

Manages the synchronous SQLAlchemy engine using the psycopg 3 driver,
session factory, request-level dependency injection, and safe connection readiness probes.
"""

import logging
from typing import Generator, Tuple, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

# Global synchronous SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_pre_ping=True,
    echo=False,
)

# Synchronous session factory
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """Dependency yielding a database session per request, rolling back on error and closing safely."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def check_db_connectivity() -> Tuple[bool, Optional[str]]:
    """Tests live PostgreSQL connectivity by executing 'SELECT 1'.

    Ensures connections are properly closed and exceptions are sanitized.

    Returns:
        Tuple of (is_connected, error_message).
        Error messages never contain credentials, connection strings, or stack traces.
    """
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            val = result.scalar()
            if val == 1:
                return True, None
            return False, "Unexpected probe response"
    except Exception as exc:
        # Log clean error type without exposing credentials or stack trace
        logger.error(f"Database readiness probe failed: {type(exc).__name__}")
        return False, "Database connection unavailable"
