import {
  API_URL,
  ApiError,
  apiFetch,
  type ApiFetchOptions,
} from "../../service/api";

type ApiClientConfig = Omit<ApiFetchOptions, "method" | "json">;
type ApiClientMutationConfig = ApiClientConfig & {
  json?: ApiFetchOptions["json"];
};

function request<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  return apiFetch<T>(path, options);
}

export const apiClient = {
  request,

  get<T>(path: string, config?: ApiClientConfig): Promise<T> {
    return request<T>(path, { ...config, method: "GET" });
  },

  post<T>(path: string, json?: ApiFetchOptions["json"], config?: ApiClientConfig): Promise<T> {
    return request<T>(path, { ...config, method: "POST", json });
  },

  put<T>(path: string, json?: ApiFetchOptions["json"], config?: ApiClientConfig): Promise<T> {
    return request<T>(path, { ...config, method: "PUT", json });
  },

  patch<T>(path: string, json?: ApiFetchOptions["json"], config?: ApiClientConfig): Promise<T> {
    return request<T>(path, { ...config, method: "PATCH", json });
  },

  delete<T>(path: string, config?: ApiClientMutationConfig): Promise<T> {
    const { json, ...rest } = config ?? {};
    return request<T>(path, { ...rest, method: "DELETE", json });
  },
};

export { API_URL, ApiError, apiFetch };
export type { ApiFetchOptions, ApiClientConfig, ApiClientMutationConfig };

