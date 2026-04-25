import type {
  ContractScore,
  DecisionLog,
  EvidenceProfile,
  RiskProfile,
  ValidationIssue,
} from "../lib/api/types";

export type LegalAudience = "b2b" | "b2c";
export type LegalRiskLevel = "baixo" | "medio" | "alto";
export type LegalContractModel = "saas" | "projeto" | "servico_continuado";
export type LegalIpMode = "licenca" | "cessao" | "titularidade_prestador";
export type LegalSupportLevel = "none" | "horario_comercial" | "estendido";
export type LegalWarningSeverity = "info" | "warning" | "critical";
export type LegalClauseMode = "essential" | "balanced" | "complete" | "robust" | "custom";

// Dados retornados pelo backend e exibidos pelo frontend.
export interface OfficialLegalSource {
  id?: string;
  title?: string;
  issuer?: string;
  jurisdiction?: string;
  reference?: string;
  citation?: string;
  type?: string;
  url?: string;
  summary?: string;
  note?: string;
}

// Dados retornados pelo backend para orientar defaults e explicar decisoes do motor juridico.
export interface ContractBlueprintContext {
  audience?: LegalAudience;
  contractModels?: LegalContractModel[];
  riskLevel?: LegalRiskLevel;
  personalData?: boolean;
  sensitiveData?: boolean;
  sourceCodeDelivery?: boolean;
  ipMode?: LegalIpMode;
  supportLevel?: LegalSupportLevel;
  subscription?: boolean;
  milestoneBilling?: boolean;
  includeArbitration?: boolean;
  includeEscrow?: boolean;
  includePortfolioUse?: boolean;
  includeChargebackRule?: boolean;
  includeHandOver?: boolean;
  authenticationMethods?: string[];
  providerDocument?: string;
  providerAddress?: string;
  clientDocument?: string;
  clientAddress?: string;
  forumCityUf?: string;
  forumConnection?: string;
  supportSummary?: string;
  subprocessorSummary?: string;
  securitySummary?: string;
  clauseMode?: LegalClauseMode;
  targetClauseCount?: number;
  replaceExisting?: boolean;
}

export interface LegalClauseDefinition {
  id: string | number;
  title: string;
  category: string;
  profession?: string;
  description?: string;
  content: string;
  slug?: string;
  required?: boolean;
  riskLevel?: LegalRiskLevel | string;
  appliesTo?: string[];
  version?: string;
  status?: string;
}

export interface LegalDecisionRule {
  id?: string;
  title?: string;
  description?: string;
  when?: string;
  then?: string;
  outcome?: string;
  rationale?: string;
  priority?: number;
  conditions?: string[];
}

export interface RiskWarningDefinition {
  id?: string;
  code?: string;
  title?: string;
  severity?: LegalWarningSeverity | string;
  message?: string;
  recommendation?: string;
  context?: string;
}

export interface EvidenceEventDefinition {
  id?: string;
  key?: string;
  name?: string;
  title?: string;
  event?: string;
  description?: string;
  required?: boolean;
}

// Filtros/contexto de entrada enviados pelo frontend ao backend para obter um blueprint juridico curado.
export interface LegalBlueprintQueryParams {
  audience?: LegalAudience;
  riskLevel?: LegalRiskLevel;
  contractModels?: string;
  personalData?: "true" | "false";
  sensitiveData?: "true" | "false";
  sourceCodeDelivery?: "true" | "false";
}

export interface LegalBlueprintResponse {
  sources: OfficialLegalSource[];
  defaultContext: ContractBlueprintContext;
  contractModelText: string;
  catalog: LegalClauseDefinition[];
  decisionRules: LegalDecisionRule[];
  warnings: RiskWarningDefinition[];
  versioningRecommendations: string[];
  migrationRecommendations: string[];
  evidencePack: {
    exportFormats: string[];
    hashAlgorithm: string;
    appendOnlyLog: boolean;
    events: EvidenceEventDefinition[];
  };
}

// Contexto de entrada enviado para /api/contracts/:id/auto-generate.
export interface AutoGenerateContractPayload {
  audience?: LegalAudience;
  contractModels?: LegalContractModel[];
  riskLevel?: LegalRiskLevel;
  personalData?: boolean;
  sensitiveData?: boolean;
  sourceCodeDelivery?: boolean;
  ipMode?: LegalIpMode;
  supportLevel?: LegalSupportLevel;
  subscription?: boolean;
  milestoneBilling?: boolean;
  includeArbitration?: boolean;
  includeEscrow?: boolean;
  includePortfolioUse?: boolean;
  includeChargebackRule?: boolean;
  includeHandOver?: boolean;
  authenticationMethods?: string[];
  providerDocument?: string;
  providerAddress?: string;
  clientDocument?: string;
  clientAddress?: string;
  forumCityUf?: string;
  forumConnection?: string;
  supportSummary?: string;
  subprocessorSummary?: string;
  securitySummary?: string;
  clauseMode?: LegalClauseMode;
  targetClauseCount?: number;
  replaceExisting?: boolean;
}

export interface AutoGenerateContractClause {
  id: string;
  slug: string;
  title: string;
  required: boolean;
  riskLevel: LegalRiskLevel;
  orderIndex: number;
}

export interface ContractTemplateField {
  key: string;
  label: string;
  section: string;
  required: boolean;
  missing: boolean;
  value: string;
  placeholder: string;
  helperText: string;
}

export interface MissingTemplateField {
  key: string;
  label: string;
  helperText: string;
}

// Dados retornados pelo backend apos a auto-geracao juridica.
export interface AutoGenerateContractResponse {
  context: ContractBlueprintContext;
  warnings: RiskWarningDefinition[];
  clauses: AutoGenerateContractClause[];
  clauseSelection?: unknown;
  templateFields?: ContractTemplateField[];
  missingTemplateFields?: MissingTemplateField[];
  contractText: string;
  validationIssues?: ValidationIssue[];
  score?: ContractScore | number | null;
  evidenceProfile?: EvidenceProfile | null;
  riskProfile?: RiskProfile | null;
  decisionLogs?: DecisionLog[];
}

// Fundacao para futuras migracoes do backend. O frontend ainda nao consome endpoints
// dedicados para clause_versions, contract_events ou contract_clause_snapshot.
export interface FutureLegalContractFoundation {
  clause_versions?: null;
  contract_events?: null;
  contract_clause_snapshot?: null;
}
