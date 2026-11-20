import type { UserRole } from '../types';

/**
 * Maps each user role to its default landing page after login.
 */
export const ROLE_DEFAULT_PATHS: Record<UserRole, string> = {
  student: '/student/dashboard',
  event_coordinator: '/coordinator/dashboard',
  club_president: '/coordinator/dashboard',
  club_advisor: '/advisor/dashboard',
  student_affairs: '/admin/dashboard',
  administrator: '/admin/dashboard',
  venue_manager: '/venue-manager/dashboard',
};

/**
 * Returns the default dashboard path for a given role.
 */
export function getDefaultPath(role: UserRole): string {
  return ROLE_DEFAULT_PATHS[role] ?? '/login';
}
