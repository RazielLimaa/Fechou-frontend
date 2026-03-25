import { authStorage } from "../lib/auth-storage";
import { getCsrfToken } from "../lib/security";

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || window.location.origin;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

type JsonBody = JsonValue;

function joinUrl(base: string, path: string) {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

/**
 * Validate that the token doesn't contain injection attempts.
 */
function sanitizeToken(token: string): string | null {
  const trimmed = token.trim();
  if (
    trimmed.length === 0 ||
    trimmed.includes("<") ||
    trimmed.includes(">") ||
    trimmed.includes("\n") ||
    trimmed.includes("\r")
  ) {
    return null;
  }
  return trimmed;
}

function normalizeErrorMessage(status: number, fallback?: string): string {
  if (status === 401) return "Sessão expirada. Faça login novamente.";
  if (status === 403) return "Você não tem permissão para esta ação.";
  if (status === 429) return "Muitas tentativas. Aguarde e tente novamente.";
  if (status >= 500) return "Serviço temporariamente indisponível.";
  return fallback && fallback.trim().length > 0 ? fallback : `Erro HTTP ${status}`;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: JsonBody; token?: string } = {},
): Promise<T> {
  const { json, token, headers, ...rest } = options;

  // Resolve auth token: explicit param > in-memory auth state
  let authToken: string | null = null;
  if (token) {
    authToken = sanitizeToken(token);
  } else {
    const stored = authStorage.getAccessToken();
    if (stored) authToken = sanitizeToken(stored);
  }

  // Build CSRF header for state-changing methods
  const method = (rest.method || "GET").toUpperCase();
  const csrfHeaders: Record<string, string> = {};
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    csrfHeaders["X-CSRF-Token"] = getCsrfToken();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const res = await fetch(joinUrl(API_URL, path), {
      ...rest,
      signal: controller.signal,
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...csrfHeaders,
        ...(headers ?? {}),
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });

    clearTimeout(timeoutId);

    // Handle auth failures securely
    if (res.status === 401) {
      authStorage.clearAll();
      window.location.href = "/login";
      throw new Error("Sessao expirada. Faca login novamente.");
    }

    if (res.status === 204 || res.status === 205) {
      return undefined as T;
    }

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");

    const data = isJson
      ? await res.json().catch(() => null)
      : await res.text().catch(() => null);

    if (!res.ok) {
      const rawMessage =
        (data &&
          typeof data === "object" &&
          "message" in data &&
          typeof (data as any).message === "string" &&
          (data as any).message.trim().length > 0 &&
          (data as any).message) ||
        (typeof data === "string" && data.trim().length > 0 ? data : "");

      const message = normalizeErrorMessage(res.status, rawMessage);

      throw new Error(message);
    }

    return data as T;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Tempo limite da requisicao excedido. Tente novamente.");
    }
    throw err;
  }
}

export const mpService = {
  getStatus: () =>
    apiFetch<{
      connected: boolean;
      authMethod: "oauth" | "api_key" | null;
      mpUserId: string | null;
      expiresAt: string | null;
    }>("/api/mercadopago/status"),

  connect: () => {
    const url = (import.meta.env.VITE_API_URL as string || "").trim();
    window.location.href = `${url}/api/mercadopago/connect`;
  },

  verifyApiKey: (accessToken: string) =>
    apiFetch<{
      valid: boolean;
      mpUserId: string;
      nickname: string | null;
      email: string | null;
    }>("/api/mercadopago/api-key/verify", {
      method: "POST",
      json: { accessToken },
    }),

  registerApiKey: (accessToken: string) =>
    apiFetch<{
      connected: boolean;
      authMethod: "api_key";
      mpUserId: string;
      nickname: string | null;
    }>("/api/mercadopago/api-key/register", {
      method: "POST",
      json: { accessToken },
    }),

  generatePaymentLink: (proposalId: number) =>
    apiFetch<{ paymentUrl: string }>(`/api/proposals/${proposalId}/payment-link`, { method: "POST" }),
};

export const pixService = {
  getPixKey: () =>
    apiFetch<{
      pixKey: string | null;
      pixKeyType: string | null;
    }>("/api/user/pix-key"),

  savePixKey: (pixKey: string, pixKeyType: string) =>
    apiFetch<{
      pixKey: string;
      pixKeyType: string;
    }>("/api/user/pix-key", {
      method: "POST",
      json: { pixKey, pixKeyType },
    }),

  deletePixKey: () =>
    apiFetch<void>("/api/user/pix-key", { method: "DELETE" }),
};
