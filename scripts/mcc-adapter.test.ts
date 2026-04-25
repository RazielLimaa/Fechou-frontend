import assert from "node:assert/strict";

import { adaptAutoGenerateResponseToMcc } from "../src/lib/api/mcc";
import type { AutoGenerateContractResponse } from "../src/types/legal-contracts";

const currentBackendResponse: AutoGenerateContractResponse = {
  context: {
    audience: "b2b",
    contractModels: ["saas"],
    riskLevel: "alto",
    personalData: true,
  },
  warnings: [
    {
      code: "lgpd_required",
      title: "LGPD obrigatoria",
      message: "O contrato envolve dados pessoais.",
      severity: "warning",
      recommendation: "Revise finalidade, seguranca e responsabilidades.",
    },
  ],
  clauses: [
    {
      id: "lgpd-basic",
      slug: "lgpd",
      title: "Protecao de dados",
      required: true,
      riskLevel: "alto",
      orderIndex: 3,
    },
  ],
  contractText: "Contrato consolidado pelo backend.",
};

const adapted = adaptAutoGenerateResponseToMcc(currentBackendResponse);

assert.equal(adapted.summary.classification, "B2B | saas");
assert.equal(adapted.summary.warnings, 1);
assert.equal(adapted.summary.blockers, 0);
assert.equal(adapted.draft.clauses.length, 1);
assert.equal(adapted.draft.validationIssues.length, 0);
assert.equal(adapted.draft.graph.edges.length, 0);
assert(adapted.summary.suggestedActions.some((action) => action.includes("dados pessoais")));

const futureMccResponse = {
  draft: {
    context: { audience: "b2c" },
    clauses: [],
    graph: { nodes: { legal: {} }, edges: [] },
    riskProfile: {},
    validationIssues: [
      {
        code: "consumer_clause_review",
        severity: "blocker",
        category: "cdc",
        userMessage: "Revise clausula de consumo.",
        recommendation: "Evite desequilibrio excessivo.",
        blocking: true,
      },
    ],
    score: null,
    evidenceProfile: null,
    decisions: [],
    snapshot: null,
  },
  summary: {
    classification: "Consumo",
    blockers: 1,
    warnings: 0,
    suggestedActions: ["Resolver blocker antes de envio."],
  },
};

assert.equal(adaptAutoGenerateResponseToMcc(futureMccResponse as any), futureMccResponse);

console.log("mcc-adapter.test.ts: OK");

