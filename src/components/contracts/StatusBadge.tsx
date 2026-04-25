import { CheckCircle2, Clock3, FileText, ShieldCheck, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";

const STATUS_STYLES: Record<string, string> = {
  rascunho: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  draft: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  review: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  pending_signature: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  finalizado: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  finalized: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  assinado: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  signed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  cancelado: "border-red-500/30 bg-red-500/10 text-red-300",
  cancelled: "border-red-500/30 bg-red-500/10 text-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  draft: "Rascunho",
  review: "Em revisao",
  pending_signature: "Aguardando assinatura",
  finalizado: "Finalizado",
  finalized: "Finalizado",
  assinado: "Assinado",
  signed: "Assinado",
  cancelado: "Cancelado",
  cancelled: "Cancelado",
};

function getIcon(status: string) {
  if (status === "signed" || status === "assinado") return CheckCircle2;
  if (status === "finalized" || status === "finalizado") return ShieldCheck;
  if (status === "cancelled" || status === "cancelado") return XCircle;
  if (status === "pending_signature") return Clock3;
  return FileText;
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status?: string | null;
  label?: string;
  className?: string;
}) {
  const normalized = (status ?? "draft").toLowerCase();
  const Icon = getIcon(normalized);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        STATUS_STYLES[normalized] ?? "border-border/40 bg-background/60 text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label ?? STATUS_LABELS[normalized] ?? normalized}</span>
    </span>
  );
}

