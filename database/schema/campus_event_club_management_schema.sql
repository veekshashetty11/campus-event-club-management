-- ============================================================
-- Campus Event & Club Management System
-- PostgreSQL 14+ — Core Schema (DDL Only)
-- ============================================================
-- File   : database/schema/campus_event_club_management_schema.sql
-- Purpose: Define all 28 tables, indexes, and reporting views.
--          Functions, triggers, and seed data are in separate files.
-- Usage  : Run once on a FRESH development database.
--          Does NOT drop databases, schemas, or existing objects.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
-- btree_gist : enables the EXCLUDE constraint for venue booking
--              overlap prevention (Group 3 / venue_bookings).
-- pgcrypto   : gen_random_uuid() for UUIDs and crypt() for
--              password hashing; verification_hash on certificates.
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- GROUP 1 — ACCESS AND ORGANISATION
-- Tables: departments, roles, permissions, role_permissions, users
-- No FK dependencies on other groups; created first.
-- ============================================================

-- ── 1. departments ───────────────────────────────────────────
-- Academic or administrative units that own clubs and house users.
CREATE TABLE departments (
    department_id   SERIAL          PRIMARY KEY,
    name            VARCHAR(120)    NOT NULL UNIQUE,
    code            VARCHAR(20)     NOT NULL UNIQUE,   -- e.g. 'CSE', 'MECH'
    description     TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── 2. roles ─────────────────────────────────────────────────
-- System-defined and custom roles (e.g. student, club_president,
-- faculty_advisor, event_coordinator, admin).
CREATE TABLE roles (
    role_id         SERIAL          PRIMARY KEY,
    name            VARCHAR(60)     NOT NULL UNIQUE,
    description     TEXT,
    is_system_role  BOOLEAN         NOT NULL DEFAULT FALSE, -- prevents accidental deletion
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── 3. permissions ───────────────────────────────────────────
-- Fine-grained permission codes; mapped to roles via role_permissions.
-- code format: '<resource>.<action>'  e.g. 'events.approve'
CREATE TABLE permissions (
    permission_id   SERIAL          PRIMARY KEY,
    code            VARCHAR(100)    NOT NULL UNIQUE,
    description     TEXT,
    resource        VARCHAR(60)     NOT NULL,  -- e.g. 'events', 'clubs', 'budgets'
    action          VARCHAR(40)     NOT NULL,  -- e.g. 'create', 'read', 'approve'
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── 4. role_permissions ──────────────────────────────────────
-- Many-to-many junction: which permissions belong to each role.
CREATE TABLE role_permissions (
    role_id         INTEGER         NOT NULL
                        REFERENCES roles(role_id)             ON DELETE CASCADE,
    permission_id   INTEGER         NOT NULL
                        REFERENCES permissions(permission_id) ON DELETE CASCADE,
    granted_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- ── 5. users ─────────────────────────────────────────────────
-- Central user record. One primary role per user (RBAC entry point).
-- password_hash: store the output of pgcrypto crypt() or bcrypt externally.
CREATE TABLE users (
    user_id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id       INTEGER
                            REFERENCES departments(department_id) ON DELETE SET NULL,
    role_id             INTEGER         NOT NULL
                            REFERENCES roles(role_id)             ON DELETE RESTRICT,
    email               VARCHAR(254)    NOT NULL UNIQUE,
    password_hash       TEXT            NOT NULL,
    full_name           VARCHAR(200)    NOT NULL,
    phone               VARCHAR(20),
    student_id          VARCHAR(30)     UNIQUE,       -- NULL for staff / faculty
    profile_photo_url   TEXT,
    status              VARCHAR(20)     NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'inactive', 'suspended')),
    is_email_verified   BOOLEAN         NOT NULL DEFAULT FALSE,
    points              INTEGER         NOT NULL DEFAULT 0
                            CHECK (points >= 0),
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);


-- ============================================================
-- GROUP 2 — CLUBS AND FINANCE
-- Tables: clubs, club_members, club_budgets, sponsors,
--         event_sponsors (deferred — see Group 3), expenses
-- expenses.event_id FK added via ALTER TABLE after events is created.
-- ============================================================

-- ── 6. clubs ─────────────────────────────────────────────────
-- A registered campus club. president_id / faculty_advisor_id are
-- set after the corresponding users are created; NULL-able to avoid
-- a circular FK dependency at creation time.
CREATE TABLE clubs (
    club_id             SERIAL          PRIMARY KEY,
    department_id       INTEGER
                            REFERENCES departments(department_id) ON DELETE SET NULL,
    name                VARCHAR(150)    NOT NULL UNIQUE,
    short_name          VARCHAR(30),
    description         TEXT,
    logo_url            TEXT,
    founded_date        DATE,
    status              VARCHAR(20)     NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('active', 'inactive', 'pending', 'dissolved')),
    president_id        UUID
                            REFERENCES users(user_id) ON DELETE SET NULL,
    faculty_advisor_id  UUID
                            REFERENCES users(user_id) ON DELETE SET NULL,
    contact_email       VARCHAR(254),
    website             TEXT,
    max_members         INTEGER         CHECK (max_members > 0),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── 7. club_members ──────────────────────────────────────────
-- Tracks current and historical membership per club.
-- A user may leave and rejoin (hence UNIQUE on club_id, user_id, joined_at).
CREATE TABLE club_members (
    membership_id   SERIAL          PRIMARY KEY,
    club_id         INTEGER         NOT NULL
                        REFERENCES clubs(club_id)  ON DELETE CASCADE,
    user_id         UUID            NOT NULL
                        REFERENCES users(user_id)  ON DELETE CASCADE,
    member_role     VARCHAR(30)     NOT NULL DEFAULT 'member'
                        CHECK (member_role IN ('member', 'officer', 'co_president',
                                               'president', 'faculty_advisor')),
    joined_at       DATE            NOT NULL DEFAULT CURRENT_DATE,
    left_at         DATE,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    approved_by     UUID
                        REFERENCES users(user_id) ON DELETE SET NULL,
    notes           TEXT,
    UNIQUE (club_id, user_id, joined_at),
    CHECK (left_at IS NULL OR left_at >= joined_at)
);

-- ── 8. club_budgets ──────────────────────────────────────────
-- Annual / semester budget allocation per club.
-- spent_amount is updated by the budget-validation trigger (not yet implemented).
-- The CHECK (spent_amount <= allocated_amount) is enforced here as a hard guard.
CREATE TABLE club_budgets (
    budget_id           SERIAL          PRIMARY KEY,
    club_id             INTEGER         NOT NULL
                            REFERENCES clubs(club_id)   ON DELETE RESTRICT,
    fiscal_year         SMALLINT        NOT NULL
                            CHECK (fiscal_year BETWEEN 2000 AND 2100),
    semester            VARCHAR(10)     NOT NULL DEFAULT 'full'
                            CHECK (semester IN ('spring', 'fall', 'summer', 'full')),
    allocated_amount    NUMERIC(12,2)   NOT NULL CHECK (allocated_amount >= 0),
    spent_amount        NUMERIC(12,2)   NOT NULL DEFAULT 0.00
                            CHECK (spent_amount >= 0),
    status              VARCHAR(20)     NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'closed', 'exhausted')),
    approved_by         UUID
                            REFERENCES users(user_id) ON DELETE SET NULL,
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (club_id, fiscal_year, semester),
    -- Hard guard: spent cannot exceed allocation.
    -- Budget-validation trigger must check this BEFORE approving an expense.
    CHECK (spent_amount <= allocated_amount)
);

-- ── 9. sponsors ──────────────────────────────────────────────
-- External organisations that sponsor events.
CREATE TABLE sponsors (
    sponsor_id      SERIAL          PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL UNIQUE,
    contact_name    VARCHAR(150),
    contact_email   VARCHAR(254),
    contact_phone   VARCHAR(20),
    website         TEXT,
    logo_url        TEXT,
    notes           TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- NOTE: event_sponsors (table 10) references events (table 16).
-- It is created in Group 3 immediately after events to avoid a
-- forward-reference FK.

-- ── 11. expenses ─────────────────────────────────────────────
-- Club expense requests against a budget and optionally an event.
-- event_id FK is added via ALTER TABLE after events is defined.
CREATE TABLE expenses (
    expense_id      SERIAL          PRIMARY KEY,
    club_id         INTEGER         NOT NULL
                        REFERENCES clubs(club_id)           ON DELETE RESTRICT,
    budget_id       INTEGER
                        REFERENCES club_budgets(budget_id)  ON DELETE SET NULL,
    -- event_id column added below via ALTER TABLE (cross-group FK)
    requested_by    UUID            NOT NULL
                        REFERENCES users(user_id)           ON DELETE RESTRICT,
    approved_by     UUID
                        REFERENCES users(user_id)           ON DELETE SET NULL,
    title           VARCHAR(200)    NOT NULL,
    description     TEXT,
    amount          NUMERIC(12,2)   NOT NULL CHECK (amount > 0),
    category        VARCHAR(60)     NOT NULL
                        CHECK (category IN (
                            'venue', 'equipment', 'catering', 'marketing',
                            'transport', 'prizes', 'miscellaneous'
                        )),
    receipt_url     TEXT,
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    submitted_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    reviewed_at     TIMESTAMPTZ,
    notes           TEXT
);


-- ============================================================
-- GROUP 3 — EVENTS AND RESOURCES
-- Tables: event_categories, event_series, venues, equipment,
--         events, event_sponsors, event_approvals,
--         venue_bookings, equipment_bookings
-- ============================================================

-- ── 12. event_categories ─────────────────────────────────────
-- Lookup table for event types (e.g. Technical, Cultural, Sports).
CREATE TABLE event_categories (
    category_id     SERIAL          PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL UNIQUE,
    description     TEXT,
    color_hex       CHAR(7)
                        CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'), -- e.g. '#4A90E2'
    icon            VARCHAR(60),    -- icon name or CSS class
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE
);

-- ── 13. event_series ─────────────────────────────────────────
-- Groups recurring events under one series (e.g. Weekly Coding Club).
CREATE TABLE event_series (
    series_id       SERIAL          PRIMARY KEY,
    club_id         INTEGER         NOT NULL
                        REFERENCES clubs(club_id)   ON DELETE CASCADE,
    title           VARCHAR(200)    NOT NULL,
    description     TEXT,
    recurrence_rule VARCHAR(200),   -- iCal RRULE or human description
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── 14. venues ───────────────────────────────────────────────
-- Physical spaces that can be booked for events.
CREATE TABLE venues (
    venue_id        SERIAL          PRIMARY KEY,
    name            VARCHAR(150)    NOT NULL UNIQUE,
    building        VARCHAR(100),
    floor           VARCHAR(20),
    room_number     VARCHAR(30),
    capacity        INTEGER         NOT NULL CHECK (capacity > 0),
    has_av_equipment BOOLEAN        NOT NULL DEFAULT FALSE,
    has_wifi        BOOLEAN         NOT NULL DEFAULT TRUE,
    is_accessible   BOOLEAN         NOT NULL DEFAULT FALSE,
    amenities       TEXT[],         -- ARRAY['projector','whiteboard','ac']
    photo_url       TEXT,
    hourly_rate     NUMERIC(8,2)    NOT NULL DEFAULT 0.00
                        CHECK (hourly_rate >= 0),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── 15. equipment ────────────────────────────────────────────
-- Bookable equipment items, optionally associated with a venue.
CREATE TABLE equipment (
    equipment_id    SERIAL          PRIMARY KEY,
    venue_id        INTEGER
                        REFERENCES venues(venue_id)  ON DELETE SET NULL,
    name            VARCHAR(150)    NOT NULL,
    category        VARCHAR(60)     NOT NULL
                        CHECK (category IN (
                            'audio', 'video', 'lighting', 'furniture',
                            'computing', 'networking', 'other'
                        )),
    serial_number   VARCHAR(100)    UNIQUE,
    quantity        INTEGER         NOT NULL DEFAULT 1 CHECK (quantity > 0),
    available_qty   INTEGER         NOT NULL DEFAULT 1 CHECK (available_qty >= 0),
    condition       VARCHAR(20)     NOT NULL DEFAULT 'good'
                        CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'retired')),
    is_available    BOOLEAN         NOT NULL DEFAULT TRUE,
    daily_rate      NUMERIC(8,2)    NOT NULL DEFAULT 0.00 CHECK (daily_rate >= 0),
    notes           TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CHECK (available_qty <= quantity)
);

-- ── 16. events ───────────────────────────────────────────────
-- Core event record. Venue is nullable (online events have no venue).
-- registered_count and waitlist_count are DENORMALISED counters
-- maintained by triggers (fn_update_event_counts — planned, not yet implemented).
-- search_vector is updated by a trigger for full-text search.
CREATE TABLE events (
    event_id            SERIAL          PRIMARY KEY,
    club_id             INTEGER         NOT NULL
                            REFERENCES clubs(club_id)               ON DELETE RESTRICT,
    category_id         INTEGER
                            REFERENCES event_categories(category_id) ON DELETE SET NULL,
    series_id           INTEGER
                            REFERENCES event_series(series_id)       ON DELETE SET NULL,
    venue_id            INTEGER
                            REFERENCES venues(venue_id)              ON DELETE SET NULL,
    created_by          UUID            NOT NULL
                            REFERENCES users(user_id)               ON DELETE RESTRICT,
    title               VARCHAR(250)    NOT NULL,
    description         TEXT,
    banner_url          TEXT,
    start_time          TIMESTAMPTZ     NOT NULL,
    end_time            TIMESTAMPTZ     NOT NULL,
    registration_deadline TIMESTAMPTZ,
    max_capacity        INTEGER         CHECK (max_capacity > 0),   -- NULL = unlimited
    registered_count    INTEGER         NOT NULL DEFAULT 0
                            CHECK (registered_count >= 0),
    waitlist_count      INTEGER         NOT NULL DEFAULT 0
                            CHECK (waitlist_count >= 0),
    is_public           BOOLEAN         NOT NULL DEFAULT TRUE,
    requires_approval   BOOLEAN         NOT NULL DEFAULT FALSE,
    status              VARCHAR(30)     NOT NULL DEFAULT 'draft'
                            CHECK (status IN (
                                'draft', 'pending_approval', 'approved',
                                'rejected', 'published', 'ongoing',
                                'completed', 'cancelled'
                            )),
    budget_allocated    NUMERIC(12,2)   NOT NULL DEFAULT 0.00
                            CHECK (budget_allocated >= 0),
    tags                TEXT[],
    -- TSVECTOR for GIN full-text search (maintained by trigger)
    search_vector       TSVECTOR,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time),
    CHECK (
        registration_deadline IS NULL
        OR registration_deadline <= start_time
    ),
    -- registered_count must not exceed capacity when capacity is set
    CHECK (
        max_capacity IS NULL
        OR registered_count <= max_capacity
    )
);

-- ── 10. event_sponsors ───────────────────────────────────────
-- Links sponsors to specific events (defined here because it references events).
CREATE TABLE event_sponsors (
    event_sponsor_id    SERIAL          PRIMARY KEY,
    event_id            INTEGER         NOT NULL
                            REFERENCES events(event_id)    ON DELETE CASCADE,
    sponsor_id          INTEGER         NOT NULL
                            REFERENCES sponsors(sponsor_id) ON DELETE RESTRICT,
    contribution_amount NUMERIC(12,2)   CHECK (contribution_amount >= 0),
    contribution_type   VARCHAR(60)
                            CHECK (contribution_type IN (
                                'monetary', 'in_kind', 'media', 'venue', 'other'
                            )),
    agreement_url       TEXT,
    is_confirmed        BOOLEAN         NOT NULL DEFAULT FALSE,
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, sponsor_id)
);

-- ── Cross-group FK: expenses.event_id ────────────────────────
-- Adds the event reference to the expenses table now that events exists.
ALTER TABLE expenses
    ADD COLUMN event_id INTEGER
        REFERENCES events(event_id) ON DELETE SET NULL;

-- ── 17. event_approvals ──────────────────────────────────────
-- Multi-level approval records for events that require approval.
-- level 1 = club president, 2 = faculty advisor, 3 = admin, etc.
CREATE TABLE event_approvals (
    approval_id     SERIAL          PRIMARY KEY,
    event_id        INTEGER         NOT NULL
                        REFERENCES events(event_id)  ON DELETE CASCADE,
    approver_id     UUID            NOT NULL
                        REFERENCES users(user_id)    ON DELETE RESTRICT,
    role_id         INTEGER
                        REFERENCES roles(role_id)    ON DELETE SET NULL,
    level           SMALLINT        NOT NULL DEFAULT 1
                        CHECK (level BETWEEN 1 AND 5),
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
    comments        TEXT,
    decided_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, approver_id, level)
);

-- ── 18. venue_bookings ───────────────────────────────────────
-- Reserves a venue for an event.
-- EXCLUSION CONSTRAINT: prevents two CONFIRMED bookings for the same
-- venue from overlapping in time. Uses tstzrange with btree_gist.
-- Pending/cancelled bookings do not block the slot (WHERE clause).
CREATE TABLE venue_bookings (
    booking_id              SERIAL      PRIMARY KEY,
    venue_id                INTEGER     NOT NULL
                                REFERENCES venues(venue_id)  ON DELETE RESTRICT,
    event_id                INTEGER     NOT NULL
                                REFERENCES events(event_id)  ON DELETE CASCADE,
    booked_by               UUID        NOT NULL
                                REFERENCES users(user_id)    ON DELETE RESTRICT,
    start_time              TIMESTAMPTZ NOT NULL,
    end_time                TIMESTAMPTZ NOT NULL,
    setup_minutes           SMALLINT    NOT NULL DEFAULT 30
                                CHECK (setup_minutes >= 0),
    teardown_minutes        SMALLINT    NOT NULL DEFAULT 30
                                CHECK (teardown_minutes >= 0),
    purpose                 TEXT,
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    approved_by             UUID
                                REFERENCES users(user_id) ON DELETE SET NULL,
    approved_at             TIMESTAMPTZ,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time),
    -- ── Overlap-prevention exclusion constraint ──────────────
    -- Two rows conflict when: same venue AND time ranges overlap
    -- AND both have status = 'confirmed'.
    -- tstzrange('[)') = inclusive start, exclusive end.
    CONSTRAINT uq_venue_no_overlap
        EXCLUDE USING gist (
            venue_id WITH =,
            tstzrange(start_time, end_time, '[)') WITH &&
        ) WHERE (status = 'confirmed')
);

-- ── 19. equipment_bookings ───────────────────────────────────
-- Reserves equipment items for an event.
CREATE TABLE equipment_bookings (
    eq_booking_id   SERIAL          PRIMARY KEY,
    equipment_id    INTEGER         NOT NULL
                        REFERENCES equipment(equipment_id)  ON DELETE RESTRICT,
    event_id        INTEGER         NOT NULL
                        REFERENCES events(event_id)         ON DELETE CASCADE,
    booked_by       UUID            NOT NULL
                        REFERENCES users(user_id)           ON DELETE RESTRICT,
    quantity_booked INTEGER         NOT NULL DEFAULT 1
                        CHECK (quantity_booked > 0),
    start_time      TIMESTAMPTZ     NOT NULL,
    end_time        TIMESTAMPTZ     NOT NULL,
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'returned', 'cancelled')),
    notes           TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time)
);


-- ============================================================
-- GROUP 4 — PARTICIPATION
-- Tables: event_registrations, event_waitlist, attendance,
--         certificates, feedback
-- ============================================================

-- ── 20. event_registrations ──────────────────────────────────
-- One row per user per event they register for.
-- ticket_code: unique QR-scannable token for check-in (pgcrypto UUID).
CREATE TABLE event_registrations (
    registration_id         SERIAL          PRIMARY KEY,
    event_id                INTEGER         NOT NULL
                                REFERENCES events(event_id)  ON DELETE CASCADE,
    user_id                 UUID            NOT NULL
                                REFERENCES users(user_id)    ON DELETE CASCADE,
    registered_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    status                  VARCHAR(20)     NOT NULL DEFAULT 'registered'
                                CHECK (status IN (
                                    'registered', 'cancelled', 'attended', 'no_show'
                                )),
    cancelled_at            TIMESTAMPTZ,
    cancellation_reason     TEXT,
    checked_in_at           TIMESTAMPTZ,
    ticket_code             UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    dietary_preferences     TEXT,
    notes                   TEXT,
    UNIQUE (event_id, user_id)
);

-- ── 21. event_waitlist ───────────────────────────────────────
-- Ordered queue when an event reaches max_capacity.
-- position is the queue rank; UNIQUE DEFERRABLE allows safe
-- bulk position reorders inside a single transaction.
CREATE TABLE event_waitlist (
    waitlist_id     SERIAL          PRIMARY KEY,
    event_id        INTEGER         NOT NULL
                        REFERENCES events(event_id)  ON DELETE CASCADE,
    user_id         UUID            NOT NULL
                        REFERENCES users(user_id)    ON DELETE CASCADE,
    position        INTEGER         NOT NULL CHECK (position > 0),
    joined_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    status          VARCHAR(20)     NOT NULL DEFAULT 'waiting'
                        CHECK (status IN ('waiting', 'promoted', 'expired', 'cancelled')),
    promoted_at     TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,    -- deadline to confirm the promoted spot
    UNIQUE (event_id, user_id),
    -- DEFERRABLE so the fn_process_waitlist trigger can safely
    -- renumber positions within one transaction.
    CONSTRAINT uq_waitlist_position
        UNIQUE (event_id, position)
        DEFERRABLE INITIALLY DEFERRED
);

-- ── 22. attendance ───────────────────────────────────────────
-- Official attendance record per user per event.
-- marked_by is the officer or admin who recorded attendance.
-- points_awarded is updated by the attendance-points trigger (planned).
CREATE TABLE attendance (
    attendance_id   SERIAL          PRIMARY KEY,
    event_id        INTEGER         NOT NULL
                        REFERENCES events(event_id)                     ON DELETE CASCADE,
    user_id         UUID            NOT NULL
                        REFERENCES users(user_id)                       ON DELETE CASCADE,
    registration_id INTEGER
                        REFERENCES event_registrations(registration_id) ON DELETE SET NULL,
    marked_by       UUID            NOT NULL
                        REFERENCES users(user_id)                       ON DELETE RESTRICT,
    status          VARCHAR(20)     NOT NULL DEFAULT 'present'
                        CHECK (status IN ('present', 'absent', 'excused', 'late')),
    check_in_time   TIMESTAMPTZ,
    check_out_time  TIMESTAMPTZ,
    points_awarded  INTEGER         NOT NULL DEFAULT 0
                        CHECK (points_awarded >= 0),
    notes           TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, user_id),
    CHECK (check_out_time IS NULL OR check_out_time >= check_in_time)
);

-- ── 23. certificates ─────────────────────────────────────────
-- Auto-issuable participation / achievement certificates.
-- certificate_id is a UUID used in the publicly verifiable PDF URL.
-- verification_hash is a pgcrypto digest for tamper detection.
CREATE TABLE certificates (
    certificate_id      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            INTEGER         NOT NULL
                            REFERENCES events(event_id)      ON DELETE RESTRICT,
    user_id             UUID            NOT NULL
                            REFERENCES users(user_id)        ON DELETE RESTRICT,
    attendance_id       INTEGER
                            REFERENCES attendance(attendance_id) ON DELETE SET NULL,
    certificate_type    VARCHAR(40)     NOT NULL DEFAULT 'participation'
                            CHECK (certificate_type IN (
                                'participation', 'achievement', 'completion',
                                'speaker', 'volunteer'
                            )),
    issued_at           TIMESTAMPTZ,
    status              VARCHAR(20)     NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'issued', 'revoked')),
    revoked_at          TIMESTAMPTZ,
    revoke_reason       TEXT,
    pdf_url             TEXT,
    verification_hash   TEXT            UNIQUE,  -- SHA-256 digest via pgcrypto
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, user_id, certificate_type)
);

-- ── 24. feedback ─────────────────────────────────────────────
-- Post-event feedback from attendees. One row per user per event.
CREATE TABLE feedback (
    feedback_id         SERIAL          PRIMARY KEY,
    event_id            INTEGER         NOT NULL
                            REFERENCES events(event_id)                     ON DELETE CASCADE,
    user_id             UUID            NOT NULL
                            REFERENCES users(user_id)                       ON DELETE CASCADE,
    registration_id     INTEGER
                            REFERENCES event_registrations(registration_id) ON DELETE SET NULL,
    overall_rating      SMALLINT        NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    content_rating      SMALLINT        CHECK (content_rating BETWEEN 1 AND 5),
    venue_rating        SMALLINT        CHECK (venue_rating BETWEEN 1 AND 5),
    organisation_rating SMALLINT        CHECK (organisation_rating BETWEEN 1 AND 5),
    comments            TEXT,
    suggestions         TEXT,
    is_anonymous        BOOLEAN         NOT NULL DEFAULT FALSE,
    submitted_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, user_id)
);


-- ============================================================
-- GROUP 5 — ENGAGEMENT AND AUDIT
-- Tables: notifications, badges, user_badges, audit_log
-- ============================================================

-- ── 25. notifications ────────────────────────────────────────
-- In-app notifications delivered to individual users.
-- reference_type / reference_id provide a polymorphic link to the
-- triggering entity (TEXT to support both INT and UUID PKs).
CREATE TABLE notifications (
    notification_id SERIAL          PRIMARY KEY,
    user_id         UUID            NOT NULL
                        REFERENCES users(user_id) ON DELETE CASCADE,
    title           VARCHAR(200)    NOT NULL,
    body            TEXT            NOT NULL,
    type            VARCHAR(30)     NOT NULL DEFAULT 'info'
                        CHECK (type IN (
                            'info', 'success', 'warning', 'error',
                            'event', 'registration', 'approval', 'system'
                        )),
    reference_type  VARCHAR(50),    -- e.g. 'event', 'club', 'expense'
    reference_id    TEXT,           -- TEXT to hold UUID or integer
    is_read         BOOLEAN         NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── 26. badges ───────────────────────────────────────────────
-- Achievement badge definitions.
CREATE TABLE badges (
    badge_id        SERIAL          PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL UNIQUE,
    description     TEXT,
    icon_url        TEXT,
    criteria        TEXT,           -- human-readable earning criteria
    points_required INTEGER         CHECK (points_required >= 0),
    badge_type      VARCHAR(30)     NOT NULL DEFAULT 'participation'
                        CHECK (badge_type IN (
                            'participation', 'leadership', 'achievement',
                            'special', 'milestone'
                        )),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── 27. user_badges ──────────────────────────────────────────
-- Awarded badges per user. Each badge is earned at most once per user.
CREATE TABLE user_badges (
    user_badge_id   SERIAL          PRIMARY KEY,
    user_id         UUID            NOT NULL
                        REFERENCES users(user_id)   ON DELETE CASCADE,
    badge_id        INTEGER         NOT NULL
                        REFERENCES badges(badge_id) ON DELETE CASCADE,
    event_id        INTEGER
                        REFERENCES events(event_id) ON DELETE SET NULL,
    awarded_by      UUID
                        REFERENCES users(user_id)   ON DELETE SET NULL,
    awarded_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    notes           TEXT,
    UNIQUE (user_id, badge_id)
);

-- ── 28. audit_log ────────────────────────────────────────────
-- Append-only tamper-evident log of every sensitive action.
-- old_values / new_values stored as JSONB for schema-independent capture.
-- user_id is SET NULL on user deletion (preserve log, anonymise actor).
-- BIGSERIAL for very high row volume.
CREATE TABLE audit_log (
    log_id          BIGSERIAL       PRIMARY KEY,
    user_id         UUID
                        REFERENCES users(user_id) ON DELETE SET NULL,
    action          VARCHAR(100)    NOT NULL,    -- e.g. 'event.status_changed'
    table_name      VARCHAR(60),
    record_id       TEXT,           -- TEXT to hold UUID or integer PKs
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    session_id      TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);


-- ============================================================
-- INDEXES
-- ============================================================
-- Naming: idx_<table>_<column(s)>

-- ── users ────────────────────────────────────────────────────
CREATE INDEX idx_users_email        ON users(email);
CREATE INDEX idx_users_department   ON users(department_id);
CREATE INDEX idx_users_role         ON users(role_id);
CREATE INDEX idx_users_status       ON users(status);

-- ── clubs ────────────────────────────────────────────────────
CREATE INDEX idx_clubs_department   ON clubs(department_id);
CREATE INDEX idx_clubs_status       ON clubs(status);
CREATE INDEX idx_clubs_president    ON clubs(president_id);

-- ── club_members ─────────────────────────────────────────────
CREATE INDEX idx_club_members_club  ON club_members(club_id);
CREATE INDEX idx_club_members_user  ON club_members(user_id);
CREATE INDEX idx_club_members_active ON club_members(club_id, is_active);

-- ── club_budgets ─────────────────────────────────────────────
CREATE INDEX idx_club_budgets_club  ON club_budgets(club_id, fiscal_year);

-- ── expenses ─────────────────────────────────────────────────
CREATE INDEX idx_expenses_club      ON expenses(club_id);
CREATE INDEX idx_expenses_budget    ON expenses(budget_id);
CREATE INDEX idx_expenses_event     ON expenses(event_id);
CREATE INDEX idx_expenses_status    ON expenses(status);

-- ── event_categories ─────────────────────────────────────────
CREATE INDEX idx_event_categories_active ON event_categories(is_active);

-- ── events ───────────────────────────────────────────────────
CREATE INDEX idx_events_club        ON events(club_id);
CREATE INDEX idx_events_status      ON events(status);
CREATE INDEX idx_events_start_time  ON events(start_time);
CREATE INDEX idx_events_venue       ON events(venue_id);
CREATE INDEX idx_events_category    ON events(category_id);
-- GIN index on the TSVECTOR column for fast full-text search
CREATE INDEX idx_events_search      ON events USING gin(search_vector);
-- GIN index on the tags ARRAY for fast array-contains queries
CREATE INDEX idx_events_tags        ON events USING gin(tags);

-- ── event_approvals ──────────────────────────────────────────
CREATE INDEX idx_event_approvals_event    ON event_approvals(event_id);
CREATE INDEX idx_event_approvals_approver ON event_approvals(approver_id);
CREATE INDEX idx_event_approvals_status   ON event_approvals(status);

-- ── venue_bookings ───────────────────────────────────────────
CREATE INDEX idx_venue_bookings_venue  ON venue_bookings(venue_id);
CREATE INDEX idx_venue_bookings_event  ON venue_bookings(event_id);
CREATE INDEX idx_venue_bookings_status ON venue_bookings(venue_id, status);
-- GiST range index to accelerate range overlap queries
CREATE INDEX idx_venue_bookings_range  ON venue_bookings
    USING gist(tstzrange(start_time, end_time, '[)'));

-- ── equipment_bookings ───────────────────────────────────────
CREATE INDEX idx_eq_bookings_equipment ON equipment_bookings(equipment_id);
CREATE INDEX idx_eq_bookings_event     ON equipment_bookings(event_id);
CREATE INDEX idx_eq_bookings_status    ON equipment_bookings(status);

-- ── event_registrations ──────────────────────────────────────
CREATE INDEX idx_registrations_event   ON event_registrations(event_id);
CREATE INDEX idx_registrations_user    ON event_registrations(user_id);
CREATE INDEX idx_registrations_status  ON event_registrations(status);

-- ── event_waitlist ───────────────────────────────────────────
CREATE INDEX idx_waitlist_event        ON event_waitlist(event_id, status);
CREATE INDEX idx_waitlist_user         ON event_waitlist(user_id);

-- ── attendance ───────────────────────────────────────────────
CREATE INDEX idx_attendance_event      ON attendance(event_id);
CREATE INDEX idx_attendance_user       ON attendance(user_id);

-- ── certificates ─────────────────────────────────────────────
CREATE INDEX idx_certificates_event    ON certificates(event_id);
CREATE INDEX idx_certificates_user     ON certificates(user_id);
CREATE INDEX idx_certificates_status   ON certificates(status);

-- ── feedback ─────────────────────────────────────────────────
CREATE INDEX idx_feedback_event        ON feedback(event_id);
CREATE INDEX idx_feedback_user         ON feedback(user_id);

-- ── notifications ────────────────────────────────────────────
CREATE INDEX idx_notifications_user    ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ── user_badges ──────────────────────────────────────────────
CREATE INDEX idx_user_badges_user      ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge     ON user_badges(badge_id);

-- ── audit_log ────────────────────────────────────────────────
CREATE INDEX idx_audit_log_user        ON audit_log(user_id);
CREATE INDEX idx_audit_log_table       ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created     ON audit_log(created_at);
CREATE INDEX idx_audit_log_action      ON audit_log(action);


-- ============================================================
-- REPORTING VIEWS
-- Read-only. No DML. Triggers and functions may refresh
-- materialised versions of these in a future phase.
-- ============================================================

-- ── vw_upcoming_events ───────────────────────────────────────
-- Public-facing list of published/approved events in the future.
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
        WHEN e.max_capacity IS NULL THEN NULL          -- unlimited
        ELSE e.max_capacity - e.registered_count
    END                             AS seats_available,
    c.club_id,
    c.name                          AS club_name,
    c.short_name                    AS club_short_name,
    ec.name                         AS category_name,
    ec.color_hex                    AS category_color,
    v.venue_id,
    v.name                          AS venue_name,
    v.building                      AS venue_building,
    v.capacity                      AS venue_capacity
FROM   events             e
JOIN   clubs              c  ON c.club_id     = e.club_id
LEFT JOIN event_categories ec ON ec.category_id = e.category_id
LEFT JOIN venues           v  ON v.venue_id   = e.venue_id
WHERE  e.status IN ('published', 'approved', 'ongoing')
  AND  e.start_time > NOW()
ORDER BY e.start_time;


-- ── vw_club_leaderboard ──────────────────────────────────────
-- Ranks active clubs by events run, active members, and avg rating.
CREATE OR REPLACE VIEW vw_club_leaderboard AS
SELECT
    c.club_id,
    c.name                                          AS club_name,
    c.short_name,
    c.status,
    COUNT(DISTINCT e.event_id)                      AS total_events,
    COUNT(DISTINCT cm.membership_id)
        FILTER (WHERE cm.is_active = TRUE)          AS active_members,
    COALESCE(SUM(e.registered_count), 0)            AS total_registrations,
    ROUND(COALESCE(AVG(f.overall_rating), 0), 2)    AS avg_event_rating
FROM   clubs c
LEFT JOIN events          e   ON e.club_id  = c.club_id
LEFT JOIN feedback        f   ON f.event_id = e.event_id
LEFT JOIN club_members    cm  ON cm.club_id = c.club_id
WHERE  c.status = 'active'
GROUP BY c.club_id, c.name, c.short_name, c.status
ORDER BY total_events DESC, avg_event_rating DESC;


-- ── vw_event_attendance_summary ──────────────────────────────
-- Per-event attendance breakdown and attendance percentage.
CREATE OR REPLACE VIEW vw_event_attendance_summary AS
SELECT
    e.event_id,
    e.title                                                         AS event_title,
    e.start_time,
    e.status                                                        AS event_status,
    c.name                                                          AS club_name,
    e.registered_count,
    COUNT(a.attendance_id)                                          AS total_marked,
    COUNT(a.attendance_id) FILTER (WHERE a.status = 'present')     AS total_present,
    COUNT(a.attendance_id) FILTER (WHERE a.status = 'absent')      AS total_absent,
    COUNT(a.attendance_id) FILTER (WHERE a.status = 'excused')     AS total_excused,
    COUNT(a.attendance_id) FILTER (WHERE a.status = 'late')        AS total_late,
    CASE
        WHEN e.registered_count > 0
        THEN ROUND(
                 COUNT(a.attendance_id) FILTER (WHERE a.status = 'present')
                 * 100.0 / e.registered_count,
             2)
        ELSE 0
    END                                                             AS attendance_pct,
    ROUND(COALESCE(AVG(f.overall_rating), 0), 2)                   AS avg_feedback_rating
FROM   events        e
JOIN   clubs         c   ON c.club_id    = e.club_id
LEFT JOIN attendance a   ON a.event_id  = e.event_id
LEFT JOIN feedback   f   ON f.event_id  = e.event_id
GROUP BY
    e.event_id, e.title, e.start_time, e.status,
    c.name, e.registered_count;


-- ── vw_budget_summary ────────────────────────────────────────
-- Club budget utilisation with approved and pending expense totals.
CREATE OR REPLACE VIEW vw_budget_summary AS
SELECT
    cb.budget_id,
    cb.club_id,
    c.name                                                          AS club_name,
    cb.fiscal_year,
    cb.semester,
    cb.allocated_amount,
    cb.spent_amount,
    cb.allocated_amount - cb.spent_amount                          AS remaining_amount,
    CASE
        WHEN cb.allocated_amount > 0
        THEN ROUND(cb.spent_amount * 100.0 / cb.allocated_amount, 2)
        ELSE 0
    END                                                             AS utilisation_pct,
    cb.status,
    COALESCE(
        SUM(ex.amount) FILTER (WHERE ex.status = 'approved'), 0
    )                                                               AS approved_expenses,
    COALESCE(
        SUM(ex.amount) FILTER (WHERE ex.status = 'pending'), 0
    )                                                               AS pending_expenses
FROM   club_budgets  cb
JOIN   clubs         c    ON c.club_id    = cb.club_id
LEFT JOIN expenses   ex   ON ex.budget_id = cb.budget_id
GROUP BY
    cb.budget_id, cb.club_id, c.name, cb.fiscal_year,
    cb.semester, cb.allocated_amount, cb.spent_amount, cb.status;


-- ============================================================
-- END OF SCHEMA DDL
-- ============================================================
-- Next files (Phase 2 — planned, not yet implemented):
--   database/schema/functions.sql   — fn_process_event_approval,
--                                     fn_register_for_event,
--                                     fn_club_score
--   database/schema/triggers.sql    — waitlist promotion,
--                                     budget validation,
--                                     attendance points,
--                                     certificate issuance,
--                                     audit logging,
--                                     search_vector update,
--                                     event counter sync
--   database/seeds/seed_data.sql    — reference data and demo records
-- ============================================================
