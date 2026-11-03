# Campus Event & Club Management System — Backend

FastAPI backend with Authentication and Role-Based Access Control (RBAC) for the Campus Event & Club Management academic DBMS project.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Framework | **FastAPI** (Python 3.11+) |
| Web Server | **Uvicorn** (ASGI) |
| Database | **PostgreSQL 16** (`campus_events_dev`) |
| Driver & ORM | **psycopg** (v3 synchronous) + **SQLAlchemy 2.0** |
| Password Hashing | **bcrypt** (work factor 12) |
| Token Management | **PyJWT** (RFC 7519, HS256) |
| Configuration | **Pydantic Settings** (`.env` validation) |
| Testing | **Pytest** + **HTTPX** (ASGI transport) |

---

## 📁 Directory Structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application entry point, lifespan, CORS, middleware
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py        # Pydantic Settings, environment validation, CORS parser
│   │   └── security.py      # bcrypt password hashing & PyJWT token utilities
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py          # SQLAlchemy DeclarativeBase
│   │   └── connection.py    # Synchronous engine, SessionLocal, SELECT 1 probe
│   ├── models/
│   │   ├── __init__.py
│   │   └── auth.py          # ORM models: Role, Permission, User, role_permissions
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── auth.py          # Pydantic schemas: LoginRequest, TokenResponse, UserProfileResponse
│   └── api/
│       ├── __init__.py
│       ├── deps.py          # Reusable auth & RBAC dependencies: get_current_user, require_roles, require_permissions
│       ├── router.py        # Versioned route aggregator (/api/v1/...)
│       ├── health.py        # /health (liveness) & /health/ready (readiness)
│       └── auth.py          # /auth/login, /auth/me, and RBAC test endpoints
├── tests/
│   ├── __init__.py
│   ├── test_health.py       # Automated tests for health and database readiness
│   └── test_auth.py         # Automated tests for authentication, JWT lifecycle & RBAC
├── .venv/                   # Python virtual environment (gitignored)
├── .env.example             # Safe template with placeholders
├── .env                     # Local environment settings (gitignored)
├── requirements.txt         # Pinned Python dependencies
└── README.md                # Backend documentation
```

---

## 🚀 Setup & Execution on macOS (Apple Silicon M2)

### 1. Prerequisites
- macOS on Apple Silicon (M2)
- PostgreSQL 16 service running locally:
  ```bash
  brew services list | grep postgresql@16
  # Ensure it reports 'started'
  ```
- Python 3.11+ installed

### 2. Activate Virtual Environment
```bash
cd backend
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment
Copy `.env.example` to `.env` if not already configured:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL="postgresql+psycopg://veekshavshetty@localhost:5432/campus_events_dev"` points to your local PostgreSQL server and database.

### 5. Run the Automated Tests
```bash
PYTHONPATH=. pytest tests/ -v
```

### 6. Start the Development Server
```bash
PYTHONPATH=. uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

## 🔑 Available Roles & Demo Credentials (Development)

| Role Name | Demo Email | Password | Primary Privileges |
|---|---|---|---|
| `administrator` | `admin@campus.edu` | `AdminPassword123!` | Unconstrained administrative control across all tables |
| `student_affairs` | `affairs@campus.edu` | `AffairsPassword123!` | Level 2 event approvals, compliance & budget approvals |
| `club_advisor` | `advisor@campus.edu` | `AdvisorPassword123!` | Level 1 event approvals, club advising & budget reviews |
| `event_coordinator` | `coordinator@campus.edu` | `CoordinatorPassword123!` | Event creation, venue booking & attendance marking |
| `club_president` | `president@campus.edu` | `PresidentPassword123!` | Club roster management, event proposals & budget submissions |
| `student` | `student@campus.edu` | `StudentPassword123!` | Event browsing, registration, waitlisting & certificates |

---

## 🔍 API Endpoints

| Endpoint | Method | Auth Required | Purpose | Success Response | Error Responses |
|---|---|:---:|---|---|---|
| `/health` | `GET` | No | Liveness probe | `200 OK` | `500 Internal Server Error` |
| `/health/ready` | `GET` | No | PostgreSQL readiness probe | `200 OK` | `503 Service Unavailable` |
| `/auth/login` | `POST` | No | Authenticate & issue JWT | `200 OK`<br>`{"access_token": "...", ...}` | `401 Unauthorized`<br>`403 Forbidden` (if inactive/suspended) |
| `/auth/me` | `GET` | **Bearer JWT** | Profile & permitted actions | `200 OK`<br>`{"email": "...", "role": "...", "permissions": [...]}` | `401 Unauthorized`<br>`403 Forbidden` |
| `/auth/test/admin-only` | `GET` | **Bearer JWT** | RBAC test: `administrator` role | `200 OK` | `401 Unauthorized`<br>`403 Forbidden` |
| `/auth/test/approval-perm` | `GET` | **Bearer JWT** | RBAC test: `events.approve` permission | `200 OK` | `401 Unauthorized`<br>`403 Forbidden` |
| `/docs` | `GET` | No | Interactive Swagger UI | OpenAPI 3.1 documentation | — |

Versioned aliases `/api/v1/...` are also mounted for all routes.
