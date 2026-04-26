import { GitBranch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MccRunResult } from "@/lib/api/mcc";
import { cn } from "@/lib/utils";

type MccDecision = MccRunResult["draft"]["decisions"][number];

export function DecisionLogPanel({ decisions, className }: { decisions?: MccDecision[]; className?: string }) {
  const items = decisions ?? [];

  return (
    <section className={cn("rounded-xl border border-border/40 bg-card/30 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-[#ff9a57]" />
            <p className="text-sm font-semibold text-foreground">Decision log explicavel</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Trilha de decisoes para auditoria e explicabilidade do MCC.
          </p>
        </div>
        <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">
          {items.length}
        </Badge>
      </div>

      {items.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-border/40 bg-background/50 px-4 py-3 text-sm text-muted-foreground">
          Decision log ainda nao retornado pelo backend atual.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((decision, index) => (
            <article key={`${decision.stage}-${decision.ruleId ?? index}`} className="rounded-lg border border-border/40 bg-background/40 px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-[#ff6600]/30 bg-[#ff6600]/10 text-[#ffb07a]">
                  {decision.stage}
                </Badge>
                {decision.ruleId && <span className="text-[11px] text-muted-foreground">{decision.ruleId}</span>}
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">{decision.summary}</p>
              {decision.rationale && (
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{decision.rationale}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

