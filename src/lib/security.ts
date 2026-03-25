import { authStorage } from "./auth-storage";
// ── Security utilities ──────────────────────────────────────────────

/**
 * Sanitize user input to prevent XSS attacks.
 * Strips HTML tags and encodes dangerous characters.
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validate that a string only contains safe characters (alphanumeric, spaces, common punctuation).
 */
export function isSafeString(input: string): boolean {
  // Allow letters, numbers, spaces, and common punctuation
  return /^[\p{L}\p{N}\s.,!?@#$%&*()_+\-=\[\]{};':"\\|<>/~`]+$/u.test(input);
}

/**
 * Simple client-side rate limiter using a sliding window approach.
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  /**
   * Check if the action is within the rate limit.
   * @param key - Identifier for the action
   * @param maxAttempts - Maximum attempts allowed
   * @param windowMs - Time window in milliseconds
   * @returns true if within limit, false if exceeded
   */
  check(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = this.attempts.get(key) || [];

    // Remove expired timestamps
    const valid = timestamps.filter((t) => now - t < windowMs);

    if (valid.length >= maxAttempts) {
      this.attempts.set(key, valid);
      return false; // Rate limited
    }

    valid.push(now);
    this.attempts.set(key, valid);
    return true; // Allowed
  }

  /**
   * Get remaining time until the rate limit resets.
   */
  getRetryAfter(key: string, windowMs: number): number {
    const timestamps = this.attempts.get(key) || [];
    if (timestamps.length === 0) return 0;
    const oldest = Math.min(...timestamps);
    return Math.max(0, windowMs - (Date.now() - oldest));
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Generate a CSRF-like token for form submissions.
 * Stored in sessionStorage so it doesn't persist across sessions.
 */
export function getCsrfToken(): string {
  let token = sessionStorage.getItem("_csrf_token");
  if (!token) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    token = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
    sessionStorage.setItem("_csrf_token", token);
  }
  return token;
}

/**
 * Validate email format.
 */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) && email.length <= 254;
}

/**
 * Validate password strength.
 */
export function isStrongPassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: "Senha deve ter pelo menos 8 caracteres." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Senha deve conter pelo menos uma letra maiuscula." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Senha deve conter pelo menos uma letra minuscula." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Senha deve conter pelo menos um numero." };
  }
  return { valid: true, message: "" };
}

/**
 * Validate a PIX key format (CPF, CNPJ, email, phone, or random key).
 */
export function isValidPixKey(key: string): boolean {
  const trimmed = key.trim();
  if (trimmed.length === 0) return false;

  // CPF: 11 digits or formatted
  const cpfRegex = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
  // CNPJ: 14 digits or formatted
  const cnpjRegex = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/;
  // Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Phone: +55 followed by DDD and number
  const phoneRegex = /^\+?55?\d{10,11}$/;
  // Random key: UUID format
  const randomKeyRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return (
    cpfRegex.test(trimmed) ||
    cnpjRegex.test(trimmed) ||
    emailRegex.test(trimmed) ||
    phoneRegex.test(trimmed) ||
    randomKeyRegex.test(trimmed) ||
    // Also allow plain digits for phone/CPF/CNPJ without formatting
    /^\d{11,14}$/.test(trimmed)
  );
}

/**
 * Mask sensitive data for display (e.g., tokens, keys).
 */
export function maskSensitive(value: string, visibleChars: number = 6): string {
  if (value.length <= visibleChars) return "*".repeat(value.length);
  return value.substring(0, visibleChars) + "*".repeat(Math.min(value.length - visibleChars, 20));
}

/**
 * Prevent clickjacking by checking if we're in an iframe.
 */
export function preventClickjacking(): void {
  if (window.self !== window.top) {
    // We're in an iframe - redirect to top
    window.top?.location.replace(window.self.location.href);
  }
}

/**
 * Clear all sensitive data from storage on logout.
 */
export function secureLogout(): void {
  authStorage.clearAll();
  // Clear all query caches
  window.location.href = "/login";
}
