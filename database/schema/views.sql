-- ============================================================
-- Campus Event & Club Management System
-- PostgreSQL 14+ — Reporting Views
-- ============================================================
-- File    : database/schema/views.sql
-- Depends : campus_event_club_management_schema.sql  (run first)
--           functions.sql                            (run second)
--           triggers.sql                             (run third)
-- Status  : WRITTEN — NOT YET EXECUTED OR TESTED AGAINST A DB.
-- ============================================================
-- These views are MOVED here from the schema file (Phase 2)
-- so that DDL, functions, triggers, and views remain in
-- separate files. The schema file's inline view definitions
-- remain for reference but should be replaced by these on
-- a clean database run.
-- ============================================================
-- CONTENTS
--   vw_upcoming_events
--   vw_club_leaderboard        (now calls fn_club_score)
--   vw_event_attendance_summary
--   vw_budget_summary
-- ============================================================


-- ── vw_upcoming_events ───────────────────────────────────────
-- Public-facing list of published/approved events in the future.
-- Shows seat availability. NULL seats_available = unlimited.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_upcoming_events AS
SELECT
    e.event_id,
    e.title,
    e.description,
    e.start_time,
    e.end_time,
    e.registration_deadline,
    e.is_public,
    e.status,
    e.max_capacity,
    e.registered_count,
    e.waitlist_count,
    CASE
        WHEN e.max_capacity IS NULL THEN NULL      -- unlimited event
        ELSE GREATEST(e.max_capacity - e.registered_count, 0)
    END                                 AS seats_available,
    -- Registration open flag (useful for the frontend button state)
    CASE
        WHEN e.max_capacity IS NOT NULL
             AND e.registered_count >= e.max_capacity THEN FALSE
        WHEN e.registration_deadline IS NOT NULL
             AND e.registration_deadline < NOW()    THEN FALSE
        WHEN e.status NOT IN ('published', 'approved') THEN FALSE
        ELSE TRUE
    END                                 AS registration_open,
    c.club_id,
    c.name                              AS club_name,
    c.short_name                        AS club_short_name,
    ec.category_id,
    ec.name                             AS category_name,
    ec.color_hex                        AS category_color,
    v.venue_id,
    v.name                              AS venue_name,
    v.building                          AS venue_building,
    v.capacity                          AS venue_capacity
FROM   events             e
JOIN   clubs              c  ON c.club_id      = e.club_id
LEFT JOIN event_categories ec ON ec.category_id = e.category_id
LEFT JOIN venues           v  ON v.venue_id    = e.venue_id
WHERE  e.status IN ('published', 'approved', 'ongoing')
  AND  e.start_time > NOW()
ORDER BY e.start_time;

COMMENT ON VIEW vw_upcoming_events IS
    'Future published/approved events with seat availability and registration status flag.';


-- ── vw_club_leaderboard ──────────────────────────────────────
-- Ranks active clubs using the fn_club_score() composite score.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_club_leaderboard AS
SELECT
    c.club_id,
    c.name                                              AS club_name,
    c.short_name,
    c.status,
    COUNT(DISTINCT e.event_id)
        FILTER (WHERE e.status = 'completed')           AS completed_events,
    COUNT(DISTINCT e.event_id)                          AS total_events,
    COUNT(DISTINCT cm.membership_id)
        FILTER (WHERE cm.is_active = TRUE)              AS active_members,
    COALESCE(SUM(e.registered_count), 0)               AS total_registrations,
    ROUND(COALESCE(AVG(f.overall_rating), 0), 2)       AS avg_event_rating,
    fn_club_score(c.club_id)                            AS composite_score
FROM   clubs c
LEFT JOIN events       e   ON e.club_id  = c.club_id
LEFT JOIN feedback     f   ON f.event_id = e.event_id
LEFT JOIN club_members cm  ON cm.club_id = c.club_id
WHERE  c.status = 'active'
GROUP BY c.club_id, c.name, c.short_name, c.status
ORDER BY composite_score DESC, avg_event_rating DESC;

COMMENT ON VIEW vw_club_leaderboard IS
    'Active clubs ranked by composite_score from fn_club_score(). '
    'Includes event counts, member counts, and average feedback rating.';


-- ── vw_event_attendance_summary ──────────────────────────────
-- Per-event attendance breakdown: counts per status + pct present.
-- attendance_pct is based on registered_count (not total marked),
-- since unmarked registrants count as implicit no-shows.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_event_attendance_summary AS
SELECT
    e.event_id,
    e.title                                                             AS event_title,
    e.start_time,
    e.status                                                            AS event_status,
    c.club_id,
    c.name                                                              AS club_name,
    e.registered_count,
    COUNT(a.attendance_id)                                              AS total_marked,
    COUNT(a.attendance_id) FILTER (WHERE a.status = 'present')         AS total_present,
    COUNT(a.attendance_id) FILTER (WHERE a.status = 'late')            AS total_late,
    COUNT(a.attendance_id) FILTER (WHERE a.status = 'absent')          AS total_absent,
    COUNT(a.attendance_id) FILTER (WHERE a.status = 'excused')         AS total_excused,
    -- Eligible for certificate: present + late
    COUNT(a.attendance_id)
        FILTER (WHERE a.status IN ('present', 'late'))                  AS total_eligible_for_cert,
    CASE
        WHEN e.registered_count > 0
        THEN ROUND(
                 COUNT(a.attendance_id) FILTER (WHERE a.status = 'present')
                 * 100.0 / e.registered_count, 2)
        ELSE 0
    END                                                                 AS on_time_attendance_pct,
    CASE
        WHEN e.registered_count > 0
        THEN ROUND(
                 COUNT(a.attendance_id)
                 FILTER (WHERE a.status IN ('present', 'late'))
                 * 100.0 / e.registered_count, 2)
        ELSE 0
    END                                                                 AS eligible_attendance_pct,
    ROUND(COALESCE(AVG(f.overall_rating), 0), 2)                       AS avg_feedback_rating,
    COALESCE(SUM(a.points_awarded), 0)                                 AS total_points_awarded
FROM   events         e
JOIN   clubs          c   ON c.club_id   = e.club_id
LEFT JOIN attendance  a   ON a.event_id  = e.event_id
LEFT JOIN feedback    f   ON f.event_id  = e.event_id
GROUP BY
    e.event_id, e.title, e.start_time, e.status,
    c.club_id, c.name, e.registered_count;

COMMENT ON VIEW vw_event_attendance_summary IS
    'Per-event attendance counts and percentages. '
    'total_eligible_for_cert counts present+late (per D3).';


-- ── vw_budget_summary ────────────────────────────────────────
-- Club budget utilisation with breakdown by expense status.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_budget_summary AS
SELECT
    cb.budget_id,
    cb.club_id,
    c.name                                                              AS club_name,
    cb.fiscal_year,
    cb.semester,
    cb.allocated_amount,
    cb.spent_amount,
    cb.allocated_amount - cb.spent_amount                              AS remaining_amount,
    CASE
        WHEN cb.allocated_amount > 0
        THEN ROUND(cb.spent_amount * 100.0 / cb.allocated_amount, 2)
        ELSE 0
    END                                                                 AS utilisation_pct,
    cb.status,
    COALESCE(
        SUM(ex.amount) FILTER (WHERE ex.status = 'approved'), 0
    )                                                                   AS approved_expenses,
    COALESCE(
        SUM(ex.amount) FILTER (WHERE ex.status = 'pending'), 0
    )                                                                   AS pending_expenses,
    COALESCE(
        SUM(ex.amount) FILTER (WHERE ex.status = 'rejected'), 0
    )                                                                   AS rejected_expenses,
    COALESCE(
        SUM(ex.amount) FILTER (WHERE ex.status = 'paid'), 0
    )                                                                   AS paid_expenses,
    COUNT(ex.expense_id)                                               AS total_expense_requests
FROM   club_budgets  cb
JOIN   clubs         c    ON c.club_id    = cb.club_id
LEFT JOIN expenses   ex   ON ex.budget_id = cb.budget_id
GROUP BY
    cb.budget_id, cb.club_id, c.name, cb.fiscal_year,
    cb.semester, cb.allocated_amount, cb.spent_amount, cb.status;

COMMENT ON VIEW vw_budget_summary IS
    'Budget utilisation per club per fiscal period. '
    'Breaks expenses down by status: approved, pending, rejected, paid.';
