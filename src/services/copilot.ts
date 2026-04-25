import { apiRequest } from "../lib/queryClient";
import { getSafeHttpErrorMessage } from "../lib/http-error";
import {
  getActiveFechouLocale,
  getFechouLocaleHeaders,
  type FechouLocale,
} from "../i18n/locale";

export type Tone = "curto" | "consultivo" | "direto";

export type CopilotAction = {
  proposalId: number;
  clientName: string;
  proposalTitle: string;
  stage: string;
  value: number;
  event: string;
  intent: string;
  angle: string;
  priorityScore: number;
  whyNow: string;
  riskIfIgnore: string;
  suggestion: Record<Tone, string>;
};

export type CopilotTodayResponse = {
  generatedAt: string;
  primaryAction: CopilotAction | null;
  secondaryActions: CopilotAction[];
  totalAnalyzed: number;
  totalRecommended: number;
  ritual?: {
    objective: string;
    maxMinutes: number;
  };
};

export type CopilotDiagnosisResponse = Record<string, unknown>;
export type CopilotTipsResponse = Record<string, unknown>;
export type CopilotProposalAnalysisResponse = Record<string, unknown>;
export type CopilotProposalApproachesResponse = Record<string, unknown>;

function safeProposalId(proposalId: number): string {
  if (!Number.isInteger(proposalId) || proposalId <= 0) {
    throw new Error("ID de proposta invalido.");
  }

  return String(proposalId);
}

function copilotRequest(
  method: string,
  url: string,
  locale: FechouLocale = getActiveFechouLocale(),
  data?: unknown,
) {
  return apiRequest(method, url, data, {
    headers: getFechouLocaleHeaders(locale),
  });
}

async function parseJsonSafe<T>(res: Response): Promise<T> {
  const text = await res.text();
  const looksHtml = text.trim().toLowerCase().startsWith("<!doctype");
  if (looksHtml) {
    const err: any = new Error("API retornou HTML (rota/proxy errado).");
    err.status = res.status;
    throw err;
  }
  try {
    return (text ? JSON.parse(text) : null) as T;
  } catch {
    const err: any = new Error("Resposta inválida (não é JSON).");
    err.status = res.status;
    throw err;
  }
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;
  let payload: unknown = null;
  try {
    payload = await parseJsonSafe<any>(res);
  } catch {}
  const err: any = new Error(getSafeHttpErrorMessage(res.status, payload));
  err.status = res.status;
  throw err;
}

export const copilotService = {
  async getTodayActions(locale?: FechouLocale): Promise<CopilotTodayResponse> {
    const res = await copilotRequest("GET", "/api/copilot/today", locale);
    await throwIfNotOk(res);
    return parseJsonSafe<CopilotTodayResponse>(res);
  },

  async getDiagnosis(locale?: FechouLocale): Promise<CopilotDiagnosisResponse> {
    const res = await copilotRequest("GET", "/api/copilot/diagnosis", locale);
    await throwIfNotOk(res);
    return parseJsonSafe<CopilotDiagnosisResponse>(res);
  },

  async getTips(locale?: FechouLocale): Promise<CopilotTipsResponse> {
    const res = await copilotRequest("GET", "/api/copilot/tips", locale);
    await throwIfNotOk(res);
    return parseJsonSafe<CopilotTipsResponse>(res);
  },

  async analyzeProposal(
    proposalId: number,
    locale?: FechouLocale,
  ): Promise<CopilotProposalAnalysisResponse> {
    const res = await copilotRequest(
      "GET",
      `/api/copilot/proposals/${safeProposalId(proposalId)}/analyze`,
      locale,
    );
    await throwIfNotOk(res);
    return parseJsonSafe<CopilotProposalAnalysisResponse>(res);
  },

  async getProposalApproaches(
    proposalId: number,
    locale?: FechouLocale,
  ): Promise<CopilotProposalApproachesResponse> {
    const res = await copilotRequest(
      "GET",
      `/api/copilot/proposals/${safeProposalId(proposalId)}/approaches`,
      locale,
    );
    await throwIfNotOk(res);
    return parseJsonSafe<CopilotProposalApproachesResponse>(res);
  },

  async markAsDone(proposalId: number): Promise<{ ok: boolean }> {
    const res = await copilotRequest("POST", `/api/copilot/actions/${safeProposalId(proposalId)}/done`);
    await throwIfNotOk(res);
    return parseJsonSafe<{ ok: boolean }>(res);
  },

  async dismissAction(proposalId: number): Promise<{ ok: boolean }> {
    const res = await copilotRequest("POST", `/api/copilot/actions/${safeProposalId(proposalId)}/dismiss`);
    await throwIfNotOk(res);
    return parseJsonSafe<{ ok: boolean }>(res);
  },
};
