"""Waitlist Expiration Background Worker Service.

Phase 8 Capacity & Waitlist Promotion:
- Discovers promoted waitlist slots where the 24-hour claim window (expires_at) has passed.
- Cancels the unclaimed registration transactionally.
- Triggers automatic promotion of the next eligible waitlisted student via trg_waitlist_promotion.
- Uses row-level 'FOR UPDATE SKIP LOCKED' to ensure concurrent workers never double-process rows.
- Scheduled natively via asyncio within FastAPI application lifespan (zero external daemon dependencies).
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.connection import SessionLocal
from app.models.event import EventWaitlist, EventRegistration

logger = logging.getLogger("uvicorn.error")

# Global background worker task handle
_worker_task: Optional[asyncio.Task] = None
_worker_stop_event = asyncio.Event()


def expire_unclaimed_promotions(db: Session) -> int:
    """Finds and cancels expired promotions, triggering auto-promotion for the next in queue.

    Returns:
        Number of expired promotions processed.
    """
    processed_count = 0
    now = datetime.now(timezone.utc)

    try:
        # Lock expired promoted waitlist rows to avoid concurrent duplicate processing
        expired_waitlist_rows = (
            db.query(EventWaitlist)
            .filter(
                EventWaitlist.status == "promoted",
                EventWaitlist.expires_at.isnot(None),
                EventWaitlist.expires_at <= now,
            )
            .with_for_update(skip_locked=True)
            .all()
        )

        for waitlist_entry in expired_waitlist_rows:
            # Mark waitlist slot as expired
            waitlist_entry.status = "expired"

            # Cancel corresponding registration row
            reg = (
                db.query(EventRegistration)
                .filter(
                    EventRegistration.event_id == waitlist_entry.event_id,
                    EventRegistration.user_id == waitlist_entry.user_id,
                    EventRegistration.status == "registered",
                )
                .with_for_update(skip_locked=True)
                .first()
            )

            if reg:
                reg.status = "cancelled"
                reg.cancelled_at = now
                reg.cancellation_reason = "Promotion expired: 24-hour confirmation window elapsed"

            processed_count += 1

        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error(f"Error processing expired waitlist promotions: {type(exc).__name__}")
        raise

    return processed_count


async def waitlist_expiration_loop(interval_seconds: int = 60):
    """Periodic async task that scans and purges expired promotions."""
    logger.info(f"Waitlist expiration worker started with check interval {interval_seconds}s.")
    while not _worker_stop_event.is_set():
        try:
            db: Session = SessionLocal()
            try:
                count = expire_unclaimed_promotions(db)
                if count > 0:
                    logger.info(f"Waitlist worker processed {count} expired promotion(s).")
            finally:
                db.close()
        except Exception as exc:
            logger.error(f"Waitlist worker encountered an error: {type(exc).__name__}")

        try:
            await asyncio.wait_for(_worker_stop_event.wait(), timeout=interval_seconds)
        except asyncio.TimeoutError:
            pass  # Normal loop tick


def start_waitlist_worker(interval_seconds: int = 60) -> None:
    """Spawns the background asyncio worker task during FastAPI application startup."""
    global _worker_task
    _worker_stop_event.clear()
    if _worker_task is None or _worker_task.done():
        _worker_task = asyncio.create_task(waitlist_expiration_loop(interval_seconds))
        logger.info("Waitlist expiration background worker task spawned.")


def stop_waitlist_worker() -> None:
    """Signals and terminates the background asyncio worker during application shutdown."""
    global _worker_task
    if _worker_task and not _worker_task.done():
        _worker_stop_event.set()
        _worker_task.cancel()
        logger.info("Waitlist expiration background worker task signaled to stop.")
    _worker_task = None
