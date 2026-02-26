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
import { exportPremiumDashboardCsv, getPremiumDashboard } from "../service/proposals";

const COLORS = ["#FF6600", "#FF9933", "#FFCC66", "#CCCCCC"];

// =====================
// Types
// =====================
type PeriodType = "monthly" | "weekly";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);

export default function PremiumDashboard() {
  const [, navigate] = useLocation();
  const { plan, loading: planLoading } = usePlan();
  const [viewMode, setViewMode] = useState<PeriodType>("monthly");

  useEffect(() => {
    mercadoPagoService.getStatus()
      .then(setMpStatus)
      .catch(() => setMpStatus({ connected: false, authMethod: null, mpUserId: null, expiresAt: null }));
  }, []);

  const handleConnectMP = () => {
    mercadoPagoService.connectOAuth();
  };

  const {
    data: dashboard,
    isLoading: dashboardLoading,
    isError: dashboardError,
    error,
  } = useQuery({
    queryKey: ["premium-dashboard", viewMode],
    queryFn: () => getPremiumDashboard(viewMode),
  });

  useEffect(() => {
    if (dashboardError) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar o dashboard premium.");
    }
  }, [dashboardError, error]);

  const stats = useMemo(() => {
    if (!dashboard) {
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

    return {
      soldCount: dashboard.soldCount,
      pendingCount: dashboard.pendingCount,
      totalValue: dashboard.totalValue,
      chartData: dashboard.chartData,
      pendingReasons: dashboard.pendingReasons,
    };
  }, [dashboard]);

  const exportToExcel = async () => {
    try {
      const { blob, fileName } = await exportPremiumDashboardCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Exportação gerada com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível exportar o CSV.");
    }
  };

    toast.success("Exportação gerada com sucesso!");
  };

  if (planLoading || dashboardLoading) {
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
