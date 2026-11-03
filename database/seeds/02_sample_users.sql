-- ============================================================
-- Campus Event & Club Management System
-- Seed File 02: Initial Demo Users for Development & Testing
-- ============================================================
-- Creates one active demo user per system role with pre-hashed
-- bcrypt passwords (work factor 12).
-- Safe and idempotent: uses ON CONFLICT (email) DO NOTHING.
-- ============================================================
-- Demo User Credentials (Development Only):
--   administrator:     admin@campus.edu        / AdminPassword123!
--   student_affairs:   affairs@campus.edu      / AffairsPassword123!
--   club_advisor:      advisor@campus.edu      / AdvisorPassword123!
--   event_coordinator: coordinator@campus.edu  / CoordinatorPassword123!
--   club_president:    president@campus.edu    / PresidentPassword123!
--   student:           student@campus.edu      / StudentPassword123!
-- ============================================================

INSERT INTO users (
    user_id,
    role_id,
    email,
    password_hash,
    full_name,
    phone,
    student_id,
    status,
    is_email_verified
)
SELECT
    gen_random_uuid(),
    r.role_id,
    'admin@campus.edu',
    '$2b$12$LDt1.D9gKM7J8t79R6QciO6ykj2rVshw3.bZWvQBTBDndyNEtPnFu',
    'Dr. Eleanor Vance',
    '+1-555-0101',
    NULL,
    'active',
    TRUE
FROM roles r WHERE r.name = 'administrator'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
    user_id,
    role_id,
    email,
    password_hash,
    full_name,
    phone,
    student_id,
    status,
    is_email_verified
)
SELECT
    gen_random_uuid(),
    r.role_id,
    'affairs@campus.edu',
    '$2b$12$9RzVh932.zS2rI6NmYlcT.ywV6VSqkU123NhNTeNzeGuBbtSWmidO',
    'Dean Marcus Brody',
    '+1-555-0102',
    NULL,
    'active',
    TRUE
FROM roles r WHERE r.name = 'student_affairs'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
    user_id,
    role_id,
    email,
    password_hash,
    full_name,
    phone,
    student_id,
    status,
    is_email_verified
)
SELECT
    gen_random_uuid(),
    r.role_id,
    'advisor@campus.edu',
    '$2b$12$P3o.yf/XT93fjLomTB.chuY10tpEZGBlenkYL/c3m2.wcJGbVzLFG',
    'Prof. Alistair Finch',
    '+1-555-0103',
    NULL,
    'active',
    TRUE
FROM roles r WHERE r.name = 'club_advisor'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
    user_id,
    role_id,
    email,
    password_hash,
    full_name,
    phone,
    student_id,
    status,
    is_email_verified
)
SELECT
    gen_random_uuid(),
    r.role_id,
    'coordinator@campus.edu',
    '$2b$12$az8Di/9tYUkZx9Vi0CsvueyRj9jsQgm9usQkuAZSreApx8DZqH8l.',
    'Chris Martinez',
    '+1-555-0104',
    'STU-2026-COOR',
    'active',
    TRUE
FROM roles r WHERE r.name = 'event_coordinator'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
    user_id,
    role_id,
    email,
    password_hash,
    full_name,
    phone,
    student_id,
    status,
    is_email_verified
)
SELECT
    gen_random_uuid(),
    r.role_id,
    'president@campus.edu',
    '$2b$12$lr2qEAJQH1Ir4YFSNOOkterveZI/i9hR0JD/hgw2CvdnH6mwHlniu',
    'Priya Sharma',
    '+1-555-0105',
    'STU-2026-PRES',
    'active',
    TRUE
FROM roles r WHERE r.name = 'club_president'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (
    user_id,
    role_id,
    email,
    password_hash,
    full_name,
    phone,
    student_id,
    status,
    is_email_verified
)
SELECT
    gen_random_uuid(),
    r.role_id,
    'student@campus.edu',
    '$2b$12$rWohmEcYpC7JUM.82vE7HeHGdH9EPqwAojxgJIVEOjc1gE/UIgQlW',
    'Samara Jenkins',
    '+1-555-0106',
    'STU-2026-8841',
    'active',
    TRUE
FROM roles r WHERE r.name = 'student'
ON CONFLICT (email) DO NOTHING;
