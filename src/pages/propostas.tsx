// src/pages/Propostas.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

import { listProposals, generateShareLink, type ApiProposal, type ApiProposalStatus } from "../service/proposals";
import { getMyPlan, type PlanId, confirmSubscriptionCheckout } from "../service/payment";
import { mercadoPagoService } from "../services/mercadoPago";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

type UiStatus = "pending" | "cancelled" | "completed";

interface Proposal {
  id: number;
  clientName: string;
  title: string;
  value: number;
  status: UiStatus;
  createdAt: Date;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);

const tabs = [
  { id: "all", label: "Todas" },
  { id: "pending", label: "Pendentes" },
  { id: "completed", label: "Finalizadas" },
  { id: "cancelled", label: "Canceladas" },
] as const;

const statusConfig = {
  pending: { label: "Pendente", color: "text-yellow-400 border-yellow-500/30", chartColor: "#fbbf24" },
  completed: { label: "Finalizada", color: "text-green-400 border-green-500/30", chartColor: "#4ade80" },
  cancelled: { label: "Cancelada", color: "text-red-400 border-red-500/30", chartColor: "#f87171" },
} as const;

const salesTips = [
  {
    title: "Follow-up Estratégico",
    text: "Envie um lembrete gentil 48h após enviar a proposta. Às vezes o cliente só precisa de um empurrãozinho.",
  },
  {
    title: "Escassez Real",
    text: "Mencione sua disponibilidade limitada para o próximo mês para incentivar o fechamento rápido.",
  },
  {
    title: "Benefícios vs Recursos",
    text: "Foque no que o cliente ganha (ex: mais vendas) e não apenas no que você faz (ex: site novo).",
  },
  {
    title: "Depoimentos",
    text: "Inclua uma pequena seção de 'o que dizem meus clientes' em suas comunicações.",
  },
  {
    title: "Call to Action",
    text: "Sempre termine sua mensagem com um próximo passo claro, como uma reunião de 15 min.",
  },
];

function apiStatusToUi(status: ApiProposalStatus): UiStatus {
  if (status === "pendente") return "pending";
  if (status === "vendida") return "completed";
  return "cancelled";
}

function toUiProposal(p: ApiProposal): Proposal {
  return {
    id: p.id,
    clientName: p.clientName,
    title: p.title,
    value: Number(p.value),
    status: apiStatusToUi(p.status),
    createdAt: new Date(p.createdAt),
  };
}

// ---------- Plano / Hierarquia ----------
const PLAN_ORDER: Record<PlanId, number> = { free: 0, pro: 1, premium: 2 };

function hasPlan(current: PlanId, required: PlanId) {
  return PLAN_ORDER[current] >= PLAN_ORDER[required];
}

function planLabel(p: PlanId) {
  if (p === "premium") return "Premium";
  if (p === "pro") return "Pro";
  return "Free";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function Propostas() {
  const [location, navigate] = useLocation();

  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("all");
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [currentTip, setCurrentTip] = useState(0);

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Plano do usuário
  const [planId, setPlanId] = useState<PlanId>("free");
  const [planLoading, setPlanLoading] = useState(true);

  // PIX key status
  const [hasPixKey, setHasPixKey] = useState(false);
  const [pixKeyLoading, setPixKeyLoading] = useState(true);

  const reload = useCallback(async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    setIsLoading(true);
    setPlanLoading(true);
    setPixKeyLoading(true);
    setError(null);

    try {
      const [data, me] = await Promise.all([listProposals(), getMyPlan()]);
      setProposals(data.map(toUiProposal));
      setPlanId(me.plan.planId);
    } catch (e: any) {
      setError(e?.message ?? "Falha ao carregar propostas.");
    } finally {
      setIsLoading(false);
      setPlanLoading(false);
    }

    // Check PIX key status separately (don't block main load if it fails)
    try {
      const pixData = await mercadoPagoService.getPixKey();
      setHasPixKey(!!pixData.pixKey && pixData.pixKey.trim().length > 0);
    } catch {
      setHasPixKey(false);
    } finally {
      setPixKeyLoading(false);
    }
  }, [navigate]);

  /**
   * ✅ Pós-checkout Stripe (ROBUSTO):
   * - espera /propostas?subscription=success&session_id=...
   * - confirma no backend
   * - atualiza o estado do plano imediatamente (pelo retorno do confirm)
   * - limpa a URL
   * - faz reload com retry pra garantir que /me já reflita a mudança
   */
  useEffect(() => {
    const url = new URL(window.location.href);
    const ok = url.searchParams.get("subscription") === "success";
    const sessionId = url.searchParams.get("session_id");

    if (!ok || !sessionId) return;

    (async () => {
      try {
        const confirmed = await confirmSubscriptionCheckout(sessionId);

        // ✅ atualiza UI na hora
        setPlanId(confirmed.planId);

        toast.success(`Plano ativado! Você agora é ${planLabel(confirmed.planId)}.`);

        // ✅ Limpa a URL para não reconfirmar ao atualizar
        url.searchParams.delete("subscription");
        url.searchParams.delete("session_id");
        window.history.replaceState({}, "", url.pathname + url.search);

        // ✅ retry reload (backend pode demorar uns ms pra refletir)
        for (let i = 0; i < 5; i++) {
          await reload();
          await sleep(800);
        }
      } catch (e: any) {
        toast.error(
          e?.message ||
            "Seu pagamento foi recebido, mas o plano ainda não atualizou. Tente atualizar em alguns segundos."
        );
      }
    })();
  }, [reload]);

  // Carrega normal ao montar
  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (location === "/propostas") reload();
  }, [location, reload]);

  useEffect(() => {
    const handler = () => reload();
    window.addEventListener("proposals:changed", handler as EventListener);
    return () => window.removeEventListener("proposals:changed", handler as EventListener);
  }, [reload]);

  const filteredProposals = useMemo(() => {
    if (activeTab === "all") return proposals;
    return proposals.filter((p) => p.status === activeTab);
  }, [activeTab, proposals]);

  const stats = useMemo(() => {
    const pending = proposals.filter((p) => p.status === "pending").length;
    const completed = proposals.filter((p) => p.status === "completed").length;
    const cancelled = proposals.filter((p) => p.status === "cancelled").length;
    const totalRevenue = proposals.filter((p) => p.status === "completed").reduce((a, p) => a + p.value, 0);
    return { pending, completed, cancelled, totalRevenue };
  }, [proposals]);

  const conversionPct = useMemo(() => {
    const denom = stats.completed + stats.cancelled;
    return denom === 0 ? 0 : Math.round((stats.completed / denom) * 100);
  }, [stats.completed, stats.cancelled]);

  const chartData = useMemo(
    () => [
      { name: "Pendentes", value: stats.pending, color: statusConfig.pending.chartColor },
      { name: "Vendidos", value: stats.completed, color: statusConfig.completed.chartColor },
      { name: "Não Vendidos", value: stats.cancelled, color: statusConfig.cancelled.chartColor },
    ],
    [stats]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="noise-overlay" />

      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 bg-background/20 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight group">
            FECHOU<span className="text-accent group-hover:italic transition-all">!</span>
          </Link>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-[0.3em] text-foreground">Propostas</span>

              <span
                className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] border ${
                  planId === "premium"
                    ? "border-yellow-500/30 text-yellow-300 bg-yellow-500/10"
                    : planId === "pro"
                      ? "border-accent/40 text-accent bg-accent/10"
                      : "border-white/10 text-muted-foreground bg-white/5"
                }`}
                title="Seu plano atual"
              >
                {planLoading ? "..." : planLabel(planId)}
              </span>
            </div>

            <Link
              href="/templates"
              className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent transition-colors relative group"
            >
              Templates
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-accent group-hover:w-full transition-all duration-300" />
            </Link>

            <Link
              href="/app/settings/payments"
              className={`text-[10px] uppercase tracking-[0.3em] transition-colors relative group ${
                !hasPixKey && !pixKeyLoading
                  ? "text-red-400 hover:text-red-300"
                  : "text-muted-foreground hover:text-accent"
              }`}
              title={!hasPixKey ? "Cadastre sua chave PIX para receber pagamentos" : "Configuracoes de pagamento"}
            >
              {!hasPixKey && !pixKeyLoading && (
                <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
              Pagamentos
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-accent group-hover:w-full transition-all duration-300" />
            </Link>

            <button
              type="button"
              onClick={reload}
              className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent transition-colors"
              title="Atualizar lista"
            >
              Atualizar
            </button>
          </div>

          {hasPlan(planId, "pro") ? (
            <Link href="/propostas/nova">
              <motion.button whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(255,102,0,0.3)" }} whileTap={{ scale: 0.95 }}>
                <span className="px-6 py-3 rounded-full bg-accent text-white text-[10px] uppercase tracking-[0.2em] font-medium block">
                  Nova Proposta
                </span>
              </motion.button>
            </Link>
          ) : (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate("/system")} title="Disponível a partir do Pro">
              <span className="px-6 py-3 rounded-full border border-accent/30 bg-accent/10 text-accent text-[10px] uppercase tracking-[0.2em] font-medium block">
                Upgrade Pro
              </span>
            </motion.button>
          )}
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <div className="mb-16">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Propostas</p>
              <h1 className="font-display text-6xl md:text-8xl font-bold tracking-[-0.04em] text-reveal leading-[0.9]">
                Histórico<span className="text-accent">.</span>
              </h1>
            </div>

            <div className="mb-10 rounded-3xl border border-white/5 bg-white/[0.02] p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Seu plano</p>
                  <p className="font-display text-2xl">
                    {planLoading ? "Carregando..." : planLabel(planId)}
                    <span className="text-accent">.</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] border ${
                      planId === "free" ? "border-white/20 text-foreground" : "border-white/10 text-muted-foreground"
                    }`}
                  >
                    Free
                  </span>

                  <span
                    className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] border ${
                      hasPlan(planId, "pro") ? "border-accent/40 text-accent" : "border-white/10 text-muted-foreground"
                    }`}
                  >
                    Pro
                  </span>

                  <span
                    className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] border ${
                      hasPlan(planId, "premium") ? "border-yellow-500/30 text-yellow-300" : "border-white/10 text-muted-foreground"
                    }`}
                  >
                    Premium
                  </span>
                </div>
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                {planLoading
                  ? "Verificando seu plano..."
                  : planId === "free"
                    ? "Você está no Free. Faça upgrade para liberar recursos avançados."
                    : planId === "pro"
                      ? "Você está no Pro. O Premium libera pagamentos + recursos completos."
                      : "Você está no Premium. Acesso total liberado."}
              </div>

              {!planLoading && planId !== "premium" && (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => navigate("/system")}
                    className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-colors"
                  >
                    Ver planos
                  </button>

                  {planId === "free" && (
                    <button
                      onClick={() => navigate("/checkout/plano/pro")}
                      className="px-5 py-2 rounded-full bg-accent text-white text-[10px] uppercase tracking-[0.2em] hover:opacity-90 transition-opacity"
                    >
                      Assinar Pro
                    </button>
                  )}

                  {planId === "pro" && (
                    <button
                      onClick={() => navigate("/checkout/plano/premium")}
                      className="px-5 py-2 rounded-full bg-yellow-500/80 text-black text-[10px] uppercase tracking-[0.2em] hover:opacity-90 transition-opacity"
                    >
                      Upgrade Premium
                    </button>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="mb-10 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="py-20 text-center text-muted-foreground">Carregando propostas...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                  <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
                      <p className="text-[9px] uppercase tracking-[0.3em] text-yellow-400 mb-3">Pendentes</p>
                      <p className="font-display text-4xl font-bold">{stats.pending}</p>
                    </div>

                    <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
                      <p className="text-[9px] uppercase tracking-[0.3em] text-green-400 mb-3">Vendidos</p>
                      <p className="font-display text-4xl font-bold">{stats.completed}</p>
                    </div>

                    <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
                      <p className="text-[9px] uppercase tracking-[0.3em] text-red-400 mb-3">Não Vendidos</p>
                      <p className="font-display text-4xl font-bold">{stats.cancelled}</p>
                    </div>

                    <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
                      <p className="text-[9px] uppercase tracking-[0.3em] text-accent mb-3">Receita Total</p>
                      <p
                        className="font-display text-3xl font-bold leading-none mt-1 text-accent cursor-pointer hover:underline"
                        onClick={() => {
                          if (planId === "premium") {
                            navigate("/dashboard/premium");
                          } else {
                            alert("Assine o plano Premium para acessar o dashboard avançado.");
                          }
                        }}
                      >
                        {formatCurrency(stats.totalRevenue)}
                      </p>
                    </div>

                    <div className="col-span-2 md:col-span-4 p-8 rounded-3xl border border-white/5 bg-white/[0.02] flex flex-col md:flex-row items-center gap-8">
                      <div className="w-full md:w-1/2 h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>

                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: "#121212",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "12px",
                              }}
                              itemStyle={{ color: "#fff", fontSize: "12px" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="w-full md:w-1/2">
                        <h3 className="font-display text-2xl font-bold mb-4">Análise de Conversão</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          Seu desempenho atual mostra que {conversionPct}% das suas propostas são convertidas em vendas.
                        </p>
                      </div>
                    </div>
                  </div>

                  {hasPlan(planId, "pro") ? (
                    <div className="p-8 rounded-3xl border border-accent/20 bg-accent/5 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold mb-6">Dicas de Venda</p>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={currentTip}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4 }}
                          >
                            <h4 className="font-display text-2xl font-bold mb-3">{salesTips[currentTip].title}</h4>
                            <p className="text-muted-foreground text-sm leading-relaxed">{salesTips[currentTip].text}</p>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      <button
                        onClick={() => setCurrentTip((prev) => (prev + 1) % salesTips.length)}
                        className="text-[10px] uppercase tracking-[0.2em] font-bold text-accent hover:opacity-70 transition-opacity self-end"
                      >
                        Próxima Dica →
                      </button>
                    </div>
                  ) : (
                    <div className="p-8 rounded-3xl border border-white/10 bg-white/[0.02] flex flex-col justify-between min-h-[300px]">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-6">Recurso Pro</p>
                        <h4 className="font-display text-2xl font-bold mb-3">Dicas de Venda</h4>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          Faça upgrade para <span className="text-accent">Pro</span> e desbloqueie dicas, insights e recomendações.
                        </p>
                      </div>

                      <button
                        onClick={() => navigate("/checkout/plano/pro")}
                        className="px-5 py-3 rounded-full bg-accent text-white text-[10px] uppercase tracking-[0.2em] hover:opacity-90 transition-opacity self-end"
                      >
                        Assinar Pro
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mb-8">
                  {tabs.map((tab) => (
                    <motion.button key={tab.id} onClick={() => setActiveTab(tab.id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <span
                        className={`px-5 py-2 rounded-full text-[10px] uppercase tracking-[0.2em] transition-all duration-300 block ${
                          activeTab === tab.id ? "bg-foreground text-background" : "border border-white/10 text-muted-foreground hover:border-white/30"
                        }`}
                      >
                        {tab.label}
                      </span>
                    </motion.button>
                  ))}
                </div>

                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {filteredProposals.map((proposal, i) => (
                      <motion.div
                        key={proposal.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: 0.03 * i, duration: 0.4 }}
                        whileHover={{ x: 8, backgroundColor: "rgba(255,255,255,0.03)" }}
                        onClick={() => setSelectedProposal(proposal)}
                        className="group flex items-center justify-between p-6 rounded-xl border border-transparent hover:border-white/5 transition-all duration-500 cursor-pointer"
                      >
                        <div className="flex items-center gap-8">
                          <div
                            className={`w-1 h-12 rounded-full ${
                              proposal.status === "pending"
                                ? "bg-gradient-to-b from-yellow-400 to-yellow-600/20"
                                : proposal.status === "completed"
                                  ? "bg-gradient-to-b from-green-400 to-green-600/20"
                                  : "bg-gradient-to-b from-red-400 to-red-600/20"
                            }`}
                          />

                          <div>
                            <p className="font-medium mb-1">{proposal.title}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {proposal.clientName} · {formatDate(proposal.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-8">
                          <span className={`text-[9px] uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${statusConfig[proposal.status].color}`}>
                            {statusConfig[proposal.status].label}
                          </span>

                          <p className="font-display text-xl font-semibold tracking-tight min-w-[140px] text-right">
                            {formatCurrency(proposal.value)}
                          </p>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();

                              // Block if PIX key is not registered
                              if (!hasPixKey) {
                                toast.error(
                                  "Cadastre sua chave PIX antes de compartilhar links de contrato.",
                                  {
                                    description: "Vá em Configurações de Pagamento para cadastrar sua chave PIX.",
                                    action: {
                                      label: "Configurar",
                                      onClick: () => navigate("/app/settings/payments"),
                                    },
                                    duration: 6000,
                                  }
                                );
                                return;
                              }

                              try {
                                const res = await generateShareLink(proposal.id);
                                const url = `${window.location.origin}/c/${res.shareToken}`;
                                await navigator.clipboard.writeText(url);
                                toast.success("Link copiado!");

                                const notification = document.createElement("div");
                                notification.className =
                                  "fixed bottom-10 right-10 bg-accent text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-bounce";
                                notification.innerText = "Link do Contrato Copiado!";
                                document.body.appendChild(notification);
                                setTimeout(() => notification.remove(), 3000);
                              } catch {
                                toast.error("Erro ao copiar link");
                              }
                            }}
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider transition-all ${
                              hasPixKey
                                ? "bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent"
                                : "bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground"
                            }`}
                            title={!hasPixKey ? "Cadastre sua chave PIX para copiar o link" : "Copiar link do contrato"}
                          >
                            {!hasPixKey && (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            )}
                            Copiar Link
                          </button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] uppercase tracking-widest border-white/10 hover:bg-white/5"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/propostas/${proposal.id}`);
                            }}
                          >
                            Visualizar
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {!filteredProposals.length && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-20 text-center text-muted-foreground border border-dashed border-white/10 rounded-3xl"
                    >
                      Nenhuma proposta encontrada nesta categoria.
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      </main>

      <FooterMobile />
    </div>
  );
}

function FooterMobile() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-white/5 py-4 px-6 md:hidden z-50">
      <div className="flex justify-around items-center">
        <Link href="/propostas" className="text-[10px] uppercase tracking-widest text-accent font-bold">
          Propostas
        </Link>
        <Link href="/app/settings/payments" className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Pagamentos
        </Link>
        <Link href="/templates" className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Templates
        </Link>
        <Link href="/system" className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Planos
        </Link>
      </div>
    </footer>
  );
}
