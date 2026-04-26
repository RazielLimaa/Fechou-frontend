const POST_AUTH_REDIRECT_KEY = "fechou_post_auth_redirect";
const REDIRECT_TTL_MS = 10 * 60 * 1000;

type RedirectIntent = {
  path: string;
  createdAt: number;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeInternalPath(rawPath: string): string | null {
  if (!isBrowser()) return null;

  try {
    const parsed = new URL(rawPath, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    if (!parsed.pathname.startsWith("/")) return null;
    if (parsed.pathname.startsWith("//")) return null;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function setPostAuthRedirect(rawPath: string) {
  if (!isBrowser()) return;

  const normalizedPath = normalizeInternalPath(rawPath);
  if (!normalizedPath) return;

  const payload: RedirectIntent = {
    path: normalizedPath,
    createdAt: Date.now(),
  };

  sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, JSON.stringify(payload));
}

export function consumePostAuthRedirect(fallbackPath: string) {
  if (!isBrowser()) return fallbackPath;

  const fallback = normalizeInternalPath(fallbackPath) ?? "/propostas";
  const raw = sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
  sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);

  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<RedirectIntent>;
    if (typeof parsed.path !== "string" || typeof parsed.createdAt !== "number") {
      return fallback;
    }

    if (Date.now() - parsed.createdAt > REDIRECT_TTL_MS) {
      return fallback;
    }

    return normalizeInternalPath(parsed.path) ?? fallback;
  } catch {
    return fallback;
  }
}

export function clearPostAuthRedirect() {
  if (!isBrowser()) return;
  sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
}
