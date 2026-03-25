const USER_KEY = "user";

let inMemoryAccessToken: string | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readSession(key: string): string | null {
  if (!isBrowser()) return null;
  return sessionStorage.getItem(key);
}

function writeSession(key: string, value: string): void {
  if (!isBrowser()) return;
  sessionStorage.setItem(key, value);
}

function removeSession(key: string): void {
  if (!isBrowser()) return;
  sessionStorage.removeItem(key);
}

export const authStorage = {
  getAccessToken(): string | null {
    return inMemoryAccessToken;
  },

  setAccessToken(token: string): void {
    const clean = token.trim();
    if (!clean) throw new Error("Token inválido.");
    inMemoryAccessToken = clean;
  },

  clearAccessToken(): void {
    inMemoryAccessToken = null;
  },

  getUserRaw(): string | null {
    return readSession(USER_KEY);
  },

  setUserRaw(raw: string): void {
    writeSession(USER_KEY, raw);
  },

  clearUser(): void {
    removeSession(USER_KEY);
  },

  clearAll(): void {
    this.clearAccessToken();
    this.clearUser();
    if (isBrowser()) sessionStorage.removeItem("_csrf_token");
  },
};
