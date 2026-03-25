import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import {
  Plus, FileText, Calendar, DollarSign, ArrowRight,
  Search, AlertCircle, SlidersHorizontal, X,
  TrendingUp, Clock, CheckCircle, XCircle, FileSignature,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";
import {
  listContracts,
  type Contract,
  type ContractStatus,
  STATUS_CONFIG,
  CONTRACT_TYPE_LABELS,
} from "../../service/contracts";
import { listProposals, type ApiProposal } from "../../service/proposals";

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (value: string | number) => {
  const n =
    typeof value === "string"
      ? parseFloat(value.replace(/[^\d,.-]/g, "").replace(",", "."))
      : value;
  if (isNaN(n)) return String(value);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
};

const fmtDate = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(date)
  );

// ─── tipos ───────────────────────────────────────────────────────────────────

type DisplayItem = {
  id: number;
  clientName: string;
  title: string;
  value: string;
  status: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  contractType?: string;
  createdAt: string;
  source: "contract" | "proposal";
};

// ─── converters ──────────────────────────────────────────────────────────────

function proposalToDisplay(p: ApiProposal): DisplayItem {
  let status: ContractStatus = "rascunho";
  if (p.contract?.signed) status = "assinado";
  else if (p.status === "vendida") status = "finalizado";
  else if (p.status === "cancelada") status = "cancelado";

  const cfg = STATUS_CONFIG[status] ?? {
    label: p.status,
    color: "text-zinc-400 border-zinc-500/30",
  };

  const bgMap: Record<string, string> = {
    rascunho: "from-zinc-800/60 to-zinc-900/80",
    finalizado: "from-blue-900/40 to-zinc-900/80",
    assinado: "from-emerald-900/40 to-zinc-900/80",
    cancelado: "from-red-900/30 to-zinc-900/80",
  };

  return {
    id: p.id,
    clientName: p.clientName,
    title: p.title,
    value: p.value,
    status,
    statusLabel: cfg.label,
    statusColor: cfg.color,
    statusBg: bgMap[status] ?? bgMap.rascunho,
    createdAt: p.createdAt,
    source: "proposal",
  };
}

function contractToDisplay(c: Contract): DisplayItem {
  const cfg = STATUS_CONFIG[c.status as ContractStatus] ?? {
    label: c.status,
    color: "text-zinc-400 border-zinc-500/30",
  };

  const bgMap: Record<string, string> = {
    rascunho: "from-zinc-800/60 to-zinc-900/80",
    finalizado: "from-blue-900/40 to-zinc-900/80",
    assinado: "from-emerald-900/40 to-zinc-900/80",
    cancelado: "from-red-900/30 to-zinc-900/80",
  };

  return {
    id: c.id,
    clientName: c.clientName,
    title: CONTRACT_TYPE_LABELS[c.contractType] ?? c.contractType ?? c.clientName,
    value: c.value,
    status: c.status,
    statusLabel: cfg.label,
    statusColor: cfg.color,
    statusBg: bgMap[c.status] ?? bgMap.rascunho,
    contractType: c.contractType,
    createdAt: c.createdAt,
    source: "contract",
  };
}

// ─── status filters ───────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: "todos", label: "Todos", icon: SlidersHorizontal },
  { value: "rascunho", label: "Rascunho", icon: Clock },
  { value: "finalizado", label: "Finalizado", icon: CheckCircle },
  { value: "assinado", label: "Assinado", icon: FileSignature },
  { value: "cancelado", label: "Cancelado", icon: XCircle },
];

const SORT_OPTIONS = [
  { value: "recente", label: "Mais recente" },
  { value: "antigo", label: "Mais antigo" },
  { value: "valor_desc", label: "Maior valor" },
  { value: "valor_asc", label: "Menor valor" },
  { value: "cliente", label: "Cliente A-Z" },
];

// ─── accent por status ────────────────────────────────────────────────────────

const STATUS_ACCENT: Record<string, string> = {
  rascunho: "#71717a",
  finalizado: "#3b82f6",
  assinado: "#10b981",
  cancelado: "#ef4444",
};

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color, icon: Icon,
}: {
  label: string; value: string | number; sub?: string;
  color: string; icon: React.ElementType;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/60 p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">{label}</span>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight" style={{ color }}>
          {value}
        </p>
        {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
      </div>
      {/* decorative glow */}
      <div
        className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-20"
        style={{ background: color }}
      />
    </motion.div>
  );
}

// ─── contract card ────────────────────────────────────────────────────────────

function ContractCard({
  item, index, onClick,
}: {
  item: DisplayItem; index: number; onClick: () => void;
}) {
  const accent = STATUS_ACCENT[item.status] ?? "#71717a";
  const initials = item.clientName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={`
        group relative overflow-hidden rounded-2xl border border-white/5
        bg-gradient-to-br ${item.statusBg}
        cursor-pointer transition-all duration-300
        hover:border-white/10 hover:shadow-xl
      `}
    >
      {/* top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accent }} />

      {/* source badge */}
      {item.source === "proposal" && (
        <div className="absolute top-3 right-3 text-[9px] px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 uppercase tracking-widest">
          Proposta
        </div>
      )}

      <div className="p-5 pt-6">
        {/* avatar + status */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: `${accent}30`, border: `1px solid ${accent}40` }}
          >
            {initials}
          </div>
          <span
            className={`text-[10px] px-2.5 py-1 rounded-full border ${item.statusColor} bg-white/5 font-medium`}
          >
            {item.statusLabel}
          </span>
        </div>

        {/* client */}
        <p className="text-white font-semibold text-sm leading-tight mb-0.5 truncate">
          {item.clientName}
        </p>
        <p className="text-zinc-500 text-xs truncate mb-4">{item.title}</p>

        {/* divider */}
        <div className="h-px bg-white/5 mb-4" />

        {/* footer */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-white font-bold text-base tracking-tight">{fmt(item.value)}</p>
            <p className="text-zinc-600 text-[11px] flex items-center gap-1">
              <Calendar size={10} />
              {fmtDate(item.createdAt)}
            </p>
          </div>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200
              group-hover:translate-x-1 group-hover:bg-white/10"
            style={{ background: `${accent}15` }}
          >
            <ArrowRight size={14} style={{ color: accent }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function ContratosPage() {
  const [, navigate] = useLocation();
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sortBy, setSortBy] = useState("recente");
  const [showSort, setShowSort] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setApiError(false);

      const [contractsResult, proposalsResult] = await Promise.allSettled([
        listContracts(),
        listProposals(),
      ]);

      if (cancelled) return;

      if (
        contractsResult.status === "rejected" &&
        proposalsResult.status === "rejected"
      ) {
        setApiError(true);
        setLoading(false);
        return;
      }

      const contractItems: DisplayItem[] =
        contractsResult.status === "fulfilled"
          ? contractsResult.value.map(contractToDisplay)
          : [];

      const contractIds = new Set(contractItems.map((c) => c.id));

      const proposalItems: DisplayItem[] =
        proposalsResult.status === "fulfilled"
          ? proposalsResult.value
              .filter((p) => !contractIds.has(p.id))
              .map(proposalToDisplay)
          : [];

      const merged = [...contractItems, ...proposalItems].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setItems(merged);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── stats ──
  const stats = useMemo(() => {
    const total = items.length;
    const assinados = items.filter((i) => i.status === "assinado").length;
    const finalizados = items.filter((i) => i.status === "finalizado").length;
    const rascunhos = items.filter((i) => i.status === "rascunho").length;
    const totalValue = items
      .filter((i) => i.status !== "cancelado")
      .reduce((acc, i) => {
        const n = parseFloat(String(i.value).replace(/[^\d.-]/g, ""));
        return acc + (isNaN(n) ? 0 : n);
      }, 0);
    return { total, assinados, finalizados, rascunhos, totalValue };
  }, [items]);

  // ── filtered + sorted ──
  const filtered = useMemo(() => {
    let result = items;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.clientName.toLowerCase().includes(q) ||
          i.title.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "todos") {
      result = result.filter((i) => i.status === statusFilter);
    }

    return [...result].sort((a, b) => {
      if (sortBy === "recente")
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "antigo")
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "valor_desc") {
        return (
          parseFloat(String(b.value).replace(/[^\d.-]/g, "")) -
          parseFloat(String(a.value).replace(/[^\d.-]/g, ""))
        );
      }
      if (sortBy === "valor_asc") {
        return (
          parseFloat(String(a.value).replace(/[^\d.-]/g, "")) -
          parseFloat(String(b.value).replace(/[^\d.-]/g, ""))
        );
      }
      if (sortBy === "cliente") return a.clientName.localeCompare(b.clientName);
      return 0;
    });
  }, [items, search, statusFilter, sortBy]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="noise-overlay" />

      {/* ── header ── */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between backdrop-blur-sm sticky top-0 z-40 bg-background/80">
        <div className="flex items-center gap-4">
          <Link href="/propostas">
            <span className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm cursor-pointer flex items-center gap-1.5">
              ← Propostas
            </span>
          </Link>
          <span className="text-white/10">|</span>
          <h1 className="font-display text-xl font-semibold">Contratos</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400">
            {items.length}
          </span>
        </div>
        <Button
          onClick={() => navigate("/contratos/novo")}
          className="px-6 py-2 rounded-full border bg-black/10 text-white border-white/10 text-[10px] uppercase tracking-[0.2em] hover:bg-accent hover:border-accent hover:text-white hover:shadow-[0_0_30px_rgba(255,102,0,0.4)] transition-all duration-500"
        >
          <Plus size={15} />
          Novo contrato
        </Button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">

        {/* ── stats grid ── */}
        {!loading && !apiError && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Total"
              value={stats.total}
              sub="contratos e propostas"
              color="#ff6600"
              icon={FileText}
            />
            <StatCard
              label="Assinados"
              value={stats.assinados}
              color="#10b981"
              icon={FileSignature}
            />
            <StatCard
              label="Em aberto"
              value={stats.rascunhos + stats.finalizados}
              color="#3b82f6"
              icon={Clock}
            />
            <StatCard
              label="Volume total"
              value={fmt(stats.totalValue)}
              color="#a855f7"
              icon={TrendingUp}
            />
          </div>
        )}

        {/* ── search + filters ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Buscar cliente ou contrato…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-zinc-900/60 border-white/5 focus:border-white/20 rounded-xl"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* sort */}
          <div className="relative">
            <button
              onClick={() => setShowSort(!showSort)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/5 bg-zinc-900/60 text-xs text-zinc-400 hover:text-zinc-200 hover:border-white/10 transition-all"
            >
              <SlidersHorizontal size={13} />
              {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
            </button>
            <AnimatePresence>
              {showSort && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-white/10 bg-zinc-900 shadow-2xl z-50 overflow-hidden"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortBy(opt.value); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                        sortBy === opt.value
                          ? "text-accent bg-accent/10"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── status filter pills ── */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(({ value, label, icon: Icon }) => {
            const active = statusFilter === value;
            const accent = STATUS_ACCENT[value] ?? "#ff6600";
            return (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 ${
                  active
                    ? "text-white border-transparent"
                    : "border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10 bg-zinc-900/40"
                }`}
                style={active ? { background: `${accent}25`, borderColor: `${accent}50`, color: accent } : {}}
              >
                <Icon size={11} />
                {label}
                {value !== "todos" && (
                  <span className="text-[10px] opacity-60">
                    ({items.filter((i) => i.status === value).length})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── content ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-52 rounded-2xl bg-zinc-900/60 animate-pulse border border-white/5"
              />
            ))}
          </div>
        ) : apiError ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <AlertCircle size={48} className="mx-auto mb-4 text-red-400/60" />
            <p className="text-zinc-300 text-lg mb-2">Não foi possível carregar</p>
            <p className="text-zinc-600 text-sm mb-8">Verifique sua conexão e tente novamente.</p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="border-white/10 hover:bg-white/5"
            >
              Tentar novamente
            </Button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 rounded-2xl border border-dashed border-white/5"
          >
            <FileText size={48} className="mx-auto mb-4 text-zinc-700" />
            <p className="text-zinc-400 text-lg mb-2">
              {search || statusFilter !== "todos"
                ? "Nenhum resultado encontrado"
                : "Nenhum contrato ainda"}
            </p>
            <p className="text-zinc-600 text-sm mb-8">
              {search || statusFilter !== "todos"
                ? "Tente ajustar os filtros."
                : "Crie seu primeiro contrato agora."}
            </p>
            {!search && statusFilter === "todos" && (
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={() => navigate("/contratos/novo")}
                  className="bg-accent hover:bg-accent/90 text-white gap-2 rounded-xl"
                >
                  <Plus size={15} />
                  Criar contrato
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/propostas")}
                  className="border-white/10 hover:bg-white/5 rounded-xl"
                >
                  Ver propostas
                </Button>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((item, i) => (
                <ContractCard
                  key={`${item.source}-${item.id}`}
                  item={item}
                  index={i}
                  onClick={() => navigate(`/contratos/${item.id}/editor`)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}