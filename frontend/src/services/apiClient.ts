import axios from 'axios';

/**
 * Centralized Axios instance for the Campus Event & Club Management API.
 *
 * Base URL is configured via the VITE_API_BASE_URL environment variable.
 * Default: http://localhost:8000
 *
 * To replace mock authentication/data with real API calls:
 *   1. Set VITE_API_BASE_URL in your .env file.
 *   2. Set VITE_ENABLE_MOCK_AUTH=false (or remove it).
 *   3. Replace mock service functions with calls using this apiClient.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// ─── Request Interceptor: Attach JWT Bearer Token ────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor: Handle 401 Unauthorized ───────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear auth state and redirect to login.
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
