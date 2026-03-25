import { apiFetch } from "../api";

export type AuthUser = {
  id: string | number;
  name: string;
  email: string;
  createdAt: string;
};

export type LoginResponse = { token: string; user: AuthUser };
export type RegisterResponse = { token: string; user: AuthUser };

// backend: app.use("/api/auth", authRoutes)
const API_PREFIX = "/api/auth";

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>(`${API_PREFIX}/login`, {
    method: "POST",
    json: { email, password },
  });
}

export function register(name: string, email: string, password: string) {
  return apiFetch<RegisterResponse>(`${API_PREFIX}/register`, {
    method: "POST",
    json: { name, email, password },
  });
}

export function me(token?: string) {
  return apiFetch<AuthUser>(`${API_PREFIX}/me`, {
    method: "GET",
    token,
  });
}
