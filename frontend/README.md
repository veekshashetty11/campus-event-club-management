# Campus Event & Club Management System — Frontend

Frontend application for the **Campus Event & Club Management System**, built with React 18, TypeScript, Vite, React Router DOM, and Tailwind CSS.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
```bash
cd frontend
npm install
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME="Campus Event & Club Management System"
VITE_ENABLE_MOCK_AUTH=true
```

### Development Server
```bash
npm run dev
```
The application will run locally at `http://localhost:5173`.

### TypeScript Verification & Production Build
```bash
# Type-check without emitting
npm run lint

# Production build
npm run build

# Preview production build locally
npm run preview
```

---

## 🔑 Demo & Testing Credentials

The frontend includes an isolated mock authentication provider that supports rapid one-click testing via the demo badges on the login page:

| Role | Email | Password | Landing Route |
| :--- | :--- | :--- | :--- |
| **Student** | `student@campus.edu` | `StudentPassword123!` | `/student/dashboard` |
| **Club Coordinator** | `coordinator@campus.edu` | `CoordinatorPassword123!` | `/coordinator/dashboard` |
| **Club Advisor** | `advisor@campus.edu` | `AdvisorPassword123!` | `/advisor/dashboard` |
| **Student Affairs** | `affairs@campus.edu` | `AffairsPassword123!` | `/administrator/dashboard` |
| **Administrator** | `admin@campus.edu` | `AdminPassword123!` | `/administrator/dashboard` |

---

## 📁 Architecture & Directory Structure

```text
frontend/
├── public/                 # Static assets and icons
├── src/
│   ├── assets/             # Brand logos and illustrations
│   ├── components/
│   │   ├── common/         # Atomic reusable UI components (Button, Input, Card, Badge, Modal, Table, StatCard, Breadcrumbs)
│   │   ├── layout/         # Shell components (Sidebar, Topbar)
│   │   └── dashboard/      # Domain widgets (UpcomingEventCard, MyRegistrationsTable, MyClubsGrid, ActivityFeed)
│   ├── contexts/           # React context providers (AuthContext)
│   ├── hooks/              # Custom reusable hooks (useDisclosure)
│   ├── layouts/            # Application layout shells (AppLayout)
│   ├── mock-data/          # Centralized fixtures (Users, Events, Clubs, Registrations, Certificates, Activities)
│   ├── pages/
│   │   ├── auth/           # LoginPage, ForgotPasswordPage
│   │   ├── student/        # StudentDashboard, Events, Registrations, Clubs, Certificates, Notifications, Profile
│   │   ├── coordinator/    # CoordinatorDashboard & placeholder views
│   │   ├── advisor/        # AdvisorDashboard & placeholder views
│   │   └── administrator/  # AdminDashboard & placeholder views
│   ├── routes/             # Central routing configuration, ProtectedRoute, RootRedirect, rolePaths
│   ├── services/           # Axios apiClient with interceptors, authService, studentService
│   ├── types/              # Comprehensive TypeScript interfaces & types
│   ├── utils/              # Formatting helpers, date manipulation, string utilities
│   ├── App.tsx             # Root component with providers
│   ├── main.tsx            # Application entry point
│   └── index.css           # Tailwind directives and base typography
├── tailwind.config.js      # Custom theme colors (brand navy, teal accent), typography, shadows
├── vite.config.ts          # Vite configuration with `@/` path alias
└── tsconfig.json           # Strict TypeScript configuration
```

---

## 🔌 Backend Integration Guide

1. **Central API Client**: Configured in `src/services/apiClient.ts` with Axios interceptors that automatically attach JWT Bearer tokens from `localStorage` / `sessionStorage` and handle `401 Unauthorized` responses.
2. **Authentication Service**: Located at `src/services/authService.ts`. Replace `mockLogin()` with an actual call to the FastAPI JWT endpoint (e.g., `POST /api/auth/login`).
3. **Domain Services**: `src/services/studentService.ts` contains clearly documented endpoint placeholders (`/api/students/dashboard/stats`, `/api/events`, `/api/students/me/registrations`, etc.) matching the project's PostgreSQL database schema.
