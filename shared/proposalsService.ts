// src/shared/proposalsService.ts
import { api } from "../src/services/api"

export interface Proposal {
  id: string;
  title: string;
  amount: number;
  status: "pending" | "signed" | "paid" | "cancelled";
  createdAt: string;
}

export type ProposalStatus = Proposal["status"];

export interface ProposalInput {
  title: string;
  amount: number;
  status?: ProposalStatus; // opcional: backend pode setar default "pending"
}

export interface ProposalUpdateInput {
  title?: string;
  amount?: number;
  status?: ProposalStatus;
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
  // ====== Private/Admin (logado) ======
  list: async () => {
    const { data } = await api.get<Proposal[]>("/api/proposals");
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<Proposal>(`/api/proposals/${encodeURIComponent(id)}`);
    return data;
  },

  create: async (payload: ProposalInput) => {
    // garante number
    const body = { ...payload, amount: Number(payload.amount) };
    const { data } = await api.post<Proposal>("/api/proposals", body);
    return data;
  },

  update: async (id: string, payload: ProposalUpdateInput) => {
    const body: ProposalUpdateInput = { ...payload };
    if (body.amount !== undefined) body.amount = Number(body.amount);

    const { data } = await api.put<Proposal>(
      `/api/proposals/${encodeURIComponent(id)}`,
      body
    );
    return data;
  },

  remove: async (id: string) => {
    await api.delete(`/api/proposals/${encodeURIComponent(id)}`);
  },

  generateShareLink: async (id: string) => {
    const { data } = await api.post<ShareLinkResponse>(
      `/api/proposals/${encodeURIComponent(id)}/share-link`
    );
    return data;
  },

  generatePaymentLink: async (id: string) => {
    const { data } = await api.post<PaymentLinkResponse>(
      `/api/proposals/${encodeURIComponent(id)}/payment-link`
    );
    return data;
  },

  // ====== Public endpoints (token) ======
  getPublic: async (token: string) => {
    const { data } = await api.get<PublicProposalResponse>(
      `/api/proposals/public/${encodeURIComponent(token)}`
    );
    return data;
  },

  signContract: async (token: string, payload: SignContractRequest) => {
    const { data } = await api.post(
      `/api/proposals/public/${encodeURIComponent(token)}/sign`,
      payload
    );
    return data;
  },

  checkout: async (token: string, payload: PublicCheckoutRequest) => {
    const { data } = await api.post<{ checkoutUrl: string }>(
      `/api/payments/public/${encodeURIComponent(token)}/checkout`,
      payload
    );
    return data;
  },
};