import { authStorage } from "../../lib/auth-storage";
import { clearCsrfToken } from "../../lib/csrf";
import { apiFetch, ApiError } from "../api";

export type AuthUser = {
  id: string | number;
  name: string;
  email: string;
  createdAt?: string;
};

export type AuthResponse = { token?: string; user: AuthUser };
export type CsrfResponse = { csrfToken?: string };
export type AuthMessageResponse = { ok: boolean; message: string };

const API_PREFIX = "/api/auth";

function persistSession(response: AuthResponse): AuthResponse {
  if (response.token) authStorage.setAccessToken(response.token);
  authStorage.setUserRaw(JSON.stringify(response.user));
  return response;
}

export function login(email: string, password: string) {
  return apiFetch<AuthResponse>(`${API_PREFIX}/login`, {
    method: "POST",
    json: { email, password },
  }).then(persistSession);
}

export function register(name: string, email: string, password: string) {
  return apiFetch<AuthResponse>(`${API_PREFIX}/register`, {
    method: "POST",
    json: { name, email, password },
  }).then(persistSession);
}

export function loginWithGoogle(code: string, redirectUri?: string) {
  return apiFetch<AuthResponse>(`${API_PREFIX}/google`, {
    method: "POST",
    json: {
      code,
      ...(redirectUri ? { redirectUri } : {}),
    },
  }).then(persistSession);
}

export async function me(): Promise<AuthUser | null> {
  try {
    return await apiFetch<AuthUser>(`${API_PREFIX}/me`, {
      method: "GET",
      skipAuthRefresh: true,
      authMode: "optional",
      retry429: 0,
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null;
    }

    throw err;
  }
}

export async function refresh(): Promise<AuthResponse | null> {
  try {
    const response = await apiFetch<AuthResponse>(`${API_PREFIX}/refresh`, {
      method: "POST",
      skipAuthRefresh: true,
      authMode: "optional",
      retry429: 0,
    });

    return persistSession(response);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      authStorage.clearAll();
      clearCsrfToken();
      return null;
    }

    throw err;
  }
}

export function logout() {
  return apiFetch<void>(`${API_PREFIX}/logout`, {
    method: "POST",
    skipAuthRefresh: true,
  }).finally(() => {
    authStorage.clearAll();
    clearCsrfToken();
  });
}

export function getCsrf() {
  return apiFetch<CsrfResponse>(`${API_PREFIX}/csrf`, {
    method: "GET",
    skipAuthRefresh: true,
    skipCsrf: true,
  });
}

export function forgotPassword(email: string) {
  return apiFetch<AuthMessageResponse>(`${API_PREFIX}/forgot-password`, {
    method: "POST",
    json: { email },
    skipAuthRefresh: true,
    authMode: "optional",
    retry429: 0,
  });
}

export function resetPassword(token: string, password: string) {
  return apiFetch<AuthMessageResponse>(`${API_PREFIX}/reset-password`, {
    method: "POST",
    json: { token, password },
    skipAuthRefresh: true,
    authMode: "optional",
    retry429: 0,
  });
}
