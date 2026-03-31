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
  userId: number;
  id: string;
  title: string;
  amount: number;
  description: string;
  freelancerName: string;
  isSigned: boolean;
  isPaid: boolean;
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
    const { data } = await api.get<PublicProposalResponse>(`/api/proposals/public/${safePublicToken(token)}`);
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
    const { data } = await api.post<{ checkoutUrl: string }>(`/api/payments/public/${safePublicToken(token)}/checkout`, payload);
    return data;
  },
};
