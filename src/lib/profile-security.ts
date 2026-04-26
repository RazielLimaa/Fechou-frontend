const MAX_AVATAR_DATA_URL_LENGTH = 8_000_000;
const MAX_EXTERNAL_URL_LENGTH = 500;
const ALLOWED_AVATAR_DATA_URL =
  /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i;

function stripControlChars(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, "");
}

export function sanitizeProfileText(raw: unknown, max = 120): string {
  if (!raw) return "";

  return String(raw)
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim()
    .slice(0, max);
}

export function sanitizeProfileAvatarSrc(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  const trimmed = stripControlChars(raw).trim();
  if (!trimmed || trimmed.length > MAX_AVATAR_DATA_URL_LENGTH) return null;

  if (trimmed.startsWith("data:")) {
    if (!ALLOWED_AVATAR_DATA_URL.test(trimmed)) return null;
    return trimmed.replace(/\s+/g, "");
  }

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../")
  ) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeProfileExternalUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  const trimmed = stripControlChars(raw).trim();
  if (!trimmed || trimmed.length > MAX_EXTERNAL_URL_LENGTH) return null;

  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (!url.hostname || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function getProfileInitial(raw: unknown): string {
  const safe = sanitizeProfileText(raw, 1);
  return safe ? safe.toUpperCase() : "?";
}
