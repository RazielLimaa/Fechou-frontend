import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { LEGAL_WARNING_LABELS, normalizeWarningSeverity } from "@/lib/legal-contracts";
import { cn } from "@/lib/utils";
import type { RiskWarningDefinition } from "@/types/legal-contracts";

type LegalWarningsListProps = {
  warnings: RiskWarningDefinition[];
  title?: string;
  emptyMessage?: string;
};

const severityConfig = {
  info: {
    icon: Info,
    badgeClassName: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    cardClassName: "border-blue-500/20 bg-blue-500/5",
    iconClassName: "text-blue-300",
  },
  warning: {
    icon: AlertTriangle,
    badgeClassName: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    cardClassName: "border-amber-500/20 bg-amber-500/5",
    iconClassName: "text-amber-300",
  },
  critical: {
    icon: ShieldAlert,
    badgeClassName: "border-red-500/40 bg-red-500/10 text-red-300",
    cardClassName: "border-red-500/30 bg-red-500/10 shadow-[0_0_0_1px_rgba(239,68,68,0.12)]",
    iconClassName: "text-red-300",
  },
} as const;

export function LegalWarningsList({
  warnings,
  title = "Warnings juridicos",
  emptyMessage = "Nenhum warning juridico para este contexto.",
}: LegalWarningsListProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">
            Validacoes retornadas pelo backend para esse contexto.
          </p>
        </div>
        <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">
          {warnings.length}
        </Badge>
      </div>

      {warnings.length === 0 ? (
        <div className="rounded-lg border border-border/40 bg-card/30 px-4 py-3 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">
          {warnings.map((warning, index) => {
            const severity = normalizeWarningSeverity(warning.severity);
            const config = severityConfig[severity];
            const Icon = config.icon;

            return (
              <div
                key={warning.id ?? `${warning.message}-${index}`}
                className={cn("rounded-lg border px-4 py-3", config.cardClassName)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5", config.iconClassName)}>
                    <Icon size={16} />
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn("border", config.badgeClassName)}>
                        {LEGAL_WARNING_LABELS[severity]}
                      </Badge>
                    </div>

                    <p className="text-sm text-foreground">{warning.message}</p>

                    {warning.recommendation && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Recomendacao:</span>{" "}
                        {warning.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
