import axios, { type InternalAxiosRequestConfig, type AxiosError } from 'axios';
import { authStorage } from '../lib/auth-storage';
import { getCsrfToken, setCsrfToken, clearCsrfToken } from '../lib/csrf';

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

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = authStorage.getAccessToken();
  if (token && config.headers) {
    if (token.trim().length > 0 && !token.includes('<') && !token.includes('>')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    const csrfToken = await getCsrfToken(API_URL);
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const nextCsrf = response.headers?.['x-csrf-token'];
    if (typeof nextCsrf === 'string') setCsrfToken(nextCsrf);
    return response;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    const code =
      error.response?.data &&
      typeof error.response.data === "object" &&
      "code" in (error.response.data as Record<string, unknown>) &&
      typeof (error.response.data as Record<string, unknown>).code === "string"
        ? String((error.response.data as Record<string, unknown>).code)
        : undefined;
    if (status === 401) {
      authStorage.clearAll();
      clearCsrfToken();
      window.location.href = '/login';
    }

    if (code === "STEP_UP_REQUIRED") {
      return Promise.reject(new Error('Confirmação adicional necessária para continuar.'));
    }

    if (code === "COOLDOWN_ACTIVE") {
      return Promise.reject(new Error('Aguarde alguns instantes antes de tentar novamente.'));
    }

    if (code === "SUSPICIOUS_ACTIVITY") {
      return Promise.reject(new Error('Atividade incomum detectada. Tente novamente mais tarde.'));
    }

    if (status === 429) {
      return Promise.reject(new Error('Muitas tentativas. Aguarde e tente novamente.'));
    }

    if (status && status >= 500) {
      return Promise.reject(new Error('Serviço temporariamente indisponível.'));
    }

    return Promise.reject(error);
  }
);
