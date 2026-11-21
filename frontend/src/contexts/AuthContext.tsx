import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, LoginCredentials } from '../types';
import {
  mockLogin,
  mockLogout,
  getStoredUser,
  getStoredToken,
} from '../services/authService';

// ─── Context shape ────────────────────────────────────────────────────────────
interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

// Singleton React Context instance to survive Vite Hot Module Replacement (HMR)
const AUTH_CONTEXT_KEY = '__CAMPUS_AUTH_CONTEXT__';
const AuthContext: React.Context<AuthContextValue | null> =
  (typeof window !== 'undefined' && (window as any)[AUTH_CONTEXT_KEY]) ||
  (() => {
    const ctx = createContext<AuthContextValue | null>(null);
    if (typeof window !== 'undefined') (window as any)[AUTH_CONTEXT_KEY] = ctx;
    return ctx;
  })();

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true during initial hydration
  const [error, setError] = useState<string | null>(null);

  // Hydrate from storage on mount
  useEffect(() => {
    const storedUser = getStoredUser();
    const storedToken = getStoredToken();
    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await mockLogin(credentials);
      setUser(response.user);
      setToken(response.accessToken);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    mockLogout();
    setUser(null);
    setToken(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
