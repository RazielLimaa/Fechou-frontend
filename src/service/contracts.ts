import { apiFetch, API_URL } from "./api";
import { authStorage } from "../lib/auth-storage";
import { getCsrfToken } from "../lib/csrf";
import { getSafeHttpErrorMessage } from "../lib/http-error";
import { normalizeCpfCnpjForSubmit } from "../lib/cpf-cnpj";
import type { RenderedContractPreview } from "../lib/contract-preview";
import type {
  AutoGenerateContractPayload,
  AutoGenerateContractResponse,
  LegalBlueprintQueryParams,
  LegalBlueprintResponse,
  LegalClauseDefinition,
} from "../types/legal-contracts";
import type {
  ContractScore,
  DecisionLog,
  EvidenceProfile,
  RiskProfile,
  ValidationIssue,
} from "../lib/api/types";

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
  suggestedClauses?: ContractClauseSuggestion[];
  layout?: ContractLayout | null;
  layoutConfig?: ContractLayout | null;
  logoUrl?: string;
  lifecycleStatus?: string | null;
  signedAt?: string | null;
  signed?: boolean;
  shareToken?: string | null;
  validationIssues?: ValidationIssue[];
  score?: ContractScore | number | null;
  evidenceProfile?: EvidenceProfile | null;
  riskProfile?: RiskProfile | null;
  decisionLogs?: DecisionLog[];
}

export interface ContractClauseSuggestion {
  id: string;
  title: string;
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

export type ClauseTemplate = LegalClauseDefinition;

export type ContractLayoutBlockId =
  | "hero"
  | "intro"
  | "summary"
  | "scope"
  | "clauses"
  | "signatures"
  | "footer";

export interface ContractPreviewLayoutConfig {
  includeClauseIds?: string[];
  hiddenClauseIds?: string[];
}

export interface ContractAppearanceLayoutConfig {
  primaryColor?: string;
  secondaryColor?: string;
  paperTint?: string;
  fontFamily?: "inter" | "georgia" | "roboto" | "playfair";
  fontScale?: number;
  contentWidth?: number;
  borderRadius?: number;
  sectionSpacing?: number;
  showSummaryCards?: boolean;
  showContractNumber?: boolean;
  showFechouBranding?: boolean;
  logoUrl?: string | null;
}

export interface ContractLayoutBlockConfig {
  enabled?: boolean;
  title?: string;
  content?: string;
}

export interface ContractLayout {
  preview?: ContractPreviewLayoutConfig;
  appearance?: ContractAppearanceLayoutConfig;
  blocks?: Partial<Record<ContractLayoutBlockId, ContractLayoutBlockConfig>>;
  customVariables?: Record<string, string>;
  contractContext?: Record<string, string>;
}

export interface CreateContractPayload {
  clientName: string;
  clientProfession?: string;
  contractType: ContractType;
  executionDate: string;
  value: string;
  paymentForm: PaymentForm;
  scope: string;
  autoApplySuggestions?: boolean;
}

export interface CreateContractResponse {
  contractId: number;
  suggestedClauses: ContractClauseSuggestion[];
}

const PREFIX = "/api/contracts";
const DIRECT_MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function buildApiUrl(path: string): string {
  const safeBase = API_URL.replace(/\/+$/, "");
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return `${safeBase}${safePath}`;
}

async function buildDirectRequestHeaders(
  method: string,
  extraHeaders: Record<string, string> = {},
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "X-Requested-With": "XMLHttpRequest",
    ...extraHeaders,
  };
  const token = authStorage.getAccessToken()?.trim();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  if (DIRECT_MUTATION_METHODS.has(method)) {
    const csrfToken = await getCsrfToken(API_URL);
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  }

  return headers;
}

export function listContracts(): Promise<Contract[]> {
  return apiFetch<Contract[]>(PREFIX);
}

export function getContract(id: number): Promise<Contract> {
  return apiFetch<Contract>(`${PREFIX}/${id}`);
}

export function createContract(data: CreateContractPayload): Promise<CreateContractResponse> {
  return apiFetch<CreateContractResponse>(PREFIX, {
    method: "POST",
    json: {
      client_name:    data.clientName,
      profession:     data.clientProfession ?? "",
      contract_type:  data.contractType,
      execution_date: data.executionDate,
      contract_value: data.value,
      payment_method: data.paymentForm,
      service_scope:  data.scope,
      ...(typeof data.autoApplySuggestions === "boolean"
        ? { auto_apply_suggestions: data.autoApplySuggestions }
        : {}),
    },
  });
}

export function fetchLegalBlueprint(
  params?: LegalBlueprintQueryParams,
): Promise<LegalBlueprintResponse> {
  const qs = new URLSearchParams();
  if (params?.audience) qs.set("audience", params.audience);
  if (params?.riskLevel) qs.set("riskLevel", params.riskLevel);
  if (params?.contractModels) qs.set("contractModels", params.contractModels);
  if (params?.personalData) qs.set("personalData", params.personalData);
  if (params?.sensitiveData) qs.set("sensitiveData", params.sensitiveData);
  if (params?.sourceCodeDelivery) qs.set("sourceCodeDelivery", params.sourceCodeDelivery);
  const query = qs.toString();
  return apiFetch<LegalBlueprintResponse>(`/api/clauses/catalog/blueprint${query ? `?${query}` : ""}`);
}

export function fetchClauses(params?: {
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

export const listClauses = fetchClauses;

export function autoGenerateContract(
  contractId: number,
  payload: AutoGenerateContractPayload,
): Promise<AutoGenerateContractResponse> {
  return apiFetch<AutoGenerateContractResponse>(`${PREFIX}/${contractId}/auto-generate`, {
    method: "POST",
    json: payload as Record<string, unknown>,
  });
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

export function renderContract(contractId: number): Promise<RenderedContractPreview> {
  return apiFetch<RenderedContractPreview>(`${PREFIX}/render`, {
    method: "POST",
    json: { contractId },
  });
}

export async function uploadLogo(contractId: number, file: File): Promise<{ logoUrl: string }> {
  const formData = new FormData();
  formData.append("logo", file);
  const headers = await buildDirectRequestHeaders("POST");
  const res = await fetch(buildApiUrl(`${PREFIX}/${contractId}/logo`), {
    method: "POST",
    credentials: "include",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(getSafeHttpErrorMessage(res.status, body));
  }
  return res.json();
}

export async function removeLogo(contractId: number): Promise<void> {
  const headers = await buildDirectRequestHeaders("DELETE");
  const res = await fetch(buildApiUrl(`${PREFIX}/${contractId}/logo`), {
    method: "DELETE",
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(getSafeHttpErrorMessage(res.status, body));
  }
}

export async function generatePdf(contractId: number): Promise<void> {
  const headers = await buildDirectRequestHeaders("POST", {
    "Content-Type": "application/json",
    Accept: "application/pdf,application/octet-stream",
  });
  const res = await fetch(buildApiUrl(`${PREFIX}/${contractId}/pdf`), {
    method: "POST",
    credentials: "include",
    headers: {
      ...headers,
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
  const payload = {
    ...data,
    payerDocument: data.payerDocument?.trim()
      ? normalizeCpfCnpjForSubmit(data.payerDocument, "Documento do pagador")
      : undefined,
  };
  return apiFetch(`${PREFIX}/${contractId}/mark-paid`, {
    method: "POST",
    json: payload,
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
  layoutPatch: Record<string, unknown>
): Promise<void> {
  await apiFetch<void>(`/api/contracts/${contractId}/layout`, {
    method: "PATCH",
    json: layoutPatch,
  });
}
