import { OctagonAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MccRunResult } from "@/lib/api/mcc";
import { cn } from "@/lib/utils";

type MccIssue = MccRunResult["draft"]["validationIssues"][number];

const ISSUE_STYLES: Record<MccIssue["severity"], string> = {
  info: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  error: "border-red-500/30 bg-red-500/10 text-red-300",
  blocker: "border-red-500/50 bg-red-500/15 text-red-200",
};

export function ValidationIssuesPanel({ issues, className }: { issues?: MccIssue[]; className?: string }) {
  const items = issues ?? [];

  return (
    <section className={cn("rounded-xl border border-border/40 bg-card/30 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <OctagonAlert size={16} className="text-red-300" />
            <p className="text-sm font-semibold text-foreground">Issues de validacao</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Bloqueios e lacunas juridicas retornados pelo MCC quando disponiveis.
          </p>
        </div>
        <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">
          {items.length}
        </Badge>
      </div>

      {items.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-border/40 bg-background/50 px-4 py-3 text-sm text-muted-foreground">
          Nenhuma issue de validacao retornada pelo backend atual.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((issue) => (
            <article key={issue.code} className="rounded-lg border border-border/40 bg-background/40 px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={ISSUE_STYLES[issue.severity]}>
                  {issue.severity}
                </Badge>
                {issue.blocking && (
                  <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-red-300">
                    Bloqueante
                  </Badge>
                )}
                <span className="text-[11px] text-muted-foreground">{issue.category}</span>
              </div>
              <p className="mt-2 text-sm text-foreground">{issue.userMessage}</p>
              {issue.recommendation && (
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{issue.recommendation}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

