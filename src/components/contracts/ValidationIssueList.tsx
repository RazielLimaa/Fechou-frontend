import { AlertCircle, AlertTriangle, Info, OctagonAlert } from "lucide-react";
import { cn } from "../../lib/utils";
import type { ValidationIssue } from "../../lib/api/types";

const ISSUE_STYLES: Record<string, string> = {
  info: "border-sky-500/25 bg-sky-500/10 text-sky-200",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  error: "border-red-500/30 bg-red-500/10 text-red-200",
  critical: "border-red-500/40 bg-red-500/15 text-red-100",
  blocking: "border-red-500/50 bg-red-500/20 text-red-100",
};

function getIssueIcon(severity?: string) {
  const normalized = (severity ?? "info").toLowerCase();
  if (normalized === "critical" || normalized === "blocking") return OctagonAlert;
  if (normalized === "error") return AlertCircle;
  if (normalized === "warning") return AlertTriangle;
  return Info;
}

export function ValidationIssueList({
  issues,
  className,
}: {
  issues?: ValidationIssue[];
  className?: string;
}) {
  if (!issues?.length) return null;

  return (
    <section className={cn("rounded-2xl border border-border/40 bg-background/55 p-3", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Validacoes do backend</p>
          <p className="text-xs leading-5 text-muted-foreground">Pendencias reais retornadas pela API.</p>
        </div>
        <span className="rounded-full border border-border/40 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
          {issues.length}
        </span>
      </div>

      <div className="space-y-2">
        {issues.map((issue, index) => {
          const severity = (issue.severity ?? "info").toLowerCase();
          const Icon = getIssueIcon(severity);

          return (
            <article
              key={String(issue.id ?? issue.code ?? `${issue.message}-${index}`)}
              className={cn(
                "rounded-xl border p-3",
                ISSUE_STYLES[severity] ?? ISSUE_STYLES.info,
              )}
            >
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold leading-5">{issue.message}</p>
                  {(issue.category || issue.impact) && (
                    <p className="text-xs leading-5 opacity-80">
                      {[issue.category, issue.impact].filter(Boolean).join(" - ")}
                    </p>
                  )}
                  {issue.recommendation && (
                    <p className="text-xs leading-5 opacity-90">{issue.recommendation}</p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

