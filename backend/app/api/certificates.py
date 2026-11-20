"""Certificate generation and verification API endpoints.

Routes:
  POST /events/{event_id}/certificates/generate — Generate certificates for all check-ins
  GET  /certificates/{certificate_id}/verify    — Public certificate verification
  GET  /users/me/certificates                   — Current user's certificates
"""

import hashlib
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.api.deps import get_current_user, require_permissions
from app.models.auth import User
from app.models.event import Attendance, Certificate, Event
from app.schemas.attendance import (
    CertificateGenerateResult,
    CertificateRecord,
    CertificateVerifyResponse,
)

events_router = APIRouter(prefix="/events", tags=["Certificates"])
certificates_router = APIRouter(prefix="/certificates", tags=["Certificates"])
users_router = APIRouter(prefix="/users", tags=["Certificates"])

_ADMIN_ROLES = {"administrator", "event_coordinator", "student_affairs"}


def _get_event_or_404(db: Session, event_id: int) -> Event:
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event {event_id} not found")
    return event


def _make_hash(event_id: int, user_id, issued_at: datetime) -> str:
    raw = f"{event_id}{user_id}{issued_at.isoformat()}"
    return hashlib.md5(raw.encode()).hexdigest()


# ── POST /events/{event_id}/certificates/generate ────────────────────────────

@events_router.post(
    "/{event_id}/certificates/generate",
    response_model=CertificateGenerateResult,
    status_code=status.HTTP_201_CREATED,
    summary="Generate Certificates",
)
def generate_certificates(
    event_id: int,
    current_user: User = Depends(require_permissions("events.read")),
    db: Session = Depends(get_db),
):
    """Generate certificates for every checked-in attendee who doesn't already have one."""
    event = _get_event_or_404(db, event_id)

    user_role = current_user.role.name if current_user.role else ""
    if user_role not in _ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or coordinator access required")

    db.execute(
        text("SELECT set_config('app.current_user_id', :uid, true)"),
        {"uid": str(current_user.user_id)},
    )

    # Fetch all attendees
    attendances = db.query(Attendance).filter(Attendance.event_id == event_id).all()

    # Existing certificates (by user_id)
    existing = {
        c.user_id
        for c in db.query(Certificate).filter(Certificate.event_id == event_id).all()
    }

    generated_records: List[Certificate] = []
    skipped = 0

    now = datetime.now(timezone.utc)

    for att in attendances:
        if att.user_id in existing:
            skipped += 1
            continue

        vh = _make_hash(event_id, att.user_id, now)
        cert = Certificate(
            event_id=event_id,
            user_id=att.user_id,
            certificate_url=None,  # URL generation is an external concern
            verification_hash=vh,
            issued_at=now,
            is_valid=True,
        )
        db.add(cert)
        generated_records.append(cert)
        existing.add(att.user_id)

    db.commit()
    for c in generated_records:
        db.refresh(c)

    return CertificateGenerateResult(
        generated=len(generated_records),
        skipped=skipped,
        certificates=[
            CertificateRecord(
                certificate_id=c.certificate_id,
                event_id=c.event_id,
                user_id=c.user_id,
                certificate_url=c.certificate_url,
                verification_hash=c.verification_hash,
                issued_at=c.issued_at,
                is_valid=c.is_valid,
                event_title=event.title,
                user_name=c.user.full_name if c.user else None,
            )
            for c in generated_records
        ],
    )


# ── GET /certificates/{certificate_id}/verify ─────────────────────────────────

@certificates_router.get(
    "/{certificate_id}/verify",
    response_model=CertificateVerifyResponse,
    summary="Verify Certificate (Public)",
)
def verify_certificate(
    certificate_id: int,
    db: Session = Depends(get_db),
):
    """Public endpoint — no auth required — to verify a certificate's validity."""
    cert = db.query(Certificate).filter(Certificate.certificate_id == certificate_id).first()
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")

    event = db.query(Event).filter(Event.event_id == cert.event_id).first()

    return CertificateVerifyResponse(
        certificate_id=cert.certificate_id,
        is_valid=cert.is_valid,
        event_id=cert.event_id,
        event_title=event.title if event else None,
        issued_at=cert.issued_at,
        verification_hash=cert.verification_hash,
    )


# ── GET /users/me/certificates ───────────────────────────────────────────────

@users_router.get(
    "/me/certificates",
    response_model=List[CertificateRecord],
    summary="My Certificates",
)
def my_certificates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    certs = (
        db.query(Certificate)
        .filter(Certificate.user_id == current_user.user_id)
        .order_by(Certificate.issued_at.desc())
        .all()
    )

    return [
        CertificateRecord(
            certificate_id=c.certificate_id,
            event_id=c.event_id,
            user_id=c.user_id,
            certificate_url=c.certificate_url,
            verification_hash=c.verification_hash,
            issued_at=c.issued_at,
            is_valid=c.is_valid,
            event_title=c.event.title if c.event else None,
            user_name=current_user.full_name,
        )
        for c in certs
    ]
