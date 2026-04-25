import { ApiError } from "../service/api";
import { isStepUpCancelledError } from "../service/step-up";

export type ApiErrorDetailsRecord = Record<string, unknown>;

export function getApiErrorDetails(error: unknown): ApiErrorDetailsRecord | null {
  if (!(error instanceof ApiError)) return null;

  return error.details && typeof error.details === "object"
    ? (error.details as ApiErrorDetailsRecord)
    : null;
}

export function getApiErrorDetailString(error: unknown, key: string): string | undefined {
  const details = getApiErrorDetails(error);
  const value = details?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getApiErrorDetailNumber(error: unknown, key: string): number | undefined {
  const details = getApiErrorDetails(error);
  const value = details?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function getApiErrorFieldErrors(error: unknown): Record<string, string> {
  const details = getApiErrorDetails(error);
  const raw = details?.fieldErrors;
  if (!raw || typeof raw !== "object") return {};

  const result: Record<string, string> = {};
  for (const [field, message] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof message === "string" && message.trim()) result[field] = message.trim();
  }
  return result;
}

export function isLikelyNetworkError(error: unknown): boolean {
  return error instanceof TypeError && /failed to fetch|load failed|networkerror/i.test(error.message.toLowerCase());
}

export function toUiErrorMessage(error: unknown): string {
  if (isStepUpCancelledError(error)) {
    return "A confirmacao foi cancelada.";
  }

  if (error instanceof ApiError) {
    const detailsMessage = getApiErrorDetailString(error, "message");
    const detailsCode = getApiErrorDetailString(error, "code");
    const fieldErrors = getApiErrorFieldErrors(error);
    const firstFieldError = Object.values(fieldErrors)[0];
    const normalizedMessage = error.message.toLowerCase();

    if (error.status === 401) {
      return "Sua sessao expirou. Faca login novamente.";
    }

    if (error.status === 429) {
      const retry = error.retryAfterSeconds ?? 1;
      return `Muitas tentativas. Tente novamente em ${retry}s.`;
    }

    if (error.isCsrfInvalid) {
      return "Falha de seguranca (CSRF). Tente novamente.";
    }

    if (detailsCode === "mp_subscription_card_validation_failed") {
      return detailsMessage ?? "Nao foi possivel validar os dados do cartao informado.";
    }

    if (detailsCode === "mp_subscription_card_token_service_not_found") {
      return detailsMessage ?? "O token do cartao foi rejeitado pelo Mercado Pago.";
    }

    if (detailsCode === "mp_subscription_provider_temporarily_unavailable") {
      return detailsMessage ?? "O Mercado Pago ficou temporariamente indisponivel.";
    }

    if (detailsCode === "mp_subscription_invalid_external_reference") {
      return detailsMessage ?? "A referencia de seguranca da assinatura e invalida. Refaca o checkout.";
    }

    if (detailsCode === "mp_subscription_owner_mismatch") {
      return detailsMessage ?? "Esta assinatura nao pertence a sua conta.";
    }

    if (detailsCode === "mp_subscription_not_authorized") {
      return detailsMessage ?? "A assinatura ainda nao foi autorizada pelo Mercado Pago.";
    }

    if (
      detailsCode === "mp_subscription_plan_id_mismatch" ||
      detailsCode === "mp_subscription_commercial_terms_mismatch" ||
      detailsCode === "mp_subscription_collector_mismatch" ||
      detailsCode === "mp_subscription_session_not_found" ||
      detailsCode === "mp_subscription_session_plan_mismatch" ||
      detailsCode === "mp_subscription_session_amount_mismatch" ||
      detailsCode === "mp_subscription_session_currency_mismatch"
    ) {
      return detailsMessage ?? "A assinatura retornada nao corresponde a sessao segura criada para este checkout.";
    }

    if (detailsCode === "database_temporarily_unavailable") {
      return detailsMessage ?? "Banco de dados temporariamente indisponivel. Tente novamente em instantes.";
    }

    if (normalizedMessage.includes("senha local configurada")) {
      return "Esta acao exige confirmacao por senha da sua conta.";
    }

    if (error.isStepUpRequired || normalizedMessage.includes("step-up")) {
      return "Confirme sua identidade para continuar.";
    }

    if (error.status === 403) {
      return "Voce nao tem permissao para concluir esta acao.";
    }

    if (error.status === 404) {
      return "Nao foi possivel localizar este recurso.";
    }

    if (error.status === 409) {
      return "Esta acao nao pode ser concluida no estado atual.";
    }

    if (error.status === 422) {
      return firstFieldError ?? "Revise os dados informados e tente novamente.";
    }

    if (error.status >= 500) {
      return "Servico temporariamente indisponivel. Tente novamente em instantes.";
    }

    return detailsMessage ?? error.message;
  }

  if (isLikelyNetworkError(error)) {
    return "Nao foi possivel conectar ao backend. Verifique sua conexao e tente novamente.";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Ocorreu um erro inesperado.";
}
