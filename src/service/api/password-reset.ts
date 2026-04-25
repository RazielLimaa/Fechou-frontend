import { ApiError, apiFetch } from "../api";

const API_PREFIX = "/api/auth";

export type PasswordResetRequestResponse = {
  ok?: boolean;
  message?: string;
};

export type PasswordResetVerifyResponse = {
  ok?: boolean;
  message?: string;
  resetToken?: string;
  resetUrl?: string;
};

export type PasswordResetCompleteResponse = {
  ok?: boolean;
  message?: string;
};

export type PasswordResetStage = "request" | "verify" | "complete";

export function requestPasswordReset(email: string) {
  return apiFetch<PasswordResetRequestResponse>(`${API_PREFIX}/forgot-password`, {
    method: "POST",
    json: { email },
    skipAuthRefresh: true,
    authMode: "optional",
    retry429: 0,
  });
}

export function verifyPasswordResetCode(email: string, code: string) {
  return apiFetch<PasswordResetVerifyResponse>(`${API_PREFIX}/forgot-password/verify-code`, {
    method: "POST",
    json: { email, code },
    skipAuthRefresh: true,
    authMode: "optional",
    retry429: 0,
  });
}

export function completePasswordReset(token: string, password: string) {
  return apiFetch<PasswordResetCompleteResponse>(`${API_PREFIX}/reset-password`, {
    method: "POST",
    json: { token, password },
    skipAuthRefresh: true,
    authMode: "optional",
    retry429: 0,
  });
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getPasswordResetErrorMessage(stage: PasswordResetStage, error: unknown) {
  if (isApiError(error) && error.status === 429) {
    return "Muitas tentativas no momento. Aguarde um pouco e tente novamente.";
  }

  if (stage === "verify") {
    if (isApiError(error) && [400, 401, 404, 410, 422].includes(error.status)) {
      return "Código inválido ou expirado. Solicite um novo código.";
    }

    return "Não foi possível validar o código agora. Tente novamente.";
  }

  if (stage === "complete") {
    if (isApiError(error) && [400, 401, 404, 410, 422].includes(error.status)) {
      return "Sua sessão de redefinição expirou ou não é mais válida. Solicite um novo código.";
    }

    return "Não foi possível redefinir sua senha agora. Tente novamente.";
  }

  return "Não foi possível concluir esta etapa agora. Tente novamente em instantes.";
}

export function extractResetTokenFromUrl(resetUrl?: string | null) {
  if (!resetUrl || typeof resetUrl !== "string") return null;

  try {
    const parsed = new URL(resetUrl, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;

    const token = parsed.searchParams.get("token");
    return token ? token.trim() : null;
  } catch {
    return null;
  }
}
