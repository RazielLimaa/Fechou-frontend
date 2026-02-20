import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios';
import { getCsrfToken } from '../lib/security';

// @ts-ignore
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // Prevent CSRF on older browsers
  },
  timeout: 30000, // 30 second timeout to prevent hanging requests
  withCredentials: false,
});

// Request interceptor: attach auth token + CSRF token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    // Validate token format before attaching
    if (token.trim().length > 0 && !token.includes('<') && !token.includes('>')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  // Attach CSRF token for state-changing requests
  if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    config.headers['X-CSRF-Token'] = getCsrfToken();
  }

  return config;
});

// Response interceptor: handle auth errors securely
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('_csrf_token');
      window.location.href = '/login';
    }

    // Don't leak internal error details to console in production
    if (error.response?.status === 403) {
      console.warn('Acesso negado.');
    }

    return Promise.reject(error);
  }
);
