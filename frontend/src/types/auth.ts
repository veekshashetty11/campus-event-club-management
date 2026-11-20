export type UserRole =
  | 'student'
  | 'event_coordinator'
  | 'club_president'
  | 'club_advisor'
  | 'student_affairs'
  | 'administrator'
  | 'venue_manager';

export interface User {
  userId: string;
  id?: string;
  role: UserRole;
  roleDisplayName: string;
  email: string;
  fullName: string;
  clubId?: number;
  rollNumber?: string;
  phone?: string;
  studentId?: string;
  department?: string;
  departmentCode?: string;
  yearAndSemester?: string;
  bio?: string;
  emergencyContact?: string;
  interests?: string[];
  profilePhotoUrl?: string;
  status: 'active' | 'inactive' | 'suspended';
  isEmailVerified: boolean;
  points: number;
  lastLoginAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}
