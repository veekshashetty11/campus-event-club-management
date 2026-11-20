/**
 * studentService.ts
 *
 * Service functions for student-facing data: dashboard stats, events,
 * registrations, clubs, certificates, notifications, activity feed.
 *
 * HOW TO MIGRATE TO REAL BACKEND:
 *   Replace each mock return with an apiClient call, e.g.:
 *     const { data } = await apiClient.get<DashboardStats>('/api/students/dashboard/stats');
 *     return data;
 *
 * NOTE: Actual backend endpoint paths are TBD. Placeholder comments mark each
 *       intended endpoint. Do not hardcode unconfirmed routes.
 */

import type { DashboardStats, EventRegistration, Certificate } from '../types';
import type { CampusEvent } from '../types/event';
import type { ClubMembership } from '../types/club';
import type { Notification, ActivityItem } from '../types/notification';
import {
  MOCK_DASHBOARD_STATS,
  MOCK_REGISTRATIONS,
  MOCK_CERTIFICATES,
  MOCK_MEMBERSHIPS,
  MOCK_EVENTS,
  MOCK_NOTIFICATIONS,
  MOCK_ACTIVITIES,
} from '../mock-data';

const delay = (ms = 500): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ── PLACEHOLDER: GET /api/students/dashboard/stats
export async function fetchStudentDashboardStats(): Promise<DashboardStats> {
  await delay();
  return MOCK_DASHBOARD_STATS;
}

// ── PLACEHOLDER: GET /api/events?status=published&upcoming=true
export async function fetchUpcomingEvents(): Promise<CampusEvent[]> {
  await delay();
  const now = new Date();
  return MOCK_EVENTS.filter(
    (e) => e.status === 'published' && new Date(e.startTime) > now,
  );
}

// ── PLACEHOLDER: GET /api/events?status=published
export async function fetchAllPublishedEvents(): Promise<CampusEvent[]> {
  await delay();
  return MOCK_EVENTS.filter((e) => e.status === 'published');
}

// ── PLACEHOLDER: GET /api/students/me/registrations
export async function fetchMyRegistrations(): Promise<EventRegistration[]> {
  await delay();
  return MOCK_REGISTRATIONS;
}

// ── PLACEHOLDER: GET /api/students/me/clubs
export async function fetchMyClubs(): Promise<ClubMembership[]> {
  await delay();
  return MOCK_MEMBERSHIPS;
}

// ── PLACEHOLDER: GET /api/students/me/certificates
export async function fetchMyCertificates(): Promise<Certificate[]> {
  await delay();
  return MOCK_CERTIFICATES;
}

// ── PLACEHOLDER: GET /api/students/me/notifications
export async function fetchMyNotifications(): Promise<Notification[]> {
  await delay();
  return MOCK_NOTIFICATIONS;
}

// ── PLACEHOLDER: GET /api/students/me/activity
export async function fetchMyActivity(): Promise<ActivityItem[]> {
  await delay();
  return MOCK_ACTIVITIES;
}

// ── PLACEHOLDER: POST /api/events/{eventId}/register
export async function registerForEvent(
  _eventId: number,
): Promise<{ success: boolean; message: string }> {
  await delay(600);
  // Mock success response
  return { success: true, message: 'Successfully registered for the event.' };
}

// ── PLACEHOLDER: DELETE /api/events/{eventId}/register
export async function cancelEventRegistration(
  _eventId: number,
): Promise<{ success: boolean; message: string }> {
  await delay(600);
  return { success: true, message: 'Registration cancelled.' };
}
