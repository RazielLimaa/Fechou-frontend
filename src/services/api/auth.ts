import { api } from "./index";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username: string;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/api/auth/login", { email, password });
  return data;
}

export async function register(name: string, email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/api/auth/register", { name, email, password });
  return data;
}

export async function me(token: string): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
}
