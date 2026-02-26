type PeriodType = "monthly" | "weekly";
export type ProposalStatus = "pendente" | "vendida" | "cancelada" | string;

export type Proposal = {
  id: string | number;
  title: string;
  clientName: string;
  status: ProposalStatus;
  value: string;
  createdAt: string;
};

export type InsightLevel = "info" | "warning" | "critical";

export type Insight = {
  id: string;
  level: InsightLevel;
  title: string;
  description: string;
  metric?: string;
};

export type NextAction = {
  id: string;
  title: string;
  description: string;
  priority: "P1" | "P2" | "P3";
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function computeHealthScore(params: {
  total: number;
  sold: number;
  pending: number;
  canceled: number;
  totalRevenue: number;
  avgTicket: number;
  pendingAgingAvg: number;
  recentSoldCount: number;
}) {
  const {
    total,
    sold,
    pending,
    canceled,
    totalRevenue,
    avgTicket,
    pendingAgingAvg,
    recentSoldCount,
  } = params;

  if (total === 0) {
    return { score: 0, reasons: ["Sem dados suficientes ainda."] };
  }

  const conversion = sold / total; // 0..1
  const pendingRate = pending / total;
  const canceledRate = canceled / total;

  let score = 100;

  // Conversão
  if (conversion < 0.10) score -= 30;
  else if (conversion < 0.20) score -= 18;
  else if (conversion < 0.30) score -= 10;

  // Pendência alta
  if (pendingRate > 0.60) score -= 20;
  else if (pendingRate > 0.45) score -= 12;

  // Cancelamento
  if (canceledRate > 0.25) score -= 18;
  else if (canceledRate > 0.15) score -= 10;

  // Pendências “velhas”
  if (pendingAgingAvg > 14) score -= 14;
  else if (pendingAgingAvg > 7) score -= 8;

  // Receita / ticket: dá bônus leve, mas sem exagero
  if (totalRevenue > 0) score += 4;
  if (avgTicket > 0) score += 3;

  // “Vendas recentes” (proxy simples)
  if (recentSoldCount === 0) score -= 10;

  score = clamp(score, 0, 100);

  const reasons: string[] = [];
  reasons.push(`Conversão: ${(conversion * 100).toFixed(1)}%`);
  reasons.push(`Pendências: ${(pendingRate * 100).toFixed(1)}%`);
  reasons.push(`Cancelamentos: ${(canceledRate * 100).toFixed(1)}%`);
  reasons.push(`Aging médio pendente: ${pendingAgingAvg.toFixed(0)} dias`);
  reasons.push(`Vendas recentes (30d): ${recentSoldCount}`);

  return { score, reasons };
}

export function generateInsights(params: {
  total: number;
  sold: number;
  pending: number;
  canceled: number;
  conversionRatePct: number;
  totalRevenue: number;
  avgTicket: number;
  pendingValue: number;
  pendingAgingAvg: number;
  biggestPending?: { title: string; clientName: string; value: number; daysOpen: number };
  trend?: { lastPeriodSold: number; prevPeriodSold: number };
}) {
  const {
    total,
    sold,
    pending,
    canceled,
    conversionRatePct,
    totalRevenue,
    avgTicket,
    pendingValue,
    pendingAgingAvg,
    biggestPending,
    trend,
  } = params;

  const out: Insight[] = [];

  if (total === 0) {
    out.push({
      id: "no-data",
      level: "info",
      title: "Sem dados suficientes",
      description: "Crie ou importe propostas para liberar métricas e insights.",
    });
    return out;
  }

  // 1) Conversão baixa
  if (conversionRatePct < 15) {
    out.push({
      id: "low-conversion",
      level: "warning",
      title: "Conversão abaixo do ideal",
      description: `Sua conversão está em ${conversionRatePct.toFixed(1)}%. Priorize follow-up nas pendências de maior valor.`,
      metric: `${conversionRatePct.toFixed(1)}%`,
    });
  } else {
    out.push({
      id: "conversion-ok",
      level: "info",
      title: "Conversão saudável",
      description: `Conversão atual em ${conversionRatePct.toFixed(1)}%. Mantenha consistência e reduza aging nas pendências.`,
      metric: `${conversionRatePct.toFixed(1)}%`,
    });
  }

  // 2) Pendência alta + aging
  const pendingRate = pending / total;
  if (pendingRate > 0.55) {
    out.push({
      id: "pending-high",
      level: pendingAgingAvg > 10 ? "critical" : "warning",
      title: "Volume alto de pendências",
      description: `Pendências representam ${(pendingRate * 100).toFixed(1)}% do funil. Aging médio de ${pendingAgingAvg.toFixed(
        0
      )} dias.`,
      metric: `${pending} pendentes`,
    });
  }

  // 3) Sem receita
  if (totalRevenue === 0 && sold === 0) {
    out.push({
      id: "no-revenue",
      level: "critical",
      title: "Nenhuma receita realizada",
      description: "Você ainda não registrou vendas. Comece atacando as pendências mais valiosas e recentes.",
    });
  }

  // 4) Cancelamento
  const canceledRate = canceled / total;
  if (canceledRate > 0.2) {
    out.push({
      id: "canceled-high",
      level: "warning",
      title: "Cancelamentos acima do normal",
      description: `Taxa de cancelamento em ${(canceledRate * 100).toFixed(1)}%. Revise preço/escopo e tempo de resposta.`,
    });
  }

  // 5) Maior pendência
  if (biggestPending) {
    out.push({
      id: "biggest-pending",
      level: "info",
      title: "Maior oportunidade em aberto",
      description: `“${biggestPending.title}” (${biggestPending.clientName}) está pendente há ${biggestPending.daysOpen} dias.`,
      metric: formatCurrency(biggestPending.value),
    });
  }

  // 6) Tendência (comparação simples de períodos)
  if (trend) {
    const { lastPeriodSold, prevPeriodSold } = trend;
    if (prevPeriodSold > 0) {
      const deltaPct = ((lastPeriodSold - prevPeriodSold) / prevPeriodSold) * 100;
      if (deltaPct <= -25) {
        out.push({
          id: "trend-drop",
          level: "warning",
          title: "Queda de vendas no período",
          description: `Vendas caíram ${Math.abs(deltaPct).toFixed(0)}% vs. período anterior. Aja nas pendências e no SLA.`,
          metric: `${lastPeriodSold} vendidos`,
        });
      } else if (deltaPct >= 25) {
        out.push({
          id: "trend-up",
          level: "info",
          title: "Crescimento de vendas no período",
          description: `Vendas subiram ${deltaPct.toFixed(0)}% vs. período anterior. Replique os canais e cadência.`,
          metric: `${lastPeriodSold} vendidos`,
        });
      }
    }
  }

  // Ordena por severidade
  const weight: Record<InsightLevel, number> = { critical: 3, warning: 2, info: 1 };
  out.sort((a, b) => weight[b.level] - weight[a.level]);

  return out.slice(0, 6);
}

export function generateNextActions(params: {
  pending: Array<Proposal & { numericValue: number; daysOpen: number }>;
  soldCount: number;
  pendingCount: number;
  conversionRatePct: number;
}) {
  const { pending, soldCount, pendingCount, conversionRatePct } = params;

  const actions: NextAction[] = [];

  // P1: pendências antigas e valiosas
  const pendingOldHigh = pending
    .filter((p) => p.daysOpen >= 7)
    .sort((a, b) => b.numericValue - a.numericValue)
    .slice(0, 3);

  if (pendingOldHigh.length > 0) {
    actions.push({
      id: "p1-old-high",
      priority: "P1",
      title: "Atacar pendências antigas de alto valor",
      description: `Você tem ${pendingOldHigh.length} pendências ≥7 dias com alto valor. Priorize follow-up e prazo.`,
    });
  }

  // P1: conversão baixa
  if (conversionRatePct < 15 && pendingCount > 0) {
    actions.push({
      id: "p1-conversion",
      priority: "P1",
      title: "Melhorar conversão do funil",
      description: "Crie um playbook simples de follow-up (D+1, D+3, D+7) e teste ajustes de proposta/preço.",
    });
  }

  // P2: se vendeu pouco, atacar cadência
  if (soldCount === 0 && pendingCount > 0) {
    actions.push({
      id: "p2-first-sale",
      priority: "P2",
      title: "Buscar primeira venda",
      description: "Selecione 5 pendências mais recentes e faça contato hoje com CTA claro (assinatura/pagamento).",
    });
  }

  // P3: higiene
  actions.push({
    id: "p3-hygiene",
    priority: "P3",
    title: "Higienizar funil",
    description: "Revisar propostas canceladas para entender motivos e ajustar template de proposta.",
  });

  // Ordena P1>P2>P3
  const w = { P1: 3, P2: 2, P3: 1 };
  actions.sort((a, b) => w[b.priority] - w[a.priority]);

  return actions.slice(0, 5);
}
