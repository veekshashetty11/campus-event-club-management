-- ============================================================
-- Campus Event & Club Management System
-- PostgreSQL 14+ — Stored Functions
-- ============================================================
-- File    : database/schema/functions.sql
-- Depends : campus_event_club_management_schema.sql (run first)
-- Status  : WRITTEN — NOT YET EXECUTED OR TESTED AGAINST A DB.
--           Do not claim correctness until verified against a
--           live PostgreSQL 14+ instance.
-- ============================================================
-- CONTENTS
--   §1  fn_process_event_approval   — sequential 3-level approval
--   §2  fn_register_for_event       — atomic registration / waitlist
--   §3  fn_club_score               — composite club ranking score
--   §4  fn_audit_log_entry          — helper called by audit triggers
-- ============================================================


-- ============================================================
-- §1  fn_process_event_approval
-- ============================================================
-- Purpose
--   Advance a 3-level event approval workflow:
--     Level 1 — Club Advisor
--     Level 2 — Student Affairs
--     Level 3 — Administrator
--
-- Rules enforced inside this function
--   • The event must be in 'pending_approval' status.
--   • The approver must hold a role matching the expected level.
--   • Levels must be completed in strict ascending order.
--   • A rejection at any level immediately halts the workflow.
--   • Full approval (level 3 approved) sets event status → 'approved'.
--
-- Application user context
--   The caller must pass the authenticated user's UUID explicitly
--   as p_approver_id. The function does NOT read current_user or
--   session_user — these reflect the DB service account, not the
--   real HTTP request user. The application layer resolves the
--   JWT → user_id and passes it here.
--
-- Signature
--   fn_process_event_approval(
--       p_event_id    INTEGER,
--       p_approver_id UUID,
--       p_decision    TEXT,    -- 'approved' | 'rejected'
--       p_comments    TEXT     -- optional notes
--   ) RETURNS JSONB           -- { "status": "...", "message": "..." }
-- ============================================================

CREATE OR REPLACE FUNCTION fn_process_event_approval(
    p_event_id    INTEGER,
    p_approver_id UUID,
    p_decision    TEXT,
    p_comments    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_event               RECORD;
    v_approver_role       TEXT;
    v_expected_level      SMALLINT;
    v_expected_role       TEXT;
    v_new_event_status    TEXT;
    v_new_approval_level  SMALLINT;
    v_approval_id         INTEGER;
BEGIN
    -- ── 0. Validate decision value ────────────────────────────
    IF p_decision NOT IN ('approved', 'rejected') THEN
        RETURN jsonb_build_object(
            'status',  'error',
            'message', 'p_decision must be ''approved'' or ''rejected''.'
        );
    END IF;

    -- ── 1. Lock the event row ─────────────────────────────────
    -- FOR UPDATE prevents concurrent approval races.
    SELECT event_id, status, requires_approval, current_approval_level
    INTO   v_event
    FROM   events
    WHERE  event_id = p_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Event not found.');
    END IF;

    IF v_event.status <> 'pending_approval' THEN
        RETURN jsonb_build_object(
            'status',  'error',
            'message', 'Event is not in pending_approval status. Current status: ' || v_event.status
        );
    END IF;

    -- ── 2. Determine which level is expected next ─────────────
    -- After n levels approved, the next expected level is n+1.
    v_expected_level := v_event.current_approval_level + 1;

    -- Map level → required role name
    v_expected_role := CASE v_expected_level
        WHEN 1 THEN 'club_advisor'
        WHEN 2 THEN 'student_affairs'
        WHEN 3 THEN 'administrator'
        ELSE NULL
    END;

    IF v_expected_role IS NULL THEN
        -- Should never happen given the CHECK constraint, but guard anyway.
        RETURN jsonb_build_object(
            'status',  'error',
            'message', 'Unexpected approval level: ' || v_expected_level
        );
    END IF;

    -- ── 3. Verify the approver holds the required role ────────
    SELECT r.name
    INTO   v_approver_role
    FROM   users u
    JOIN   roles r ON r.role_id = u.role_id
    WHERE  u.user_id = p_approver_id
      AND  u.status  = 'active';

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'status',  'error',
            'message', 'Approver not found or account is inactive.'
        );
    END IF;

    IF v_approver_role <> v_expected_role THEN
        RETURN jsonb_build_object(
            'status',  'error',
            'message', 'Approver role ''' || v_approver_role
                     || ''' is not authorised for level-' || v_expected_level
                     || ' approval. Required role: ' || v_expected_role
        );
    END IF;

    -- ── 4. Guard: prevent the same approver approving twice at same level ──
    IF EXISTS (
        SELECT 1 FROM event_approvals
        WHERE  event_id    = p_event_id
          AND  approver_id = p_approver_id
          AND  level       = v_expected_level
    ) THEN
        RETURN jsonb_build_object(
            'status',  'error',
            'message', 'Approver has already submitted a decision at level ' || v_expected_level
        );
    END IF;

    -- ── 5. Compute resulting event status ─────────────────────
    IF p_decision = 'rejected' THEN
        v_new_event_status   := 'rejected';
        v_new_approval_level := v_event.current_approval_level; -- level does NOT advance on rejection
    ELSE
        -- 'approved' at this level
        IF v_expected_level = 3 THEN
            -- All three levels passed — fully approved
            v_new_event_status   := 'approved';
            v_new_approval_level := 3;
        ELSE
            -- More levels remain — stay in pending_approval
            v_new_event_status   := 'pending_approval';
            v_new_approval_level := v_expected_level;
        END IF;
    END IF;

    -- ── 6. Write the approval record ──────────────────────────
    INSERT INTO event_approvals (
        event_id, approver_id, role_id, level,
        status, comments, decided_at
    )
    SELECT
        p_event_id,
        p_approver_id,
        u.role_id,
        v_expected_level,
        p_decision,
        p_comments,
        NOW()
    FROM users u
    WHERE u.user_id = p_approver_id
    RETURNING approval_id INTO v_approval_id;

    -- ── 7. Update the event ───────────────────────────────────
    UPDATE events
    SET    status                = v_new_event_status,
           current_approval_level = v_new_approval_level,
           updated_at            = NOW()
    WHERE  event_id = p_event_id;

    -- ── 8. Notify the event creator ───────────────────────────
    INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
    SELECT
        e.created_by,
        CASE p_decision
            WHEN 'approved' THEN 'Event Approval: Level ' || v_expected_level || ' Approved'
            ELSE                 'Event Rejected at Level ' || v_expected_level
        END,
        CASE p_decision
            WHEN 'approved' THEN
                CASE WHEN v_new_event_status = 'approved'
                    THEN 'Your event has been fully approved and is ready to publish.'
                    ELSE 'Level ' || v_expected_level || ' approved. Awaiting next approval level.'
                END
            ELSE 'Your event was rejected at level ' || v_expected_level
                 || COALESCE('. Reason: ' || p_comments, '.')
        END,
        CASE p_decision WHEN 'approved' THEN 'approval' ELSE 'warning' END,
        'event',
        p_event_id::TEXT
    FROM events e
    WHERE e.event_id = p_event_id;

    -- ── 9. Return success payload ─────────────────────────────
    RETURN jsonb_build_object(
        'status',           'success',
        'approval_id',      v_approval_id,
        'level_processed',  v_expected_level,
        'decision',         p_decision,
        'event_status',     v_new_event_status,
        'message',          CASE p_decision
            WHEN 'approved' THEN
                CASE WHEN v_new_event_status = 'approved'
                    THEN 'Event fully approved.'
                    ELSE 'Level ' || v_expected_level || ' approved. Next: level ' || (v_expected_level + 1)
                END
            ELSE 'Event rejected at level ' || v_expected_level || '. Workflow halted.'
        END
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Roll back any partial writes; surface the error to the caller.
        RAISE;
END;
$$;

COMMENT ON FUNCTION fn_process_event_approval(INTEGER, UUID, TEXT, TEXT) IS
    'Advances the 3-level sequential event approval workflow. '
    'Returns JSONB with status/message. Caller must pass the authenticated '
    'user UUID; do not rely on current_user for app-user identity.';


-- ============================================================
-- §2  fn_register_for_event
-- ============================================================
-- Purpose
--   Atomically registers a user for an event or, if the event is
--   full, adds them to the waitlist. Prevents duplicate registration
--   and duplicate waitlist entries.
--
-- Registration rules
--   • Event must be in 'published' or 'approved' status.
--   • Registration deadline must not have passed (if set).
--   • User must not already be registered or on the waitlist.
--   • If max_capacity is NULL, the event is unlimited.
--   • If event is at capacity, insert into event_waitlist.
--   • Both branches increment the relevant counter atomically.
--
-- Concurrency
--   The events row is locked with FOR UPDATE before reading
--   registered_count, preventing two concurrent calls from both
--   seeing "seats available" and double-registering.
--
-- Signature
--   fn_register_for_event(
--       p_event_id  INTEGER,
--       p_user_id   UUID
--   ) RETURNS JSONB   -- { "status": ..., "type": "registered"|"waitlisted", ... }
-- ============================================================

CREATE OR REPLACE FUNCTION fn_register_for_event(
    p_event_id INTEGER,
    p_user_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_event            RECORD;
    v_next_position    INTEGER;
    v_waitlist_id      INTEGER;
    v_registration_id  INTEGER;
BEGIN
    -- ── 1. Lock event row to prevent concurrent race ──────────
    SELECT event_id, status, max_capacity, registered_count,
           waitlist_count, registration_deadline
    INTO   v_event
    FROM   events
    WHERE  event_id = p_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Event not found.');
    END IF;

    -- ── 2. Check event is open for registration ───────────────
    IF v_event.status NOT IN ('published', 'approved') THEN
        RETURN jsonb_build_object(
            'status',  'error',
            'message', 'Event is not open for registration. Status: ' || v_event.status
        );
    END IF;

    IF v_event.registration_deadline IS NOT NULL
       AND v_event.registration_deadline < NOW()
    THEN
        RETURN jsonb_build_object(
            'status',  'error',
            'message', 'Registration deadline has passed.'
        );
    END IF;

    -- ── 3. Check for existing registration ───────────────────
    IF EXISTS (
        SELECT 1 FROM event_registrations
        WHERE event_id = p_event_id
          AND user_id  = p_user_id
          AND status  <> 'cancelled'
    ) THEN
        RETURN jsonb_build_object(
            'status',  'error',
            'message', 'User is already registered for this event.'
        );
    END IF;

    -- ── 4. Check for existing waitlist entry ──────────────────
    IF EXISTS (
        SELECT 1 FROM event_waitlist
        WHERE event_id = p_event_id
          AND user_id  = p_user_id
          AND status   = 'waiting'
    ) THEN
        RETURN jsonb_build_object(
            'status',  'error',
            'message', 'User is already on the waitlist for this event.'
        );
    END IF;

    -- ── 5. Branch: seat available vs. full ───────────────────
    IF v_event.max_capacity IS NULL
       OR v_event.registered_count < v_event.max_capacity
    THEN
        -- ── 5a. Register the user ─────────────────────────────
        INSERT INTO event_registrations (event_id, user_id, status)
        VALUES (p_event_id, p_user_id, 'registered')
        RETURNING registration_id INTO v_registration_id;

        -- Update denormalised counter (trigger also does this; function
        -- updates it directly so callers see the new count immediately
        -- even before the trigger fires in the same statement).
        UPDATE events
        SET    registered_count = registered_count + 1,
               updated_at       = NOW()
        WHERE  event_id = p_event_id;

        -- Notify user
        INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
        VALUES (
            p_user_id,
            'Registration Confirmed',
            'You have successfully registered for the event.',
            'registration',
            'event',
            p_event_id::TEXT
        );

        RETURN jsonb_build_object(
            'status',          'success',
            'type',            'registered',
            'registration_id', v_registration_id,
            'message',         'Registration confirmed.'
        );

    ELSE
        -- ── 5b. Add to waitlist ───────────────────────────────
        -- Determine next position (MAX + 1 within event, for 'waiting' entries).
        SELECT COALESCE(MAX(position), 0) + 1
        INTO   v_next_position
        FROM   event_waitlist
        WHERE  event_id = p_event_id
          AND  status   = 'waiting';

        INSERT INTO event_waitlist (event_id, user_id, position, status)
        VALUES (p_event_id, p_user_id, v_next_position, 'waiting')
        RETURNING waitlist_id INTO v_waitlist_id;

        UPDATE events
        SET    waitlist_count = waitlist_count + 1,
               updated_at     = NOW()
        WHERE  event_id = p_event_id;

        -- Notify user
        INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
        VALUES (
            p_user_id,
            'Added to Waitlist',
            'The event is full. You have been added to the waitlist at position '
                || v_next_position || '.',
            'registration',
            'event',
            p_event_id::TEXT
        );

        RETURN jsonb_build_object(
            'status',       'success',
            'type',         'waitlisted',
            'waitlist_id',  v_waitlist_id,
            'position',     v_next_position,
            'message',      'Added to waitlist at position ' || v_next_position || '.'
        );
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

COMMENT ON FUNCTION fn_register_for_event(INTEGER, UUID) IS
    'Atomically registers a user or adds them to the waitlist. '
    'Locks the event row before reading registered_count to prevent races.';


-- ============================================================
-- §3  fn_club_score
-- ============================================================
-- Purpose
--   Computes a composite ranking score for a given club so that
--   vw_club_leaderboard can ORDER BY a single deterministic number.
--
-- Score formula (all weights are tunable via the literals below)
--   score = (total_completed_events * 10)
--         + (active_members        *  2)
--         + (total_attendance      *  3)
--         + (avg_feedback_rating   * 15)   -- scaled from 0-5 to 0-75
--         + (total_points_awarded  *  1)
--
-- Signature
--   fn_club_score(p_club_id INTEGER) RETURNS NUMERIC
-- ============================================================

CREATE OR REPLACE FUNCTION fn_club_score(p_club_id INTEGER)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE    -- reads DB but does not modify; enables query plan caching
AS $$
DECLARE
    v_events_score    NUMERIC := 0;
    v_members_score   NUMERIC := 0;
    v_attend_score    NUMERIC := 0;
    v_rating_score    NUMERIC := 0;
    v_points_score    NUMERIC := 0;
BEGIN
    -- Events: completed events for this club
    SELECT COALESCE(COUNT(*), 0) * 10
    INTO   v_events_score
    FROM   events
    WHERE  club_id = p_club_id
      AND  status  = 'completed';

    -- Active members
    SELECT COALESCE(COUNT(*), 0) * 2
    INTO   v_members_score
    FROM   club_members
    WHERE  club_id   = p_club_id
      AND  is_active = TRUE;

    -- Attendance: present records across all club events
    SELECT COALESCE(COUNT(*), 0) * 3
    INTO   v_attend_score
    FROM   attendance  a
    JOIN   events      e ON e.event_id = a.event_id
    WHERE  e.club_id  = p_club_id
      AND  a.status IN ('present', 'late');

    -- Average feedback rating (weighted ×15 so max contribution = 75)
    SELECT COALESCE(ROUND(AVG(f.overall_rating) * 15, 2), 0)
    INTO   v_rating_score
    FROM   feedback f
    JOIN   events   e ON e.event_id = f.event_id
    WHERE  e.club_id = p_club_id;

    -- Sum of all attendance points awarded via club's events
    SELECT COALESCE(SUM(a.points_awarded), 0)
    INTO   v_points_score
    FROM   attendance a
    JOIN   events     e ON e.event_id = a.event_id
    WHERE  e.club_id = p_club_id;

    RETURN v_events_score + v_members_score + v_attend_score
         + v_rating_score + v_points_score;
END;
$$;

COMMENT ON FUNCTION fn_club_score(INTEGER) IS
    'Composite club score: weighted sum of completed events, active members, '
    'attendance, feedback rating, and total points. Used in vw_club_leaderboard.';


-- ============================================================
-- §4  fn_audit_log_entry  (helper — called by audit triggers)
-- ============================================================
-- Purpose
--   Central write function for audit_log rows. All audit triggers
--   call this function rather than writing directly, so the
--   filtering logic (secret field stripping) lives in one place.
--
-- Secret-field stripping
--   Fields named 'password_hash', 'verification_hash', 'ticket_code',
--   and 'session_id' are removed from old_values/new_values JSONB
--   before the row is stored. This prevents sensitive data leaking
--   into the audit log.
--
-- Application user context
--   The real HTTP-layer user UUID is passed via the PostgreSQL
--   session-level setting 'app.current_user_id', set by the
--   application before executing any DML:
--
--       SET LOCAL "app.current_user_id" = '<uuid>';
--
--   If the setting is absent (e.g. during migrations or seeds),
--   user_id is stored as NULL — preserving the row while
--   clearly indicating no authenticated user context.
--
-- Signature
--   fn_audit_log_entry(
--       p_action      TEXT,
--       p_table_name  TEXT,
--       p_record_id   TEXT,
--       p_old_values  JSONB,
--       p_new_values  JSONB
--   ) RETURNS VOID
-- ============================================================

CREATE OR REPLACE FUNCTION fn_audit_log_entry(
    p_action      TEXT,
    p_table_name  TEXT,
    p_record_id   TEXT,
    p_old_values  JSONB DEFAULT NULL,
    p_new_values  JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER   -- runs with owner's privileges so audit triggers
                   -- on restricted tables can still write audit_log
AS $$
DECLARE
    -- Fields that must NEVER appear in the audit log
    c_secret_fields  TEXT[] := ARRAY[
        'password_hash', 'verification_hash',
        'ticket_code', 'session_id'
    ];
    v_actor_id       UUID;
    v_clean_old      JSONB;
    v_clean_new      JSONB;
    v_field          TEXT;
BEGIN
    -- ── Resolve the actor UUID from session setting ───────────
    BEGIN
        v_actor_id := current_setting('app.current_user_id', TRUE)::UUID;
    EXCEPTION
        WHEN invalid_text_representation THEN
            v_actor_id := NULL;  -- malformed UUID → treat as unauthenticated
        WHEN OTHERS THEN
            v_actor_id := NULL;
    END;

    -- ── Strip secret fields from snapshots ────────────────────
    v_clean_old := p_old_values;
    v_clean_new := p_new_values;

    FOREACH v_field IN ARRAY c_secret_fields LOOP
        IF v_clean_old IS NOT NULL AND v_clean_old ? v_field THEN
            v_clean_old := v_clean_old - v_field;
        END IF;
        IF v_clean_new IS NOT NULL AND v_clean_new ? v_field THEN
            v_clean_new := v_clean_new - v_field;
        END IF;
    END LOOP;

    -- ── Write the audit row ───────────────────────────────────
    INSERT INTO audit_log (
        user_id, action, table_name, record_id,
        old_values, new_values, created_at
    )
    VALUES (
        v_actor_id,
        p_action,
        p_table_name,
        p_record_id,
        v_clean_old,
        v_clean_new,
        NOW()
    );
END;
$$;

COMMENT ON FUNCTION fn_audit_log_entry(TEXT, TEXT, TEXT, JSONB, JSONB) IS
    'Central audit writer. Strips secret fields; reads actor from '
    '"app.current_user_id" session setting. SECURITY DEFINER so '
    'triggers on restricted tables can still write audit_log.';
