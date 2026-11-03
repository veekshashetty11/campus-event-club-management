-- ============================================================
-- Campus Event & Club Management System
-- PostgreSQL 14+ — Triggers
-- ============================================================
-- File    : database/schema/triggers.sql
-- Depends : campus_event_club_management_schema.sql  (run first)
--           functions.sql                            (run second)
-- Status  : WRITTEN — NOT YET EXECUTED OR TESTED AGAINST A DB.
--           Do not claim correctness until verified against a
--           live PostgreSQL 14+ instance.
-- ============================================================
-- CONTENTS
--   §1  trg_update_search_vector    — events FTS maintenance
--   §2  trg_sync_event_counts       — denormalised counter sync
--   §3  trg_waitlist_promotion      — auto-promote on cancellation
--   §4  trg_budget_validation       — block over-budget approvals
--   §5  trg_attendance_points       — award configurable points
--   §6  trg_certificate_issuance    — create pending certificate
--   §7  trg_audit_*                 — audit log for 9 table groups
-- ============================================================


-- ============================================================
-- §1  Full-text search vector — events
-- ============================================================
-- Fires BEFORE INSERT OR UPDATE on events.
-- Rebuilds search_vector from title (A), description (B), tags (C).
-- Uses 'english' dictionary for stemming / stop-word removal.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_trg_update_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title,       '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english',
            COALESCE(array_to_string(NEW.tags, ' '), '')
        ), 'C');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_search_vector
    BEFORE INSERT OR UPDATE OF title, description, tags
    ON events
    FOR EACH ROW
    EXECUTE FUNCTION fn_trg_update_search_vector();

COMMENT ON TRIGGER trg_update_search_vector ON events IS
    'Rebuilds search_vector before any INSERT or title/description/tags UPDATE.';


-- ============================================================
-- §2  Denormalised counter sync — registered_count / waitlist_count
-- ============================================================
-- Two separate trigger functions: one for event_registrations,
-- one for event_waitlist.  Each adjusts the relevant counter on
-- the parent events row.
--
-- Design note:
--   fn_register_for_event also updates the counter directly so
--   that callers see the new value within the same statement.
--   The trigger provides the safety net for direct DML that
--   bypasses the function.
-- ============================================================

-- ── 2a. event_registrations → events.registered_count ────────
CREATE OR REPLACE FUNCTION fn_trg_sync_registered_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Only count active registrations
        IF NEW.status = 'registered' THEN
            UPDATE events
            SET    registered_count = registered_count + 1,
                   updated_at       = NOW()
            WHERE  event_id = NEW.event_id;
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Transition from 'registered' → something else: decrement
        IF OLD.status = 'registered' AND NEW.status <> 'registered' THEN
            UPDATE events
            SET    registered_count = GREATEST(registered_count - 1, 0),
                   updated_at       = NOW()
            WHERE  event_id = NEW.event_id;

        -- Transition from non-'registered' → 'registered': increment
        -- (e.g. a reactivation or waitlist promotion path)
        ELSIF OLD.status <> 'registered' AND NEW.status = 'registered' THEN
            UPDATE events
            SET    registered_count = registered_count + 1,
                   updated_at       = NOW()
            WHERE  event_id = NEW.event_id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.status = 'registered' THEN
            UPDATE events
            SET    registered_count = GREATEST(registered_count - 1, 0),
                   updated_at       = NOW()
            WHERE  event_id = OLD.event_id;
        END IF;
    END IF;

    RETURN NULL;  -- AFTER trigger; return value is ignored for row triggers
END;
$$;

CREATE TRIGGER trg_sync_registered_count
    AFTER INSERT OR UPDATE OF status OR DELETE
    ON event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION fn_trg_sync_registered_count();

COMMENT ON TRIGGER trg_sync_registered_count ON event_registrations IS
    'Keeps events.registered_count in sync with active registrations.';


-- ── 2b. event_waitlist → events.waitlist_count ────────────────
CREATE OR REPLACE FUNCTION fn_trg_sync_waitlist_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'waiting' THEN
            UPDATE events
            SET    waitlist_count = waitlist_count + 1,
                   updated_at     = NOW()
            WHERE  event_id = NEW.event_id;
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'waiting' AND NEW.status <> 'waiting' THEN
            UPDATE events
            SET    waitlist_count = GREATEST(waitlist_count - 1, 0),
                   updated_at     = NOW()
            WHERE  event_id = NEW.event_id;
        ELSIF OLD.status <> 'waiting' AND NEW.status = 'waiting' THEN
            UPDATE events
            SET    waitlist_count = waitlist_count + 1,
                   updated_at     = NOW()
            WHERE  event_id = NEW.event_id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.status = 'waiting' THEN
            UPDATE events
            SET    waitlist_count = GREATEST(waitlist_count - 1, 0),
                   updated_at     = NOW()
            WHERE  event_id = OLD.event_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_waitlist_count
    AFTER INSERT OR UPDATE OF status OR DELETE
    ON event_waitlist
    FOR EACH ROW
    EXECUTE FUNCTION fn_trg_sync_waitlist_count();

COMMENT ON TRIGGER trg_sync_waitlist_count ON event_waitlist IS
    'Keeps events.waitlist_count in sync with waiting entries.';


-- ============================================================
-- §3  Automatic waitlist promotion
-- ============================================================
-- Fires AFTER UPDATE on event_registrations.
-- Activates when status changes from 'registered' → 'cancelled'.
-- If the event has a confirmed seat now free AND the waitlist is
-- non-empty, promotes the earliest eligible waitlisted user.
--
-- Concurrency safety
--   The events row is locked FOR UPDATE before reading
--   registered_count, preventing two concurrent cancellations
--   from both promoting the same waitlist entry.
--
-- Duplicate-promotion prevention
--   Uses SELECT … FOR UPDATE SKIP LOCKED on the waitlist row so
--   only one concurrent transaction can promote the same entry.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_trg_waitlist_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_event      RECORD;
    v_waitlist   RECORD;
BEGIN
    -- Only act when a registration is cancelled
    IF OLD.status <> 'registered' OR NEW.status <> 'cancelled' THEN
        RETURN NULL;
    END IF;

    -- ── Lock the event row ────────────────────────────────────
    SELECT event_id, max_capacity, registered_count
    INTO   v_event
    FROM   events
    WHERE  event_id = NEW.event_id
    FOR UPDATE;

    -- Confirm a seat is actually free after this cancellation
    -- (registered_count is decremented by trg_sync_registered_count,
    --  which fires in the same AFTER UPDATE statement batch)
    IF v_event.max_capacity IS NOT NULL
       AND (v_event.registered_count - 1) >= v_event.max_capacity
    THEN
        RETURN NULL;  -- No free seat
    END IF;

    -- ── Pick the first waiting entry — skip locked to prevent races ──
    SELECT waitlist_id, user_id, position
    INTO   v_waitlist
    FROM   event_waitlist
    WHERE  event_id = NEW.event_id
      AND  status   = 'waiting'
    ORDER  BY position
    LIMIT  1
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN NULL;  -- Waitlist is empty
    END IF;

    -- ── Mark this waitlist entry as promoted ──────────────────
    UPDATE event_waitlist
    SET    status       = 'promoted',
           promoted_at  = NOW(),
           expires_at   = NOW() + INTERVAL '24 hours'
    WHERE  waitlist_id = v_waitlist.waitlist_id;

    -- ── Renumber remaining 'waiting' entries ──────────────────
    -- DEFERRABLE constraint allows this within the transaction.
    UPDATE event_waitlist
    SET    position = position - 1
    WHERE  event_id = NEW.event_id
      AND  status   = 'waiting'
      AND  position > v_waitlist.position;

    -- ── Create a registration for the promoted user ───────────
    INSERT INTO event_registrations (event_id, user_id, status)
    VALUES (NEW.event_id, v_waitlist.user_id, 'registered')
    ON CONFLICT (event_id, user_id) DO UPDATE
        SET status       = 'registered',
            cancelled_at = NULL,
            registered_at = NOW();

    -- ── Notify the promoted user ──────────────────────────────
    INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
    VALUES (
        v_waitlist.user_id,
        'Waitlist Promotion — Seat Available',
        'A seat has opened up! You have been moved from the waitlist to registered. '
        || 'Your spot is held for 24 hours.',
        'registration',
        'event',
        NEW.event_id::TEXT
    );

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_waitlist_promotion
    AFTER UPDATE OF status
    ON event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION fn_trg_waitlist_promotion();

COMMENT ON TRIGGER trg_waitlist_promotion ON event_registrations IS
    'Auto-promotes the earliest waitlisted user when a registration is cancelled. '
    'Uses row-level locking to prevent duplicate promotions under concurrent load.';


-- ============================================================
-- §4  Budget validation — block over-budget expense approvals
-- ============================================================
-- Fires BEFORE UPDATE on expenses.
-- Activates when status transitions → 'approved'.
-- Checks that the linked budget has sufficient remaining amount.
-- Rejects (RAISE EXCEPTION) if the approval would exceed the budget.
-- On approval, increments budget.spent_amount atomically.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_trg_budget_validation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_budget  RECORD;
BEGIN
    -- Only act on transitions TO 'approved'
    IF NEW.status <> 'approved' OR OLD.status = 'approved' THEN
        RETURN NEW;
    END IF;

    -- Expenses without a budget link are not budget-validated
    IF NEW.budget_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- ── Lock and read the budget row ──────────────────────────
    SELECT budget_id, allocated_amount, spent_amount, status
    INTO   v_budget
    FROM   club_budgets
    WHERE  budget_id = NEW.budget_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Budget record % not found.', NEW.budget_id;
    END IF;

    IF v_budget.status <> 'active' THEN
        RAISE EXCEPTION
            'Budget % is not active (status: %). Cannot approve expense.',
            v_budget.budget_id, v_budget.status;
    END IF;

    IF v_budget.spent_amount + NEW.amount > v_budget.allocated_amount THEN
        RAISE EXCEPTION
            'Insufficient budget. Allocated: %, Spent: %, Requested: %. '
            'Remaining: %.',
            v_budget.allocated_amount,
            v_budget.spent_amount,
            NEW.amount,
            v_budget.allocated_amount - v_budget.spent_amount;
    END IF;

    -- ── Approve: increment spent_amount ───────────────────────
    UPDATE club_budgets
    SET    spent_amount = spent_amount + NEW.amount,
           status       = CASE
               WHEN spent_amount + NEW.amount = allocated_amount
               THEN 'exhausted'
               ELSE status
           END,
           updated_at   = NOW()
    WHERE  budget_id = NEW.budget_id;

    -- Set reviewed_at on the expense
    NEW.reviewed_at := NOW();

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_budget_validation
    BEFORE UPDATE OF status
    ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION fn_trg_budget_validation();

COMMENT ON TRIGGER trg_budget_validation ON expenses IS
    'BEFORE UPDATE: blocks expense approval if it would exceed the linked budget. '
    'On approval, atomically increments club_budgets.spent_amount.';


-- ============================================================
-- §5  Attendance points allocation
-- ============================================================
-- Fires AFTER INSERT OR UPDATE on attendance.
-- Awards configurable points (from events.points_on_time or
-- events.points_late) to users.points.
-- Prevents double-awarding: only runs when points_awarded = 0
-- (INSERT path) or when status changes from non-eligible to
-- eligible (UPDATE path).
--
-- Eligibility (per approved decision D3 & D4):
--   'present' → events.points_on_time points
--   'late'    → events.points_late points
--   'absent', 'excused' → 0 points
-- ============================================================

CREATE OR REPLACE FUNCTION fn_trg_attendance_points()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_event     RECORD;
    v_pts       INTEGER := 0;
    v_prev_pts  INTEGER := 0;
BEGIN
    -- ── Determine the previous points already credited ────────
    IF TG_OP = 'UPDATE' THEN
        v_prev_pts := COALESCE(OLD.points_awarded, 0);
    END IF;

    -- ── Determine new points to award ─────────────────────────
    SELECT points_on_time, points_late
    INTO   v_event
    FROM   events
    WHERE  event_id = NEW.event_id;

    v_pts := CASE NEW.status
        WHEN 'present' THEN COALESCE(v_event.points_on_time, 0)
        WHEN 'late'    THEN COALESCE(v_event.points_late,    0)
        ELSE 0
    END;

    -- ── If no change in points, do nothing ────────────────────
    IF v_pts = v_prev_pts THEN
        RETURN NULL;
    END IF;

    -- ── Update attendance.points_awarded ──────────────────────
    UPDATE attendance
    SET    points_awarded = v_pts
    WHERE  attendance_id  = NEW.attendance_id;

    -- ── Adjust users.points by the delta ─────────────────────
    -- Uses delta (v_pts - v_prev_pts) to handle status changes.
    -- GREATEST(… , 0) prevents negative total (safety net).
    UPDATE users
    SET    points     = GREATEST(points + (v_pts - v_prev_pts), 0),
           updated_at = NOW()
    WHERE  user_id = NEW.user_id;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_attendance_points
    AFTER INSERT OR UPDATE OF status
    ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION fn_trg_attendance_points();

COMMENT ON TRIGGER trg_attendance_points ON attendance IS
    'Awards configurable points from events.points_on_time/points_late. '
    'Uses delta updates to handle status changes without double-awarding.';


-- ============================================================
-- §6  Certificate issuance
-- ============================================================
-- Fires AFTER INSERT OR UPDATE on attendance.
-- Creates a certificate row (status = 'pending') for eligible
-- attendees. Eligibility: status IN ('present', 'late').
-- Prevents duplicate certificates via the UNIQUE constraint on
-- (event_id, user_id, certificate_type).
-- Does NOT issue 'absent' certificates (enforced by IF guard
-- and by the certificate type eligibility check).
-- ============================================================

CREATE OR REPLACE FUNCTION fn_trg_certificate_issuance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_cert_type TEXT := 'participation';  -- default type
BEGIN
    -- Only act on eligible status values (D3: present OR late)
    IF NEW.status NOT IN ('present', 'late') THEN
        -- If status changed AWAY from eligible, do not revoke here.
        -- Revocation is an explicit administrative action.
        RETURN NULL;
    END IF;

    -- Skip if nothing changed (UPDATE but status stayed the same)
    IF TG_OP = 'UPDATE' AND NEW.status = OLD.status THEN
        RETURN NULL;
    END IF;

    -- ── Insert certificate if it doesn't already exist ────────
    -- ON CONFLICT DO NOTHING prevents errors on duplicate triggers
    -- (e.g. repeated updates that leave status = 'present').
    INSERT INTO certificates (
        event_id, user_id, attendance_id,
        certificate_type, status, created_at
    )
    VALUES (
        NEW.event_id,
        NEW.user_id,
        NEW.attendance_id,
        v_cert_type,
        'pending',
        NOW()
    )
    ON CONFLICT (event_id, user_id, certificate_type) DO NOTHING;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_certificate_issuance
    AFTER INSERT OR UPDATE OF status
    ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION fn_trg_certificate_issuance();

COMMENT ON TRIGGER trg_certificate_issuance ON attendance IS
    'Creates a pending certificate for present/late attendees. '
    'ON CONFLICT DO NOTHING prevents duplicate issuance.';


-- ============================================================
-- §7  Audit logging triggers
-- ============================================================
-- One trigger function (fn_trg_audit_log) handles all audited
-- tables. Each CREATE TRIGGER statement below attaches it to a
-- specific table, naming the action appropriately.
--
-- Audited tables and operations (D5 decision):
--   users              — INSERT, UPDATE, DELETE
--   roles              — INSERT, UPDATE, DELETE
--   permissions        — INSERT, UPDATE, DELETE
--   clubs              — INSERT, UPDATE, DELETE
--   club_members       — INSERT, UPDATE, DELETE
--   events             — INSERT, UPDATE, DELETE
--   event_approvals    — INSERT, UPDATE
--   venue_bookings     — INSERT, UPDATE
--   equipment_bookings — INSERT, UPDATE
--   event_registrations — INSERT, UPDATE
--   event_waitlist     — INSERT, UPDATE
--   club_budgets       — INSERT, UPDATE
--   expenses           — INSERT, UPDATE
--   event_sponsors     — INSERT, UPDATE, DELETE
--   attendance         — INSERT, UPDATE
--   certificates       — INSERT, UPDATE
--
-- Secret fields (password_hash, verification_hash, ticket_code,
-- session_id) are stripped inside fn_audit_log_entry.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_trg_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER   -- same privilege level as fn_audit_log_entry
AS $$
DECLARE
    v_action      TEXT;
    v_record_id   TEXT;
    v_old_values  JSONB := NULL;
    v_new_values  JSONB := NULL;
BEGIN
    -- ── Build action string: '<table>.<operation>' ────────────
    v_action := TG_TABLE_NAME || '.' || LOWER(TG_OP);

    -- ── Capture old / new row snapshots as JSONB ──────────────
    IF TG_OP = 'DELETE' THEN
        v_record_id  := row_to_json(OLD)::JSONB ->> _pk_column_for(TG_TABLE_NAME);
        v_old_values := row_to_json(OLD)::JSONB;
    ELSIF TG_OP = 'INSERT' THEN
        v_record_id  := row_to_json(NEW)::JSONB ->> _pk_column_for(TG_TABLE_NAME);
        v_new_values := row_to_json(NEW)::JSONB;
    ELSE  -- UPDATE
        v_record_id  := row_to_json(NEW)::JSONB ->> _pk_column_for(TG_TABLE_NAME);
        v_old_values := row_to_json(OLD)::JSONB;
        v_new_values := row_to_json(NEW)::JSONB;
    END IF;

    -- ── Delegate to central writer (strips secrets) ───────────
    PERFORM fn_audit_log_entry(
        v_action,
        TG_TABLE_NAME,
        v_record_id,
        v_old_values,
        v_new_values
    );

    -- AFTER trigger — return value is unused for row triggers
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- ── Helper: map table name → primary key column name ─────────
-- Used by fn_trg_audit_log to extract the record ID from a row.
CREATE OR REPLACE FUNCTION _pk_column_for(p_table TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE p_table
        WHEN 'users'               THEN 'user_id'
        WHEN 'roles'               THEN 'role_id'
        WHEN 'permissions'         THEN 'permission_id'
        WHEN 'clubs'               THEN 'club_id'
        WHEN 'club_members'        THEN 'membership_id'
        WHEN 'club_budgets'        THEN 'budget_id'
        WHEN 'expenses'            THEN 'expense_id'
        WHEN 'event_sponsors'      THEN 'event_sponsor_id'
        WHEN 'events'              THEN 'event_id'
        WHEN 'event_approvals'     THEN 'approval_id'
        WHEN 'venue_bookings'      THEN 'booking_id'
        WHEN 'equipment_bookings'  THEN 'eq_booking_id'
        WHEN 'event_registrations' THEN 'registration_id'
        WHEN 'event_waitlist'      THEN 'waitlist_id'
        WHEN 'attendance'          THEN 'attendance_id'
        WHEN 'certificates'        THEN 'certificate_id'
        ELSE 'id'  -- fallback; log will still write but record_id may be wrong
    END;
$$;

COMMENT ON FUNCTION _pk_column_for(TEXT) IS
    'Maps table name to primary key column name for audit log record_id extraction.';

-- ── Attach audit trigger to each audited table ────────────────

CREATE TRIGGER trg_audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

CREATE TRIGGER trg_audit_roles
    AFTER INSERT OR UPDATE OR DELETE ON roles
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

CREATE TRIGGER trg_audit_permissions
    AFTER INSERT OR UPDATE OR DELETE ON permissions
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

CREATE TRIGGER trg_audit_clubs
    AFTER INSERT OR UPDATE OR DELETE ON clubs
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

CREATE TRIGGER trg_audit_club_members
    AFTER INSERT OR UPDATE OR DELETE ON club_members
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

CREATE TRIGGER trg_audit_events
    AFTER INSERT OR UPDATE OR DELETE ON events
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

CREATE TRIGGER trg_audit_event_approvals
    AFTER INSERT OR UPDATE ON event_approvals
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

CREATE TRIGGER trg_audit_venue_bookings
    AFTER INSERT OR UPDATE ON venue_bookings
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

CREATE TRIGGER trg_audit_equipment_bookings
    AFTER INSERT OR UPDATE ON equipment_bookings
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

CREATE TRIGGER trg_audit_event_registrations
    AFTER INSERT OR UPDATE ON event_registrations
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

CREATE TRIGGER trg_audit_event_waitlist
    AFTER INSERT OR UPDATE ON event_waitlist
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

CREATE TRIGGER trg_audit_club_budgets
    AFTER INSERT OR UPDATE ON club_budgets
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

CREATE TRIGGER trg_audit_expenses
    AFTER INSERT OR UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

CREATE TRIGGER trg_audit_event_sponsors
    AFTER INSERT OR UPDATE OR DELETE ON event_sponsors
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

CREATE TRIGGER trg_audit_attendance
    AFTER INSERT OR UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();

CREATE TRIGGER trg_audit_certificates
    AFTER INSERT OR UPDATE ON certificates
    FOR EACH ROW EXECUTE FUNCTION fn_trg_audit_log();
