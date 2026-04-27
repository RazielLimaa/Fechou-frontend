import { QueryClient, type QueryFunction } from "@tanstack/react-query";
import { API_URL } from "../service/api";
import { getSafeHttpErrorMessage } from "./http-error";

function buildHeaders(hasJsonBody: boolean, extraHeaders?: Record<string, string>): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  };

  if (hasJsonBody) headers["Content-Type"] = "application/json";

  return {
    ...headers,
    ...(extraHeaders ?? {}),
  };
}

function resolveApiUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const safeBase = API_URL.replace(/\/+$/, "");
  const safePath = url.startsWith("/") ? url : `/${url}`;
  return `${safeBase}${safePath}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await res.json().catch(() => null)
      : (await res.text().catch(() => "")) || res.statusText;

    throw new Error(getSafeHttpErrorMessage(res.status, payload));
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { headers?: Record<string, string> },
): Promise<Response> {
  const hasBody = data !== undefined;

  const res = await fetch(resolveApiUrl(url), {
    method,
    headers: buildHeaders(hasBody, options?.headers),
    body: hasBody ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(resolveApiUrl(queryKey.join("/") as string), {
      credentials: "include",
      headers: buildHeaders(false),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as any;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
