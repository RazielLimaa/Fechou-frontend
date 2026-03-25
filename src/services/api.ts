import { apiFetch, type ApiFetchOptions, ApiError } from "../service/api";

type ReqConfig = {
  headers?: Record<string, string>;
  stepUpToken?: string;
  timeoutMs?: number;
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
