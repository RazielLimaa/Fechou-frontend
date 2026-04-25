import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { LEGAL_WARNING_LABELS, normalizeWarningSeverity } from "@/lib/legal-contracts";
import type { MccRunResult } from "@/lib/api/mcc";
import type { RiskWarningDefinition } from "@/types/legal-contracts";
import { cn } from "@/lib/utils";

export function RiskWarningsPanel({
  warnings,
  summary,
  className,
}: {
  warnings?: RiskWarningDefinition[];
  summary?: MccRunResult["summary"] | null;
  className?: string;
}) {
  const items = warnings ?? [];

  return (
    <section className={cn("rounded-xl border border-border/40 bg-card/30 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-300" />
            <p className="text-sm font-semibold text-foreground">Pontos de atencao</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Warnings retornados pelo backend antes de assinar, enviar ou gerar PDF.
          </p>
        </div>
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">
          {summary?.warnings ?? items.length}
        </Badge>
      </div>

      {items.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-border/40 bg-background/50 px-4 py-3 text-sm text-muted-foreground">
          Nenhum warning retornado para este contexto.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((warning, index) => {
            const severity = normalizeWarningSeverity(warning.severity);
            return (
              <article key={warning.id ?? warning.code ?? `${warning.message}-${index}`} className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                    {LEGAL_WARNING_LABELS[severity]}
                  </Badge>
                  {warning.code && <span className="text-[11px] text-muted-foreground">{warning.code}</span>}
                </div>
                {(warning.title || warning.message) && (
                  <p className="mt-2 text-sm text-foreground">{warning.title ?? warning.message}</p>
                )}
                {warning.title && warning.message && (
                  <p className="mt-1 text-sm text-muted-foreground">{warning.message}</p>
                )}
                {warning.recommendation && (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    <span className="font-medium text-foreground">Revisao recomendada:</span> {warning.recommendation}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

