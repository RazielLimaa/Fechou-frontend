import { authStorage } from "../lib/auth-storage";
import { getCsrfToken, setCsrfToken, clearCsrfToken } from "../lib/csrf";

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "http://localhost:3001";

const MUTABLE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RATE_LIMIT_RETRIES = 1;

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonBody = JsonValue;

export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;
  retryAfterSeconds?: number;
  details?: unknown;

  constructor(message: string, init: { status: number; code?: string; requestId?: string; retryAfterSeconds?: number; details?: unknown }) {
    super(message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.requestId = init.requestId;
    this.retryAfterSeconds = init.retryAfterSeconds;
    this.details = init.details;
  }

  get isCsrfInvalid(): boolean {
    return this.status === 403 && /csrf inválido|csrf invalido|csrf missing|csrf/i.test(this.message);
  }

  get isStepUpRequired(): boolean {
    return this.status === 403 && (this.code === "STEP_UP_REQUIRED" || /step-up auth required/i.test(this.message));
  }
}

export type ApiFetchOptions = RequestInit & {
  json?: JsonBody;
  token?: string;
  stepUpToken?: string;
  timeoutMs?: number;
  skipAuthRefresh?: boolean;
  skipCsrf?: boolean;
  retry429?: number;
  __internalRetry?: { refreshed?: boolean; csrfRetried?: boolean };
};

function joinUrl(base: string, path: string): string {
  const safeBase = base.replace(/\/+$/, "");
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return `${safeBase}${safePath}`;
}

function sanitizeHeaderToken(token: string): string | null {
  const trimmed = token.trim();
  if (!trimmed || /[<>\n\r]/.test(trimmed)) return null;
  return trimmed;
}

function normalizeErrorMessage(status: number, fallback?: string): string {
  if (status === 401) return "Sessão expirada. Faça login novamente.";
  if (status === 403) return "Você não tem permissão para esta ação.";
  if (status === 429) return "Muitas tentativas. Aguarde e tente novamente.";
  if (status >= 500) return "Serviço temporariamente indisponível.";
  return fallback && fallback.trim().length > 0 ? fallback : `Erro HTTP ${status}`;
}

function normalizeErrorByCode(code?: string): string | null {
  if (!code) return null;
  if (code === "STEP_UP_REQUIRED") return "Confirmação adicional necessária para continuar.";
  if (code === "COOLDOWN_ACTIVE") return "Aguarde alguns instantes antes de tentar novamente.";
  if (code === "SUSPICIOUS_ACTIVITY") return "Atividade incomum detectada. Tente novamente mais tarde.";
  return null;
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
  return res.text().catch(() => "");
}

function normalizeErrorByCode(code?: string): string | null {
  if (!code) return null;
  if (code === "STEP_UP_REQUIRED") return "Step-up auth required.";
  if (code === "COOLDOWN_ACTIVE") return "Aguarde alguns instantes antes de tentar novamente.";
  if (code === "SUSPICIOUS_ACTIVITY") return "Atividade incomum detectada. Tente novamente mais tarde.";
  return null;
}

function getErrorMessage(status: number, payload: unknown): string {
  const asObject = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const payloadMessage = asObject && typeof asObject.message === "string" ? asObject.message.trim() : "";
  if (payloadMessage) return payloadMessage;

  if (status === 401) return "Sessão expirada. Faça login novamente.";
  if (status === 403) return "Você não tem permissão para esta ação.";
  if (status === 429) return "Muitas tentativas. Aguarde e tente novamente.";
  if (status >= 500) return "Serviço temporariamente indisponível.";
  return `Erro HTTP ${status}`;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(joinUrl(API_URL, "/api/auth/refresh"), {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      const nextCsrf = res.headers.get("x-csrf-token");
      if (nextCsrf) setCsrfToken(nextCsrf);

      if (!res.ok) return false;

      const payload = await parseResponseBody(res);
      const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
      const token = data && typeof data.token === "string" ? sanitizeHeaderToken(data.token) : null;
      if (token) authStorage.setAccessToken(token);

      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const {
    json,
    token,
    stepUpToken,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    skipAuthRefresh = false,
    skipCsrf = false,
    retry429 = DEFAULT_RATE_LIMIT_RETRIES,
    headers,
    __internalRetry,
    ...rest
  } = options;

  const method = (rest.method ?? "GET").toUpperCase();

  const authToken = token ? sanitizeHeaderToken(token) : sanitizeHeaderToken(authStorage.getAccessToken() ?? "");
  const safeStepUpToken = stepUpToken ? sanitizeHeaderToken(stepUpToken) : null;

  const csrfHeaders: Record<string, string> = {};
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfToken = await getCsrfToken(API_URL);
    if (csrfToken) csrfHeaders["X-CSRF-Token"] = csrfToken;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(joinUrl(API_URL, path), {
      ...rest,
      signal: controller.signal,
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(safeStepUpToken ? { "X-Step-Up-Token": safeStepUpToken } : {}),
        ...csrfHeaders,
        ...(headers ?? {}),
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });

    clearTimeout(timeoutId);

    const nextCsrf = res.headers.get("x-csrf-token");
    if (nextCsrf) setCsrfToken(nextCsrf);

    // Handle auth failures securely
    if (res.status === 401) {
      authStorage.clearAll();
      clearCsrfToken();
      window.location.href = "/login";
      throw new Error("Sessao expirada. Faca login novamente.");
    }

    const nextCsrf = res.headers.get("x-csrf-token");
    if (nextCsrf) setCsrfToken(nextCsrf);

    if (res.ok) {
      const data = await parseResponseBody(res);
      return data as T;
    }

    const payload = await parseResponseBody(res);
    const asObject = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
    const code = asObject && typeof asObject.code === "string" ? asObject.code : undefined;
    const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
    const normalizedMessage = normalizeErrorByCode(code);
    const message = normalizedMessage ?? getErrorMessage(res.status, payload);

    if (res.status === 401 && !skipAuthRefresh && !__internalRetry?.refreshed) {
      const refreshed = await tryRefreshSession();
      if (refreshed) {
        return apiFetch<T>(path, {
          ...options,
          __internalRetry: { ...__internalRetry, refreshed: true },
        });
      }

    if (!res.ok) {
      const code =
        data && typeof data === "object" && "code" in data && typeof (data as any).code === "string"
          ? (data as any).code
          : undefined;
      const rawMessage =
        (data &&
          typeof data === "object" &&
          "message" in data &&
          typeof (data as any).message === "string" &&
          (data as any).message.trim().length > 0 &&
          (data as any).message) ||
        (typeof data === "string" && data.trim().length > 0 ? data : "");

      const message = normalizeErrorByCode(code) ?? normalizeErrorMessage(res.status, rawMessage);

    if (res.status === 403 && !skipCsrf && !__internalRetry?.csrfRetried) {
      const isCsrfError = /csrf inválido|csrf invalido|csrf missing|csrf token/i.test(message);
      if (isCsrfError) {
        clearCsrfToken();
        await getCsrfToken(API_URL);
        return apiFetch<T>(path, {
          ...options,
          __internalRetry: { ...__internalRetry, csrfRetried: true },
        });
      }
    }

    if (res.status === 429 && retry429 > 0) {
      const waitSeconds = retryAfter ?? 1;
      await delay(waitSeconds * 1000);
      return apiFetch<T>(path, {
        ...options,
        retry429: retry429 - 1,
      });
    }

    throw new ApiError(message, {
      status: res.status,
      code,
      requestId,
      retryAfterSeconds: retryAfter,
      details: payload,
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Tempo limite da requisição excedido. Tente novamente.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
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
    window.location.href = joinUrl(API_URL, "/api/mercadopago/connect");
  },

  verifyApiKey: (accessToken: string, stepUpToken?: string) =>
    apiFetch<{
      valid: boolean;
      mpUserId: string;
      nickname: string | null;
      email: string | null;
    }>("/api/mercadopago/api-key/verify", {
      method: "POST",
      json: { accessToken },
      stepUpToken,
    }),

  registerApiKey: (accessToken: string, stepUpToken?: string) =>
    apiFetch<{
      connected: boolean;
      authMethod: "api_key";
      mpUserId: string;
      nickname: string | null;
    }>("/api/mercadopago/api-key/register", {
      method: "POST",
      json: { accessToken },
      stepUpToken,
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

  savePixKey: (pixKey: string, pixKeyType: string, stepUpToken?: string) =>
    apiFetch<{
      pixKey: string;
      pixKeyType: string;
    }>("/api/user/pix-key", {
      method: "POST",
      json: { pixKey, pixKeyType },
      stepUpToken,
    }),

  deletePixKey: (stepUpToken?: string) => apiFetch<void>("/api/user/pix-key", { method: "DELETE", stepUpToken }),
};
