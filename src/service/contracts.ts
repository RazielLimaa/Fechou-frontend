import { apiFetch } from "./api";
import { authStorage } from "../lib/auth-storage";

export type ContractStatus = "rascunho" | "finalizado" | "assinado" | "cancelado";
export type PaymentForm = "pix" | "transferencia" | "boleto" | "cartao" | "outro";
export type ContractType =
  | "prestacao_servicos"
  | "desenvolvimento"
  | "design"
  | "marketing"
  | "consultoria"
  | "outro";

export interface Contract {
  id: number;
  userId: number;
  clientName: string;
  clientProfession?: string;
  contractType: ContractType;
  executionDate: string;
  value: string;
  paymentForm: PaymentForm;
  scope: string;
  status: ContractStatus;
  createdAt: string;
  updatedAt?: string;
  clauses?: ContractClause[];
  layoutConfig?: LayoutConfig;
  logoUrl?: string;
  lifecycleStatus?: string | null;
  signedAt?: string | null;
  signed?: boolean;
  shareToken?: string | null;
}

export interface ContractClause {
  id: number;
  contractId?: number;
  clauseId?: string | number;
  title: string;
  content: string;
  customContent?: string | null;
  category: string;
  orderIndex?: number;
  order?: number;
}

export interface ClauseTemplate {
  id: string | number;
  title: string;
  category: string;
  profession?: string;
  description?: string;
  content: string;
}

export interface LayoutBlock {
  id: string;
  type: "logo" | "header" | "info" | "scope" | "clauses" | "divider" | "signatures";
  x: number;
  y: number;
  width: number;
  height: number;
  props?: Record<string, unknown>;
}

export interface LayoutConfig {
  blocks: LayoutBlock[];
  logoPosition?: "top-left" | "top-center" | "top-right";
  logoSize?: number;
  headerAlignment?: "left" | "center" | "right";
  fontFamily?: "inter" | "georgia" | "roboto" | "playfair";
}

export interface CreateContractPayload {
  clientName: string;
  clientProfession?: string;
  contractType: ContractType;
  executionDate: string;
  value: string;
  paymentForm: PaymentForm;
  scope: string;
}

const PREFIX = "/api/contracts";

export function listContracts(): Promise<Contract[]> {
  return apiFetch<Contract[]>(PREFIX);
}

export function getContract(id: number): Promise<Contract> {
  return apiFetch<Contract>(`${PREFIX}/${id}`);
}

export function createContract(data: CreateContractPayload): Promise<{ contractId: number }> {
  return apiFetch<{ contractId: number }>(PREFIX, {
    method: "POST",
    json: {
      client_name:    data.clientName,
      profession:     data.clientProfession ?? "",
      contract_type:  data.contractType,
      execution_date: data.executionDate,
      contract_value: data.value,
      payment_method: data.paymentForm,
      service_scope:  data.scope,
    },
  });
}

export function listClauses(params?: {
  search?: string;
  category?: string;
  profession?: string;
}): Promise<ClauseTemplate[]> {
  const qs = new URLSearchParams();
  if (params?.search)    qs.set("search",    params.search);
  if (params?.category)  qs.set("category",  params.category);
  if (params?.profession) qs.set("profession", params.profession);
  const q = qs.toString();
  return apiFetch<ClauseTemplate[]>(`/api/clauses${q ? `?${q}` : ""}`);
}

export function addClause(
  contractId: number,
  clauseId: string | number
): Promise<ContractClause> {
  if (!clauseId) return Promise.reject(new Error("ID da cláusula inválido."));
  return apiFetch<ContractClause>(`${PREFIX}/${contractId}/clauses`, {
    method: "POST",
    json: { clause_id: clauseId },
  });
}

export function deleteClause(
  contractId: number,
  clauseId: string | number
): Promise<void> {
  return apiFetch<void>(`${PREFIX}/${contractId}/clauses/${clauseId}`, {
    method: "DELETE",
  });
}

export function updateClause(
  contractId: number,
  clauseId: string | number,
  customContent: string
): Promise<ContractClause> {
  return apiFetch<ContractClause>(`${PREFIX}/${contractId}/clauses/${clauseId}`, {
    method: "PATCH",
    json: { custom_content: customContent },
  });
}

export function reorderClauses(
  contractId: number,
  startIndex: number,
  endIndex: number
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`${PREFIX}/${contractId}/clauses/reorder`, {
    method: "PATCH",
    json: { startIndex, endIndex },
  });
}

export function renderContract(contractId: number): Promise<{ html: string }> {
  return apiFetch<{ html: string }>(`${PREFIX}/render`, {
    method: "POST",
    json: { contractId },
  });
}



export async function uploadLogo(contractId: number, file: File): Promise<{ logoUrl: string }> {
  const formData = new FormData();
  formData.append("logo", file);
  const token = authStorage.getAccessToken() ?? "";
  const res = await fetch(`${PREFIX}/${contractId}/logo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || "Erro ao fazer upload da logo");
  }
  return res.json();
}

export async function removeLogo(contractId: number): Promise<void> {
  const token = authStorage.getAccessToken() ?? "";
  const res = await fetch(`${PREFIX}/${contractId}/logo`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || "Erro ao remover logo");
  }
}

export async function generatePdf(contractId: number): Promise<void> {
  const token = authStorage.getAccessToken() ?? "";
  const res = await fetch(`${PREFIX}/${contractId}/pdf`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Erro ao gerar PDF");
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `contrato-${contractId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Share link ───────────────────────────────────────────────────────────────

export function generateContractShareLink(
  contractId: number,
  expiresInHours = 72
): Promise<{ shareToken: string; expiresAt: string; publicUrlPath: string }> {
  return apiFetch(`${PREFIX}/${contractId}/share-link`, {
    method: "POST",
    json: { expiresInHours },
  });
}

// ─── Mark paid ────────────────────────────────────────────────────────────────

export function markContractPaid(
  contractId: number,
  data: { note?: string; payerName?: string; payerDocument?: string },
  stepUpToken?: string,
): Promise<{ ok: boolean; contractId: number }> {
  return apiFetch(`${PREFIX}/${contractId}/mark-paid`, {
    method: "POST",
    json: data,
    stepUpToken,
  });
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export function cancelContract(
  contractId: number
): Promise<{ ok: boolean; contractId: number }> {
  return apiFetch(`${PREFIX}/${contractId}/cancel`, {
    method: "PATCH",
  });
}

// ─── Labels / configs ─────────────────────────────────────────────────────────

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  prestacao_servicos: "Prestação de Serviços",
  desenvolvimento:    "Desenvolvimento",
  design:             "Design",
  marketing:          "Marketing",
  consultoria:        "Consultoria",
  outro:              "Outro",
};

export const PAYMENT_FORM_LABELS: Record<PaymentForm, string> = {
  pix:         "PIX",
  transferencia:"Transferência Bancária",
  boleto:      "Boleto",
  cartao:      "Cartão de Crédito",
  outro:       "Outro",
};

export const STATUS_CONFIG: Record<ContractStatus, { label: string; color: string }> = {
  rascunho:   { label: "Rascunho",   color: "text-zinc-400 border-zinc-500/30"  },
  finalizado: { label: "Finalizado", color: "text-blue-400 border-blue-500/30"  },
  assinado:   { label: "Assinado",   color: "text-green-400 border-green-500/30"},
  cancelado:  { label: "Cancelado",  color: "text-red-400 border-red-500/30"    },
};

// ─── update / layoutsave ─────────────────────────────────────────────────────────
export async function updateLayout(
  contractId: number,
  layoutConfig: Record<string, unknown>
): Promise<void> {
  const token = authStorage.getAccessToken() ?? "";
 
  const res = await fetch(`/api/contracts/${contractId}/layout`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ layout_config: layoutConfig }),
  });
 
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? "Erro ao salvar layout.");
  }
}
