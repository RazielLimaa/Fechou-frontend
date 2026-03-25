import { api } from "./../services/api";

const PREFIX = "/api/payments";

const ALLOWED_BACK_URL_ORIGINS = [
  "https://fechou.cloud",
  "https://www.fechou.cloud",
  "https://fechou.netlify.app",
] as const;

const ALLOWED_BACK_URL_PATHS = new Set([
  "/pagamento/confirmacao",
]);

const DEFAULT_BACK_URL = "https://fechou.cloud/pagamento/confirmacao";

function makeIdempotencyKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function assertValidPlan(planId: string): asserts planId is "pro" | "premium" {
  if (planId !== "pro" && planId !== "premium") {
    throw new Error(`Plano inválido: "${planId}". Use "pro" ou "premium".`);
  }
}

function sanitizeBackUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1";

    const isPrivateIPv4 =
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

    if (parsed.protocol !== "https:") return undefined;
    if (isLocalhost || isPrivateIPv4) return undefined;
    if (!ALLOWED_BACK_URL_ORIGINS.includes(parsed.origin as (typeof ALLOWED_BACK_URL_ORIGINS)[number])) {
      return undefined;
    }
    if (!ALLOWED_BACK_URL_PATHS.has(parsed.pathname)) {
      return undefined;
    }

    parsed.username = "";
    parsed.password = "";
    parsed.hash = "";

    return parsed.toString();
  } catch {
    return undefined;
  }
}

function getSafeBackUrl(options?: { backUrl?: string }): string {
  return sanitizeBackUrl(options?.backUrl) ?? DEFAULT_BACK_URL;
}

function assertMercadoPagoCheckoutUrl(url: string): void {
  const validHosts = [
    "mercadopago.com",
    "mercadopago.com.br",
    "mercadolibre.com",
    "sandbox.mercadopago.com.br",
    "www.mercadopago.com",
    "www.mercadopago.com.br",
  ];

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error("URL de checkout malformada.");
  }

  const hostname = parsed.hostname.toLowerCase();
  const protocol = parsed.protocol.toLowerCase();

  if (protocol !== "https:") {
    throw new Error("URL de checkout inválida.");
  }

  const isValidHost = validHosts.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`)
  );

  if (!isValidHost) {
    throw new Error("URL de checkout inválida.");
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

export type SubscriptionCheckoutResponse = {
  checkoutUrl: string;
  preapprovalId: string;
  planId: PlanId;
};

export type ConfirmSubscriptionResponse = {
  ok: boolean;
  planId: PlanId;
  status: string;
};

export type CancelSubscriptionResponse = {
  ok: boolean;
};

export async function getBillingMe(): Promise<PaymentsMeResponse> {
  try {
    const { data } = await api.get<PaymentsMeResponse>(`${PREFIX}/me`);
    return data;
  } catch {
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
}

export const getMyPlan = getBillingMe;

export async function createSubscriptionCheckout(
  planId: "pro" | "premium",
  options?: { backUrl?: string }
): Promise<SubscriptionCheckoutResponse> {
  assertValidPlan(planId);

  const backUrl = getSafeBackUrl(options);

  const { data } = await api.post<SubscriptionCheckoutResponse>(
    `${PREFIX}/subscriptions/checkout`,
    { planId, backUrl },
    {
      headers: {
        "idempotency-key": makeIdempotencyKey(),
      },
    }
  );

  if (!data || typeof data !== "object") {
    throw new Error("Resposta inválida do servidor de pagamentos.");
  }

  if (!data.checkoutUrl || typeof data.checkoutUrl !== "string") {
    throw new Error("Resposta inválida do servidor de pagamentos.");
  }

  if (!data.preapprovalId || typeof data.preapprovalId !== "string") {
    throw new Error("Preapproval inválido retornado pelo servidor.");
  }

  if (data.planId !== "pro" && data.planId !== "premium" && data.planId !== "free") {
    throw new Error("Plano inválido retornado pelo servidor.");
  }

  assertMercadoPagoCheckoutUrl(data.checkoutUrl);

  return data;
}

export async function confirmSubscription(
  preapprovalId: string
): Promise<ConfirmSubscriptionResponse> {
  const sanitizedPreapprovalId = preapprovalId?.trim();

  if (!sanitizedPreapprovalId || sanitizedPreapprovalId.length < 4 || sanitizedPreapprovalId.length > 120) {
    throw new Error("preapprovalId inválido.");
  }

  const { data } = await api.post<ConfirmSubscriptionResponse>(
    `${PREFIX}/subscriptions/confirm`,
    { preapprovalId: sanitizedPreapprovalId },
    {
      headers: {
        "idempotency-key": makeIdempotencyKey(),
      },
    }
  );

  if (!data || typeof data !== "object") {
    throw new Error("Resposta inválida na confirmação da assinatura.");
  }

  if (typeof data.ok !== "boolean") {
    throw new Error("Resposta inválida na confirmação da assinatura.");
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
    }
  );

  if (!data || typeof data.ok !== "boolean") {
    throw new Error("Resposta inválida ao cancelar assinatura.");
  }

  return data;
}

export async function confirmSubscriptionCheckout(
  idOrSessionId: string
): Promise<ConfirmSubscriptionResponse> {
  return confirmSubscription(idOrSessionId);
}

export async function createSubscriptionCheckoutLegacy(
  planId: "pro" | "premium",
  payload: { successUrl?: string; cancelUrl?: string; backUrl?: string }
): Promise<SubscriptionCheckoutResponse> {
  return createSubscriptionCheckout(planId, {
    backUrl: payload.backUrl ?? payload.successUrl,
  });
}