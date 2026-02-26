import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import Navbar from "../components/landing/Navbar";
import Footer from "../components/landing/Footer";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Download,
  FileBarChart,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowLeft,
  ShieldCheck,
  ListChecks,
  TriangleAlert,
} from "lucide-react";
import { useLocation } from "wouter";
import { usePlan } from "../hooks/use-plan";
import { useQuery } from "@tanstack/react-query";
import { listProposals } from "../service/proposals";
import { toast } from "sonner";

// =====================
// Types
// =====================
type PeriodType = "monthly" | "weekly";
type ProposalStatus = "pendente" | "vendida" | "cancelada" | string;

type Proposal = {
  id: string | number;
  title: string;
  clientName: string;
  status: ProposalStatus;
  value: string; // no seu código, value chega como string
  createdAt: string;
};

type InsightLevel = "info" | "warning" | "critical";

type Insight = {
  id: string;
  level: InsightLevel;
  title: string;
  description: string;
  metric?: string;
};

type NextAction = {
  id: string;
  title: string;
  description: string;
  priority: "P1" | "P2" | "P3";
};

// =====================
// Constants / UI helpers
// =====================
const COLORS = ["#FF6600", "#FF9933", "#FFCC66", "#CCCCCC"] as const;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);

const toNumber = (rawValue: string) => {
  if (!rawValue) return 0;
  // "1.234,56" -> 1234.56
  return Number(rawValue.replace(/\./g, "").replace(",", ".")) || 0;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const daysBetween = (isoDate: string, now = new Date()) => {
  const d = new Date(isoDate);
  const ms = now.getTime() - d.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
};

const getISOWeek = (date: Date) => {
  const workingDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = workingDate.getUTCDay() || 7;
  workingDate.setUTCDate(workingDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(workingDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((workingDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const csvEscape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

const levelStyles: Record<InsightLevel, { badge: string; ring: string; icon: React.ComponentType<any> }> = {
  info: { badge: "bg-white/5 text-muted-foreground", ring: "border-white/10", icon: AlertCircle },
  warning: { badge: "bg-amber-500/10 text-amber-300", ring: "border-amber-500/20", icon: TriangleAlert },
  critical: { badge: "bg-rose-500/10 text-rose-300", ring: "border-rose-500/20", icon: TriangleAlert },
};

// =====================
// Premium analytics logic
// =====================
function computeHealthScore(params: {
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

function generateInsights(params: {
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

function generateNextActions(params: {
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

// =====================
// Component
// =====================
export default function PremiumDashboard() {
  const [, navigate] = useLocation();
  const { plan, loading: planLoading } = usePlan();
  const [viewMode, setViewMode] = useState<PeriodType>("monthly");

  const { data, isLoading: proposalsLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: listProposals,
  });

  const proposals = (data ?? []) as Proposal[];

  const stats = useMemo(() => {
    if (!proposals.length) {
      return {
        soldCount: 0,
        pendingCount: 0,
        canceledCount: 0,
        totalValue: 0,
        pendingValue: 0,
        avgTicket: 0,
        conversionRatePct: 0,
        chartData: [] as Array<{ name: string; sold: number; pending: number; revenue: number }>,
        pendingReasons: [
          { name: "Aguardando Assinatura", value: 0 },
          { name: "Aguardando Pagamento", value: 0 },
          { name: "Em Revisão", value: 0 },
        ],
        pendingRanked: [] as Array<Proposal & { numericValue: number; daysOpen: number }>,
        trend: { lastPeriodSold: 0, prevPeriodSold: 0 },
        revenueSpark: [] as Array<{ name: string; revenue: number }>,
      };
    }

    const now = new Date();

    const sold = proposals.filter((p) => p.status === "vendida");
    const pending = proposals.filter((p) => p.status === "pendente");
    const canceled = proposals.filter((p) => p.status === "cancelada");

    const soldRevenue = sold.reduce((acc, p) => acc + toNumber(p.value), 0);
    const pendingValue = pending.reduce((acc, p) => acc + toNumber(p.value), 0);

    const total = proposals.length;
    const conversionRatePct = total > 0 ? (sold.length / total) * 100 : 0;
    const avgTicket = sold.length > 0 ? soldRevenue / sold.length : 0;

    // Grouping by period for bar chart
    const grouped = new Map<string, { sold: number; pending: number; revenue: number }>();

    proposals.forEach((p) => {
      const createdAt = new Date(p.createdAt);
      const key =
        viewMode === "monthly"
          ? `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`
          : `${createdAt.getFullYear()}-W${String(getISOWeek(createdAt)).padStart(2, "0")}`;

      const existing = grouped.get(key) || { sold: 0, pending: 0, revenue: 0 };

      if (p.status === "vendida") {
        existing.sold += 1;
        existing.revenue += toNumber(p.value);
      }
      if (p.status === "pendente") {
        existing.pending += 1;
      }

      grouped.set(key, existing);
    });

    const chartData = Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, values]) => ({
        name,
        sold: values.sold,
        pending: values.pending,
        revenue: Number(values.revenue.toFixed(2)),
      }));

    // “Sparkline” de receita (usa os últimos 10 pontos do chartData)
    const revenueSpark = chartData.slice(-10).map((d) => ({ name: d.name, revenue: d.revenue }));

    // Pendências ranqueadas
    const pendingRanked = pending
      .map((p) => ({
        ...p,
        numericValue: toNumber(p.value),
        daysOpen: daysBetween(p.createdAt, now),
      }))
      .sort((a, b) => b.numericValue - a.numericValue);

    // Pending reasons (fake, mas estável e “premium”)
    const pendingReasons = [
      { name: "Aguardando Assinatura", value: Math.max(0, Math.round(pending.length * 0.45)) },
      { name: "Aguardando Pagamento", value: Math.max(0, Math.round(pending.length * 0.35)) },
      { name: "Em Revisão", value: Math.max(0, Math.round(pending.length * 0.2)) },
    ].filter((x) => x.value > 0);

    // Trend simples: compara último período vs anterior
    const last = chartData.at(-1);
    const prev = chartData.at(-2);
    const trend = {
      lastPeriodSold: last?.sold ?? 0,
      prevPeriodSold: prev?.sold ?? 0,
    };

    return {
      soldCount: sold.length,
      pendingCount: pending.length,
      canceledCount: canceled.length,
      totalValue: soldRevenue,
      pendingValue,
      avgTicket,
      conversionRatePct,
      chartData,
      pendingReasons,
      pendingRanked,
      trend,
      revenueSpark,
    };
  }, [proposals, viewMode]);

  const premium = useMemo(() => {
    const total = proposals.length;
    const pendingAgingAvg =
      stats.pendingRanked.length > 0
        ? stats.pendingRanked.reduce((acc, p) => acc + p.daysOpen, 0) / stats.pendingRanked.length
        : 0;

    // proxy “vendas recentes”: vendidos nos últimos 30 dias
    const recentSoldCount = proposals.filter((p) => p.status === "vendida" && daysBetween(p.createdAt) <= 30).length;

    const biggestPending = stats.pendingRanked[0]
      ? {
          title: stats.pendingRanked[0].title,
          clientName: stats.pendingRanked[0].clientName,
          value: stats.pendingRanked[0].numericValue,
          daysOpen: stats.pendingRanked[0].daysOpen,
        }
      : undefined;

    const health = computeHealthScore({
      total,
      sold: stats.soldCount,
      pending: stats.pendingCount,
      canceled: stats.canceledCount,
      totalRevenue: stats.totalValue,
      avgTicket: stats.avgTicket,
      pendingAgingAvg,
      recentSoldCount,
    });

    const insights = generateInsights({
      total,
      sold: stats.soldCount,
      pending: stats.pendingCount,
      canceled: stats.canceledCount,
      conversionRatePct: stats.conversionRatePct,
      totalRevenue: stats.totalValue,
      avgTicket: stats.avgTicket,
      pendingValue: stats.pendingValue,
      pendingAgingAvg,
      biggestPending,
      trend: stats.trend,
    });

    const actions = generateNextActions({
      pending: stats.pendingRanked,
      soldCount: stats.soldCount,
      pendingCount: stats.pendingCount,
      conversionRatePct: stats.conversionRatePct,
    });

    return { pendingAgingAvg, recentSoldCount, biggestPending, health, insights, actions };
  }, [proposals, stats]);

  const exportToExcel = () => {
    if (!proposals.length) {
      toast.error("Nenhuma proposta para exportar.");
      return;
    }

    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];

    const pendingReasons = ["Aguardando Assinatura", "Aguardando Pagamento", "Em Revisão"];

    const monthlyMap = new Map<string, { sold: number; pending: number; revenue: number; total: number }>();
    const weeklyMap = new Map<string, { sold: number; pending: number; revenue: number; total: number }>();

    proposals.forEach((proposal) => {
      const createdAt = new Date(proposal.createdAt);
      const monthlyKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
      const weeklyKey = `${createdAt.getFullYear()}-W${String(getISOWeek(createdAt)).padStart(2, "0")}`;
      const value = toNumber(proposal.value);

      const updateMap = (
        map: Map<string, { sold: number; pending: number; revenue: number; total: number }>,
        key: string
      ) => {
        const current = map.get(key) || { sold: 0, pending: 0, revenue: 0, total: 0 };
        current.total += 1;

        if (proposal.status === "vendida") {
          current.sold += 1;
          current.revenue += value;
        }
        if (proposal.status === "pendente") {
          current.pending += 1;
        }

        map.set(key, current);
      };

      updateMap(monthlyMap, monthlyKey);
      updateMap(weeklyMap, weeklyKey);
    });

    const overallAvgTicket = stats.soldCount ? stats.totalValue / stats.soldCount : 0;

    const headers = [
      "proposal_id",
      "titulo_proposta",
      "cliente",
      "status",
      "valor_brl",
      "data_criacao_iso",
      "ano",
      "trimestre",
      "mes_numero",
      "mes_nome",
      "semana_iso",
      "periodo_mensal",
      "periodo_semanal",
      "is_vendida",
      "is_pendente",
      "is_cancelada",
      "receita_realizada_brl",
      "motivo_pendencia",
      "dias_aberta",
      "mensal_total_contratos",
      "mensal_contratos_vendidos",
      "mensal_contratos_pendentes",
      "mensal_receita_total_brl",
      "mensal_taxa_conversao_percentual",
      "mensal_ticket_medio_brl",
      "semanal_total_contratos",
      "semanal_contratos_vendidos",
      "semanal_contratos_pendentes",
      "semanal_receita_total_brl",
      "semanal_taxa_conversao_percentual",
      "semanal_ticket_medio_brl",
      "kpi_total_contratos_vendidos_geral",
      "kpi_receita_total_geral_brl",
      "kpi_contratos_pendentes_geral",
      "kpi_ticket_medio_geral_brl",
      "health_score_0_100",
      "pendencias_aging_medio_dias",
    ];

    const rows = proposals.map((proposal) => {
      const createdAt = new Date(proposal.createdAt);
      const value = toNumber(proposal.value);
      const year = createdAt.getFullYear();
      const month = createdAt.getMonth() + 1;
      const isoWeek = getISOWeek(createdAt);
      const monthlyKey = `${year}-${String(month).padStart(2, "0")}`;
      const weeklyKey = `${year}-W${String(isoWeek).padStart(2, "0")}`;
      const monthAgg = monthlyMap.get(monthlyKey) || { sold: 0, pending: 0, revenue: 0, total: 0 };
      const weekAgg = weeklyMap.get(weeklyKey) || { sold: 0, pending: 0, revenue: 0, total: 0 };
      const status = proposal.status as ProposalStatus;
      const isSold = status === "vendida";
      const isPending = status === "pendente";
      const isCanceled = status === "cancelada";
      const stableReasonIndex = String(proposal.id).length % pendingReasons.length;
      const pendingReason = isPending ? pendingReasons[stableReasonIndex] : "N/A";

      const monthlyConversion = monthAgg.total ? (monthAgg.sold / monthAgg.total) * 100 : 0;
      const weeklyConversion = weekAgg.total ? (weekAgg.sold / weekAgg.total) * 100 : 0;
      const monthlyAvg = monthAgg.sold ? monthAgg.revenue / monthAgg.sold : 0;
      const weeklyAvg = weekAgg.sold ? weekAgg.revenue / weekAgg.sold : 0;

      return [
        csvEscape(proposal.id),
        csvEscape(proposal.title),
        csvEscape(proposal.clientName),
        csvEscape(status),
        csvEscape(value.toFixed(2)),
        csvEscape(createdAt.toISOString()),
        csvEscape(year),
        csvEscape(`T${Math.ceil(month / 3)}`),
        csvEscape(month),
        csvEscape(monthNames[createdAt.getMonth()]),
        csvEscape(isoWeek),
        csvEscape(monthlyKey),
        csvEscape(weeklyKey),
        csvEscape(isSold ? 1 : 0),
        csvEscape(isPending ? 1 : 0),
        csvEscape(isCanceled ? 1 : 0),
        csvEscape(isSold ? value.toFixed(2) : "0.00"),
        csvEscape(pendingReason),
        csvEscape(daysBetween(proposal.createdAt)),
        csvEscape(monthAgg.total),
        csvEscape(monthAgg.sold),
        csvEscape(monthAgg.pending),
        csvEscape(monthAgg.revenue.toFixed(2)),
        csvEscape(monthlyConversion.toFixed(2)),
        csvEscape(monthlyAvg.toFixed(2)),
        csvEscape(weekAgg.total),
        csvEscape(weekAgg.sold),
        csvEscape(weekAgg.pending),
        csvEscape(weekAgg.revenue.toFixed(2)),
        csvEscape(weeklyConversion.toFixed(2)),
        csvEscape(weeklyAvg.toFixed(2)),
        csvEscape(stats.soldCount),
        csvEscape(stats.totalValue.toFixed(2)),
        csvEscape(stats.pendingCount),
        csvEscape(overallAvgTicket.toFixed(2)),
        csvEscape(premium.health.score),
        csvEscape(premium.pendingAgingAvg.toFixed(0)),
      ];
    });

    const BOM = "\uFEFF";
    const csvContent = BOM + headers.join(";") + "\n" + rows.map((row) => row.join(";")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PowerBI_Vendas_Completo_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Exportação gerada com sucesso!");
  };

  // =====================
  // Guards
  // =====================
  if (planLoading || proposalsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent"></div>
      </div>
    );
  }

  if (plan?.planId !== "premium") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-accent mb-6" />
        <h1 className="text-3xl font-display mb-4">Acesso Restrito</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Este dashboard avançado está disponível exclusivamente para assinantes do plano Premium.
        </p>
        <button onClick={() => navigate("/system")} className="px-8 py-3 bg-accent text-white rounded-full font-medium">
          Ver Planos
        </button>
      </div>
    );
  }

  // =====================
  // UI
  // =====================
  return (
    <div className="bg-background min-h-screen text-foreground selection:bg-accent selection:text-white overflow-x-hidden">
      <div className="noise-overlay" />
      <Navbar />

      <main className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <button
                onClick={() => navigate("/propostas")}
                className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para Propostas
              </button>
              <h1 className="font-display text-2xl sm:text-4xl md:text-6xl tracking-tight">
                Dashboard <span className="text-accent italic">Premium</span>
              </h1>
              <p className="text-muted-foreground mt-2">
                Insights acionáveis + export robusto para Power BI (mensal e semanal).
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="bg-white/5 rounded-full p-1 border border-white/10 flex">
                <button
                  onClick={() => setViewMode("monthly")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    viewMode === "monthly"
                      ? "bg-accent text-white shadow-lg"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setViewMode("weekly")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    viewMode === "weekly"
                      ? "bg-accent text-white shadow-lg"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Semanal
                </button>
              </div>

              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white/5 hover:bg-accent/10 border border-white/10 rounded-full text-xs sm:text-sm font-medium transition-all"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Exportar planilha única Power BI</span>
                <span className="sm:hidden">Exportar Power BI</span>
              </button>
            </div>
          </div>

          {/* Premium Strip: Health + Insights + Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Health Score */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-display">Health Score</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Um indicador único (0–100) baseado no seu funil e cadência.
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 sm:gap-0">
                <div>
                  <div className="text-4xl sm:text-5xl font-display leading-none">{premium.health.score}</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {premium.health.score >= 80
                      ? "Excelente"
                      : premium.health.score >= 60
                      ? "Bom"
                      : premium.health.score >= 40
                      ? "Atenção"
                      : "Crítico"}
                  </div>
                </div>

                <div className="w-full sm:w-40">
                  <div className="h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${premium.health.score}%` }}
                    />
                  </div>
                  <div className="mt-3 text-[11px] text-muted-foreground space-y-1">
                    {premium.health.reasons.slice(0, 3).map((r) => (
                      <div key={r} className="truncate">
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Pendências (aging)</div>
                  <div className="text-lg font-display mt-1">{premium.pendingAgingAvg.toFixed(0)} dias</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Vendidas (30d)</div>
                  <div className="text-lg font-display mt-1">{premium.recentSoldCount}</div>
                </div>
              </div>
            </motion.div>

            {/* Insights */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl lg:col-span-1"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-display">Insights</h3>
                  <p className="text-xs text-muted-foreground mt-1">Regras inteligentes com prioridade.</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 text-accent">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {premium.insights.map((ins) => {
                  const Icon = levelStyles[ins.level].icon;
                  return (
                    <div
                      key={ins.id}
                      className={`p-4 rounded-2xl border ${levelStyles[ins.level].ring} bg-white/5`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl ${levelStyles[ins.level].badge}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium truncate">{ins.title}</div>
                            {ins.metric && (
                              <div className="text-[11px] text-muted-foreground shrink-0">{ins.metric}</div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {ins.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Next Actions */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-display">Next Actions</h3>
                  <p className="text-xs text-muted-foreground mt-1">Próxima melhor ação, por prioridade.</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 text-blue-400">
                  <ListChecks className="w-6 h-6" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {premium.actions.map((a) => (
                  <div key={a.id} className="p-4 rounded-2xl border border-white/10 bg-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">{a.title}</div>
                      <div
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                          a.priority === "P1"
                            ? "text-rose-300 border-rose-500/20 bg-rose-500/10"
                            : a.priority === "P2"
                            ? "text-amber-300 border-amber-500/20 bg-amber-500/10"
                            : "text-muted-foreground border-white/10 bg-white/5"
                        }`}
                      >
                        {a.priority}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.description}</div>
                  </div>
                ))}
              </div>

              {premium.biggestPending && (
                <div className="mt-6 p-4 rounded-2xl border border-white/10 bg-white/[0.03]">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Maior pendência</div>
                  <div className="mt-2 text-sm font-medium truncate">{premium.biggestPending.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">{premium.biggestPending.clientName}</div>
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className="text-muted-foreground">{premium.biggestPending.daysOpen} dias</span>
                    <span className="text-white font-semibold">{formatCurrency(premium.biggestPending.value)}</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-12">
            {[
              { label: "Contratos Vendidos", value: stats.soldCount, icon: TrendingUp, color: "text-green-500" },
              { label: "Pendentes", value: stats.pendingCount, icon: Clock, color: "text-amber-500" },
              { label: "Receita Total", value: formatCurrency(stats.totalValue), icon: FileBarChart, color: "text-accent" },
              {
                label: "Ticket Médio",
                value: formatCurrency(stats.avgTicket),
                icon: AlertCircle,
                color: "text-blue-500",
              },
            ].map((metric, i) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl"
              >
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 ${metric.color}`}>
                    <metric.icon className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <p className="text-muted-foreground text-[10px] sm:text-sm font-medium uppercase tracking-wider">{metric.label}</p>
                <h3 className="text-xl sm:text-3xl font-display mt-1 break-all">{metric.value}</h3>

                {/* micro contexto premium */}
                {metric.label === "Pendentes" && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Valor pendente: <span className="text-white font-medium">{formatCurrency(stats.pendingValue)}</span>
                  </p>
                )}
                {metric.label === "Contratos Vendidos" && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Conversão: <span className="text-white font-medium">{stats.conversionRatePct.toFixed(1)}%</span>
                  </p>
                )}
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:col-span-2 p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl h-[320px] sm:h-[420px]"
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6 mb-4 sm:mb-8">
                <div>
                  <h3 className="text-xl font-display">
                    Vendas por período ({viewMode === "monthly" ? "Mensal" : "Semanal"})
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vendidos vs pendentes, com receita agregada por período.
                  </p>
                </div>

                <div className="hidden md:block w-56">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
                    Receita (últimos períodos)
                  </div>
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.revenueSpark}>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "#121212",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "12px",
                          }}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="#FF6600" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="w-full h-full pb-8 sm:pb-12">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#121212",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                      }}
                    />
                    <Bar dataKey="sold" name="Vendidos" fill="#FF6600" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" name="Pendentes" fill="rgba(255,102,0,0.2)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08 }}
              className="p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl h-[320px] sm:h-[420px]"
            >
              <h3 className="text-xl font-display mb-4">Motivos de pendência</h3>
              <p className="text-xs text-muted-foreground mb-6">
                Distribuição estimada para priorização (assinatura/pagamento/revisão).
              </p>

              <div className="w-full h-full pb-8 sm:pb-12">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.pendingReasons}
                      cx="50%"
                      cy="45%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.pendingReasons.map((entry, index) => (
                        <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#121212",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex flex-wrap justify-center gap-4 mt-[-20px]">
                  {stats.pendingReasons.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-xs text-muted-foreground">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Premium: Top pending list */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-display">Pendências prioritárias</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Top 8 pendências por valor, com aging (dias em aberto).
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 text-amber-300">
                  <Clock className="w-6 h-6" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {stats.pendingRanked.slice(0, 8).map((p) => (
                  <div
                    key={String(p.id)}
                    className="p-3 sm:p-4 rounded-2xl border border-white/10 bg-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.clientName}</div>
                      <div className="text-[11px] text-muted-foreground mt-2">
                        Aging: <span className="text-white font-medium">{p.daysOpen} dias</span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-sm font-semibold text-white">{formatCurrency(p.numericValue)}</div>
                      <div
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border mt-2 inline-block ${
                          p.daysOpen >= 14
                            ? "text-rose-300 border-rose-500/20 bg-rose-500/10"
                            : p.daysOpen >= 7
                            ? "text-amber-300 border-amber-500/20 bg-amber-500/10"
                            : "text-muted-foreground border-white/10 bg-white/5"
                        }`}
                      >
                        {p.daysOpen >= 14 ? "CRÍTICO" : p.daysOpen >= 7 ? "ATENÇÃO" : "NOVO"}
                      </div>
                    </div>
                  </div>
                ))}

                {stats.pendingRanked.length === 0 && (
                  <div className="p-6 rounded-2xl border border-white/10 bg-white/5 text-center text-muted-foreground">
                    Sem pendências no momento. Ótimo sinal.
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-display">Resumo executivo</h3>
                  <p className="text-xs text-muted-foreground mt-1">O que importa para decisão rápida.</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 text-rose-300">
                  <TriangleAlert className="w-6 h-6" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/5">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Conversão</div>
                  <div className="text-xl sm:text-2xl font-display mt-1">{stats.conversionRatePct.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {stats.conversionRatePct < 15
                      ? "Priorize follow-up e clareza de proposta."
                      : "Manter cadência e reduzir aging."}
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/5">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Valor pendente</div>
                  <div className="text-xl sm:text-2xl font-display mt-1 break-all">{formatCurrency(stats.pendingValue)}</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Ataque as pendências com maior valor e mais tempo em aberto.
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/5">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Ticket médio</div>
                  <div className="text-xl sm:text-2xl font-display mt-1 break-all">{formatCurrency(stats.avgTicket)}</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Ajuste pacotes/escopo para aumentar valor percebido.
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/5">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Risco</div>
                  <div className="text-xl sm:text-2xl font-display mt-1">
                    {premium.insights.some((i) => i.level === "critical") ? "Alto" : premium.insights.some((i) => i.level === "warning") ? "Médio" : "Baixo"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Baseado em conversão, aging e tendência do período.
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
