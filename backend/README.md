# Campus Event & Club Management System — Backend

FastAPI backend foundation for the Campus Event & Club Management academic DBMS project.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Framework | **FastAPI** (Python 3.11+) |
| Web Server | **Uvicorn** (ASGI) |
| Database | **PostgreSQL 16** (`campus_events_dev`) |
| Driver & ORM | **psycopg** (v3 synchronous) + **SQLAlchemy 2.0** |
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
│   │   └── config.py        # Pydantic Settings, environment validation, CORS parser
│   ├── db/
│   │   ├── __init__.py
│   │   └── connection.py    # Synchronous engine, SessionLocal, SELECT 1 probe
│   └── api/
│       ├── __init__.py
│       ├── router.py        # Versioned route aggregator (/api/v1/...)
│       └── health.py        # /health (liveness) & /health/ready (readiness)
├── tests/
│   ├── __init__.py
│   └── test_health.py       # Automated tests for health and database readiness
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

## 🔍 Health & Diagnostic Endpoints

| Endpoint | Method | Database Query? | Purpose | Success Response | Failure Response |
|---|---|---|---|---|---|
| `/` | `GET` | No | API metadata & links | `200 OK` | — |
| `/health` | `GET` | **No** | Application liveness probe | `200 OK`<br>`{"status": "ok"}` | `500 Internal Server Error` |
| `/health/ready` | `GET` | **Yes** (`SELECT 1`) | Database readiness probe | `200 OK`<br>`{"status": "ready", "database": "connected"}` | `503 Service Unavailable`<br>`{"status": "not_ready", "database": "unavailable"}` |
| `/docs` | `GET` | No | Interactive Swagger UI | Interactive API documentation | — |

Versioned aliases `/api/v1/health` and `/api/v1/health/ready` are also available.
