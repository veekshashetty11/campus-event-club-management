/**
 * authService.ts
 *
 * Isolated mock authentication service.
 *
 * HOW TO MIGRATE TO REAL BACKEND:
 *   1. Replace the mock login function body with:
 *        return apiClient.post<AuthResponse>('/api/auth/login', credentials);
 *   2. Replace mockLogout with a real API call if the backend supports token revocation.
 *   3. Update validateToken to verify with the backend instead of localStorage.
 *
 * The service API surface (login, logout, getCurrentUser) stays the same —
 * only the implementations change.
 */

import type { LoginCredentials, AuthResponse, User } from '../types';
import { MOCK_USERS } from '../mock-data';

// ─── Mock password map (email → password) ────────────────────────────────────
// These match the demo accounts seeded in database/seeds/02_sample_users.sql
const MOCK_PASSWORDS: Record<string, string> = {
  'admin@campus.edu': 'AdminPassword123!',
  'affairs@campus.edu': 'AffairsPassword123!',
  'advisor@campus.edu': 'AdvisorPassword123!',
  'coordinator@campus.edu': 'CoordinatorPassword123!',
  'president@campus.edu': 'PresidentPassword123!',
  'venue@campus.edu': 'VenuePassword123!',
  'student@campus.edu': 'StudentPassword123!',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const simulateDelay = (ms = 800): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const generateMockToken = (user: User): string =>
  btoa(`mock.${user.userId}.${user.role}.${Date.now()}`);

// ─── Mock login ───────────────────────────────────────────────────────────────
export async function mockLogin(
  credentials: LoginCredentials,
): Promise<AuthResponse> {
  await simulateDelay();

  const user = MOCK_USERS.find(
    (u) => u.email.toLowerCase() === credentials.email.toLowerCase(),
  );

  if (!user) {
    throw new Error('No account found with this email address.');
  }

  const expectedPassword = MOCK_PASSWORDS[credentials.email.toLowerCase()];
  if (!expectedPassword || credentials.password !== expectedPassword) {
    throw new Error('Incorrect password. Please try again.');
  }

  if (user.status !== 'active') {
    throw new Error('Your account has been suspended. Please contact support.');
  }

  const token = generateMockToken(user);

  if (credentials.rememberMe) {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    sessionStorage.setItem('access_token', token);
    sessionStorage.setItem('user', JSON.stringify(user));
  }

  return {
    accessToken: token,
    tokenType: 'bearer',
    expiresIn: 3600,
    user,
  };
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export function mockLogout(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('user');
}

// ─── Retrieve current user from storage ──────────────────────────────────────
export function getStoredUser(): User | null {
  try {
    const raw =
      localStorage.getItem('user') ?? sessionStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

// ─── Retrieve current token from storage ─────────────────────────────────────
export function getStoredToken(): string | null {
  return (
    localStorage.getItem('access_token') ??
    sessionStorage.getItem('access_token') ??
    null
  );
}

// ─── Check if the user is authenticated ──────────────────────────────────────
export function isAuthenticated(): boolean {
  return !!getStoredToken() && !!getStoredUser();
}
