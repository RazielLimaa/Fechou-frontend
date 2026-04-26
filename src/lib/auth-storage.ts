let inMemoryAccessToken: string | null = null;
let inMemoryUserRaw: string | null = null;

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
    return inMemoryUserRaw;
  },

  setUserRaw(raw: string): void {
    inMemoryUserRaw = raw;
  },

  clearUser(): void {
    inMemoryUserRaw = null;
  },

  clearAll(): void {
    this.clearAccessToken();
    this.clearUser();
  },
};
