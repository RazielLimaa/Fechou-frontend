import { authStorage } from "../../lib/auth-storage";
import { apiFetch } from "../api";

export type AuthUser = {
  id: string | number;
  name: string;
  email: string;
  createdAt?: string;
};

export type AuthResponse = { token?: string; user: AuthUser };
export type CsrfResponse = { csrfToken?: string };

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

export function me() {
  return apiFetch<AuthUser>(`${API_PREFIX}/me`, { method: "GET" });
}

export function refresh() {
  return apiFetch<AuthResponse>(`${API_PREFIX}/refresh`, {
    method: "POST",
    skipAuthRefresh: true,
  }).then(persistSession);
}

export function logout() {
  return apiFetch<void>(`${API_PREFIX}/logout`, {
    method: "POST",
    skipAuthRefresh: true,
  }).finally(() => {
    authStorage.clearAll();
  });
}

export function me(token?: string) {
  return apiFetch<AuthUser>(`${API_PREFIX}/me`, {
    method: "GET",
    skipAuthRefresh: true,
    skipCsrf: true,
  });
}
