import { ApiError } from "../service/api";

export function toUiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      const retry = error.retryAfterSeconds ?? 1;
      return `Muitas tentativas. Tente novamente em ${retry}s.`;
    }

    if (error.isCsrfInvalid) {
      return "Falha de segurança (CSRF). Tente novamente.";
    }

    if (error.isStepUpRequired) {
      return "Step-up auth required. Confirme sua identidade para continuar.";
    }

    if (error.status >= 500) {
      return "Serviço temporariamente indisponível. Tente novamente em instantes.";
    }

    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Ocorreu um erro inesperado.";
}
