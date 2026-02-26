export type ApiProposalStatus = "pendente" | "vendida" | "cancelada";

export interface ApiProposal {
  id: number;
  userId: number;
  title: string;
  clientName: string;
  description: string;
  value: string; // 
  status: ApiProposalStatus;
  createdAt: string;
  contract?: {
    signed: boolean;
    signedAt: string | null;
    signerName: string | null;
    canPay: boolean;
  };
}

import { getCsrfToken } from "../lib/security";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

function getToken(): string {
  const token = localStorage.getItem("access_token") ?? "";
  // Basic token validation
  if (token && (/<|>|javascript:/i.test(token) || token.length > 4096)) {
    localStorage.removeItem("access_token");
    return "";
  }
  return token;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const csrfHeaders: Record<string, string> = {};
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    csrfHeaders["X-CSRF-Token"] = getCsrfToken();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${getToken()}`,
        ...csrfHeaders,
        ...(init?.headers ?? {}),
      },
    });

    clearTimeout(timeoutId);

    if (res.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      throw new Error("Sessao expirada.");
    }

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      throw new Error(data?.message ?? `Erro ${res.status}`);
    }

    return data as T;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Tempo limite da requisicao excedido.");
    }
    throw err;
  }
}

export function listProposals(): Promise<ApiProposal[]> {
  return apiFetch<ApiProposal[]>("/api/proposals");
}

export type PremiumDashboardPeriod = "monthly" | "weekly";

export interface PremiumDashboardResponse {
  period: PremiumDashboardPeriod;
  generatedAt: string;
  soldCount: number;
  pendingCount: number;
  canceledCount: number;
  totalValue: number;
  pendingValue: number;
  avgTicket: number;
  conversionRatePct: number;
  chartData: Array<{ name: string; sold: number; pending: number; revenue: number }>;
  pendingReasons: Array<{ name: string; value: number }>;
}

export function getPremiumDashboard(period: PremiumDashboardPeriod): Promise<PremiumDashboardResponse> {
  return apiFetch<PremiumDashboardResponse>(`/api/analytics/premium-dashboard?period=${period}`);
}

export async function exportPremiumDashboardCsv(): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/analytics/premium-dashboard/export.csv`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // ignore and keep fallback message
    }
    throw new Error(message);
  }

  return res.blob();
}

export function createProposal(input: {
  title: string;
  clientName: string;
  description: string;
  value: number;
}): Promise<ApiProposal> {
  return apiFetch<ApiProposal>("/api/proposals", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function generateShareLink(id: number, expiresInHours?: number): Promise<{ shareToken: string; expiresAt: string; path: string }> {
  return apiFetch<{ shareToken: string; expiresAt: string; path: string }>(`/api/proposals/${id}/share-link`, {
    method: "POST",
    body: JSON.stringify({ expiresInHours }),
  });
}

export function getPublicProposal(token: string): Promise<ApiProposal> {
  return apiFetch<ApiProposal>(`/api/proposals/public/${token}`);
}

export function signProposal(token: string, data: { signerName: string; signerDocument: string }): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/proposals/public/${token}/sign`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function createCheckout(token: string, data: { successUrl: string; failureUrl: string; pendingUrl: string; payerEmail?: string }): Promise<{ checkoutUrl: string; preferenceId: string }> {
  return apiFetch<{ checkoutUrl: string; preferenceId: string }>(`/api/payments/public/${token}/checkout`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function createSubscriptionCheckout(data: { priceId: string; successUrl: string; cancelUrl: string }) {
  return apiFetch<{ checkoutUrl: string; sessionId: string }>("/api/subscriptions/checkout", {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Idempotency-Key": `sub-checkout-${Date.now()}`
    }
  });
}
