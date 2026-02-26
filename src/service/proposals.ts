import { getCsrfToken } from "../lib/security";

export type ApiProposalStatus = "pendente" | "vendida" | "cancelada";

export interface ApiProposal {
  id: number;
  userId: number;
  title: string;
  clientName: string;
  description: string;
  value: string;
  status: ApiProposalStatus;
  createdAt: string;

  contract?: {
    signed: boolean;
    signedAt: string | null;
    signerName: string | null;
    canPay: boolean;
  };

  // quando vem do público (/public/:token)
  pixKey?: string | null;
  pixKeyType?: string | null;
}

const RAW_BASE = (import.meta as any)?.env?.VITE_API_URL ?? "http://localhost:3001";
const API_BASE = String(RAW_BASE).trim().replace(/\/+$/, "");

function isLikelyJwt(token: string) {
  if (!token) return false;
  if (token.length < 10 || token.length > 4096) return false;
  if (/[<>\s"']/.test(token)) return false;
  return true;
}

function getToken(): string {
  const token = localStorage.getItem("access_token") ?? "";
  if (!isLikelyJwt(token)) {
    if (token) localStorage.removeItem("access_token");
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
        "Cache-Control": "no-store",
        Pragma: "no-cache",
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
      throw new Error("Sessão expirada.");
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
      throw new Error("Tempo limite da requisição excedido.");
    }
    throw err;
  }
}

export function listProposals(): Promise<ApiProposal[]> {
  return apiFetch<ApiProposal[]>("/api/proposals");
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

export function generateShareLink(
  id: number,
  expiresInHours?: number
): Promise<{ shareToken: string; expiresAt: string; publicUrlPath: string }> {
  return apiFetch<{ shareToken: string; expiresAt: string; publicUrlPath: string }>(`/api/proposals/${id}/share-link`, {
    method: "POST",
    body: JSON.stringify({ expiresInHours }),
    headers: {
      "Idempotency-Key": `share-link-${id}-${Date.now()}`,
    },
  });
}

export function getPublicProposal(token: string): Promise<ApiProposal> {
  return apiFetch<ApiProposal>(`/api/proposals/public/${token}`);
}

export function signProposal(
  token: string,
  data: { signerName: string; signerDocument: string }
): Promise<{ ok: boolean; proposalId: number; signedAt: string | null }> {
  return apiFetch<{ ok: boolean; proposalId: number; signedAt: string | null }>(`/api/proposals/public/${token}/sign`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Idempotency-Key": `public-sign-${Date.now()}`,
    },
  });
}

/**
 * ✅ CONFIRMAR PAGAMENTO MANUAL (PIX)
 * POST /api/proposals/:id/mark-paid
 */
export function markProposalPaid(
  id: number,
  data?: { note?: string; payerName?: string; payerDocument?: string }
): Promise<{ ok: boolean; proposalId: number; amountCents: number; externalPaymentId: string }> {
  return apiFetch<{ ok: boolean; proposalId: number; amountCents: number; externalPaymentId: string }>(
    `/api/proposals/${id}/mark-paid`,
    {
    method: "POST",
      body: JSON.stringify(data ?? {}),
    headers: {
        "Idempotency-Key": `mark-paid-${id}-${Date.now()}`,
      },
    }
  );
}