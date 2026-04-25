import { api } from './api';
import { normalizeSignerDocument, validateSignerName } from '../lib/signature-security';

export interface Proposal {
  id: string;
  title: string;
  amount: number;
  status: 'pending' | 'signed' | 'paid' | 'cancelled';
  createdAt: string;
}

export interface ShareLinkResponse {
  shareLink: string;
}

export interface PaymentLinkResponse {
  paymentUrl: string;
}

export interface PublicProposalResponse {
  proposalId?: number | string;
  contractId?: number | string;
  value: number;
  userId: number;
  id: string;
  title: string;
  amount: number;
  description: string;
  freelancerName: string;
  isSigned: boolean;
  isPaid: boolean;
  clientName?: string;
  signerName?: string;
  contractType?: string;
  executionDate?: string;
  paymentForm?: string;
  status?: string;
  planId?: 'free' | 'pro' | 'premium';
  layoutConfig?: Record<string, any> | null;
  logoUrl?: string | null;
  previewHtml?: string | null;
  previewDocumentUrl?: string | null;
  previewExpiresAt?: string | null;
  clauses?: {
    id: number;
    clauseId: number;
    title: string;
    content: string;
    customContent: string | null;
    category: string;
    orderIndex: number;
  }[];
  clientSignatureUrl?: string | null;
  providerSignatureUrl?: string | null;
}

export interface SignContractRequest {
  signerName: string;
  signerDocument: string;
  signatureDataUrl?: string;
}

export interface PublicCheckoutRequest {
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  payerEmail?: string;
}

function normalizeTrustedAppReturnUrl(url: string): string {
  const parsed = new URL(url, window.location.origin);
  const isSameOrigin = parsed.origin === window.location.origin;
  const isLocalHttp =
    parsed.protocol === "http:" &&
    isSameOrigin &&
    ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  const isHttps = parsed.protocol === "https:";

  if (!isSameOrigin || (!isHttps && !isLocalHttp)) {
    throw new Error("URL de retorno inválida.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("URL de retorno inválida.");
  }

  parsed.hash = "";
  return parsed.toString();
}


function safePublicToken(token: string): string {
  const t = token.trim();
  if (!/^[a-f0-9]{64}$/i.test(t)) throw new Error("Token público inválido.");
  return t.toLowerCase();
}

export const proposalsService = {
  list: async () => {
    const { data } = await api.get<Proposal[]>('/api/proposals');
    return data;
  },
  getById: async (id: string) => {
    const { data } = await api.get<Proposal>(`/api/proposals/${id}`);
    return data;
  },
  generateShareLink: async (id: string) => {
    const { data } = await api.post<ShareLinkResponse>(`/api/proposals/${id}/share-link`);
    return data;
  },
  generatePaymentLink: async (id: string) => {
    const { data } = await api.post<PaymentLinkResponse>(`/api/proposals/${id}/payment-link`);
    return data;
  },
  getPublic: async (token: string) => {
    const { data } = await api.get<PublicProposalResponse>(`/api/proposals/public/${safePublicToken(token)}`, {
      cache: "no-store",
      authMode: "optional",
    });
    return data;
  },
  signContract: async (token: string, payload: SignContractRequest) => {
    const safePayload: SignContractRequest = {
      signerName: validateSignerName(payload.signerName),
      signerDocument: normalizeSignerDocument(payload.signerDocument),
      ...(payload.signatureDataUrl ? { signatureDataUrl: payload.signatureDataUrl } : {}),
    };
    const { data } = await api.post(`/api/proposals/public/${safePublicToken(token)}/sign`, safePayload);
    return data;
  },
  checkout: async (token: string, payload: PublicCheckoutRequest) => {
    const safePayload: PublicCheckoutRequest = {
      successUrl: normalizeTrustedAppReturnUrl(payload.successUrl),
      failureUrl: normalizeTrustedAppReturnUrl(payload.failureUrl),
      pendingUrl: normalizeTrustedAppReturnUrl(payload.pendingUrl),
      ...(payload.payerEmail ? { payerEmail: payload.payerEmail.trim().toLowerCase() } : {}),
    };
    const { data } = await api.post<{ checkoutUrl: string }>(`/api/payments/public/${safePublicToken(token)}/checkout`, safePayload);
    return data;
  },
};
