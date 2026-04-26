import type {
  AutoGenerateContractPayload,
  AutoGenerateContractResponse,
  RiskWarningDefinition,
} from "../../types/legal-contracts";

export type MccValidationSeverity = "info" | "warning" | "error" | "blocker";

export type MccRunResult = {
  draft: {
    context: unknown;
    clauses: unknown[];
    graph: {
      nodes: Record<string, unknown>;
      edges: unknown[];
    };
    riskProfile: unknown;
    validationIssues: Array<{
      code: string;
      severity: MccValidationSeverity;
      category: string;
      userMessage: string;
      recommendation: string;
      blocking: boolean;
    }>;
    score: {
      total: number;
      grade: "A" | "B" | "C" | "D" | "E";
      dimensions: {
        legalCoverage: number;
        financialProtection: number;
        clarity: number;
        evidence: number;
        legalBalance: number;
      };
      penalties: unknown[];
    } | null;
    evidenceProfile: {
      recommendedSignature: "simple" | "advanced" | "qualified";
      witnesses: "not_needed" | "recommended" | "required_for_target";
      executiveTitleReadiness: "weak" | "reinforced" | "strong";
      requiredEvents: unknown[];
      notes: string[];
    } | null;
    decisions: Array<{
      stage: string;
      ruleId?: string;
      summary: string;
      rationale: string;
      legalReferences: unknown[];
    }>;
    snapshot: unknown;
  };
  summary: {
    classification: string;
    blockers: number;
    warnings: number;
    suggestedActions: string[];
  };
};

export type MccAutoGenerateResult = {
  raw: AutoGenerateContractResponse;
  mcc: MccRunResult;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasMccShape(value: unknown): value is MccRunResult {
  return isRecord(value) && isRecord(value.draft) && isRecord(value.summary);
}

function getWarningMessage(warning: RiskWarningDefinition): string {
  return warning.message || warning.title || warning.code || "Ponto de atencao retornado pelo backend.";
}

function normalizeSeverity(value: unknown): MccValidationSeverity {
  if (value === "blocker" || value === "error" || value === "warning" || value === "info") {
    return value;
  }

  if (value === "critical") return "error";
  return "info";
}

function deriveClassification(context: unknown): string {
  if (!isRecord(context)) return "Contrato contextual";

  const audience = typeof context.audience === "string" ? context.audience.toUpperCase() : null;
  const models = Array.isArray(context.contractModels)
    ? context.contractModels.filter((item): item is string => typeof item === "string")
    : [];

  return [audience, models.join(" + ")].filter(Boolean).join(" | ") || "Contrato contextual";
}

function adaptValidationIssues(source: Record<string, unknown>): MccRunResult["draft"]["validationIssues"] {
  const rawIssues = Array.isArray(source.validationIssues)
    ? source.validationIssues
    : Array.isArray(source.validation_issues)
    ? source.validation_issues
    : [];

  return rawIssues
    .filter(isRecord)
    .map((issue, index) => {
      const message = issue.userMessage ?? issue.message;
      return {
        code: typeof issue.code === "string" ? issue.code : `issue-${index + 1}`,
        severity: normalizeSeverity(issue.severity),
        category: typeof issue.category === "string" ? issue.category : "validacao",
        userMessage: typeof message === "string" ? message : "Ponto de revisao retornado pelo backend.",
        recommendation: typeof issue.recommendation === "string" ? issue.recommendation : "",
        blocking: Boolean(issue.blocking) || issue.severity === "blocker",
      };
    });
}

function adaptGraph(source: Record<string, unknown>): MccRunResult["draft"]["graph"] {
  const draft = isRecord(source.draft) ? source.draft : source;
  const graph = isRecord(draft.graph) ? draft.graph : null;

  return {
    nodes: isRecord(graph?.nodes) ? graph.nodes : {},
    edges: Array.isArray(graph?.edges) ? graph.edges : [],
  };
}

function adaptScore(source: Record<string, unknown>): MccRunResult["draft"]["score"] {
  const rawScore = isRecord(source.draft) && isRecord(source.draft.score)
    ? source.draft.score
    : isRecord(source.score)
    ? source.score
    : null;

  if (!rawScore) return null;

  const total = typeof rawScore.total === "number"
    ? rawScore.total
    : typeof rawScore.overall === "number"
    ? rawScore.overall
    : 0;

  const dimensions = isRecord(rawScore.dimensions) ? rawScore.dimensions : rawScore;

  return {
    total,
    grade: typeof rawScore.grade === "string" ? rawScore.grade as "A" | "B" | "C" | "D" | "E" : "C",
    dimensions: {
      legalCoverage: typeof dimensions.legalCoverage === "number" ? dimensions.legalCoverage : 0,
      financialProtection: typeof dimensions.financialProtection === "number" ? dimensions.financialProtection : 0,
      clarity: typeof dimensions.clarity === "number" ? dimensions.clarity : 0,
      evidence: typeof dimensions.evidence === "number" ? dimensions.evidence : 0,
      legalBalance: typeof dimensions.legalBalance === "number" ? dimensions.legalBalance : 0,
    },
    penalties: Array.isArray(rawScore.penalties) ? rawScore.penalties : [],
  };
}

function adaptEvidenceProfile(source: Record<string, unknown>): MccRunResult["draft"]["evidenceProfile"] {
  const rawProfile = isRecord(source.draft) && isRecord(source.draft.evidenceProfile)
    ? source.draft.evidenceProfile
    : isRecord(source.evidenceProfile)
    ? source.evidenceProfile
    : null;

  if (!rawProfile) return null;

  return {
    recommendedSignature:
      rawProfile.recommendedSignature === "qualified" || rawProfile.recommendedSignature === "advanced"
        ? rawProfile.recommendedSignature
        : "simple",
    witnesses:
      rawProfile.witnesses === "required_for_target" || rawProfile.witnesses === "recommended"
        ? rawProfile.witnesses
        : "not_needed",
    executiveTitleReadiness:
      rawProfile.executiveTitleReadiness === "strong" || rawProfile.executiveTitleReadiness === "reinforced"
        ? rawProfile.executiveTitleReadiness
        : "weak",
    requiredEvents: Array.isArray(rawProfile.requiredEvents) ? rawProfile.requiredEvents : [],
    notes: Array.isArray(rawProfile.notes)
      ? rawProfile.notes.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function adaptDecisions(source: Record<string, unknown>): MccRunResult["draft"]["decisions"] {
  const draft = isRecord(source.draft) ? source.draft : source;
  const rawDecisions = Array.isArray(draft.decisions) ? draft.decisions : Array.isArray(source.decisionLogs) ? source.decisionLogs : [];

  return rawDecisions.filter(isRecord).map((decision, index) => ({
    stage: typeof decision.stage === "string" ? decision.stage : "mcc",
    ruleId: typeof decision.ruleId === "string" ? decision.ruleId : undefined,
    summary: typeof decision.summary === "string" ? decision.summary : `Decisao ${index + 1}`,
    rationale: typeof decision.rationale === "string" ? decision.rationale : "",
    legalReferences: Array.isArray(decision.legalReferences) ? decision.legalReferences : [],
  }));
}

export function adaptAutoGenerateResponseToMcc(response: AutoGenerateContractResponse): MccRunResult {
  const source = response as unknown;
  if (hasMccShape(source)) return source;

  const record = isRecord(source) ? source : {};
  const validationIssues = adaptValidationIssues(record);
  const blockers = validationIssues.filter((issue) => issue.blocking || issue.severity === "blocker").length;
  const warningMessages = response.warnings.map(getWarningMessage);

  return {
    draft: {
      context: response.context,
      clauses: response.clauses,
      graph: adaptGraph(record),
      riskProfile: {
        warnings: response.warnings,
        level: isRecord(response.context) ? response.context.riskLevel : undefined,
      },
      validationIssues,
      score: adaptScore(record),
      evidenceProfile: adaptEvidenceProfile(record),
      decisions: adaptDecisions(record),
      snapshot: isRecord(record.draft) ? record.draft.snapshot ?? null : record.snapshot ?? null,
    },
    summary: {
      classification: deriveClassification(response.context),
      blockers,
      warnings: response.warnings.length,
      suggestedActions: [
        ...warningMessages.slice(0, 3),
        "Revise manualmente os pontos de atencao antes de assinar ou enviar.",
      ],
    },
  };
}

export async function runMccAutoGenerate(
  contractId: number,
  payload: AutoGenerateContractPayload,
): Promise<MccAutoGenerateResult> {
  const { autoGenerateContract } = await import("../../service/contracts");
  const raw = await autoGenerateContract(contractId, payload);
  return {
    raw,
    mcc: adaptAutoGenerateResponseToMcc(raw),
  };
}
