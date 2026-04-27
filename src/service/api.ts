import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { clearCsrfToken, getCsrfToken, setCsrfToken } from "../lib/csrf";
import { getRawHttpErrorMessage, getSafeHttpErrorMessage } from "../lib/http-error";
import { normalizeCpfCnpjDigits } from "../lib/cpf-cnpj";

const DEFAULT_API_URL = "https://fechou-backend-g69o.onrender.com";
const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

export const API_URL =
  rawApiUrl && rawApiUrl.length > 0
    ? rawApiUrl
    : DEFAULT_API_URL;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30_000,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

const MUTABLE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RATE_LIMIT_RETRIES = 1;
const AUTH_REFRESH_PATH = "/api/auth/refresh";

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
    return this.status === 403 && (
      this.code === "STEP_UP_REQUIRED" ||
      /step-up auth required|step-up|confirme sua identidade/i.test(this.message)
    );
  }
}

export type ApiFetchOptions = Omit<
  AxiosRequestConfig,
  "baseURL" | "data" | "headers" | "method" | "timeout" | "url" | "withCredentials"
> & {
  method?: string;
  headers?: HeadersInit;
  cache?: RequestCache;
  credentials?: RequestCredentials;
  json?: JsonBody;
  body?: BodyInit | null;
  stepUpToken?: string;
  timeoutMs?: number;
  skipAuthRefresh?: boolean;
  authMode?: "required" | "optional";
  skipCsrf?: boolean;
  retry429?: number;
  __internalRetry?: { refreshed?: boolean; csrfRetried?: boolean };
};

function joinUrl(base: string, path: string): string {
  const safeBase = base.replace(/\/+$/, "");
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return `${safeBase}${safePath}`;
}

function normalizeApiPath(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    const target = new URL(path);
    const base = new URL(API_URL);
    if (target.origin !== base.origin) {
      throw new Error("Endpoint externo bloqueado pelo cliente seguro da API.");
    }

    return `${target.pathname}${target.search}${target.hash}`;
  }

  return path.startsWith("/") ? path : `/${path}`;
}

function headersToRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return headers;
}

function getResponseHeader(headers: Record<string, unknown>, name: string): string | null {
  const lowerName = name.toLowerCase();
  const value = Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName)?.[1];
  return typeof value === "string" ? value : null;
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
  if (code === "STEP_UP_REQUIRED") return "Confirme sua identidade para continuar.";
  if (code === "COOLDOWN_ACTIVE") return "Aguarde alguns instantes antes de tentar novamente.";
  if (code === "SUSPICIOUS_ACTIVITY") return "Atividade incomum detectada. Tente novamente mais tarde.";
  return null;
}

function getErrorMessage(status: number, payload: unknown): string {
  return getSafeHttpErrorMessage(status, payload);
}

async function refreshAuthSession(timeoutMs: number): Promise<boolean> {
  try {
    const csrf = await getCsrfToken(API_URL);
    const response = await api.request({
      url: AUTH_REFRESH_PATH,
      method: "POST",
      timeout: timeoutMs,
      validateStatus: () => true,
      headers: {
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
    });

    const nextCsrf = getResponseHeader(response.headers, "x-csrf-token");
    if (nextCsrf) setCsrfToken(nextCsrf);

    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const {
    json,
    stepUpToken,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    skipAuthRefresh = false,
    authMode = "required",
    skipCsrf = false,
    retry429 = DEFAULT_RATE_LIMIT_RETRIES,
    headers,
    body,
    cache: _cache,
    credentials: _credentials,
    __internalRetry,
    ...rest
  } = options;

  const method = (rest.method ?? "GET").toUpperCase();

  const safeStepUpToken = stepUpToken ? sanitizeHeaderToken(stepUpToken) : null;

  const csrfHeaders: Record<string, string> = {};
  if (!skipCsrf && MUTABLE_METHODS.has(method)) {
    const csrf = await getCsrfToken(API_URL);
    if (csrf) csrfHeaders["X-CSRF-Token"] = csrf;
  }

  try {
    const response = await api.request({
      ...rest,
      url: normalizeApiPath(path),
      method,
      timeout: timeoutMs,
      validateStatus: () => true,
      headers: {
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(safeStepUpToken ? { "X-Step-Up-Token": safeStepUpToken } : {}),
        ...csrfHeaders,
        ...headersToRecord(headers),
      },
      data: json !== undefined ? json : body,
    });

    const res = response;
    const requestId = getResponseHeader(res.headers, "x-request-id") ?? undefined;

    const nextCsrf = getResponseHeader(res.headers, "x-csrf-token");
    if (nextCsrf) setCsrfToken(nextCsrf);

    if (res.status >= 200 && res.status < 300) {
      return (res.status === 204 || res.status === 205 ? null : res.data) as T;
    }

    const payload = res.data;
    const asObject = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
    const code = asObject && typeof asObject.code === "string" ? asObject.code : undefined;
    const retryAfter = parseRetryAfter(getResponseHeader(res.headers, "retry-after"));
    const normalizedMessage = normalizeErrorByCode(code);
    const message = normalizedMessage ?? getErrorMessage(res.status, payload);
    const rawMessage = getRawHttpErrorMessage(payload);

    if (res.status === 401 && !skipAuthRefresh && !__internalRetry?.refreshed) {
      const refreshed = await refreshAuthSession(timeoutMs);
      if (refreshed) {
        return apiFetch<T>(path, {
          ...options,
          __internalRetry: { ...__internalRetry, refreshed: true },
        });
      }
    }

    if (res.status === 401 && authMode === "required") {
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
      const isCsrfError = /csrf inválido|csrf invalido|csrf missing|csrf token/i.test(`${rawMessage} ${message}`);
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
    if (
      (err instanceof DOMException && err.name === "AbortError") ||
      (err instanceof AxiosError && (err.code === "ECONNABORTED" || err.code === "ERR_CANCELED"))
    ) {
      throw new Error("Tempo limite da requisição excedido. Tente novamente.");
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

  savePixKey: (pixKey: string, pixKeyType: string, stepUpToken?: string) => {
    const cleanType = pixKeyType.trim();
    const cleanKey = cleanType === "cpf" || cleanType === "cnpj"
      ? normalizeCpfCnpjDigits(pixKey, cleanType.toUpperCase())
      : pixKey.trim();
    return apiFetch<{
      pixKey: string;
      pixKeyType: string;
    }>("/api/user/pix-key", {
      method: "POST",
      json: { pixKey: cleanKey, pixKeyType: cleanType },
      stepUpToken,
    });
  },

  deletePixKey: (stepUpToken?: string) => apiFetch<void>("/api/user/pix-key", { method: "DELETE", stepUpToken }),
};
