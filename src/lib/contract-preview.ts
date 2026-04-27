import { API_URL } from "../service/api";

export interface RenderedContractPreview {
  previewHtml?: string;
  previewDocumentUrl?: string;
  previewExpiresAt?: string | null;
}

const PREVIEW_REFRESH_SKEW_MS = 5_000;

export function getPreviewRefreshDelay(
  previewExpiresAt: string | null | undefined,
  now = Date.now(),
): number | null {
  if (!previewExpiresAt) return null;

  const expiresAt = Date.parse(previewExpiresAt);
  if (Number.isNaN(expiresAt)) return null;

  return Math.max(0, expiresAt - now - PREVIEW_REFRESH_SKEW_MS);
}

export function normalizePreviewDocumentUrl(
  previewDocumentUrl: string | null | undefined,
): string | null {
  const trimmed = previewDocumentUrl?.trim();
  if (!trimmed) return null;

  const apiBase = new URL(API_URL);
  const resolved = new URL(trimmed, apiBase);

  if (resolved.pathname.startsWith("/api/")) {
    return new URL(`${resolved.pathname}${resolved.search}${resolved.hash}`, apiBase).toString();
  }

  if (resolved.origin !== apiBase.origin) {
    return null;
  }

  return resolved.toString();
}
