import { ApiError } from "../../service/api";

const STATUS_MESSAGES: Record<number, string> = {
  400: "Revise os dados enviados e tente novamente.",
  401: "Sua sessao expirou. Faca login novamente.",
  403: "Voce nao tem permissao para executar esta acao.",
  404: "Nao encontramos esse recurso para a sua conta.",
  409: "Esse recurso mudou ou esta em um estado que impede a acao.",
  422: "Alguns dados precisam ser corrigidos antes de continuar.",
  429: "Muitas tentativas em pouco tempo. Aguarde e tente novamente.",
};

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getFriendlyApiErrorMessage(
  error: unknown,
  fallback = "Nao foi possivel concluir a acao agora. Tente novamente.",
): string {
  if (error instanceof ApiError) {
    if (error.isStepUpRequired) return "Confirme sua identidade para continuar.";

    const base = STATUS_MESSAGES[error.status] ?? error.message ?? fallback;
    return error.requestId ? `${base} Codigo de suporte: ${error.requestId}.` : base;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return "A requisicao demorou demais. Verifique a conexao e tente novamente.";
  }

  if (error instanceof Error && error.message && !/token|secret|cipher|stack/i.test(error.message)) {
    return error.message;
  }

  return fallback;
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

export function isValidationError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 400 || error.status === 422);
}

export function isRateLimitedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}

export { ApiError };

