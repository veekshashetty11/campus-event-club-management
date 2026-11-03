# Campus Event & Club Management System

> **Academic DBMS Project** — a full-stack system for managing campus clubs,
> events, venues, registrations, budgets, attendance, and certificates.

---

## 📚 Project Overview

This system provides a centralised platform for:

- **Club management** — create clubs, manage membership roles and officers
- **Event lifecycle** — submit → approve → publish → run → close events
- **Venue booking** — conflict-free venue reservations with capacity checks
- **Registration & waitlists** — attendee sign-up, automatic waitlist promotion
- **Budget tracking** — club budgets, expense requests, approval workflows
- **Attendance & certificates** — mark attendance, auto-generate certificates
- **Audit logging** — tamper-evident log of every critical action
- **Reporting** — SQL views for analytics, event summaries, and exports

---

## 🛠️ Technology Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Database   | PostgreSQL 14+                      |
| Backend    | Python 3.11+ · FastAPI · SQLAlchemy |
| Frontend   | React 18 · TypeScript · Vite        |
| Auth       | JWT (role-based access control)     |
| Dev tools  | Git · GitHub · pre-commit           |

---

## 📁 Repository Structure

```text
campus-event-club-management/
├── database/
│   ├── schema/        # DDL — tables, types, constraints, triggers, views
│   ├── migrations/    # Versioned schema migration scripts
│   ├── seeds/         # Sample / test data SQL scripts
│   └── tests/         # SQL-level unit and integration tests
├── backend/           # FastAPI application (routes, models, services)
├── frontend/          # React + TypeScript + Vite SPA
├── docs/              # Architecture diagrams, ER diagrams, API docs
├── .gitignore
└── README.md
```

---

## ⚙️ Setup (coming in Phase 2)

> Prerequisites and setup instructions will be added after the database
> schema and backend skeleton are reviewed and approved.

---

## 🗺️ Development Phases

- [x] **Phase 1** — Workspace scaffolding and project structure
- [ ] **Phase 2** — Database schema design (DDL, constraints, triggers)
- [ ] **Phase 3** — Backend API implementation (FastAPI)
- [ ] **Phase 4** — Frontend SPA implementation (React + TypeScript)
- [ ] **Phase 5** — Integration, testing, and documentation

---

## ⚠️ Security Notice

No real passwords, API keys, or database credentials are ever committed to
this repository. Use `.env` files locally (excluded by `.gitignore`) and
`.env.example` as a safe template.

---

*Maintained by the project team as part of an academic DBMS course.*
