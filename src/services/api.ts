import { apiFetch, type ApiFetchOptions, ApiError } from "../service/api";

type ReqConfig = {
  headers?: Record<string, string>;
  stepUpToken?: string;
  timeoutMs?: number;
  cache?: RequestCache;
  authMode?: ApiFetchOptions["authMode"];
  skipCsrf?: boolean;
  retry429?: number;
};

type Resp<T> = { data: T };

async function request<T>(
  method: string,
  path: string,
  payload?: unknown,
  config?: ReqConfig,
): Promise<Resp<T>> {
  const data = await apiFetch<T>(path, {
    method,
    headers: config?.headers,
    stepUpToken: config?.stepUpToken,
    timeoutMs: config?.timeoutMs,
    cache: config?.cache,
    authMode: config?.authMode,
    skipCsrf: config?.skipCsrf,
    retry429: config?.retry429,
    ...(payload !== undefined ? { json: payload as ApiFetchOptions["json"] } : {}),
  });

  return { data };
}

export const api = {
  get<T>(path: string, config?: ReqConfig) {
    return request<T>("GET", path, undefined, config);
  },

  post<T>(path: string, payload?: unknown, config?: ReqConfig) {
    return request<T>("POST", path, payload, config);
  },

  put<T>(path: string, payload?: unknown, config?: ReqConfig) {
    return request<T>("PUT", path, payload, config);
  },

  patch<T>(path: string, payload?: unknown, config?: ReqConfig) {
    return request<T>("PATCH", path, payload, config);
  },

  delete<T>(path: string, config?: ReqConfig) {
    return request<T>("DELETE", path, undefined, config);
  },
};

export { ApiError };
