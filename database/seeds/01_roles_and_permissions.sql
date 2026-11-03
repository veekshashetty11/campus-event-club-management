-- ============================================================
-- Campus Event & Club Management System
-- Seed File 01: Core System Roles, Permissions, and Mappings
-- ============================================================
-- Populates the standard roles and fine-grained permissions
-- required for RBAC as defined in the system schema design.
-- Idempotent: safe to run multiple times without duplicating data.
-- ============================================================

-- ── 1. Insert Standard Roles ─────────────────────────────────
INSERT INTO roles (name, description, is_system_role)
VALUES
    ('administrator',     'Full system administrator with unconstrained access',                         TRUE),
    ('student_affairs',   'Student affairs officer: Level 2 event approvals, compliance & budget review', TRUE),
    ('club_advisor',      'Faculty/staff advisor: Level 1 event approvals and club oversight',           TRUE),
    ('event_coordinator', 'Event organizer: event scheduling, venue bookings and attendance marking',    TRUE),
    ('club_president',    'Club leader: club profile management, event proposals and budget submission',  TRUE),
    ('student',           'General campus student: event discovery, registration and club membership',   TRUE)
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    is_system_role = EXCLUDED.is_system_role;


-- ── 2. Insert Standard Permissions ───────────────────────────
INSERT INTO permissions (code, resource, action, description)
VALUES
    -- Events
    ('events.create',     'events',       'create',  'Propose and draft new events'),
    ('events.read',       'events',       'read',    'View event details and schedules'),
    ('events.update',     'events',       'update',  'Modify event descriptions, venues, or timings'),
    ('events.delete',     'events',       'delete',  'Cancel or remove an event'),
    ('events.approve',    'events',       'approve', 'Approve or reject event proposals in workflow'),
    ('events.register',   'events',       'register','Register or waitlist for open events'),

    -- Clubs
    ('clubs.create',      'clubs',        'create',  'Propose a new campus club charter'),
    ('clubs.read',        'clubs',        'read',    'Browse club directory and member rosters'),
    ('clubs.update',      'clubs',        'update',  'Update club profile, description, and links'),
    ('clubs.delete',      'clubs',        'delete',  'Dissolve or delete a club record'),
    ('clubs.manage',      'clubs',        'manage',  'Manage memberships and executive committee'),

    -- Budgets & Expenses
    ('budgets.create',    'budgets',      'create',  'Submit club budget allocations and expense requests'),
    ('budgets.read',      'budgets',      'read',    'View club budget balances and expense ledgers'),
    ('budgets.update',    'budgets',      'update',  'Modify pending expense requests'),
    ('budgets.approve',   'budgets',      'approve', 'Approve or reject club budgets and expense claims'),

    -- Venues & Facilities
    ('venues.book',       'venues',       'book',    'Reserve campus venues and facilities'),
    ('venues.read',       'venues',       'read',    'View venue calendars and availability'),
    ('venues.manage',     'venues',       'manage',  'Create and configure venue capacities'),

    -- Attendance & Certificates
    ('attendance.mark',   'attendance',   'mark',    'Record check-in and attendee participation'),
    ('attendance.read',   'attendance',   'read',    'View event attendance statistics and logs'),
    ('certificates.issue','certificates', 'issue',   'Issue verifiable participation certificates'),
    ('certificates.read', 'certificates', 'read',    'View and verify earned certificates'),

    -- User & System Administration
    ('users.read',        'users',        'read',    'View campus directory and user profiles'),
    ('users.manage',      'users',        'manage',  'Manage user roles, accounts, and suspensions'),
    ('reports.view',      'reports',      'view',    'View analytics, leaderboards, and audit trails')
ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description,
    resource    = EXCLUDED.resource,
    action      = EXCLUDED.action;


-- ── 3. Map Permissions to Roles ──────────────────────────────

-- Administrator: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'administrator'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Student Affairs
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.code IN (
    'events.read', 'events.approve',
    'clubs.read', 'clubs.manage',
    'budgets.read', 'budgets.approve',
    'venues.read',
    'attendance.read',
    'certificates.read',
    'users.read',
    'reports.view'
)
WHERE r.name = 'student_affairs'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Club Advisor
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.code IN (
    'events.read', 'events.approve',
    'clubs.read',
    'budgets.read',
    'venues.read',
    'attendance.read',
    'certificates.read',
    'reports.view'
)
WHERE r.name = 'club_advisor'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Event Coordinator
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.code IN (
    'events.create', 'events.read', 'events.update',
    'venues.book', 'venues.read',
    'attendance.mark', 'attendance.read',
    'certificates.issue', 'certificates.read',
    'clubs.read'
)
WHERE r.name = 'event_coordinator'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Club President
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.code IN (
    'clubs.read', 'clubs.update', 'clubs.manage',
    'events.create', 'events.read', 'events.update',
    'budgets.create', 'budgets.read',
    'venues.book', 'venues.read',
    'attendance.read',
    'certificates.read'
)
WHERE r.name = 'club_president'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Student
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.code IN (
    'events.read', 'events.register',
    'clubs.read',
    'certificates.read'
)
WHERE r.name = 'student'
ON CONFLICT (role_id, permission_id) DO NOTHING;
