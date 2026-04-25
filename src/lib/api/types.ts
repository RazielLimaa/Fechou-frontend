export type ApiResourceId = string | number;

export type ValidationSeverity =
  | "info"
  | "warning"
  | "error"
  | "critical"
  | "blocking"
  | string;

export type ContractLifecycleStatus =
  | "draft"
  | "review"
  | "pending_signature"
  | "signed"
  | "finalized"
  | "cancelled"
  | "rascunho"
  | "finalizado"
  | "assinado"
  | "cancelado"
  | string;

export type PaymentStatus =
  | "unpaid"
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled"
  | string;

export type ElectronicSignatureLevel =
  | "simple"
  | "advanced"
  | "qualified"
  | "simples"
  | "avancada"
  | "qualificada"
  | string;

export interface ValidationIssue {
  id?: ApiResourceId;
  code?: string;
  severity?: ValidationSeverity;
  category?: string;
  field?: string;
  message: string;
  impact?: string;
  recommendation?: string;
  blocking?: boolean;
  source?: string;
  createdAt?: string;
}

export interface ContractScore {
  overall?: number;
  value?: number;
  total?: number;
  label?: string;
  coverageLegal?: number;
  legalCoverage?: number;
  financialProtection?: number;
  clarity?: number;
  evidenceStrength?: number;
  legalBalance?: number;
  reasons?: string[];
  updatedAt?: string;
}

export interface RiskWarning {
  id?: ApiResourceId;
  severity?: ValidationSeverity;
  message: string;
  recommendation?: string;
  context?: string;
}

export interface RiskProfile {
  level?: "baixo" | "medio" | "alto" | "low" | "medium" | "high" | string;
  score?: number;
  summary?: string;
  warnings?: RiskWarning[];
  blocked?: boolean;
  updatedAt?: string;
}

export interface EvidenceEvent {
  id?: ApiResourceId;
  key?: string;
  type?: string;
  title?: string;
  name?: string;
  description?: string;
  actor?: string;
  timestamp?: string;
  createdAt?: string;
  verified?: boolean;
  required?: boolean;
}

export interface EvidenceProfile {
  signatureLevel?: ElectronicSignatureLevel;
  evidenceStrength?: number | string;
  witnessesRecommended?: boolean;
  witnessesRequired?: boolean;
  hashAlgorithm?: string;
  appendOnlyLog?: boolean;
  events?: EvidenceEvent[];
  requirements?: string[];
  gaps?: string[];
  updatedAt?: string;
}

export interface DecisionLog {
  id?: ApiResourceId;
  ruleId?: string;
  title?: string;
  decision?: string;
  outcome?: string;
  rationale?: string;
  priority?: number;
  createdAt?: string;
}

export interface ContractInsights {
  validationIssues: ValidationIssue[];
  warnings: RiskWarning[];
  score: ContractScore | null;
  evidenceProfile: EvidenceProfile | null;
  riskProfile: RiskProfile | null;
  decisionLogs: DecisionLog[];
}

export interface ApiListResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

