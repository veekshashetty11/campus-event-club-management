import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts
import AppLayout from '../layouts/AppLayout';

// Route guards
import ProtectedRoute from './ProtectedRoute';
import RootRedirect from './RootRedirect';

// Auth pages
import LoginPage from '../pages/auth/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';

// General pages
import NotFoundPage from '../pages/NotFoundPage';
import UnauthorizedPage from '../pages/UnauthorizedPage';

// Student pages
import StudentDashboard from '../pages/student/StudentDashboard';
import StudentEventsPage from '../pages/student/StudentEventsPage';
import EventDetailsPage from '../pages/student/EventDetailsPage';
import StudentRegistrationsPage from '../pages/student/StudentRegistrationsPage';
import StudentClubsPage from '../pages/student/StudentClubsPage';
import StudentCertificatesPage from '../pages/student/StudentCertificatesPage';
import StudentNotificationsPage from '../pages/student/StudentNotificationsPage';
import StudentProfilePage from '../pages/student/StudentProfilePage';

// Coordinator pages
import CoordinatorDashboard from '../pages/coordinator/CoordinatorDashboard';
import CoordinatorClubPage from '../pages/coordinator/CoordinatorClubPage';
import CoordinatorMembersPage from '../pages/coordinator/CoordinatorMembersPage';
import CoordinatorEventsPage from '../pages/coordinator/CoordinatorEventsPage';
import CoordinatorCreateEventPage from '../pages/coordinator/CoordinatorCreateEventPage';
import CoordinatorRegistrationsPage from '../pages/coordinator/CoordinatorRegistrationsPage';
import CoordinatorAttendancePage from '../pages/coordinator/CoordinatorAttendancePage';
import CoordinatorBudgetPage from '../pages/coordinator/CoordinatorBudgetPage';
import CoordinatorSponsorsPage from '../pages/coordinator/CoordinatorSponsorsPage';
import CoordinatorReportsPage from '../pages/coordinator/CoordinatorReportsPage';
import CoordinatorVenuesPage from '../pages/coordinator/CoordinatorVenuesPage';
import CoordinatorNotificationsPage from '../pages/coordinator/CoordinatorNotificationsPage';
import CoordinatorProfilePage from '../pages/coordinator/CoordinatorProfilePage';

// Advisor pages
import AdvisorDashboard from '../pages/advisor/AdvisorDashboard';
import AdvisorApprovalsPage from '../pages/advisor/AdvisorApprovalsPage';
import AdvisorClubsPage from '../pages/advisor/AdvisorClubsPage';
import AdvisorReportsPage from '../pages/advisor/AdvisorReportsPage';
import AdvisorNotificationsPage from '../pages/advisor/AdvisorNotificationsPage';
import AdvisorProfilePage from '../pages/advisor/AdvisorProfilePage';

// Administrator pages
import AdministratorDashboard from '../pages/administrator/AdministratorDashboard';
import AdminApprovalsPage from '../pages/administrator/AdminApprovalsPage';
import AdminEventsPage from '../pages/administrator/AdminEventsPage';
import AdminClubsPage from '../pages/administrator/AdminClubsPage';
import AdminUsersPage from '../pages/administrator/AdminUsersPage';
import AdminAuditPage from '../pages/administrator/AdminAuditPage';
import AdminReportsPage from '../pages/administrator/AdminReportsPage';
import AdminSettingsPage from '../pages/administrator/AdminSettingsPage';

// Venue Manager pages
import VenueManagerDashboard from '../pages/venue-manager/VenueManagerDashboard';
import VenueListPage from '../pages/venue-manager/VenueListPage';
import VenueBookingsPage from '../pages/venue-manager/VenueBookingsPage';
import VenueCalendarPage from '../pages/venue-manager/VenueCalendarPage';
import EquipmentPage from '../pages/venue-manager/EquipmentPage';
import EquipmentBookingsPage from '../pages/venue-manager/EquipmentBookingsPage';
import VenueReportsPage from '../pages/venue-manager/VenueReportsPage';
import VenueNotificationsPage from '../pages/venue-manager/VenueNotificationsPage';

export const router = createBrowserRouter([
  // ── Public routes ──────────────────────────────────────────
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },

  // ── Root redirect ──────────────────────────────────────────
  {
    path: '/',
    element: <RootRedirect />,
  },

  // ── Student routes ─────────────────────────────────────────
  {
    path: '/student',
    element: (
      <ProtectedRoute allowedRoles={['student']}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <StudentDashboard /> },
      { path: 'dashboard', element: <StudentDashboard /> },
      { path: 'events', element: <StudentEventsPage /> },
      { path: 'events/:eventId', element: <EventDetailsPage /> },
      { path: 'registrations', element: <StudentRegistrationsPage /> },
      { path: 'clubs', element: <StudentClubsPage /> },
      { path: 'certificates', element: <StudentCertificatesPage /> },
      { path: 'notifications', element: <StudentNotificationsPage /> },
      { path: 'profile', element: <StudentProfilePage /> },
    ],
  },

  // ── Coordinator routes ─────────────────────────────────────
  {
    path: '/coordinator',
    element: (
      <ProtectedRoute allowedRoles={['event_coordinator', 'club_president']}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <CoordinatorDashboard /> },
      { path: 'dashboard', element: <CoordinatorDashboard /> },
      { path: 'club', element: <CoordinatorClubPage /> },
      { path: 'members', element: <CoordinatorMembersPage /> },
      { path: 'events', element: <CoordinatorEventsPage /> },
      { path: 'events/create', element: <CoordinatorCreateEventPage /> },
      { path: 'events/edit/:id', element: <CoordinatorCreateEventPage /> },
      { path: 'registrations', element: <CoordinatorRegistrationsPage /> },
      { path: 'attendance', element: <CoordinatorAttendancePage /> },
      { path: 'budget', element: <CoordinatorBudgetPage /> },
      { path: 'sponsors', element: <CoordinatorSponsorsPage /> },
      { path: 'reports', element: <CoordinatorReportsPage /> },
      { path: 'venues', element: <CoordinatorVenuesPage /> },
      { path: 'notifications', element: <CoordinatorNotificationsPage /> },
      { path: 'profile', element: <CoordinatorProfilePage /> },
    ],
  },

  // ── Advisor routes ─────────────────────────────────────────
  {
    path: '/advisor',
    element: (
      <ProtectedRoute allowedRoles={['club_advisor']}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdvisorDashboard /> },
      { path: 'dashboard', element: <AdvisorDashboard /> },
      { path: 'approvals', element: <AdvisorApprovalsPage /> },
      { path: 'events', element: <AdvisorApprovalsPage /> },
      { path: 'clubs', element: <AdvisorClubsPage /> },
      { path: 'reports', element: <AdvisorReportsPage /> },
      { path: 'notifications', element: <AdvisorNotificationsPage /> },
      { path: 'profile', element: <AdvisorProfilePage /> },
    ],
  },

  // ── Administrator & Student Affairs routes (/admin/*) ────────
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['administrator', 'student_affairs']}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdministratorDashboard /> },
      { path: 'dashboard', element: <AdministratorDashboard /> },
      { path: 'approvals', element: <AdminApprovalsPage /> },
      { path: 'events', element: <AdminEventsPage /> },
      { path: 'clubs', element: <AdminClubsPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'audit', element: <AdminAuditPage /> },
      { path: 'reports', element: <AdminReportsPage /> },
      { path: 'settings', element: <AdminSettingsPage /> },
    ],
  },

  // ── Administrator alias (/administrator/*) ─────────────────
  {
    path: '/administrator',
    element: (
      <ProtectedRoute allowedRoles={['administrator', 'student_affairs']}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'approvals', element: <Navigate to="/admin/approvals" replace /> },
      { path: 'events', element: <Navigate to="/admin/events" replace /> },
      { path: 'clubs', element: <Navigate to="/admin/clubs" replace /> },
      { path: 'users', element: <Navigate to="/admin/users" replace /> },
      { path: 'audit', element: <Navigate to="/admin/audit" replace /> },
      { path: 'reports', element: <Navigate to="/admin/reports" replace /> },
      { path: 'settings', element: <Navigate to="/admin/settings" replace /> },
    ],
  },

  // ── Venue Manager routes ───────────────────────────────────
  {
    path: '/venue-manager',
    element: (
      <ProtectedRoute allowedRoles={['venue_manager']}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <VenueManagerDashboard /> },
      { path: 'dashboard', element: <VenueManagerDashboard /> },
      { path: 'venues', element: <VenueListPage /> },
      { path: 'bookings', element: <VenueBookingsPage /> },
      { path: 'calendar', element: <VenueCalendarPage /> },
      { path: 'equipment', element: <EquipmentPage /> },
      { path: 'equipment-bookings', element: <EquipmentBookingsPage /> },
      { path: 'reports', element: <VenueReportsPage /> },
      { path: 'notifications', element: <VenueNotificationsPage /> },
    ],
  },

  // ── Catch-all 404 ──────────────────────────────────────────
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
