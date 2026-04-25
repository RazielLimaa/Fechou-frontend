import { apiFetch } from "./api";

export type StepUpScope =
  | "user.pix.update"
  | "user.pix.delete"
  | "payments.mark-paid"
  | "contracts.mark-paid"
  | "integrations.mp.api-key.register"
  | "contracts.provider-signature.save"
  | "contracts.provider-signature.delete"
  | "contracts.provider-signature.apply";

export type StepUpTokenResponse = {
  stepUpToken: string;
  expiresAt?: string;
};

export type StepUpPromptContent = {
  title: string;
  description: string;
  confirmLabel: string;
};

type StepUpPasswordPrompt = (content: StepUpPromptContent) => Promise<string | null>;

const STEP_UP_PROMPTS: Record<StepUpScope, StepUpPromptContent> = {
  "user.pix.update": {
    title: "Confirmar alteração da chave PIX",
    description: "Digite sua senha para salvar uma nova chave PIX. Essa confirmação vale apenas para esta ação.",
    confirmLabel: "Salvar chave",
  },
  "user.pix.delete": {
    title: "Confirmar remoção da chave PIX",
    description: "Digite sua senha para remover sua chave PIX cadastrada com segurança.",
    confirmLabel: "Remover chave",
  },
  "payments.mark-paid": {
    title: "Confirmar pagamento manual",
    description: "Digite sua senha para registrar manualmente este pagamento.",
    confirmLabel: "Confirmar pagamento",
  },
  "contracts.mark-paid": {
    title: "Confirmar pagamento do contrato",
    description: "Digite sua senha para registrar este pagamento no contrato.",
    confirmLabel: "Confirmar pagamento",
  },
  "integrations.mp.api-key.register": {
    title: "Confirmar integração sensível",
    description: "Digite sua senha para registrar uma chave de integração com segurança.",
    confirmLabel: "Confirmar integração",
  },
  "contracts.provider-signature.save": {
    title: "Salvar assinatura do prestador",
    description: "Digite sua senha para salvar sua assinatura no perfil com proteção reforçada.",
    confirmLabel: "Salvar assinatura",
  },
  "contracts.provider-signature.delete": {
    title: "Remover assinatura do prestador",
    description: "Digite sua senha para remover sua assinatura salva do perfil.",
    confirmLabel: "Remover assinatura",
  },
  "contracts.provider-signature.apply": {
    title: "Aplicar assinatura no contrato",
    description: "Digite sua senha para aplicar sua assinatura salva neste contrato.",
    confirmLabel: "Aplicar assinatura",
  },
};

let stepUpPasswordPrompt: StepUpPasswordPrompt | null = null;

export class StepUpCancelledError extends Error {
  constructor() {
    super("A confirmação foi cancelada.");
    this.name = "StepUpCancelledError";
  }
}

export function isStepUpCancelledError(error: unknown): error is StepUpCancelledError {
  return error instanceof StepUpCancelledError;
}

export function setStepUpPasswordPrompt(prompt: StepUpPasswordPrompt | null): void {
  stepUpPasswordPrompt = prompt;
}

function getStepUpPrompt(scope: StepUpScope): StepUpPromptContent {
  return STEP_UP_PROMPTS[scope] ?? {
    title: "Confirme sua identidade",
    description: "Digite sua senha para continuar com esta ação sensível.",
    confirmLabel: "Confirmar",
  };
}

async function promptStepUpPassword(scope: StepUpScope): Promise<string> {
  if (!stepUpPasswordPrompt) {
    throw new Error("Não foi possível confirmar sua identidade agora. Tente novamente.");
  }

  const password = await stepUpPasswordPrompt(getStepUpPrompt(scope));
  const normalized = typeof password === "string" ? password.trim() : "";

  if (!normalized) {
    throw new StepUpCancelledError();
  }

  return normalized;
}

export function requestStepUp(scope: StepUpScope, payload?: Record<string, unknown>, password?: string) {
  return apiFetch<StepUpTokenResponse>("/api/auth/step-up/request", {
    method: "POST",
    json: {
      scope,
      ...(payload ? { payload } : {}),
      ...(password ? { password } : {}),
    },
  });
}

export async function runWithStepUp<T>(
  scope: StepUpScope,
  payload: Record<string, unknown> | undefined,
  actionFn: (stepUpToken: string) => Promise<T>,
): Promise<T> {
  let password = "";
  let stepUpToken = "";

  try {
    password = await promptStepUpPassword(scope);
    const response = await requestStepUp(scope, payload, password);
    stepUpToken = response.stepUpToken?.trim() ?? "";

    if (!stepUpToken) {
      throw new Error("Não foi possível confirmar sua identidade agora. Tente novamente.");
    }

    return await actionFn(stepUpToken);
  } finally {
    password = "";
    stepUpToken = "";
  }
}
