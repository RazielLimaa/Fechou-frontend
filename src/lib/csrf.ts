let csrfToken: string | null = null;
const DEFAULT_API_URL = "https://fechou-backend-g69o.onrender.com";

export function setCsrfToken(token: string | null | undefined): void {
  const t = token?.trim();
  csrfToken = t && t.length > 0 ? t : csrfToken;
}

export function clearCsrfToken(): void {
  csrfToken = null;
}

export function getCsrfTokenSync(): string | null {
  return csrfToken;
}

export async function getCsrfToken(baseUrl?: string): Promise<string | null> {
  if (csrfToken) return csrfToken;

  try {
    const apiBase = (baseUrl ?? DEFAULT_API_URL).replace(/\/+$/, "");
    const endpoint = `${apiBase}/api/auth/csrf`;
    const res = await fetch(endpoint, {
      method: "GET",
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
    });

    const headerToken = res.headers.get("x-csrf-token");
    if (headerToken && headerToken.trim().length > 0) {
      csrfToken = headerToken.trim();
      return csrfToken;
    }

    const body = await res.json().catch(() => null);
    const bodyToken = body && typeof body === "object" && typeof body.csrfToken === "string" ? body.csrfToken : null;
    if (bodyToken && bodyToken.trim().length > 0) {
      csrfToken = bodyToken.trim();
      return csrfToken;
    }

    return null;
  } catch {
    return null;
  }
}
