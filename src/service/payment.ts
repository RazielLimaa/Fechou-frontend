// src/service/payment.ts
import { apiFetch } from "./api";

const API_PREFIX = "/api/payments";

// ---------- auth helpers ----------
function getToken() {
  const token = localStorage.getItem("access_token");
  return token && token.trim().length > 0 ? token : undefined;
}

function makeIdempotencyKey() {
  return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------- types ----------
export type PlanId = "free" | "pro" | "premium";

export type PlanInfo = {
  planId: PlanId;
  status: string | null;
  priceId: string | null;
  isSubscribed: boolean;
};

export type SubscriptionInfo = null | {
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
};

export type PaymentsMeResponse = {
  payments: any[];
  subscription: SubscriptionInfo;
  plan: PlanInfo;
};

export type CheckoutResponse = {
  checkoutUrl: string;
  sessionId: string;
};

// Resposta padrão do confirm (ajuste se seu backend retornar diferente)
export type ConfirmSubscriptionResponse = {
  ok: true;
  planId: PlanId;
};

// ---------- API calls ----------

/**
 * GET /api/payments/me
 * Retorna payments + subscription + plan { planId, status, priceId, isSubscribed }
 */
export function getBillingMe() {
  return apiFetch<PaymentsMeResponse>(`${API_PREFIX}/me`, {
    method: "GET",
    token: getToken(),
  });
}

/**
 * ✅ Alias pro frontend: Propostas.tsx usa getMyPlan()
 */
export function getMyPlan() {
  return getBillingMe();
}

/**
 * POST /api/payments/subscriptions/checkout/:planId
 * planId = "pro" | "premium"
 */
export function createSubscriptionCheckout(
  planId: "pro" | "premium",
  payload: { successUrl: string; cancelUrl: string }
) {
  return apiFetch<CheckoutResponse>(`${API_PREFIX}/subscriptions/checkout/${planId}`, {
    method: "POST",
    json: payload,
    token: getToken(),
    headers: {
      "Idempotency-Key": makeIdempotencyKey(),
    },
  });
}

/**
 * ✅ POST /api/payments/subscriptions/confirm
 * Confirma uma assinatura após o redirect do Stripe (session_id)
 *
 * Espera receber sessionId da URL:
 * /propostas?subscription=success&session_id=cs_test_...
 */
export function confirmSubscriptionCheckout(sessionId: string) {
  return apiFetch<ConfirmSubscriptionResponse>(`${API_PREFIX}/subscriptions/confirm`, {
    method: "POST",
    json: { sessionId },
    token: getToken(),
    headers: {
      "Idempotency-Key": makeIdempotencyKey(),
    },
  });
}

/**
 * POST /api/payments/proposals/:id/checkout
 * Pagamento avulso de uma proposta
 */
export function createProposalCheckout(
  proposalId: number,
  payload: { successUrl: string; cancelUrl: string; clientEmail?: string }
) {
  return apiFetch<CheckoutResponse>(`${API_PREFIX}/proposals/${proposalId}/checkout`, {
    method: "POST",
    json: payload,
    token: getToken(),
    headers: {
      "Idempotency-Key": makeIdempotencyKey(),
    },
  });
}
