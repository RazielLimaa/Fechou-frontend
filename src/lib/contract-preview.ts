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
