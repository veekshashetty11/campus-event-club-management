# Schema Design Decisions

**Project:** Campus Event & Club Management System
**File:** `database/schema/campus_event_club_management_schema.sql`
**Status:** Phase 3 — Functions, triggers, and views implemented (NOT YET EXECUTED).
            Phase 2 — Core DDL (28 tables, indexes, views) — complete.

---

## Phase 3 Approved Decisions (D1–D5)

### D1 — Three-Level Sequential Event Approval
**Approved:** Implemented in `fn_process_event_approval()`.
- Level 1: `club_advisor` role
- Level 2: `student_affairs` role
- Level 3: `administrator` role
- Levels must be completed in strict ascending order.
- `events.current_approval_level` (new column, Phase 3) tracks progress in O(1).
- Rejection at any level sets `events.status = 'rejected'` and halts the workflow.
- The same approver cannot submit twice at the same level.
- The function does NOT rely on `current_user` / `session_user` for identity — the caller passes the authenticated user UUID explicitly.

### D2 — Automatic Waitlist Promotion
**Approved:** Implemented in `trg_waitlist_promotion` (AFTER UPDATE on `event_registrations`).
- Triggers when `status` changes from `'registered'` → `'cancelled'`.
- Uses `FOR UPDATE` on the `events` row and `FOR UPDATE SKIP LOCKED` on the waitlist row to prevent concurrent promotions of the same entry.
- Promoted user gets a 24-hour window (`expires_at`) to confirm.
- Waitlist positions are renumbered within the same transaction (safe because `uq_waitlist_position` is `DEFERRABLE`).

### D3 — Certificate Eligibility
**Approved:** `'present'` and `'late'` attendance statuses qualify for a certificate.
`'absent'` and `'excused'` do not.
- Implemented in `trg_certificate_issuance` (AFTER INSERT OR UPDATE on `attendance`).
- `ON CONFLICT (event_id, user_id, certificate_type) DO NOTHING` prevents duplicates.
- Revocation is a separate explicit administrative action (not handled by trigger).

### D4 — Configurable Attendance Points
**Approved:** Points stored on `events` table as `points_on_time` (default 10) and `points_late` (default 5).
- Added via `ALTER TABLE` in Phase 3 schema amendments.
- `trg_attendance_points` reads these columns at trigger time — no hard-coded values in trigger functions.
- Uses delta arithmetic (`v_pts - v_prev_pts`) to adjust `users.points` when attendance status changes, preventing double-awarding.
- `NULL` value for either column means "award no points for that status".

### D5 — Audit Scope
**Approved:** 16 audited tables across all 5 groups:
`users`, `roles`, `permissions`, `clubs`, `club_members`, `events`, `event_approvals`, `venue_bookings`, `equipment_bookings`, `event_registrations`, `event_waitlist`, `club_budgets`, `expenses`, `event_sponsors`, `attendance`, `certificates`.
- Lookup tables (`departments`, `event_categories`, `event_series`, `venues`, `equipment`, `sponsors`, `badges`, `feedback`, `notifications`, `user_badges`) are NOT audited to reduce noise.
- Application user passed via `SET LOCAL "app.current_user_id" = '<uuid>'` before DML.
- `fn_audit_log_entry` (SECURITY DEFINER) strips: `password_hash`, `verification_hash`, `ticket_code`, `session_id`.

---

---

## 1. Table Ordering and Circular-Dependency Resolution

### Decision
`users` is created before `clubs`, even though clubs have `president_id` and `faculty_advisor_id` columns that reference `users`.

### Rationale
A genuine circular dependency arises if `users` also referenced `clubs` (e.g., a `current_club_id` column). That column was deliberately omitted. The FK direction is **users → clubs** only through `club_members`; the reverse direction (`clubs → users`) is nullable and added after `users` is created, so no circular FK exists.

### Implication
`clubs.president_id` and `clubs.faculty_advisor_id` are nullable. Application logic and seeds must set them **after** creating the relevant user records.

---

## 2. `event_sponsors` Placement (Table 10 in Logical Group, Created in Group 3)

### Decision
`event_sponsors` is logically part of the "Clubs and Finance" group but is physically defined **after** the `events` table.

### Rationale
`event_sponsors` carries a FK to `events(event_id)`. PostgreSQL requires the referenced table to exist at `CREATE TABLE` time. Moving it after `events` is the only FK-safe option; no structural change to the data model is needed.

---

## 3. `expenses.event_id` Added via `ALTER TABLE`

### Decision
`expenses` is created in Group 2 without `event_id`. The column is added via `ALTER TABLE expenses ADD COLUMN event_id ...` immediately after `events` is defined.

### Rationale
Expenses belong financially to clubs (Group 2), but some expenses are tied to a specific event (Group 3). Adding the column post-definition avoids a forward-reference FK while keeping the table in its logical group.

### Implication
`event_id` is nullable — expenses that are club-level (not event-specific) leave this NULL.

---

## 4. Venue Overlap Prevention — Exclusion Constraint

### Decision
```sql
CONSTRAINT uq_venue_no_overlap
    EXCLUDE USING gist (
        venue_id WITH =,
        tstzrange(start_time, end_time, '[)') WITH &&
    ) WHERE (status = 'confirmed')
```

### Rationale
- A plain UNIQUE constraint cannot express range-based non-overlap.
- The GiST exclusion constraint (enabled by `btree_gist`) enforces at the database level that no two **confirmed** bookings for the same venue overlap.
- `Pending` and `cancelled` bookings are excluded from the check (`WHERE` clause), allowing multiple teams to tentatively request the same slot; only confirming one triggers the guard.

### Implication
`btree_gist` must be installed (`CREATE EXTENSION IF NOT EXISTS btree_gist`). The application must never bypass the `status = 'confirmed'` guard to circumvent this constraint.

---

## 5. Denormalised Counters on `events`

### Decision
`events.registered_count` and `events.waitlist_count` are denormalised integer columns maintained by application triggers (not yet implemented).

### Rationale
Computing `COUNT(*)` from `event_registrations` on every request would be expensive for high-traffic events. Denormalised counters enable O(1) seat-availability checks.

### Assumption
The counters will be kept consistent by:
- A trigger on `event_registrations` (INSERT/UPDATE/DELETE) that increments/decrements `registered_count`.
- A trigger on `event_waitlist` that maintains `waitlist_count`.
- These triggers are planned in `database/schema/triggers.sql` (Phase 3).

### Risk
If a bug causes the counter to drift, a reconciliation query can reset it:
```sql
UPDATE events e
SET    registered_count = (
           SELECT COUNT(*) FROM event_registrations
           WHERE event_id = e.event_id AND status = 'registered'
       );
```

---

## 6. Waitlist Position Management — `DEFERRABLE INITIALLY DEFERRED`

### Decision
```sql
CONSTRAINT uq_waitlist_position
    UNIQUE (event_id, position)
    DEFERRABLE INITIALLY DEFERRED
```

### Rationale
When a user at position 3 is promoted, all users behind them must be renumbered (3 → 2, 4 → 3, …). PostgreSQL checks UNIQUE constraints per-statement by default, which causes a transient duplicate when two rows temporarily hold the same position during a bulk UPDATE. `DEFERRABLE INITIALLY DEFERRED` moves the check to **transaction commit**, allowing safe in-transaction renumbering.

### Implication
All waitlist position updates must be wrapped in an explicit `BEGIN … COMMIT` transaction.

---

## 7. `club_budgets.spent_amount` Constraint vs. Trigger

### Decision
A table-level `CHECK (spent_amount <= allocated_amount)` is retained as a hard safety net. The `fn_register_for_event` / budget-validation trigger is the primary enforcement point.

### Rationale
The trigger (planned) will reject an expense approval if it would breach the budget **before** updating `spent_amount`. The `CHECK` constraint is a secondary guard against direct DML bypassing the trigger.

### Implication
If the trigger is bypassed (e.g., via `SET session_replication_role = replica`), the CHECK constraint still protects integrity. Administrators who need to override budgets must explicitly increase `allocated_amount` first.

---

## 8. Primary Key Choices

| Table | PK Type | Reason |
|---|---|---|
| `users` | UUID (`gen_random_uuid()`) | Globally unique; safe to expose in APIs and ticket codes without revealing sequential IDs |
| `certificates` | UUID | Used as a public verification token in PDF URLs |
| `audit_log` | BIGSERIAL | Very high row volume; sequential int is fine for append-only internal log |
| All other tables | SERIAL (integer) | Simpler, faster joins for high-frequency relational lookups |

---

## 9. Password Storage

### Decision
`users.password_hash` stores a `TEXT` value. No plaintext passwords are ever stored.

### Assumption
Passwords are hashed **in the application layer** (e.g., using `bcrypt` via Python's `passlib`) before being inserted. The `pgcrypto` extension is available for server-side `crypt()` if needed, but the recommended approach is application-layer hashing.

### Rule
No seed file or migration may insert a plaintext password into `password_hash`.

---

## 10. Full-Text Search on `events`

### Decision
`events.search_vector TSVECTOR` is stored and indexed with a GIN index:
```sql
CREATE INDEX idx_events_search ON events USING gin(search_vector);
```

### Assumption
The `search_vector` column will be populated and refreshed by a `BEFORE INSERT OR UPDATE` trigger on `events` (planned):
```sql
NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
```
Until the trigger is implemented, `search_vector` will be NULL and the GIN index will be empty but harmless.

---

## 11. Polymorphic References in `notifications` and `audit_log`

### Decision
`reference_id` (notifications) and `record_id` (audit_log) are `TEXT` columns rather than typed FKs.

### Rationale
These columns must reference rows in many different tables (events, clubs, expenses, …), each with different PK types (SERIAL integers vs. UUIDs). A typed FK can only reference one table. Using TEXT with an accompanying `reference_type` / `table_name` text discriminator is the standard PostgreSQL pattern for this use case.

### Implication
Referential integrity for these polymorphic links **cannot** be enforced by the database. Application code and the audit trigger are responsible for populating them consistently.

---

## 12. Soft Deletes vs. Hard Deletes

### Decision
No soft-delete columns (e.g., `deleted_at`) were added to any table.

### Rationale
The deletion rules already preserve historical integrity:
- `ON DELETE CASCADE` — removes child records that have no meaning without the parent (e.g., registrations when an event is cascade-deleted — but events use `RESTRICT`).
- `ON DELETE RESTRICT` — prevents deletion of records that are referenced by financial or participation history (users, clubs, events).
- `ON DELETE SET NULL` — nullifies optional FK pointers while preserving the dependent row (e.g., a departing faculty advisor on a club record).

Soft-delete columns can be added to specific tables (e.g., `users`, `clubs`) in a future migration if the application requires recycle-bin functionality.

---

## 13. Advanced Routines — Phase 3 Implementation Status

All planned routines have been written. **Not yet executed or verified against a live database.**

| Routine | File | Status |
|---|---|---|
| `fn_process_event_approval()` | `functions.sql §1` | Written |
| `fn_register_for_event()` | `functions.sql §2` | Written |
| `fn_club_score()` | `functions.sql §3` | Written |
| `fn_audit_log_entry()` | `functions.sql §4` | Written |
| `trg_update_search_vector` | `triggers.sql §1` | Written |
| `trg_sync_registered_count` | `triggers.sql §2a` | Written |
| `trg_sync_waitlist_count` | `triggers.sql §2b` | Written |
| `trg_waitlist_promotion` | `triggers.sql §3` | Written |
| `trg_budget_validation` | `triggers.sql §4` | Written |
| `trg_attendance_points` | `triggers.sql §5` | Written |
| `trg_certificate_issuance` | `triggers.sql §6` | Written |
| `trg_audit_*` (16 triggers) | `triggers.sql §7` | Written |

---

## 14. What Was NOT Invented

The following were deliberately left out to avoid inventing unsupported requirements:

- **Payment / ticketing tables** — no fee collection mechanism was specified.
- **Chat / messaging tables** — out of scope.
- **File / document storage table** — URLs are stored as `TEXT`; actual files are handled by the application or an object store.
- **Email queue table** — notifications are in-app; external email delivery is an application concern.
- **User sessions table** — JWT-based stateless auth is assumed; no server-side session store is modelled.

If any of these are needed, they should be confirmed with the project supervisor before implementation.
