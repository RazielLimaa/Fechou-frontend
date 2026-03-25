import { apiFetch, API_URL } from "./api";
import {
  normalizeSignerDocument,
  validateSignatureDataUrl,
  validateSignerName,
} from "../lib/signature-security";

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
  expiresInHours?: number,
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

export function signProposal(token: string, data: SignProposalPayload): Promise<SignProposalResponse> {
  const signerName = validateSignerName(data.signerName);
  const signerDocument = normalizeSignerDocument(data.signerDocument);
  const signatureDataUrl = validateSignatureDataUrl(data.signatureDataUrl);

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
  data?: { note?: string; payerName?: string; payerDocument?: string },
  stepUpToken?: string,
): Promise<{ ok: boolean; proposalId: number; amountCents: number; externalPaymentId: string }> {
  return apiFetch(`/api/proposals/${safeId(id)}/mark-paid`, {
    method: "POST",
    json: data ?? {},
    stepUpToken,
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
  return apiFetch<PremiumDashboardResponse>(
    `/api/analytics/premium-dashboard?period=${encodeURIComponent(period)}`,
  );
}

export interface PremiumDashboardCsvExport {
  blob: Blob;
  fileName: string;
}

export async function exportPremiumDashboardCsv(): Promise<PremiumDashboardCsvExport> {
  const res = await fetch(`${API_URL.replace(/\/+$/, "")}/api/analytics/premium-dashboard/export.csv`, {
    method: "GET",
    credentials: "include",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // noop
    }
    throw new Error(message);
  }

  const disposition = res.headers.get("content-disposition") ?? "";
  const fileNameMatch = disposition.match(/filename="?([^";]+)"?/i);
  const fileName = fileNameMatch?.[1] || `PowerBI_Vendas_Completo_${new Date().toISOString().slice(0, 10)}.csv`;

  return { blob: await res.blob(), fileName };
}
