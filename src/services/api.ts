import axios, { type InternalAxiosRequestConfig, type AxiosError } from 'axios';
import { authStorage } from '../lib/auth-storage';
import { getCsrfToken } from '../lib/security';

const rawApiUrl = import.meta.env.VITE_API_URL;
if (!rawApiUrl || String(rawApiUrl).trim().length === 0) {
  throw new Error('VITE_API_URL ausente. Configure a URL da API antes de iniciar o app.');
}

const API_URL = String(rawApiUrl).trim();

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
  },
  timeout: 30000,
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authStorage.getAccessToken();
  if (token && config.headers) {
    if (token.trim().length > 0 && !token.includes('<') && !token.includes('>')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    config.headers['X-CSRF-Token'] = getCsrfToken();
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      authStorage.clearAll();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);
