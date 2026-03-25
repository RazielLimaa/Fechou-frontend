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

  pixKey?: string | null;
  pixKeyType?: string | null;
}

export type SignProposalPayload = {
  signerName: string;
  signerDocument: string;
  signatureDataUrl: string;
};

export type SignProposalResponse = {
  ok: boolean;
  proposalId: number;
  signedAt: string | null;
};

// ─── config ──────────────────────────────────────────────────────────────────

const RAW_BASE = (import.meta as any)?.env?.VITE_API_URL ?? "http://localhost:3001";
const API_BASE = String(RAW_BASE).trim().replace(/\/+$/, "");

// ─── segurança ────────────────────────────────────────────────────────────────

function isLikelyJwt(token: string): boolean {
  if (!token) return false;
  if (token.length < 20 || token.length > 4096) return false;
  if (/[<>\s"']/.test(token)) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

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

function safeId(id: number): string {
  if (!Number.isInteger(id) || id <= 0 || id > 2_147_483_647) {
    throw new Error("ID inválido.");
  }

  return String(id);
}

function safePublicToken(token: string): string {
  const t = token.trim();

  if (!/^[a-f0-9]{64}$/i.test(t)) {
    throw new Error("Token inválido.");
  }

  return t.toLowerCase();
}

// ─── validações locais do payload de assinatura ─────────────────────────────

function validateSignatureDataUrl(signatureDataUrl: string): string {
  const value = signatureDataUrl.trim();

  if (!value) {
    throw new Error("Assinatura não informada.");
  }

  if (!/^data:image\/png;base64,/i.test(value)) {
    throw new Error("Formato de assinatura inválido.");
  }

  // limite defensivo no frontend para evitar payload exagerado
  if (value.length > 2_500_000) {
    throw new Error("Assinatura muito grande.");
  }

  return value;
}

// ─── apiFetch ─────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();

  const csrfHeaders: Record<string, string> = {};
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    csrfHeaders["X-CSRF-Token"] = getCsrfToken();
  }

  const body = init?.json !== undefined ? JSON.stringify(init.json) : init?.body;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      body,
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

    if (res.status === 204) {
      return null as unknown as T;
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

// ─── funções públicas ─────────────────────────────────────────────────────────

export function listProposals(): Promise<ApiProposal[]> {
  return apiFetch<ApiProposal[]>("/api/proposals");
}

export function getProposalById(id: number): Promise<ApiProposal> {
  return apiFetch<ApiProposal>(`/api/proposals/${safeId(id)}`);
}

export function createProposal(input: {
  title: string;
  clientName: string;
  description: string;
  value: number;
}): Promise<ApiProposal> {
  return apiFetch<ApiProposal>("/api/proposals", {
    method: "POST",
    json: input,
  });
}

export function generateShareLink(
  id: number,
  expiresInHours?: number
): Promise<{ shareToken: string; expiresAt: string; publicUrlPath: string }> {
  return apiFetch(`/api/proposals/${safeId(id)}/share-link`, {
    method: "POST",
    json: { expiresInHours },
    headers: {
      "Idempotency-Key": `share-link-${id}-${Date.now()}`,
    },
  });
}

export function getPublicProposal(token: string): Promise<ApiProposal> {
  return apiFetch<ApiProposal>(`/api/proposals/public/${safePublicToken(token)}`);
}

export function signProposal(
  token: string,
  data: SignProposalPayload
): Promise<SignProposalResponse> {
  const signerName = data.signerName.trim();
  const signerDocument = data.signerDocument.trim();
  const signatureDataUrl = validateSignatureDataUrl(data.signatureDataUrl);

  if (signerName.length < 2 || signerName.length > 200) {
    throw new Error("Nome do assinante inválido.");
  }

  if (signerDocument.length < 5 || signerDocument.length > 20) {
    throw new Error("Documento do assinante inválido.");
  }

  return apiFetch<SignProposalResponse>(`/api/proposals/public/${safePublicToken(token)}/sign`, {
    method: "POST",
    json: {
      signerName,
      signerDocument,
      signatureDataUrl,
    },
    headers: {
      "Idempotency-Key": `public-sign-${Date.now()}`,
    },
  });
}

export function markProposalPaid(
  id: number,
  data?: { note?: string; payerName?: string; payerDocument?: string }
): Promise<{ ok: boolean; proposalId: number; amountCents: number; externalPaymentId: string }> {
  return apiFetch(`/api/proposals/${safeId(id)}/mark-paid`, {
    method: "POST",
    json: data ?? {},
    headers: {
      "Idempotency-Key": `mark-paid-${id}-${Date.now()}`,
    },
  });
}

export function cancelProposal(id: number): Promise<{ ok: boolean; proposalId: number }> {
  return apiFetch(`/api/proposals/${safeId(id)}/cancel`, {
    method: "PATCH",
  });
}

// ─── premium dashboard ────────────────────────────────────────────────────────

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

export function getPremiumDashboard(
  period: PremiumDashboardPeriod
): Promise<PremiumDashboardResponse> {
  return apiFetch<PremiumDashboardResponse>(
    `/api/analytics/premium-dashboard?period=${encodeURIComponent(period)}`
  );
}

export interface PremiumDashboardCsvExport {
  blob: Blob;
  fileName: string;
}

export async function exportPremiumDashboardCsv(): Promise<PremiumDashboardCsvExport> {
  const res = await fetch(`${API_BASE}/api/analytics/premium-dashboard/export.csv`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Sessao expirada.");
  }

  if (!res.ok) {
    let message = `Erro ${res.status}`;

    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // fallback
    }

    throw new Error(message);
  }

<<<<<<< HEAD
  const disposition = res.headers.get("content-disposition") ?? "";
  const fileNameMatch = disposition.match(/filename="?([^";]+)"?/i);
  const fileName = fileNameMatch?.[1] || `PowerBI_Vendas_Completo_${new Date().toISOString().slice(0, 10)}.csv`;

  return { blob: await res.blob(), fileName };
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
=======
  return res.blob();
>>>>>>> 48f4339 (poisé eu commitei la no dckend primeiro, entao se voce viu o commit la, voce ja sabe oque, mas saiba que essa idea pode dar muito certo, mais para frente tera novas coisas, com mais segurança, logico. talvez um dia, UM DIAgit add . o codigo vire um clean code.. mas por enquanto é rumo aos 100 primeiros assinantes. enfim, é isso, boa noite.)
}