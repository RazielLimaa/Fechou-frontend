import { apiRequest } from "../lib/queryClient";

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
  let msg = `HTTP ${res.status}`;
  try {
    const data = await parseJsonSafe<any>(res);
    msg = data?.message || data?.error || msg;
  } catch {}
  const err: any = new Error(msg);
  err.status = res.status;
  throw err;
}

export const copilotService = {
  async getTodayActions(): Promise<CopilotTodayResponse> {
    const res = await apiRequest("GET", "/api/copilot/today");
    await throwIfNotOk(res);
    return parseJsonSafe<CopilotTodayResponse>(res);
  },

  async markAsDone(proposalId: number): Promise<{ ok: boolean }> {
    const res = await apiRequest("POST", `/api/copilot/actions/${proposalId}/done`);
    await throwIfNotOk(res);
    return parseJsonSafe<{ ok: boolean }>(res);
  },

  async dismissAction(proposalId: number): Promise<{ ok: boolean }> {
    const res = await apiRequest("POST", `/api/copilot/actions/${proposalId}/dismiss`);
    await throwIfNotOk(res);
    return parseJsonSafe<{ ok: boolean }>(res);
  },
};
