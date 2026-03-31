import React from "react";
import { authStorage } from "../lib/auth-storage";
// src/pages/Propostas.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import {
  Menu, X, Search, ArrowUpDown,
  TrendingUp, Clock, CheckCircle2, XCircle, FileText,
  Copy, BadgeCheck, Ban, Loader2, Zap, ChevronRight,
  ArrowUpRight, Flame, Target, Star, Lock,
} from "lucide-react";
import { cn } from "../lib/utils";
import { Input } from "../components/ui/input";

import {
  listProposals,
  generateShareLink,
  markProposalPaid,
  cancelProposal,
  type ApiProposal,
  type ApiProposalStatus,
} from "../service/proposals";

import {
  listContracts,
  generateContractShareLink,
  markContractPaid,
  cancelContract,
  type Contract,
  STATUS_CONFIG,
  CONTRACT_TYPE_LABELS,
} from "../service/contracts";

import { getMyPlan, type PlanId, confirmSubscriptionCheckout } from "../service/payment";
import { runWithStepUp } from "../service/step-up";
import { toUiErrorMessage } from "../lib/api-error";
import { mercadoPagoService, isPixConfigured } from "../services/mercadoPago";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type UiStatus = "pending" | "cancelled" | "completed" | "rascunho";

interface UnifiedItem {
  id: number;
  clientName: string;
  title: string;
  value: number;
  status: UiStatus;
  createdAt: Date;
  source: "proposal" | "contract";
  rawProposal?: ApiProposal;
  contractStatus?: string;
  signed: boolean;
  lifecycleStatus: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const fmtK = (v: number) =>
  v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : formatCurrency(v);

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);

function daysBetween(a: Date, b: Date = new Date()) {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
}

const proposalStatusConfig = {
  pending:   { label: "Pendente",   color: "text-yellow-400 border-yellow-500/30", chartColor: "#fbbf24", bg: "bg-yellow-500/10",  dot: "bg-yellow-400" },
  completed: { label: "Finalizada", color: "text-green-400 border-green-500/30",   chartColor: "#4ade80", bg: "bg-green-500/10",   dot: "bg-green-400"  },
  cancelled: { label: "Cancelada",  color: "text-red-400 border-red-500/30",       chartColor: "#f87171", bg: "bg-red-500/10",     dot: "bg-red-400"    },
  rascunho:  { label: "Rascunho",   color: "text-zinc-400 border-zinc-500/30",     chartColor: "#71717a", bg: "bg-zinc-500/10",    dot: "bg-zinc-400"   },
} as const;

const salesTips = [
  { title: "Follow-up em 48h",       text: "Envie um lembrete gentil 2 dias após enviar a proposta. Clientes silenciosos geralmente só precisam de um empurrão." },
  { title: "Coloque validade",        text: "Adicione 'válida por 7 dias' nas propostas. Escassez real acelera decisão sem pressionar o cliente." },
  { title: "Benefícios, não recursos", text: "Fale o que o cliente ganha (mais vendas, mais tempo) e não o que você entrega (site, logo, código)." },
  { title: "Bundling aumenta ticket", text: "Ao invés de só 'site', ofereça 'site + manutenção 3 meses'. Aumenta receita sem aumentar esforço." },
  { title: "CTA direto",             text: "Sempre termine mensagens com próximo passo claro: 'Posso reservar sua vaga até sexta?'" },
];

function apiStatusToUi(status: ApiProposalStatus): UiStatus {
  if (status === "pendente") return "pending";
  if (status === "vendida")  return "completed";
  return "cancelled";
}

function deriveContractUiStatus(c: Contract): UiStatus {
  const lc = (c as any).lifecycleStatus as string | undefined;
  if (lc === "CANCELLED" || (c as any).status === "cancelado") return "cancelled";
  if (lc === "PAID")                                           return "completed";
  if ((c as any).signedAt || (c as any).contractSignedAt || (c as any).signed) return "completed";
  if (lc === "SENT" || lc === "ACCEPTED")                     return "pending";
  const s = (c as any).status as string;
  if (s === "assinado" || s === "finalizado")                  return "completed";
  if (s === "cancelado")                                       return "cancelled";
  if (s === "pendente")                                        return "pending";
  if ((c as any).shareToken || (c as any).shareTokenHash)     return "pending";
  return "rascunho";
}

function proposalToUnified(p: ApiProposal): UnifiedItem {
  return {
    id: p.id, clientName: p.clientName, title: p.title,
    value: Number(p.value),
    status: apiStatusToUi(p.status),
    createdAt: new Date(p.createdAt),
    source: "proposal", rawProposal: p,
    signed: Boolean(p.contract?.signed),
    lifecycleStatus: p.status === "vendida" ? "PAID" : p.status === "cancelada" ? "CANCELLED" : "SENT",
  };
}

function contractToUnified(c: Contract): UnifiedItem {
  const uiStatus = deriveContractUiStatus(c);
  return {
    id: c.id, clientName: c.clientName,
    title: CONTRACT_TYPE_LABELS[c.contractType] ?? c.clientName,
    value: Number(c.value ?? (c as any).contractValue ?? 0),
    status: uiStatus,
    createdAt: new Date(c.createdAt),
    source: "contract",
    contractStatus: c.status,
    signed: Boolean((c as any).signedAt || (c as any).contractSignedAt || (c as any).signed),
    lifecycleStatus: (c as any).lifecycleStatus ?? "DRAFT",
  };
}

const PLAN_ORDER: Record<PlanId, number> = { free: 0, pro: 1, premium: 2 };
function hasPlan(current: PlanId, required: PlanId) { return PLAN_ORDER[current] >= PLAN_ORDER[required]; }
function planLabel(p: PlanId) { return p === "premium" ? "Premium" : p === "pro" ? "Pro" : "Free"; }
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

const STATUS_FILTER_OPTIONS = [
  { value: "all",       label: "Todos"      },
  { value: "pending",   label: "Pendentes"  },
  { value: "completed", label: "Finalizados"},
  { value: "rascunho",  label: "Rascunho"   },
  { value: "cancelled", label: "Cancelados" },
] as const;

const SORT_OPTIONS = [
  { value: "recente",    label: "Mais recente" },
  { value: "antigo",     label: "Mais antigo"  },
  { value: "valor_desc", label: "Maior valor"  },
  { value: "valor_asc",  label: "Menor valor"  },
  { value: "cliente",    label: "Cliente A-Z"  },
] as const;

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Propostas() {
  const [location, navigate] = useLocation();

  const [activeTab, setActiveTab]           = useState<string>("all");
  const [currentTip, setCurrentTip]         = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled]             = useState(false);
  const [items, setItems]                   = useState<UnifiedItem[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [search, setSearch]                 = useState("");
  const [sortBy, setSortBy]                 = useState("recente");
  const [showSortMenu, setShowSortMenu]     = useState(false);
  const [loadingAction, setLoadingAction]   = useState<string | null>(null);
  const [planId, setPlanId]                 = useState<PlanId>("free");
  const [planLoading, setPlanLoading]       = useState(true);
  const [hasPixKey, setHasPixKey]           = useState(false);
  const [pixKeyLoading, setPixKeyLoading]   = useState(true);

  const reload = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) { navigate("/login"); return; }
    setIsLoading(true); setPlanLoading(true); setError(null);
    try {
      const [proposalsData, contractsData, me] = await Promise.all([
        listProposals(),
        listContracts().catch(() => [] as Contract[]),
        getMyPlan(),
      ]);
      const proposalIds    = new Set(proposalsData.map(p => p.id));
      const proposalItems  = proposalsData.map(proposalToUnified);
      const contractItems  = contractsData.filter(c => !proposalIds.has(c.id)).map(contractToUnified);
      const merged = [...proposalItems, ...contractItems].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setItems(merged);
      setPlanId(me.plan.planId);
    } catch (e: any) {
      setError(e?.message ?? "Falha ao carregar.");
    } finally {
      setIsLoading(false); setPlanLoading(false);
    }
    try {
      const pixData = await mercadoPagoService.getPixKey();
      setHasPixKey(isPixConfigured(pixData));
    } catch { setHasPixKey(false); }
    finally { setPixKeyLoading(false); }
  }, [navigate]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const ok = url.searchParams.get("subscription") === "success";
    const sessionId = url.searchParams.get("session_id");
    if (!ok || !sessionId) return;
    (async () => {
      try {
        const confirmed = await confirmSubscriptionCheckout(sessionId);
        setPlanId(confirmed.planId);
        toast.success(`Plano ativado! Você agora é ${planLabel(confirmed.planId)}.`);
        url.searchParams.delete("subscription"); url.searchParams.delete("session_id");
        window.history.replaceState({}, "", url.pathname + url.search);
        for (let i = 0; i < 5; i++) { await reload(); await sleep(800); }
      } catch (e: any) {
        toast.error(e?.message || "Pagamento recebido, mas plano ainda não atualizou.");
      }
    })();
  }, [reload]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { if (location === "/propostas") reload(); }, [location, reload]);
  useEffect(() => {
    const handler = () => reload();
    window.addEventListener("proposals:changed", handler as EventListener);
    return () => window.removeEventListener("proposals:changed", handler as EventListener);
  }, [reload]);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const proposals    = items.filter(i => i.source === "proposal");
    const pending      = proposals.filter(p => p.status === "pending").length;
    const completed    = proposals.filter(p => p.status === "completed").length;
    const cancelled    = proposals.filter(p => p.status === "cancelled").length;
    const totalRevenue = proposals.filter(p => p.status === "completed").reduce((a, p) => a + p.value, 0);
    const pendingValue = proposals.filter(p => p.status === "pending").reduce((a, p) => a + p.value, 0);
    const contracts    = items.filter(i => i.source === "contract").length;
    return { pending, completed, cancelled, totalRevenue, pendingValue, contracts };
  }, [items]);

  const conversionPct = useMemo(() => {
    const denom = stats.completed + stats.cancelled;
    return denom === 0 ? 0 : Math.round((stats.completed / denom) * 100);
  }, [stats]);

  // Aging das pendências
  const criticalPending = useMemo(() =>
    items.filter(i => i.status === "pending" && daysBetween(i.createdAt) >= 14).length,
  [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (activeTab !== "all") result = result.filter(i => i.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i => i.clientName.toLowerCase().includes(q) || i.title.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      if (sortBy === "recente")    return b.createdAt.getTime() - a.createdAt.getTime();
      if (sortBy === "antigo")     return a.createdAt.getTime() - b.createdAt.getTime();
      if (sortBy === "valor_desc") return b.value - a.value;
      if (sortBy === "valor_asc")  return a.value - b.value;
      if (sortBy === "cliente")    return a.clientName.localeCompare(b.clientName);
      return 0;
    });
  }, [items, activeTab, search, sortBy]);

  const chartData = useMemo(() => [
    { name: "Pendentes",    value: stats.pending,   color: "#fbbf24" },
    { name: "Finalizadas",  value: stats.completed, color: "#4ade80" },
    { name: "Não vendidas", value: stats.cancelled, color: "#f87171" },
  ], [stats]);

const getCfg = (item: UnifiedItem) => proposalStatusConfig[item.status] ?? proposalStatusConfig.rascunho;

function toContractSigningPath(data: { publicUrlPath?: string; shareToken?: string }) {
  const rawPath = (data.publicUrlPath ?? "").trim();
  const normalizedPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const pathToken =
    normalizedPath.match(/\/p\/(?:contract|review)\/([a-f0-9]{64})/i)?.[1]
    ?? normalizedPath.match(/([a-f0-9]{64})/i)?.[1];
  const token = (pathToken ?? data.shareToken ?? "").trim();
  if (/^[a-f0-9]{64}$/i.test(token)) return `/p/contract/${token.toLowerCase()}`;
  return normalizedPath || null;
}

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCopyLink = useCallback(async (item: UnifiedItem) => {
    if (item.source === "proposal" && !hasPixKey) {
      toast.error("Cadastre sua chave PIX antes de compartilhar links.", {
        action: { label: "Configurar", onClick: () => navigate("/app/settings/payments") },
        duration: 6000,
      });
      return;
    }
    const key = `${item.source}-${item.id}-copy`;
    setLoadingAction(key);
    try {
      const res = item.source === "contract"
        ? await generateContractShareLink(item.id)
        : await generateShareLink(item.id);

      const publicPath = item.source === "proposal"
        ? toContractSigningPath(res)
        : (res.publicUrlPath?.trim().startsWith("/") ? res.publicUrlPath.trim() : `/${(res.publicUrlPath ?? "").trim()}`);

      if (!publicPath) throw new Error("Não foi possível gerar o link público.");

      await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`);
      toast.success("Link copiado!");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao gerar link.");
    } finally { setLoadingAction(null); }
  }, [hasPixKey, navigate]);

  const handleMarkPaid = useCallback(async (item: UnifiedItem) => {
    const ok = confirm(`Confirmar pagamento?\n\n${item.title}\n${formatCurrency(item.value)}`);
    if (!ok) return;
    const key = `${item.source}-${item.id}-paid`;
    setLoadingAction(key);
    try {
      if (item.source === "contract") {
        await runWithStepUp("contracts.mark-paid", { contractId: item.id }, (stepUpToken) => markContractPaid(item.id, {}, stepUpToken));
      } else {
        await runWithStepUp("payments.mark-paid", { proposalId: item.id }, (stepUpToken) => markProposalPaid(item.id, {}, stepUpToken));
      }
      toast.success("Pagamento confirmado!");
      await reload();
    } catch (err: unknown) {
      toast.error(toUiErrorMessage(err));
    } finally { setLoadingAction(null); }
  }, [reload]);

  const handleCancel = useCallback(async (item: UnifiedItem) => {
    const ok = confirm(`Cancelar esta ${item.source === "contract" ? "contrato" : "proposta"}?\n\n"${item.title}"\n\nEsta ação não pode ser desfeita.`);
    if (!ok) return;
    const key = `${item.source}-${item.id}-cancel`;
    setLoadingAction(key);
    try {
      if (item.source === "contract") await cancelContract(item.id);
      else await cancelProposal(item.id);
      toast.success("Cancelado com sucesso.");
      await reload();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao cancelar.");
    } finally { setLoadingAction(null); }
  }, [reload]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="noise-overlay" />

      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/[0.03] blur-[120px]" />
      </div>

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 md:py-8 transition-all duration-700",
        scrolled || mobileMenuOpen ? "bg-background/20 backdrop-blur-2xl py-4" : "bg-transparent"
      )}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight group">
            FECHOU<span className="text-accent group-hover:italic transition-all">!</span>
          </Link>

          <div className="flex items-center gap-4 md:gap-6 lg:gap-12">
            <div className="hidden md:flex items-center gap-8">
              <div className="flex items-center gap-2.5">
                <Link href="/propostas" className="text-[10px] uppercase tracking-[0.3em] font-medium text-muted-foreground hover:text-accent transition-colors relative group">
                  Propostas
                  <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-accent group-hover:w-full transition-all duration-300" />
                </Link>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-[0.2em] border font-bold",
                  planId === "premium" ? "border-yellow-500/30 text-yellow-300 bg-yellow-500/10"
                  : planId === "pro"   ? "border-accent/40 text-accent bg-accent/10"
                  : "border-white/10 text-white/30 bg-white/5"
                )}>{planLoading ? "···" : planLabel(planId)}</span>
              </div>
              <Link href="/contratos" className="text-[10px] uppercase tracking-[0.3em] font-medium text-muted-foreground hover:text-accent transition-colors relative group">
                Contratos
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-accent group-hover:w-full transition-all duration-300" />
              </Link>
              <Link href="/templates" className="text-[10px] uppercase tracking-[0.3em] font-medium text-muted-foreground hover:text-accent transition-colors relative group">
                Templates
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-accent group-hover:w-full transition-all duration-300" />
              </Link>
              <Link href="/app/settings/payments" className={cn(
                "text-[10px] uppercase tracking-[0.3em] font-medium transition-colors relative group",
                !hasPixKey && !pixKeyLoading ? "text-red-400 hover:text-red-300" : "text-muted-foreground hover:text-accent"
              )}>
                {!hasPixKey && !pixKeyLoading && (
                  <span className="absolute -top-1 -right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                )}
                Pagamentos
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-accent group-hover:w-full transition-all duration-300" />
              </Link>
              <button type="button" onClick={reload} className="text-[10px] uppercase tracking-[0.3em] font-medium text-muted-foreground hover:text-accent transition-colors">
                Atualizar
              </button>
            </div>

            <div className="hidden md:block">
              {hasPlan(planId, "pro") ? (
                <button onClick={() => navigate("/contratos/novo")}
                  className="px-5 py-2 rounded-full border border-white/10 text-[10px] uppercase tracking-[0.2em] hover:bg-accent hover:border-accent hover:text-white hover:shadow-[0_0_24px_rgba(255,102,0,0.35)] transition-all duration-500">
                  Nova Proposta
                </button>
              ) : (
                <button onClick={() => navigate("/system")}
                  className="px-5 py-2 rounded-full border border-accent/30 bg-accent/5 text-accent text-[10px] uppercase tracking-[0.2em] hover:bg-accent hover:text-white transition-all duration-500">
                  Upgrade Pro
                </button>
              )}
            </div>

            <button type="button" className="md:hidden p-2 text-muted-foreground hover:text-accent" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="md:hidden mt-4 pb-4 border-t border-white/[0.06]"
            >
              <div className="flex flex-col gap-4 pt-4 px-1">
                <div className="flex items-center gap-2.5">
                  <Link href="/propostas" onClick={() => setMobileMenuOpen(false)} className="text-[10px] uppercase tracking-[0.3em] font-medium text-muted-foreground">Propostas</Link>
                  <span className={cn("px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest border font-bold",
                    planId === "premium" ? "border-yellow-500/30 text-yellow-300 bg-yellow-500/10"
                    : planId === "pro"   ? "border-accent/40 text-accent bg-accent/10"
                    : "border-white/10 text-white/30"
                  )}>{planLoading ? "···" : planLabel(planId)}</span>
                </div>
                <Link href="/contratos" onClick={() => setMobileMenuOpen(false)} className="text-[10px] uppercase tracking-[0.3em] font-medium text-muted-foreground">Contratos</Link>
                <Link href="/templates" onClick={() => setMobileMenuOpen(false)} className="text-[10px] uppercase tracking-[0.3em] font-medium text-muted-foreground">Templates</Link>
                <Link href="/app/settings/payments" onClick={() => setMobileMenuOpen(false)} className={cn("text-[10px] uppercase tracking-[0.3em] font-medium", !hasPixKey && !pixKeyLoading ? "text-red-400" : "text-muted-foreground")}>Pagamentos</Link>
                <button type="button" onClick={() => { reload(); setMobileMenuOpen(false); }} className="text-[10px] uppercase tracking-[0.3em] font-medium text-muted-foreground text-left">Atualizar</button>
                {hasPlan(planId, "pro") ? (
                  <button onClick={() => { navigate("/contratos/novo"); setMobileMenuOpen(false); }}
                    className="w-full px-5 py-2.5 rounded-xl border border-white/10 text-[10px] uppercase tracking-[0.2em] hover:bg-accent hover:border-accent hover:text-white transition-all text-left">
                    Nova Proposta
                  </button>
                ) : (
                  <button onClick={() => { navigate("/system"); setMobileMenuOpen(false); }}
                    className="w-full px-5 py-2.5 rounded-xl border border-accent/30 bg-accent/5 text-accent text-[10px] uppercase tracking-[0.2em] text-left">
                    Upgrade Pro
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="relative z-10 pt-24 sm:pt-32 pb-28 px-4 sm:px-6">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>

            {/* ── Heading ─────────────────────────────────────────────────── */}
            <div className="mb-10 sm:mb-12">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-4">Visão geral</p>
              <h1 className="font-display text-4xl sm:text-6xl md:text-8xl font-bold tracking-[-0.04em] leading-[0.9]">
                Histórico<span className="text-accent">.</span>
              </h1>
            </div>

            {/* ── Banner de plano ─────────────────────────────────────────── */}
            {!planLoading && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className={cn(
                  "mb-8 rounded-2xl border p-5 sm:p-6",
                  planId === "premium" ? "border-yellow-500/20 bg-yellow-500/[0.04]"
                  : planId === "pro"   ? "border-accent/15 bg-accent/[0.03]"
                  : "border-white/[0.06] bg-white/[0.02]"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                      planId === "premium" ? "bg-yellow-500/15" : planId === "pro" ? "bg-accent/15" : "bg-white/5"
                    )}>
                      {planId === "premium" ? <Star size={14} className="text-yellow-400" />
                        : planId === "pro"  ? <Zap size={14} className="text-accent" />
                        : <Lock size={14} className="text-white/30" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">Plano {planLabel(planId)}</p>
                        <span className={cn(
                          "text-[9px] px-2 py-0.5 rounded-full border font-black uppercase tracking-widest",
                          planId === "premium" ? "border-yellow-500/30 text-yellow-300 bg-yellow-500/10"
                          : planId === "pro"   ? "border-accent/30 text-accent bg-accent/10"
                          : "border-white/10 text-white/30"
                        )}>{planLabel(planId)}</span>
                      </div>
                      <p className="text-[11px] text-white/30 mt-0.5">
                        {planId === "free"    ? "Crie propostas básicas. Faça upgrade para desbloquear contratos, pagamentos e dashboard avançado."
                          : planId === "pro"  ? "Propostas e contratos ilimitados. O Premium libera pagamentos online e dashboard de inteligência."
                          : "Acesso total. Dashboard de inteligência de vendas disponível."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {planId !== "premium" && (
                      <>
                        <button onClick={() => navigate("/system")}
                          className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[10px] uppercase tracking-widest text-white/40 hover:text-white hover:border-white/10 transition-all">
                          Ver planos
                        </button>
                        {planId === "free" && (
                          <button onClick={() => navigate("/checkout/plano/pro")}
                            className="px-4 py-2 rounded-xl bg-accent text-white text-[10px] uppercase tracking-widest font-bold hover:opacity-90 transition-opacity">
                            Assinar Pro
                          </button>
                        )}
                        {planId === "pro" && (
                          <button onClick={() => navigate("/checkout/plano/premium")}
                            className="px-4 py-2 rounded-xl bg-yellow-500/80 text-black text-[10px] uppercase tracking-widest font-bold hover:opacity-90 transition-opacity">
                            Upgrade Premium
                          </button>
                        )}
                      </>
                    )}
                    {planId === "premium" && (
                      <button onClick={() => navigate("/dashboard/premium")}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-500/15 border border-yellow-500/20 text-yellow-300 text-[10px] uppercase tracking-widest font-bold hover:bg-yellow-500/20 transition-all">
                        Ver Dashboard <ChevronRight size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {error && (
              <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-300">{error}</div>
            )}

            {isLoading ? (
              <div className="py-20 flex items-center justify-center gap-3 text-white/30">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Loader2 size={16} />
                </motion.div>
                <span className="text-sm">Carregando...</span>
              </div>
            ) : (
              <>
                {/* ── Alerta de pendências críticas ────────────────────────── */}
                {criticalPending > 0 && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-6 flex items-start gap-3 p-4 rounded-2xl border border-rose-500/20 bg-rose-500/[0.04]"
                  >
                    <Flame size={14} className="text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">
                        {criticalPending} proposta{criticalPending > 1 ? "s" : ""} sem resposta há +14 dias
                      </p>
                      <p className="text-[11px] text-white/40 mt-0.5">
                        Clientes silenciosos costumam estar pesquisando concorrentes. Faça follow-up agora.
                      </p>
                    </div>
                    <button onClick={() => setActiveTab("pending")}
                      className="text-[10px] font-bold text-rose-400 hover:text-rose-300 uppercase tracking-widest shrink-0 transition-colors">
                      Ver →
                    </button>
                  </motion.div>
                )}

                {/* ── KPIs ─────────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                  {[
                    { label: "Pendentes",     value: stats.pending,                   sub: `${fmtK(stats.pendingValue)} em aberto`, color: "#fbbf24", icon: Clock,        onClick: () => setActiveTab("pending") },
                    { label: "Finalizadas",   value: stats.completed,                 sub: `${conversionPct}% de conversão`,        color: "#4ade80", icon: CheckCircle2, onClick: () => setActiveTab("completed") },
                    { label: "Contratos",     value: stats.contracts,                 sub: "documentos ativos",                     color: "#3b82f6", icon: FileText,     onClick: () => navigate("/contratos") },
                    { label: "Receita Total", value: fmtK(stats.totalRevenue),        sub: planId === "premium" ? "Ver dashboard →" : "Premium para análise", color: "#ff6600", icon: TrendingUp,
                      onClick: () => planId === "premium" ? navigate("/dashboard/premium") : navigate("/checkout/plano/premium") },
                  ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <motion.div key={s.label}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06, ease: [0.23, 1, 0.32, 1] }}
                        onClick={s.onClick}
                        className="relative overflow-hidden p-4 sm:p-5 rounded-2xl border border-white/[0.05] bg-white/[0.02] cursor-pointer hover:border-white/[0.1] hover:bg-white/[0.04] transition-all duration-300 group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <p className="text-[9px] uppercase tracking-[0.25em] text-white/30 font-bold">{s.label}</p>
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center opacity-40 group-hover:opacity-70 transition-opacity" style={{ backgroundColor: s.color + "20" }}>
                            <Icon size={11} style={{ color: s.color }} />
                          </div>
                        </div>
                        <p className="font-display text-2xl sm:text-3xl font-bold leading-none mb-2" style={{ color: s.label === "Receita Total" ? s.color : undefined }}>{s.value}</p>
                        <p className="text-[10px] text-white/25">{s.sub}</p>
                        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-10 transition-opacity group-hover:opacity-20" style={{ background: s.color }} />
                      </motion.div>
                    );
                  })}
                </div>

                {/* ── Chart + Card de plano ─────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">

                  {/* Pie + conversão */}
                  <div className="p-5 sm:p-7 rounded-2xl border border-white/[0.05] bg-white/[0.02] flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-full sm:w-[160px] h-[160px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={4} dataKey="value">
                            {chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                          </Pie>
                          <RechartsTooltip contentStyle={{ backgroundColor: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "11px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 w-full">
                      <p className="text-[9px] uppercase tracking-widest text-white/25 font-bold mb-1">Taxa de Conversão</p>
                      <p className="font-display text-4xl font-bold text-white mb-1">{conversionPct}%</p>
                      <p className="text-[11px] text-white/30 mb-4">das propostas convertidas em vendas</p>
                      <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${conversionPct}%` }}
                          transition={{ delay: 0.5, duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
                          className="h-full rounded-full bg-gradient-to-r from-accent to-orange-400"
                        />
                      </div>
                      <div className="flex items-center gap-4 mt-4">
                        {chartData.map(d => (
                          <div key={d.name} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: d.color }} />
                            <span className="text-[10px] text-white/30">{d.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card de plano — diferente por tier */}
                  {hasPlan(planId, "pro") ? (
                    <div className="p-5 sm:p-7 rounded-2xl border border-accent/15 bg-accent/[0.03] flex flex-col justify-between min-h-[200px]">
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Target size={12} className="text-accent" />
                          <p className="text-[9px] uppercase tracking-[0.28em] text-accent/60 font-bold">Dica de Venda</p>
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div key={currentTip}
                            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }}
                          >
                            <h4 className="font-display text-lg font-bold mb-2 text-white">{salesTips[currentTip].title}</h4>
                            <p className="text-white/40 text-[12px] leading-relaxed">{salesTips[currentTip].text}</p>
                          </motion.div>
                        </AnimatePresence>
                      </div>
                      <div className="flex items-center justify-between mt-5">
                        <div className="flex gap-1">
                          {salesTips.map((_, i) => (
                            <button key={i} onClick={() => setCurrentTip(i)}
                              className={cn("w-1.5 h-1.5 rounded-full transition-all", i === currentTip ? "bg-accent" : "bg-white/10")} />
                          ))}
                        </div>
                        <button onClick={() => setCurrentTip(p => (p + 1) % salesTips.length)}
                          className="text-[10px] uppercase tracking-widest font-bold text-accent hover:opacity-70 transition-opacity">
                          Próxima →
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Free: upsell card
                    <div className="p-5 sm:p-7 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex flex-col justify-between min-h-[200px] relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] to-transparent pointer-events-none" />
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-4">
                          <Lock size={11} className="text-white/20" />
                          <p className="text-[9px] uppercase tracking-[0.28em] text-white/25 font-bold">Recurso Pro</p>
                        </div>
                        <h4 className="font-display text-lg font-bold mb-2 text-white">Dicas de Venda + Dashboard</h4>
                        <p className="text-white/35 text-[12px] leading-relaxed">
                          Faça upgrade para <span className="text-accent font-bold">Pro</span> e desbloqueie dicas de venda rotativas, análises de conversão e muito mais.
                        </p>
                        <div className="mt-4 space-y-1.5">
                          {["Dicas de fechamento diárias", "Análise de conversão", "Propostas ilimitadas"].map(f => (
                            <div key={f} className="flex items-center gap-2 text-[11px] text-white/25">
                              <div className="w-1 h-1 rounded-full bg-accent/40" />
                              {f}
                            </div>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => navigate("/checkout/plano/pro")}
                        className="relative mt-5 self-start px-5 py-2.5 rounded-xl bg-accent text-white text-[10px] uppercase tracking-widest font-bold hover:opacity-90 transition-opacity">
                        Assinar Pro
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Banner premium (só para free/pro) ────────────────────── */}
                {planId !== "premium" && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="mb-8 p-5 rounded-2xl border border-yellow-500/15 bg-yellow-500/[0.03] flex flex-col sm:flex-row items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                        <Star size={13} className="text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Dashboard de Inteligência Premium</p>
                        <p className="text-[11px] text-white/30">Score de saúde, oportunidades críticas, previsão de receita e insights de vendas.</p>
                      </div>
                    </div>
                    <button onClick={() => navigate("/checkout/plano/premium")}
                      className="shrink-0 flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-yellow-500/80 text-black text-[10px] uppercase tracking-widest font-black hover:opacity-90 transition-opacity">
                      Ver Premium <ChevronRight size={11} />
                    </button>
                  </motion.div>
                )}

                {/* ── Busca + Ordenação + Filtros ───────────────────────────── */}
                <div className="mb-5 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                      <Input
                        placeholder="Buscar por cliente ou título…"
                        value={search}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                        className="pl-9 bg-white/[0.03] border-white/[0.05] focus:border-white/15 rounded-xl h-10 text-sm placeholder:text-white/20"
                      />
                      {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setShowSortMenu(!showSortMenu)}
                        className="flex items-center gap-2 px-4 h-10 rounded-xl border border-white/[0.05] bg-white/[0.03] text-[11px] text-white/30 hover:text-white/60 hover:border-white/10 transition-all whitespace-nowrap"
                      >
                        <ArrowUpDown size={12} />
                        {SORT_OPTIONS.find(s => s.value === sortBy)?.label ?? "Ordenar"}
                      </button>
                      <AnimatePresence>
                        {showSortMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.97 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-white/[0.08] bg-zinc-950 shadow-2xl z-50 overflow-hidden"
                          >
                            {SORT_OPTIONS.map(opt => (
                              <button key={opt.value} onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                                className={cn(
                                  "w-full text-left px-4 py-2.5 text-[11px] transition-colors",
                                  sortBy === opt.value ? "text-accent bg-accent/10" : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                                )}>
                                {opt.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Tabs de status */}
                  <div className="flex flex-wrap gap-2">
                    {STATUS_FILTER_OPTIONS.map(tab => {
                      const active = activeTab === tab.value;
                      const count  = tab.value === "all" ? items.length : items.filter(i => i.status === tab.value).length;
                      return (
                        <motion.button key={tab.value} onClick={() => setActiveTab(tab.value)}
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          className={cn(
                            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-medium border transition-all duration-200",
                            active ? "bg-foreground text-background border-transparent" : "border-white/[0.07] text-white/30 hover:border-white/20 hover:text-white/60 bg-white/[0.02]"
                          )}>
                          {tab.label}
                          <span className={cn("text-[10px]", active ? "opacity-50" : "opacity-30")}>({count})</span>
                        </motion.button>
                      );
                    })}
                    {(search || activeTab !== "all" || sortBy !== "recente") && (
                      <button onClick={() => { setSearch(""); setActiveTab("all"); setSortBy("recente"); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] text-white/25 hover:text-white/50 border border-white/[0.05] hover:border-white/10 transition-all">
                        <X size={10} /> Limpar
                      </button>
                    )}
                  </div>

                  {(search || activeTab !== "all") && (
                    <p className="text-[11px] text-white/20">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</p>
                  )}
                </div>

                {/* ── Lista unificada ───────────────────────────────────────── */}
                <div className="space-y-1.5">
                  <AnimatePresence mode="popLayout">
                    {filtered.map((item, i) => {
                      const cfg        = getCfg(item);
                      const isProposal = item.source === "proposal";
                      const isContract = item.source === "contract";
                      const isPending  = item.status === "pending" || item.status === "rascunho";
                      const isSigned   = item.signed && item.status !== "cancelled";
                      const isCancelled = item.status === "cancelled";
                      const age        = daysBetween(item.createdAt);
                      const isOld      = isPending && age >= 14;

                      const loadingCopy = loadingAction === `${item.source}-${item.id}-copy`;
                      const loadingPaid = loadingAction === `${item.source}-${item.id}-paid`;
                      const loadingCnl  = loadingAction === `${item.source}-${item.id}-cancel`;

                      return (
                        <motion.div
                          key={`${item.source}-${item.id}`}
                          layout
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          transition={{ delay: 0.02 * i, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                          className={cn(
                            "group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-xl border transition-all duration-300 gap-3 sm:gap-0",
                            isOld ? "border-rose-500/10 hover:border-rose-500/20 bg-rose-500/[0.02]"
                              : "border-transparent hover:border-white/[0.06] hover:bg-white/[0.02]"
                          )}
                        >
                          {/* Left: info */}
                          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                            <div className={cn(
                              "w-0.5 h-8 sm:h-10 rounded-full shrink-0",
                              item.status === "pending"   ? "bg-gradient-to-b from-yellow-400 to-yellow-600/10"
                              : item.status === "completed" ? "bg-gradient-to-b from-green-400 to-green-600/10"
                              : item.status === "cancelled" ? "bg-gradient-to-b from-red-400 to-red-600/10"
                              : "bg-gradient-to-b from-zinc-500 to-zinc-700/10"
                            )} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <p className="font-medium text-sm truncate text-white">{item.title}</p>
                                <span className={cn(
                                  "text-[9px] px-1.5 py-0.5 rounded-md border shrink-0 font-bold uppercase tracking-wider",
                                  isProposal
                                    ? "border-blue-500/20 bg-blue-500/[0.08] text-blue-400"
                                    : "border-accent/20 bg-accent/[0.08] text-accent"
                                )}>
                                  {isProposal ? "Proposta" : "Contrato"}
                                </span>
                                {isOld && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-md border border-rose-500/20 bg-rose-500/[0.08] text-rose-400 font-bold uppercase tracking-wider shrink-0">
                                    {age}d sem resposta
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-white/30 truncate">
                                {item.clientName} · {formatDate(item.createdAt)}
                              </p>
                            </div>
                          </div>

                          {/* Center: status + valor */}
                          <div className="flex items-center gap-3 sm:gap-6 pl-4 sm:pl-0">
                            <span className={cn("text-[9px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border shrink-0 font-bold", cfg.color, cfg.bg)}>
                              {cfg.label}
                            </span>
                            <p className="font-display text-base sm:text-xl font-semibold tracking-tight sm:min-w-[120px] text-right text-white">
                              {formatCurrency(item.value)}
                            </p>
                          </div>

                          {/* Right: ações */}
                          <div className="flex flex-wrap gap-2 pl-4 sm:pl-0 sm:ml-4">
                            {isContract && (
                              <Button variant="outline" size="sm"
                                className="text-[10px] uppercase tracking-widest border-white/[0.08] hover:bg-white/[0.05] text-white/50 hover:text-white"
                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/contratos/${item.id}/editor`); }}>
                                Abrir editor
                              </Button>
                            )}
                            {isProposal && (
                              <Button variant="outline" size="sm"
                                className="text-[10px] uppercase tracking-widest border-white/[0.08] hover:bg-white/[0.05] text-white/50 hover:text-white"
                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/propostas/${item.id}/pdf`); }}>
                                Visualizar
                              </Button>
                            )}
                            {!isCancelled && (
                              <button
                                disabled={loadingCopy}
                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleCopyLink(item); }}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider transition-all disabled:opacity-40",
                                  isProposal && !hasPixKey
                                    ? "bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-white/30"
                                    : "bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent"
                                )}
                              >
                                {loadingCopy ? <Loader2 size={10} className="animate-spin" /> : <Copy size={10} />}
                                Link
                              </button>
                            )}
                            {isSigned && item.lifecycleStatus !== "PAID" && !isCancelled && (
                              <button
                                disabled={loadingPaid}
                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleMarkPaid(item); }}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 transition-all disabled:opacity-40"
                              >
                                {loadingPaid ? <Loader2 size={10} className="animate-spin" /> : <BadgeCheck size={10} />}
                                Confirmar
                              </button>
                            )}
                            {isPending && (
                              <button
                                disabled={loadingCnl}
                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleCancel(item); }}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider transition-all disabled:opacity-40 bg-red-500/[0.08] hover:bg-red-500/15 border border-red-500/15 text-red-400"
                              >
                                {loadingCnl ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />}
                                Cancelar
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {filtered.length === 0 && !isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="py-16 sm:py-24 text-center text-white/20 border border-dashed border-white/[0.06] rounded-2xl px-4"
                    >
                      <p className="text-sm mb-2">{search ? `Nenhum resultado para "${search}".` : "Nenhum item nesta categoria."}</p>
                      {(search || activeTab !== "all") && (
                        <button onClick={() => { setSearch(""); setActiveTab("all"); }}
                          className="text-xs text-accent hover:underline">
                          Limpar filtros
                        </button>
                      )}
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      </main>

      <FooterMobile planId={planId} navigate={navigate} />
    </div>
  );
}

// ─── Footer Mobile ────────────────────────────────────────────────────────────

function FooterMobile({ planId, navigate }: { planId: PlanId; navigate: (to: string) => void }) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-white/[0.05] py-3 px-6 md:hidden z-50">
      <div className="flex justify-around items-center">
        <Link href="/propostas" className="text-[9px] uppercase tracking-widest text-accent font-bold">Propostas</Link>
        <Link href="/contratos" className="text-[9px] uppercase tracking-widest text-white/30">Contratos</Link>
        <Link href="/app/settings/payments" className="text-[9px] uppercase tracking-widest text-white/30">Pagamentos</Link>
        <Link href="/templates" className="text-[9px] uppercase tracking-widest text-white/30">Templates</Link>
        {planId === "premium"
          ? <Link href="/dashboard/premium" className="text-[9px] uppercase tracking-widest text-yellow-400 font-bold">Dashboard</Link>
          : <Link href="/system" className="text-[9px] uppercase tracking-widest text-white/30">Planos</Link>
        }
      </div>
    </footer>
  );
}
