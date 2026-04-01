function appBaseUrl() {
  const base = import.meta.env.BASE_URL || "/";
  return `${window.location.origin}${base.endsWith("/") ? base : `${base}/`}`;
}

export function toAppAbsoluteUrl(path: string) {
  const cleanPath = path.replace(/^\/+/, "");
  return new URL(cleanPath, appBaseUrl()).toString();
}
