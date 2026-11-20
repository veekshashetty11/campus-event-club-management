"""Budgets, Expenses, and Sponsorship Management API.

Endpoints:
- GET  /clubs/{club_id}/budgets         — list budgets for a club
- POST /clubs/{club_id}/budgets         — create budget entry (admin only)
- GET  /clubs/{club_id}/budgets/summary — aggregate totals
- POST /clubs/{club_id}/expenses        — submit expense (club member/leader)
- GET  /clubs/{club_id}/expenses        — list expenses with status filter
- PATCH /expenses/{expense_id}/approve  — approve expense (admin/student_affairs)
- PATCH /expenses/{expense_id}/reject   — reject expense with reason
- GET  /events/{event_id}/sponsors      — list sponsors for event
- POST /events/{event_id}/sponsors      — attach sponsor to event
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.api.deps import get_current_user, require_permissions
from app.api.events import is_user_authorized_for_club
from app.models.auth import User
from app.models.event import Club, ClubBudget, Expense, Event, Sponsor, EventSponsor, ClubMember
from app.schemas.budget import (
    ClubBudgetCreate,
    ClubBudgetResponse,
    ClubBudgetSummary,
    ExpenseCreate,
    ExpenseRejectRequest,
    ExpenseResponse,
    EventSponsorCreate,
    EventSponsorResponse,
    SponsorResponse,
)

clubs_budget_router = APIRouter(prefix="/clubs", tags=["Budgets"])
expenses_router = APIRouter(prefix="/expenses", tags=["Expenses"])
sponsors_router = APIRouter(prefix="/events", tags=["Sponsors"])


def _get_club_or_404(db: Session, club_id: int) -> Club:
    club = db.query(Club).filter(Club.club_id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Club {club_id} not found")
    return club


def _is_admin_or_student_affairs(user: User) -> bool:
    role = user.role.name if user.role else ""
    return role in ("administrator", "student_affairs")


def _is_club_member_or_leader(db: Session, user: User, club_id: int) -> bool:
    """Returns True if user is an admin, club leader, or any active member."""
    if _is_admin_or_student_affairs(user):
        return True
    if is_user_authorized_for_club(db, user, club_id):
        return True
    membership = (
        db.query(ClubMember)
        .filter(
            ClubMember.club_id == club_id,
            ClubMember.user_id == user.user_id,
            ClubMember.is_active == True,
        )
        .first()
    )
    return membership is not None


# ── Budget Endpoints ─────────────────────────────────────────────────────────

@clubs_budget_router.get(
    "/{club_id}/budgets",
    response_model=List[ClubBudgetResponse],
    summary="List Club Budgets",
)
def list_club_budgets(
    club_id: int,
    fiscal_year: Optional[int] = Query(None, description="Filter by fiscal year"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_club_or_404(db, club_id)
    if not (is_user_authorized_for_club(db, current_user, club_id) or _is_admin_or_student_affairs(current_user)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view budgets for this club")

    query = db.query(ClubBudget).filter(ClubBudget.club_id == club_id)
    if fiscal_year:
        query = query.filter(ClubBudget.fiscal_year == fiscal_year)
    return query.order_by(ClubBudget.fiscal_year.desc(), ClubBudget.created_at.desc()).all()


@clubs_budget_router.post(
    "/{club_id}/budgets",
    response_model=ClubBudgetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Club Budget",
)
def create_club_budget(
    club_id: int,
    payload: ClubBudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_club_or_404(db, club_id)
    if not _is_admin_or_student_affairs(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can create budget entries")

    # Validate event if provided
    if payload.event_id is not None:
        event = db.query(Event).filter(Event.event_id == payload.event_id, Event.club_id == club_id).first()
        if not event:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event not found or does not belong to this club")

    budget = ClubBudget(
        club_id=club_id,
        event_id=payload.event_id,
        fiscal_year=payload.fiscal_year,
        allocated_amount=payload.allocated_amount,
        spent_amount=Decimal("0.00"),
        remaining_amount=payload.allocated_amount,
        approved_by=current_user.user_id,
    )
    try:
        db.execute(text("SELECT set_config('app.current_user_id', :uid, true)"), {"uid": str(current_user.user_id)})
        db.add(budget)
        db.commit()
        db.refresh(budget)
    except Exception:
        db.rollback()
        raise
    return budget


@clubs_budget_router.get(
    "/{club_id}/budgets/summary",
    response_model=ClubBudgetSummary,
    summary="Club Budget Summary",
)
def club_budget_summary(
    club_id: int,
    fiscal_year: Optional[int] = Query(None, description="Filter by fiscal year"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_club_or_404(db, club_id)
    if not (is_user_authorized_for_club(db, current_user, club_id) or _is_admin_or_student_affairs(current_user)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    query = db.query(
        func.coalesce(func.sum(ClubBudget.allocated_amount), Decimal("0.00")).label("total_allocated"),
        func.coalesce(func.sum(ClubBudget.spent_amount), Decimal("0.00")).label("total_spent"),
        func.coalesce(func.sum(ClubBudget.remaining_amount), Decimal("0.00")).label("total_remaining"),
        func.count(ClubBudget.budget_id).label("budget_count"),
    ).filter(ClubBudget.club_id == club_id)

    if fiscal_year:
        query = query.filter(ClubBudget.fiscal_year == fiscal_year)

    row = query.one()
    return ClubBudgetSummary(
        club_id=club_id,
        total_allocated=row.total_allocated,
        total_spent=row.total_spent,
        total_remaining=row.total_remaining,
        budget_count=row.budget_count,
    )


# ── Expense Endpoints ────────────────────────────────────────────────────────

@clubs_budget_router.post(
    "/{club_id}/expenses",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Expense",
)
def submit_expense(
    club_id: int,
    payload: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_club_or_404(db, club_id)
    if not _is_club_member_or_leader(db, current_user, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this club")

    if payload.event_id is not None:
        event = db.query(Event).filter(Event.event_id == payload.event_id, Event.club_id == club_id).first()
        if not event:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event not found or does not belong to this club")

    expense = Expense(
        club_id=club_id,
        event_id=payload.event_id,
        submitted_by=current_user.user_id,
        category=payload.category,
        description=payload.description,
        amount=payload.amount,
        receipt_url=payload.receipt_url,
        status="pending",
    )
    try:
        db.execute(text("SELECT set_config('app.current_user_id', :uid, true)"), {"uid": str(current_user.user_id)})
        db.add(expense)
        db.commit()
        db.refresh(expense)
    except Exception:
        db.rollback()
        raise
    return expense


@clubs_budget_router.get(
    "/{club_id}/expenses",
    response_model=List[ExpenseResponse],
    summary="List Club Expenses",
)
def list_club_expenses(
    club_id: int,
    expense_status: Optional[str] = Query(None, alias="status", description="Filter: pending, approved, rejected"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_club_or_404(db, club_id)
    if not (is_user_authorized_for_club(db, current_user, club_id) or _is_admin_or_student_affairs(current_user)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view expenses for this club")

    query = db.query(Expense).filter(Expense.club_id == club_id)
    if expense_status:
        query = query.filter(Expense.status == expense_status)
    return query.order_by(Expense.created_at.desc()).all()


@expenses_router.patch(
    "/{expense_id}/approve",
    response_model=ExpenseResponse,
    summary="Approve Expense",
)
def approve_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _is_admin_or_student_affairs(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins or student affairs can approve expenses")

    expense = db.query(Expense).filter(Expense.expense_id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    if expense.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Expense is already '{expense.status}'")

    expense.status = "approved"
    expense.approved_by = current_user.user_id
    expense.approved_at = datetime.now(timezone.utc)

    # Deduct from most recent budget for this club (same fiscal year preferred)
    current_year = datetime.now(timezone.utc).year
    budget = (
        db.query(ClubBudget)
        .filter(ClubBudget.club_id == expense.club_id)
        .order_by(
            (ClubBudget.fiscal_year == current_year).desc(),
            ClubBudget.created_at.desc(),
        )
        .first()
    )
    if budget:
        budget.spent_amount = (budget.spent_amount or Decimal("0.00")) + expense.amount
        budget.remaining_amount = budget.allocated_amount - budget.spent_amount

    try:
        db.execute(text("SELECT set_config('app.current_user_id', :uid, true)"), {"uid": str(current_user.user_id)})
        db.commit()
        db.refresh(expense)
    except Exception:
        db.rollback()
        raise
    return expense


@expenses_router.patch(
    "/{expense_id}/reject",
    response_model=ExpenseResponse,
    summary="Reject Expense",
)
def reject_expense(
    expense_id: int,
    payload: ExpenseRejectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _is_admin_or_student_affairs(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins or student affairs can reject expenses")

    expense = db.query(Expense).filter(Expense.expense_id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    if expense.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Expense is already '{expense.status}'")

    expense.status = "rejected"
    expense.approved_by = current_user.user_id
    expense.approved_at = datetime.now(timezone.utc)
    # Store rejection reason in description suffix
    expense.description = f"{expense.description}\n\n[REJECTED] {payload.reason}"

    try:
        db.execute(text("SELECT set_config('app.current_user_id', :uid, true)"), {"uid": str(current_user.user_id)})
        db.commit()
        db.refresh(expense)
    except Exception:
        db.rollback()
        raise
    return expense


# ── Sponsor Endpoints ────────────────────────────────────────────────────────

@sponsors_router.get(
    "/{event_id}/sponsors",
    response_model=List[EventSponsorResponse],
    summary="List Event Sponsors",
)
def list_event_sponsors(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    sponsors = db.query(EventSponsor).filter(EventSponsor.event_id == event_id).all()
    return sponsors


@sponsors_router.post(
    "/{event_id}/sponsors",
    response_model=EventSponsorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Attach Sponsor to Event",
)
def attach_sponsor_to_event(
    event_id: int,
    payload: EventSponsorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if not (is_user_authorized_for_club(db, current_user, event.club_id) or _is_admin_or_student_affairs(current_user)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to attach sponsors to this event")

    sponsor = db.query(Sponsor).filter(Sponsor.sponsor_id == payload.sponsor_id).first()
    if not sponsor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sponsor not found")

    # Prevent duplicate
    existing = db.query(EventSponsor).filter(
        EventSponsor.event_id == event_id,
        EventSponsor.sponsor_id == payload.sponsor_id,
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Sponsor already attached to this event")

    event_sponsor = EventSponsor(
        event_id=event_id,
        sponsor_id=payload.sponsor_id,
        sponsorship_amount=payload.sponsorship_amount,
        sponsorship_type=payload.sponsorship_type,
        notes=payload.notes,
    )
    try:
        db.execute(text("SELECT set_config('app.current_user_id', :uid, true)"), {"uid": str(current_user.user_id)})
        db.add(event_sponsor)
        db.commit()
        db.refresh(event_sponsor)
    except Exception:
        db.rollback()
        raise
    return event_sponsor
