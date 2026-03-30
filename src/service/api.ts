import { authStorage } from "../lib/auth-storage";
import { clearCsrfToken, getCsrfToken, setCsrfToken } from "../lib/csrf";

const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

// Prefer same-origin by default to avoid browser CORS issues in production/reverse-proxy setups.
export const API_URL = rawApiUrl && rawApiUrl.length > 0 ? rawApiUrl : window.location.origin;

const MUTABLE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RATE_LIMIT_RETRIES = 1;

type JsonBody = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

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

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const asSeconds = Number(value);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) return asSeconds;
  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseResponseBody(res: Response): Promise<unknown> {
  if (res.status === 204 || res.status === 205) return null;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json().catch(() => null);
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
  if (!skipCsrf && MUTABLE_METHODS.has(method)) {
    const csrf = await getCsrfToken(API_URL);
    if (csrf) csrfHeaders["X-CSRF-Token"] = csrf;
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

    const res = response;
    const requestId = res.headers.get("x-request-id") ?? undefined;
    if (requestId) {
      console.debug(`[api][${requestId}] ${method} ${path} -> ${response.status}`);
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

      authStorage.clearAll();
      clearCsrfToken();
      throw new ApiError("Sessão expirada. Faça login novamente.", {
        status: res.status,
        code,
        requestId,
        retryAfterSeconds: retryAfter,
        details: payload,
      });
    }

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
