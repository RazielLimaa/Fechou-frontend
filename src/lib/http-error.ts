function fallbackMessageForStatus(status: number): string {
  if (status === 400) return "Não foi possível concluir a solicitação.";
  if (status === 401) return "Sessão expirada. Faça login novamente.";
  if (status === 403) return "Você não tem permissão para esta ação.";
  if (status === 404) return "Recurso não encontrado.";
  if (status === 409) return "Não foi possível concluir a solicitação no momento.";
  if (status === 422) return "Alguns dados precisam ser revisados antes de continuar.";
  if (status === 429) return "Muitas tentativas. Aguarde e tente novamente.";
  if (status >= 500) return "Serviço temporariamente indisponível.";
  return `Erro HTTP ${status}`;
}

function extractStringPayload(payload: unknown): string {
  if (!payload) return "";

  if (typeof payload === "string") {
    return payload.trim();
  }

  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.message === "string") return record.message.trim();
    if (typeof record.error === "string") return record.error.trim();
  }

  return "";
}

function looksSensitiveMessage(value: string): boolean {
  if (!value) return false;

  return (
    value.length > 160 ||
    /<\/?[a-z][\s\S]*>/i.test(value) ||
    /\b(exception|stack|trace|syntaxerror|referenceerror|typeerror|prisma|sequelize|postgres|mysql|mongodb|redis|jwt|bearer|token|header|cookie|csrf|internal server error)\b/i.test(value) ||
    /\bat\s+[A-Z]:\\|\/[A-Za-z0-9_.-]+:\d+:\d+/i.test(value)
  );
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function getSafeHttpErrorMessage(status: number, payload: unknown): string {
  const rawMessage = normalizeWhitespace(extractStringPayload(payload));
  if (!rawMessage || looksSensitiveMessage(rawMessage)) {
    return fallbackMessageForStatus(status);
  }

  return rawMessage;
}

export function getRawHttpErrorMessage(payload: unknown): string {
  return normalizeWhitespace(extractStringPayload(payload));
}
