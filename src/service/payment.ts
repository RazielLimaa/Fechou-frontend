import { api } from "./../services/api";

const PREFIX = "/api/payments";
const SKIP_PAYMENTS_ME = String(import.meta.env.VITE_SKIP_PAYMENTS_ME ?? "false").toLowerCase() === "true";

function resolveDefaultSubscriptionBackUrl(): string {
  const explicit = String(import.meta.env.VITE_SUBSCRIPTION_BACK_URL ?? "").trim();
  if (explicit) {
    return explicit;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/pagamento/confirmacao`;
  }

  return "https://fechou.cloud/pagamento/confirmacao";
}

export const DEFAULT_SUBSCRIPTION_BACK_URL = resolveDefaultSubscriptionBackUrl();

function makeIdempotencyKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function assertValidPlan(planId: string): asserts planId is "pro" | "premium" {
  if (planId !== "pro" && planId !== "premium") {
    throw new Error(`Plano invalido: "${planId}". Use "pro" ou "premium".`);
  }
}

function assertValidCardTokenId(cardTokenId: string): void {
  const sanitized = cardTokenId.trim();

  if (sanitized.length < 6 || sanitized.length > 300) {
    throw new Error("Token do cartao invalido.");
  }
}

function assertValidBackUrl(backUrl: string): void {
  let parsed: URL;

  try {
    parsed = new URL(backUrl);
  } catch {
    throw new Error("URL de retorno invalida.");
  }

  const protocol = parsed.protocol.toLowerCase();
  const isLocalHttp =
    protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase());

  if (protocol !== "https:" && !isLocalHttp) {
    throw new Error("URL de retorno invalida.");
  }
}

function assertValidSubscriptionCheckoutUrl(checkoutUrl: string, backUrl: string): void {
  let parsedCheckoutUrl: URL;
  let parsedBackUrl: URL;

  try {
    parsedCheckoutUrl = new URL(checkoutUrl);
    parsedBackUrl = new URL(backUrl);
  } catch {
    throw new Error("URL de checkout malformada.");
  }

  const protocol = parsedCheckoutUrl.protocol.toLowerCase();
  const isLocalHttp =
    protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(parsedCheckoutUrl.hostname.toLowerCase());

  if (protocol !== "https:" && !isLocalHttp) {
    throw new Error("URL de checkout invalida.");
  }

  const sameReturnRoute =
    parsedCheckoutUrl.origin === parsedBackUrl.origin &&
    parsedCheckoutUrl.pathname === parsedBackUrl.pathname;
  const trustedMercadoPagoHosts = [
    "mercadopago.com",
    "mercadopago.com.br",
    "sandbox.mercadopago.com.br",
    "mercadolibre.com",
  ];
  const hostname = parsedCheckoutUrl.hostname.toLowerCase();
  const trustedMercadoPago = trustedMercadoPagoHosts.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  );

  if (!sameReturnRoute && !trustedMercadoPago) {
    throw new Error("URL de checkout invalida.");
  }
}

function assertValidBillingMeResponse(data: PaymentsMeResponse): void {
  if (!data || typeof data !== "object") {
    throw new Error("Resposta invalida ao consultar assinatura.");
  }

  const plan = data.plan;
  if (!plan || (plan.planId !== "free" && plan.planId !== "pro" && plan.planId !== "premium")) {
    throw new Error("Plano invalido retornado pelo servidor.");
  }

  if (typeof plan.isSubscribed !== "boolean") {
    throw new Error("Status de assinatura invalido retornado pelo servidor.");
  }
}

export type PlanId = "free" | "pro" | "premium";

export type PlanInfo = {
  planId: PlanId;
  status: string | null;
  isSubscribed: boolean;
};

export type SubscriptionInfo = {
  id: number | string;
  userId: number | string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  status: string;
  currentPeriodEnd: string | Date | null;
  cancelAtPeriodEnd: boolean;
  createdAt?: string;
  updatedAt?: string;
} | null;

export type PaymentsMeResponse = {
  payments: unknown[];
  subscription: SubscriptionInfo;
  plan: PlanInfo;
};

export type CreateSubscriptionCheckoutPayload = {
  cardTokenId: string;
  backUrl: string;
};

export type SubscriptionCheckoutResponse = {
  checkoutUrl: string;
  preapprovalId: string;
  planId: PlanId;
  providerCheckoutUrl?: string;
  externalReference?: string;
};

export type SubscriptionClientConfigResponse = {
  publicKey: string;
  mode: "production" | "test";
  publicKeyMode?: "production" | "test";
  hasAssociatedPlansConfigured?: boolean;
};

export type ConfirmSubscriptionResponse = {
  ok: boolean;
  planId: PlanId;
  status: string;
};

export type ConfirmSubscriptionPayload = {
  preapprovalId?: string;
  externalReference?: string;
};

export type CancelSubscriptionResponse = {
  ok: boolean;
};

export async function getBillingMe(): Promise<PaymentsMeResponse> {
  if (SKIP_PAYMENTS_ME) {
    if (!import.meta.env.DEV) {
      throw new Error("VITE_SKIP_PAYMENTS_ME nao pode ser usado em producao.");
    }

    return {
      payments: [],
      subscription: null,
      plan: {
        planId: "free",
        status: null,
        isSubscribed: false,
      },
    };
  }

  const { data } = await api.get<PaymentsMeResponse>(`${PREFIX}/me`);
  assertValidBillingMeResponse(data);
  return data;
}

export const getMyPlan = getBillingMe;

export async function getSubscriptionClientConfig(): Promise<SubscriptionClientConfigResponse> {
  const { data } = await api.get<SubscriptionClientConfigResponse>(`${PREFIX}/subscriptions/client-config`, {
    cache: "no-store",
  });

  const resolvedMode =
    data?.mode === "production" || data?.mode === "test"
      ? data.mode
      : data?.publicKeyMode === "production" || data?.publicKeyMode === "test"
        ? data.publicKeyMode
        : null;

  if (!data || typeof data.publicKey !== "string" || !resolvedMode) {
    throw new Error("Configuracao invalida do Mercado Pago para assinatura.");
  }

  return {
    publicKey: data.publicKey,
    mode: resolvedMode,
    publicKeyMode: data.publicKeyMode ?? resolvedMode,
    hasAssociatedPlansConfigured:
      typeof data.hasAssociatedPlansConfigured === "boolean"
        ? data.hasAssociatedPlansConfigured
        : undefined,
  };
}

export async function createSubscriptionCheckout(
  planId: "pro" | "premium",
  payload: CreateSubscriptionCheckoutPayload,
): Promise<SubscriptionCheckoutResponse> {
  assertValidPlan(planId);
  assertValidCardTokenId(payload.cardTokenId);
  assertValidBackUrl(payload.backUrl);

  const safePayload: CreateSubscriptionCheckoutPayload & { planId: "pro" | "premium" } = {
    planId,
    cardTokenId: payload.cardTokenId.trim(),
    backUrl: payload.backUrl.trim(),
  };

  const { data } = await api.post<SubscriptionCheckoutResponse>(
    `${PREFIX}/subscriptions/checkout`,
    safePayload,
    {
      headers: {
        "idempotency-key": makeIdempotencyKey(),
      },
    },
  );

  if (!data || typeof data !== "object") {
    throw new Error("Resposta invalida do servidor de pagamentos.");
  }

  if (!data.checkoutUrl || typeof data.checkoutUrl !== "string") {
    throw new Error("Resposta invalida do servidor de pagamentos.");
  }

  if (!data.preapprovalId || typeof data.preapprovalId !== "string") {
    throw new Error("Preapproval invalido retornado pelo servidor.");
  }

  if (data.planId !== "pro" && data.planId !== "premium" && data.planId !== "free") {
    throw new Error("Plano invalido retornado pelo servidor.");
  }

  assertValidSubscriptionCheckoutUrl(data.checkoutUrl, safePayload.backUrl);

  return data;
}

export async function confirmSubscription(
  payload: string | ConfirmSubscriptionPayload,
): Promise<ConfirmSubscriptionResponse> {
  const sanitizedPreapprovalId =
    typeof payload === "string"
      ? payload.trim()
      : String(payload.preapprovalId ?? "").trim();
  const sanitizedExternalReference =
    typeof payload === "string"
      ? ""
      : String(payload.externalReference ?? "").trim();

  const confirmPayload: ConfirmSubscriptionPayload = {};

  if (sanitizedPreapprovalId) {
    if (sanitizedPreapprovalId.length < 4 || sanitizedPreapprovalId.length > 120) {
      throw new Error("preapprovalId invalido.");
    }
    confirmPayload.preapprovalId = sanitizedPreapprovalId;
  }

  if (sanitizedExternalReference) {
    if (sanitizedExternalReference.length < 4 || sanitizedExternalReference.length > 200) {
      throw new Error("externalReference invalido.");
    }
    confirmPayload.externalReference = sanitizedExternalReference;
  }

  if (!confirmPayload.preapprovalId && !confirmPayload.externalReference) {
    throw new Error("Identificador de confirmacao invalido.");
  }

  const { data } = await api.post<ConfirmSubscriptionResponse>(
    `${PREFIX}/subscriptions/confirm`,
    confirmPayload,
    {
      headers: {
        "idempotency-key": makeIdempotencyKey(),
      },
    },
  );

  if (!data || typeof data !== "object") {
    throw new Error("Resposta invalida na confirmacao da assinatura.");
  }

  if (typeof data.ok !== "boolean") {
    throw new Error("Resposta invalida na confirmacao da assinatura.");
  }

  return data;
}

export async function cancelSubscription(): Promise<CancelSubscriptionResponse> {
  const { data } = await api.post<CancelSubscriptionResponse>(
    `${PREFIX}/subscriptions/cancel`,
    {},
    {
      headers: {
        "idempotency-key": makeIdempotencyKey(),
      },
    },
  );

  if (!data || typeof data.ok !== "boolean") {
    throw new Error("Resposta invalida ao cancelar assinatura.");
  }

  return data;
}

export async function confirmSubscriptionCheckout(
  idOrSessionId: string,
): Promise<ConfirmSubscriptionResponse> {
  return confirmSubscription(idOrSessionId);
}

export async function createSubscriptionCheckoutLegacy(
  planId: "pro" | "premium",
  payload: { successUrl?: string; cancelUrl?: string; backUrl?: string; cardTokenId?: string },
): Promise<SubscriptionCheckoutResponse> {
  if (!payload.cardTokenId) {
    throw new Error("cardTokenId e obrigatorio para criar a assinatura.");
  }

  return createSubscriptionCheckout(planId, {
    cardTokenId: payload.cardTokenId,
    backUrl: payload.backUrl ?? DEFAULT_SUBSCRIPTION_BACK_URL,
  });
}
