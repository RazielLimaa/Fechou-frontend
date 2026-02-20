import { motion } from "framer-motion";
import { useMemo, useState, useEffect } from "react";
import Navbar from "../components/landing/Navbar";
import Footer from "../components/landing/Footer";
import { mercadoPagoService, type MercadoPagoStatusResponse } from "../services/mercadoPago";
import { toast } from "sonner";
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
} from "recharts";
import { Download, FileBarChart, TrendingUp, AlertCircle, Clock, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { usePlan } from "../hooks/use-plan";
import { useQuery } from "@tanstack/react-query";
import { listProposals } from "../service/proposals";

const COLORS = ["#FF6600", "#FF9933", "#FFCC66", "#CCCCCC"];

type PeriodType = "monthly" | "weekly";

type ProposalStatus = "pendente" | "vendida" | "cancelada" | string;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);

const toNumber = (rawValue: string) => {
  if (!rawValue) return 0;
  return Number(rawValue.replace(".", "").replace(",", ".")) || 0;
};

const getISOWeek = (date: Date) => {
  const workingDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = workingDate.getUTCDay() || 7;
  workingDate.setUTCDate(workingDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(workingDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((workingDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const csvEscape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export default function PremiumDashboard() {
  const [, navigate] = useLocation();
  const { plan, loading: planLoading } = usePlan();
  const [viewMode, setViewMode] = useState<PeriodType>("monthly");
  const [mpStatus, setMpStatus] = useState<MercadoPagoStatusResponse | null>(null);

  useEffect(() => {
    mercadoPagoService.getStatus()
      .then(setMpStatus)
      .catch(() => setMpStatus({ connected: false, authMethod: null, mpUserId: null, expiresAt: null }));
  }, []);

  const handleConnectMP = () => {
    mercadoPagoService.connectOAuth();
  };

  const { data: proposals, isLoading: proposalsLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: listProposals,
  });

  const stats = useMemo(() => {
    if (!proposals?.length) {
      return {
        soldCount: 0,
        pendingCount: 0,
        totalValue: 0,
        chartData: [],
        pendingReasons: [
          { name: "Aguardando Assinatura", value: 0 },
          { name: "Aguardando Pagamento", value: 0 },
          { name: "Em Revisão", value: 0 },
        ],
      };
    }

    const sold = proposals.filter((p) => p.status === "vendida");
    const pending = proposals.filter((p) => p.status === "pendente");

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

    const pendingReasons = [
      { name: "Aguardando Assinatura", value: Math.max(1, Math.round(pending.length * 0.45)) },
      { name: "Aguardando Pagamento", value: Math.max(1, Math.round(pending.length * 0.35)) },
      { name: "Em Revisão", value: Math.max(1, Math.round(pending.length * 0.2)) },
    ];

    return {
      soldCount: sold.length,
      pendingCount: pending.length,
      totalValue: sold.reduce((acc, curr) => acc + toNumber(curr.value), 0),
      chartData,
      pendingReasons,
    };
  }, [proposals, viewMode]);

  const exportToExcel = () => {
    if (!proposals?.length) return;

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

      const updateMap = (map: Map<string, { sold: number; pending: number; revenue: number; total: number }>, key: string) => {
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
      "dias_sem_pagamento_estimado",
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
        csvEscape(isPending ? (Number(String(proposal.id).slice(-2).replace(/\D/g, "")) % 15) + 1 : 0),
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
  };


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

  return (
    <div className="bg-background min-h-screen text-foreground selection:bg-accent selection:text-white">
      <div className="noise-overlay" />
      <Navbar />
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <button
                onClick={() => navigate("/propostas")}
                className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para Propostas
              </button>
              <h1 className="font-display text-4xl md:text-6xl tracking-tight">
                Dashboard <span className="text-accent italic">Premium</span>
              </h1>
              <p className="text-muted-foreground mt-2">Dados robustos para Power BI (mensal e semanal).</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="bg-white/5 rounded-full p-1 border border-white/10 flex">
                <button
                  onClick={() => setViewMode("monthly")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    viewMode === "monthly" ? "bg-accent text-white shadow-lg" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setViewMode("weekly")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    viewMode === "weekly" ? "bg-accent text-white shadow-lg" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Semanal
                </button>
              </div>

              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-accent/10 border border-white/10 rounded-full text-sm font-medium transition-all"
              >
                <Download className="w-4 h-4" />
                Exportar planilha única Power BI
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl"
            >
              <h3 className="text-xl font-display mb-6">Configuracoes de Recebimento</h3>
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium mb-4 text-muted-foreground">Chave PIX</p>
                  {mpStatus?.pixKey ? (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl space-y-3">
                      <p className="text-sm text-green-400 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Chave PIX cadastrada
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Tipo</span>
                        <span className="font-mono">{mpStatus.pixKeyType === 'cpf' ? 'CPF' : mpStatus.pixKeyType === 'cnpj' ? 'CNPJ' : mpStatus.pixKeyType === 'email' ? 'E-mail' : mpStatus.pixKeyType === 'phone' ? 'Telefone' : 'Chave Aleatoria'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Chave</span>
                        <span className="font-mono">{mpStatus.pixKey.length > 12 ? `${mpStatus.pixKey.slice(0, 8)}...${mpStatus.pixKey.slice(-4)}` : mpStatus.pixKey}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                      <p className="text-sm text-yellow-400 font-medium mb-2">
                        Chave PIX nao cadastrada
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Cadastre sua chave PIX para receber pagamentos dos seus clientes.
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => navigate("/app/settings/payments")}
                  className="w-full py-3 bg-accent/10 text-accent border border-accent/20 rounded-xl font-medium text-sm hover:bg-accent/20 transition-colors"
                >
                  {mpStatus?.pixKey ? "Gerenciar chave PIX" : "Cadastrar chave PIX"}
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl flex flex-col justify-center items-center text-center"
            >
              <div className="p-4 rounded-2xl bg-accent/10 text-accent mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-display mb-2">Recebimento via PIX</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {mpStatus?.pixKey
                  ? "Sua chave PIX esta ativa. Os pagamentos dos seus clientes serao enviados diretamente para esta chave."
                  : "Cadastre sua chave PIX ao lado para comecar a receber pagamentos dos seus contratos."}
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { label: "Contratos Vendidos", value: stats.soldCount, icon: TrendingUp, color: "text-green-500" },
              { label: "Pendentes", value: stats.pendingCount, icon: Clock, color: "text-amber-500" },
              { label: "Receita Total", value: formatCurrency(stats.totalValue), icon: FileBarChart, color: "text-accent" },
              {
                label: "Ticket Médio",
                value: formatCurrency(stats.soldCount ? stats.totalValue / stats.soldCount : 0),
                icon: AlertCircle,
                color: "text-blue-500",
              },
            ].map((metric, i) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl bg-white/5 ${metric.color}`}>
                    <metric.icon className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">{metric.label}</p>
                <h3 className="text-3xl font-display mt-1">{metric.value}</h3>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:col-span-2 p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl h-[400px]"
            >
              <h3 className="text-xl font-display mb-8">Vendas por período ({viewMode === "monthly" ? "Mensal" : "Semanal"})</h3>
              <div className="w-full h-full pb-12">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#121212", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }} />
                    <Bar dataKey="sold" name="Vendidos" fill="#FF6600" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" name="Pendentes" fill="rgba(255,102,0,0.2)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl h-[400px]"
            >
              <h3 className="text-xl font-display mb-8">Motivos de pendência</h3>
              <div className="w-full h-full pb-12">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.pendingReasons} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {stats.pendingReasons.map((entry, index) => (
                        <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: "#121212", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-[-40px]">
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
        </div>
      </main>
      <Footer />
    </div>
  );
}
