import { api } from './api';

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
}

export interface PublicCheckoutRequest {
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  payerEmail?: string;
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
    const { data } = await api.get<PublicProposalResponse>(`/api/proposals/public/${token}`);
    return data;
  },
  signContract: async (token: string, payload: SignContractRequest) => {
    const { data } = await api.post(`/api/proposals/public/${token}/sign`, payload);
    return data;
  },
  checkout: async (token: string, payload: PublicCheckoutRequest) => {
    const { data } = await api.post<{ checkoutUrl: string }>(`/api/payments/public/${token}/checkout`, payload);
    return data;
  },
};
