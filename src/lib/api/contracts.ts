import * as contractsService from "../../service/contracts";
import type { AutoGenerateContractResponse } from "../../types/legal-contracts";
import type {
  ContractInsights,
  ContractScore,
  DecisionLog,
  EvidenceProfile,
  RiskProfile,
  RiskWarning,
  ValidationIssue,
} from "./types";

export type {
  ClauseTemplate,
  Contract,
  ContractClause,
  ContractClauseSuggestion,
  ContractLayout,
  ContractLayoutBlockConfig,
  ContractLayoutBlockId,
  ContractStatus,
  ContractType,
  CreateContractPayload,
  CreateContractResponse,
  PaymentForm,
} from "../../service/contracts";

export {
  addClause,
  autoGenerateContract,
  cancelContract,
  createContract,
  deleteClause,
  fetchClauses,
  fetchLegalBlueprint,
  generateContractShareLink,
  generatePdf,
  getContract,
  listClauses,
  listContracts,
  markContractPaid,
  removeLogo,
  renderContract,
  reorderClauses,
  updateClause,
  updateLayout,
  uploadLogo,
} from "../../service/contracts";

type InsightSource = Partial<{
  validationIssues: ValidationIssue[];
  validation_issues: ValidationIssue[];
  issues: ValidationIssue[];
  warnings: RiskWarning[];
  score: ContractScore | number | null;
  contractScore: ContractScore | number | null;
  contract_score: ContractScore | number | null;
  evidenceProfile: EvidenceProfile | null;
  evidence_profile: EvidenceProfile | null;
  riskProfile: RiskProfile | null;
  risk_profile: RiskProfile | null;
  decisionLogs: DecisionLog[];
  decision_logs: DecisionLog[];
}> | null | undefined;

const EMPTY_INSIGHTS: ContractInsights = {
  validationIssues: [],
  warnings: [],
  score: null,
  evidenceProfile: null,
  riskProfile: null,
  decisionLogs: [],
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickArray<T>(record: Record<string, unknown>, keys: string[]): T[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value as T[];
  }

  return [];
}

function pickFirst<T>(record: Record<string, unknown>, keys: string[]): T | null {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) return value as T;
  }

  return null;
}

function normalizeScore(value: unknown): ContractScore | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { overall: Math.max(0, Math.min(100, value)) };
  }

  return asRecord(value) ? (value as ContractScore) : null;
}

function dedupeByMessage<T extends { id?: unknown; message?: string; title?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item.id ?? item.message ?? item.title ?? JSON.stringify(item));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeContractInsights(
  ...sources: Array<InsightSource | AutoGenerateContractResponse>
): ContractInsights {
  const next: ContractInsights = {
    validationIssues: [],
    warnings: [],
    score: null,
    evidenceProfile: null,
    riskProfile: null,
    decisionLogs: [],
  };

  for (const source of sources) {
    const record = asRecord(source);
    if (!record) continue;

    next.validationIssues.push(
      ...pickArray<ValidationIssue>(record, ["validationIssues", "validation_issues", "issues"]),
    );
    next.warnings.push(...pickArray<RiskWarning>(record, ["warnings"]));
    next.decisionLogs.push(...pickArray<DecisionLog>(record, ["decisionLogs", "decision_logs"]));

    next.score ??= normalizeScore(pickFirst<ContractScore | number>(record, ["score", "contractScore", "contract_score"]));
    next.evidenceProfile ??= pickFirst<EvidenceProfile>(record, ["evidenceProfile", "evidence_profile"]);
    next.riskProfile ??= pickFirst<RiskProfile>(record, ["riskProfile", "risk_profile"]);

    if (next.riskProfile?.warnings?.length) {
      next.warnings.push(...next.riskProfile.warnings);
    }
  }

  return {
    ...EMPTY_INSIGHTS,
    ...next,
    validationIssues: dedupeByMessage(next.validationIssues),
    warnings: dedupeByMessage(next.warnings),
    decisionLogs: dedupeByMessage(next.decisionLogs),
  };
}

export const contractsApi = {
  list: contractsService.listContracts,
  get: contractsService.getContract,
  create: contractsService.createContract,
  fetchLegalBlueprint: contractsService.fetchLegalBlueprint,
  fetchClauses: contractsService.fetchClauses,
  listClauses: contractsService.listClauses,
  autoGenerate: contractsService.autoGenerateContract,
  addClause: contractsService.addClause,
  deleteClause: contractsService.deleteClause,
  updateClause: contractsService.updateClause,
  reorderClauses: contractsService.reorderClauses,
  renderPreview: contractsService.renderContract,
  uploadLogo: contractsService.uploadLogo,
  removeLogo: contractsService.removeLogo,
  generatePdf: contractsService.generatePdf,
  generateShareLink: contractsService.generateContractShareLink,
  markPaid: contractsService.markContractPaid,
  cancel: contractsService.cancelContract,
  updateLayout: contractsService.updateLayout,
};

