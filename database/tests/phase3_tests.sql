-- ============================================================
-- Campus Event & Club Management System
-- PostgreSQL 14+ — SQL Test Scripts
-- ============================================================
-- File    : database/tests/phase3_tests.sql
-- Status  : DESIGNED — NOT YET EXECUTED.
--           These tests have been carefully designed to cover
--           success paths, rejection paths, boundary conditions,
--           and concurrency-sensitive behaviour.
--           They HAVE NOT been run against a live database yet.
--           Mark each test PASS/FAIL/ERROR after execution.
-- ============================================================
-- HOW TO RUN
--   1. Set up the schema, functions, triggers, and views first.
--   2. Load seeds (seed_data.sql) for base data.
--   3. Run this file inside a transaction and ROLLBACK at the
--      end so the test database stays clean, OR run each block
--      independently in its own transaction.
--   4. Replace placeholder UUIDs and IDs with real seeded values.
-- ============================================================
-- CONTENTS
--   §T1   Environment and extension checks
--   §T2   Schema structural checks
--   §T3   fn_process_event_approval tests
--   §T4   fn_register_for_event tests
--   §T5   fn_club_score tests
--   §T6   Waitlist promotion trigger tests
--   §T7   Budget validation trigger tests
--   §T8   Attendance points trigger tests
--   §T9   Certificate issuance trigger tests
--   §T10  Audit log trigger tests
--   §T11  Venue booking exclusion constraint tests
--   §T12  View smoke tests
--   §T13  Concurrency scenario descriptions
-- ============================================================

-- ============================================================
-- §T1  Environment and extension checks
-- ============================================================

-- T1-1: btree_gist extension must be present
SELECT extname, extversion
FROM   pg_extension
WHERE  extname = 'btree_gist';
-- Expected: 1 row with extname = 'btree_gist'

-- T1-2: pgcrypto extension must be present
SELECT extname, extversion
FROM   pg_extension
WHERE  extname = 'pgcrypto';
-- Expected: 1 row with extname = 'pgcrypto'

-- T1-3: PostgreSQL version must be 14 or higher
SELECT current_setting('server_version_num')::INTEGER >= 140000 AS version_ok;
-- Expected: TRUE


-- ============================================================
-- §T2  Schema structural checks
-- ============================================================

-- T2-1: Exactly 28 user tables (excluding pg_ system tables)
SELECT COUNT(*) AS table_count
FROM   information_schema.tables
WHERE  table_schema = 'public'
  AND  table_type   = 'BASE TABLE';
-- Expected: 28
-- Note: If you add tables for seeds or tests in the same schema, adjust.

-- T2-2: events.points_on_time and points_late columns exist (Phase 3 addition)
SELECT column_name, data_type, column_default
FROM   information_schema.columns
WHERE  table_name  = 'events'
  AND  column_name IN ('points_on_time', 'points_late', 'current_approval_level')
ORDER  BY column_name;
-- Expected: 3 rows

-- T2-3: Exclusion constraint on venue_bookings exists
SELECT conname, contype
FROM   pg_constraint
WHERE  conrelid = 'venue_bookings'::REGCLASS
  AND  contype  = 'x';   -- 'x' = EXCLUDE
-- Expected: 1 row with conname = 'uq_venue_no_overlap'

-- T2-4: Deferrable unique constraint on event_waitlist
SELECT conname, condeferrable, condeferred
FROM   pg_constraint
WHERE  conrelid  = 'event_waitlist'::REGCLASS
  AND  conname   = 'uq_waitlist_position';
-- Expected: condeferrable = TRUE, condeferred = TRUE

-- T2-5: All audit triggers exist
SELECT trigger_name, event_object_table, event_manipulation
FROM   information_schema.triggers
WHERE  trigger_name LIKE 'trg_audit_%'
ORDER  BY event_object_table, event_manipulation;
-- Expected: 16+ rows covering all audited tables


-- ============================================================
-- §T3  fn_process_event_approval tests
-- ============================================================
-- Prerequisite seed data assumed (replace IDs with actual seeded values):
--   Event ID 1: status='pending_approval', current_approval_level=0
--   User A (club_advisor role): uuid = '<advisor_uuid>'
--   User B (student_affairs role): uuid = '<sa_uuid>'
--   User C (administrator role): uuid = '<admin_uuid>'
--   User D (student role): uuid = '<student_uuid>'

-- T3-1: SUCCESS — Level 1 approval by club advisor
SELECT fn_process_event_approval(1, '<advisor_uuid>'::UUID, 'approved', 'Looks good');
-- Expected: {"status":"success","level_processed":1,"event_status":"pending_approval",...}
-- Verify:
SELECT status, current_approval_level FROM events WHERE event_id = 1;
-- Expected: status='pending_approval', current_approval_level=1

-- T3-2: REJECT — Level 2 attempted before level 1 completes (wrong approver at wrong time)
-- Reset event: UPDATE events SET status='pending_approval', current_approval_level=0 WHERE event_id=1;
SELECT fn_process_event_approval(1, '<sa_uuid>'::UUID, 'approved', NULL);
-- Expected: {"status":"error","message":"Approver role 'student_affairs' is not authorised for level-1..."}

-- T3-3: REJECT — Wrong role attempts level 1
SELECT fn_process_event_approval(1, '<student_uuid>'::UUID, 'approved', NULL);
-- Expected: {"status":"error","message":"Approver role 'student' is not authorised for level-1..."}

-- T3-4: REJECT — Event not in pending_approval status
-- UPDATE events SET status='draft' WHERE event_id=1;
SELECT fn_process_event_approval(1, '<advisor_uuid>'::UUID, 'approved', NULL);
-- Expected: {"status":"error","message":"Event is not in pending_approval status..."}

-- T3-5: REJECT — Duplicate approval at same level
-- (After T3-1 succeeds, level=1, same advisor tries again)
SELECT fn_process_event_approval(1, '<advisor_uuid>'::UUID, 'approved', 'Duplicate attempt');
-- Expected: {"status":"error","message":"Approver has already submitted a decision at level 1"}

-- T3-6: SUCCESS — Full 3-level approval chain
-- After T3-1: level=1
SELECT fn_process_event_approval(1, '<sa_uuid>'::UUID, 'approved', 'SA approval');
-- Expected: level_processed=2, event_status='pending_approval'
SELECT fn_process_event_approval(1, '<admin_uuid>'::UUID, 'approved', 'Final admin approval');
-- Expected: level_processed=3, event_status='approved'
SELECT status, current_approval_level FROM events WHERE event_id = 1;
-- Expected: status='approved', current_approval_level=3

-- T3-7: REJECTION halts workflow at level 2
-- Reset: status='pending_approval', current_approval_level=1
SELECT fn_process_event_approval(1, '<sa_uuid>'::UUID, 'rejected', 'Missing safety plan');
-- Expected: event_status='rejected'
SELECT status, current_approval_level FROM events WHERE event_id = 1;
-- Expected: status='rejected', current_approval_level=1 (NOT incremented on rejection)

-- T3-8: REJECT — Invalid decision value
SELECT fn_process_event_approval(1, '<advisor_uuid>'::UUID, 'maybe', NULL);
-- Expected: {"status":"error","message":"p_decision must be 'approved' or 'rejected'."}

-- T3-9: REJECT — Nonexistent event
SELECT fn_process_event_approval(9999, '<advisor_uuid>'::UUID, 'approved', NULL);
-- Expected: {"status":"error","message":"Event not found."}

-- T3-10: REJECT — Inactive approver
-- UPDATE users SET status='suspended' WHERE user_id='<advisor_uuid>';
SELECT fn_process_event_approval(1, '<advisor_uuid>'::UUID, 'approved', NULL);
-- Expected: {"status":"error","message":"Approver not found or account is inactive."}


-- ============================================================
-- §T4  fn_register_for_event tests
-- ============================================================
-- Prerequisite: Event 2: status='published', max_capacity=2,
--               registered_count=0
-- Users: U1, U2, U3 (all students)

-- T4-1: SUCCESS — First registration
SELECT fn_register_for_event(2, '<u1_uuid>'::UUID);
-- Expected: {"status":"success","type":"registered","registration_id":...}
SELECT registered_count FROM events WHERE event_id = 2;
-- Expected: 1

-- T4-2: SUCCESS — Second registration (fills event)
SELECT fn_register_for_event(2, '<u2_uuid>'::UUID);
-- Expected: {"status":"success","type":"registered",...}
SELECT registered_count FROM events WHERE event_id = 2;
-- Expected: 2

-- T4-3: SUCCESS — Event full → waitlisted
SELECT fn_register_for_event(2, '<u3_uuid>'::UUID);
-- Expected: {"status":"success","type":"waitlisted","position":1,...}
SELECT waitlist_count FROM events WHERE event_id = 2;
-- Expected: 1

-- T4-4: REJECT — Duplicate registration
SELECT fn_register_for_event(2, '<u1_uuid>'::UUID);
-- Expected: {"status":"error","message":"User is already registered for this event."}

-- T4-5: REJECT — Duplicate waitlist
SELECT fn_register_for_event(2, '<u3_uuid>'::UUID);
-- Expected: {"status":"error","message":"User is already on the waitlist for this event."}

-- T4-6: REJECT — Event not open
-- UPDATE events SET status='draft' WHERE event_id=2;
SELECT fn_register_for_event(2, '<u3_uuid>'::UUID);
-- Expected: {"status":"error","message":"Event is not open for registration..."}

-- T4-7: REJECT — Deadline passed
-- UPDATE events SET registration_deadline = NOW() - INTERVAL '1 hour' WHERE event_id=2;
SELECT fn_register_for_event(2, '<u3_uuid>'::UUID);
-- Expected: {"status":"error","message":"Registration deadline has passed."}

-- T4-8: SUCCESS — Unlimited event (max_capacity IS NULL)
-- INSERT event 3 with max_capacity=NULL, status='published'
SELECT fn_register_for_event(3, '<u1_uuid>'::UUID);
-- Expected: {"status":"success","type":"registered",...}


-- ============================================================
-- §T5  fn_club_score tests
-- ============================================================

-- T5-1: Club with no events scores 0
SELECT fn_club_score(999);  -- nonexistent club
-- Expected: 0

-- T5-2: Club with data returns positive score
SELECT fn_club_score(1);
-- Expected: > 0 (exact value depends on seed data)

-- T5-3: Score increases after completing an event
-- UPDATE events SET status='completed' WHERE event_id=1 AND club_id=1;
-- SELECT fn_club_score(1) -- expected to increase by 10


-- ============================================================
-- §T6  Waitlist promotion trigger tests
-- ============================================================
-- Setup: Event 2 is full (2/2 registered), U3 is waitlisted at position 1.
-- U4 is at position 2 (add U4 to waitlist for completeness).

-- T6-1: SUCCESS — Cancellation triggers automatic promotion
UPDATE event_registrations
SET    status       = 'cancelled',
       cancelled_at = NOW()
WHERE  event_id = 2
  AND  user_id  = '<u1_uuid>';

-- Immediately check that U3 is now registered (promoted by trigger)
SELECT status FROM event_registrations
WHERE event_id = 2 AND user_id = '<u3_uuid>';
-- Expected: 'registered'

-- Check waitlist entry for U3 is now 'promoted'
SELECT status, promoted_at FROM event_waitlist
WHERE event_id = 2 AND user_id = '<u3_uuid>';
-- Expected: status='promoted', promoted_at NOT NULL

-- Check registered_count is still 2 (1 cancelled, 1 promoted)
SELECT registered_count, waitlist_count FROM events WHERE event_id = 2;
-- Expected: registered_count=2, waitlist_count=0

-- T6-2: No promotion when event is unlimited
-- (max_capacity IS NULL — trigger should not promote from empty waitlist)
-- Setup: Event 3, unlimited, no waitlist
-- Cancel one registration → no promotion expected (waitlist is empty)


-- ============================================================
-- §T7  Budget validation trigger tests
-- ============================================================
-- Setup:
--   Budget B1: club_id=1, allocated=1000, spent=0, status='active'
--   Expense E1: club_id=1, budget_id=B1, amount=400, status='pending'
--   Expense E2: club_id=1, budget_id=B1, amount=700, status='pending'
--   SET LOCAL "app.current_user_id" = '<admin_uuid>';

-- T7-1: SUCCESS — Approve expense within budget
UPDATE expenses SET status='approved' WHERE expense_id = 1;
-- Expected: no exception
SELECT spent_amount FROM club_budgets WHERE budget_id = 1;
-- Expected: 400.00

-- T7-2: REJECT — Approve expense that exceeds budget
UPDATE expenses SET status='approved' WHERE expense_id = 2;
-- Expected: ERROR: Insufficient budget. Allocated: 1000, Spent: 400, Requested: 700. Remaining: 600.

-- T7-3: Budget status becomes 'exhausted' when fully spent
-- Expense E3: amount=600, status='pending'
UPDATE expenses SET status='approved' WHERE expense_id = 3;
-- Expected: spent_amount=1000, budget status='exhausted'

-- T7-4: REJECT — Approve expense against inactive budget
-- UPDATE club_budgets SET status='closed' WHERE budget_id=1;
-- Expense E4: amount=10, status='pending', budget_id=1
UPDATE expenses SET status='approved' WHERE expense_id = 4;
-- Expected: ERROR: Budget X is not active (status: closed).

-- T7-5: Expense without budget_id bypasses validation
-- Expense E5: club_id=1, budget_id=NULL, amount=50, status='pending'
UPDATE expenses SET status='approved' WHERE expense_id = 5;
-- Expected: succeeds (no budget check when budget_id IS NULL)


-- ============================================================
-- §T8  Attendance points trigger tests
-- ============================================================
-- Setup: Event 4: points_on_time=10, points_late=5
--        User U1: points=0
--        Attendance A1: event_id=4, user_id=U1, status='absent'

-- T8-1: No points for absent
-- (A1 is inserted with status='absent' → trigger should award 0 pts)
SELECT points_awarded FROM attendance WHERE attendance_id = 1;
-- Expected: 0
SELECT points FROM users WHERE user_id = '<u1_uuid>';
-- Expected: 0

-- T8-2: Points awarded for 'present'
UPDATE attendance SET status='present' WHERE attendance_id = 1;
SELECT points_awarded FROM attendance WHERE attendance_id = 1;
-- Expected: 10
SELECT points FROM users WHERE user_id = '<u1_uuid>';
-- Expected: 10

-- T8-3: Points reduced when changed to 'late'
UPDATE attendance SET status='late' WHERE attendance_id = 1;
SELECT points_awarded FROM attendance WHERE attendance_id = 1;
-- Expected: 5
SELECT points FROM users WHERE user_id = '<u1_uuid>';
-- Expected: 5  (reduced by delta: 10→5)

-- T8-4: Points removed when changed to 'absent'
UPDATE attendance SET status='absent' WHERE attendance_id = 1;
SELECT points_awarded FROM attendance WHERE attendance_id = 1;
-- Expected: 0
SELECT points FROM users WHERE user_id = '<u1_uuid>';
-- Expected: 0

-- T8-5: Points_on_time = NULL means no points awarded
-- UPDATE events SET points_on_time=NULL WHERE event_id=4;
-- UPDATE attendance SET status='present' WHERE attendance_id=1;
-- Expected: points_awarded=0, user points unchanged


-- ============================================================
-- §T9  Certificate issuance trigger tests
-- ============================================================
-- Continuing from §T8 setup.

-- T9-1: Certificate created when attendance set to 'present'
UPDATE attendance SET status='present' WHERE attendance_id = 1;
SELECT status, certificate_type FROM certificates
WHERE event_id=4 AND user_id='<u1_uuid>';
-- Expected: 1 row, status='pending', certificate_type='participation'

-- T9-2: No duplicate certificate on repeated UPDATE with same status
UPDATE attendance SET status='present' WHERE attendance_id = 1;
SELECT COUNT(*) FROM certificates WHERE event_id=4 AND user_id='<u1_uuid>';
-- Expected: 1 (ON CONFLICT DO NOTHING prevents duplicates)

-- T9-3: Certificate created for 'late' attendance (D3 approved)
-- Setup: Attendance A2: event_id=4, user_id=U2, status='absent'
UPDATE attendance SET status='late' WHERE attendance_id = 2;
SELECT status FROM certificates
WHERE event_id=4 AND user_id='<u2_uuid>';
-- Expected: 1 row, status='pending'

-- T9-4: No certificate for 'absent'
-- Setup: Attendance A3: status='present' → set to 'absent'
UPDATE attendance SET status='absent' WHERE attendance_id = 3;
-- Expected: no NEW certificate row (existing pending row remains if it was already created)

-- T9-5: Certificate NOT issued for 'excused'
-- Setup: Attendance A4: event_id=4, user_id=U4, status='excused' (INSERT)
-- Expected: no certificate row created


-- ============================================================
-- §T10  Audit log trigger tests
-- ============================================================

-- T10-1: Setting app.current_user_id propagates to audit log
SET LOCAL "app.current_user_id" = '<admin_uuid>';
INSERT INTO event_categories (name, description) VALUES ('Test Category', 'Audit test');
-- NOTE: event_categories is NOT in the audited table list (intentional — lookup tables excluded).
-- Verify audit entry for an audited table instead:
UPDATE clubs SET updated_at=NOW() WHERE club_id=1;
SELECT user_id, action, table_name
FROM   audit_log
ORDER  BY log_id DESC LIMIT 1;
-- Expected: user_id='<admin_uuid>', action='clubs.update', table_name='clubs'

-- T10-2: password_hash NOT present in audit snapshot
UPDATE users SET updated_at=NOW() WHERE user_id='<u1_uuid>';
SELECT (new_values ? 'password_hash') AS has_password_hash
FROM   audit_log
WHERE  table_name='users'
ORDER  BY log_id DESC LIMIT 1;
-- Expected: FALSE

-- T10-3: Audit entry created without app.current_user_id (unauthenticated path)
RESET "app.current_user_id";
UPDATE clubs SET updated_at=NOW() WHERE club_id=1;
SELECT user_id FROM audit_log ORDER BY log_id DESC LIMIT 1;
-- Expected: NULL (no actor — migration/seed context)

-- T10-4: DELETE operation captured in audit log
DELETE FROM event_categories WHERE name='Test Category';
-- (event_categories is not audited; use an audited table)
-- For a table that IS audited on DELETE:
-- Attempt a club delete and check the log (will fail if FKs prevent delete):
-- Expected: audit row with action='clubs.delete'


-- ============================================================
-- §T11  Venue booking exclusion constraint tests
-- ============================================================
-- Setup:
--   Venue V1, Event E1: booking 09:00–11:00 status='confirmed'
--   Event E2: booking 10:00–12:00 (overlapping)
--   Event E3: booking 11:00–13:00 (adjacent, non-overlapping)
--   Event E4: booking 09:00–11:00 status='pending' (same slot, pending allowed)

-- T11-1: REJECT — Overlapping confirmed bookings
INSERT INTO venue_bookings (venue_id, event_id, booked_by, start_time, end_time, status)
VALUES (1, 2, '<admin_uuid>', '2027-01-15 10:00+05:30', '2027-01-15 12:00+05:30', 'confirmed');
-- Expected: ERROR from exclusion constraint (overlap with E1's confirmed booking 09:00–11:00)

-- T11-2: SUCCESS — Adjacent bookings do not conflict (tstzrange '[)' = exclusive end)
INSERT INTO venue_bookings (venue_id, event_id, booked_by, start_time, end_time, status)
VALUES (1, 3, '<admin_uuid>', '2027-01-15 11:00+05:30', '2027-01-15 13:00+05:30', 'confirmed');
-- Expected: succeeds (11:00 is the exclusive end of E1's [09:00,11:00) range)

-- T11-3: SUCCESS — Pending booking for same slot does not block confirmation later
INSERT INTO venue_bookings (venue_id, event_id, booked_by, start_time, end_time, status)
VALUES (1, 4, '<admin_uuid>', '2027-01-15 09:00+05:30', '2027-01-15 11:00+05:30', 'pending');
-- Expected: succeeds (WHERE status='confirmed' excludes pending rows from constraint)

-- T11-4: REJECT — Confirming T11-3's pending booking conflicts with E1's confirmed booking
UPDATE venue_bookings SET status='confirmed'
WHERE event_id=4 AND venue_id=1;
-- Expected: ERROR from exclusion constraint


-- ============================================================
-- §T12  View smoke tests
-- ============================================================
-- These are SELECT-only tests to verify views return data
-- without errors when seed data exists.

-- T12-1: vw_upcoming_events returns rows
SELECT COUNT(*) FROM vw_upcoming_events;
-- Expected: >= 0 (depends on seed events with future start_time)

-- T12-2: vw_club_leaderboard returns rows for active clubs
SELECT COUNT(*) FROM vw_club_leaderboard;
-- Expected: >= 1

-- T12-3: vw_event_attendance_summary has correct column set
SELECT event_id, event_title, on_time_attendance_pct,
       eligible_attendance_pct, total_eligible_for_cert
FROM   vw_event_attendance_summary
LIMIT  1;
-- Expected: no column-not-found error

-- T12-4: vw_budget_summary has correct column set
SELECT budget_id, remaining_amount, utilisation_pct,
       approved_expenses, pending_expenses, rejected_expenses
FROM   vw_budget_summary
LIMIT  1;
-- Expected: no column-not-found error

-- T12-5: registration_open flag is FALSE when event is full
-- (Requires seed event at capacity)
SELECT event_id, registered_count, max_capacity, registration_open
FROM   vw_upcoming_events
WHERE  max_capacity IS NOT NULL
  AND  registered_count >= max_capacity
LIMIT  1;
-- Expected: registration_open = FALSE


-- ============================================================
-- §T13  Concurrency scenario descriptions
-- ============================================================
-- These scenarios CANNOT be tested with a simple SQL script.
-- They require two concurrent database sessions.
-- Document them here for the test plan; execute manually or
-- via a test harness (e.g., pgbench, pytest-asyncio).

/*
CONCURRENCY TEST C1: Double-registration race condition
  Session A: BEGIN; SELECT fn_register_for_event(2, '<u5_uuid>');
  Session B: BEGIN; SELECT fn_register_for_event(2, '<u5_uuid>');
  Both sessions commit concurrently.
  Expected: Exactly one registration succeeds; the other receives
            UNIQUE violation on (event_id, user_id) or
            "already registered" error from fn_register_for_event.
  Mechanism: FOR UPDATE lock on events row in fn_register_for_event.

CONCURRENCY TEST C2: Last-seat race condition
  Event has 1 remaining seat.
  Session A: SELECT fn_register_for_event(2, '<u5_uuid>');
  Session B: SELECT fn_register_for_event(2, '<u6_uuid>');
  Expected: Exactly one registers, the other is waitlisted.
  Mechanism: FOR UPDATE lock ensures sequential capacity check.

CONCURRENCY TEST C3: Simultaneous cancellation and promotion
  Event is full. Waitlist has U3.
  Session A cancels U1's registration.
  Session B cancels U2's registration simultaneously.
  Expected: U3 is promoted exactly once. No duplicate registration.
            SKIP LOCKED prevents double-promotion of the same waitlist entry.

CONCURRENCY TEST C4: Simultaneous expense approval against same budget
  Budget: allocated=1000, spent=700. Two expenses of 200 each.
  Session A: UPDATE expenses SET status='approved' WHERE expense_id=E1;
  Session B: UPDATE expenses SET status='approved' WHERE expense_id=E2;
  Expected: One succeeds (spent→900), the other fails with
            "Insufficient budget" (900+200>1000).
  Mechanism: FOR UPDATE lock on club_budgets in trg_budget_validation.
*/
