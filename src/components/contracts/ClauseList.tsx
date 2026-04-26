import { FileText } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ClauseListItem {
  id?: string | number;
  title: string;
  category?: string;
  required?: boolean;
  riskLevel?: string;
  orderIndex?: number;
}

export function ClauseList({
  clauses,
  title = "Clausulas",
  className,
}: {
  clauses?: ClauseListItem[];
  title?: string;
  className?: string;
}) {
  if (!clauses?.length) return null;

  return (
    <section className={cn("rounded-2xl border border-border/40 bg-background/55 p-3", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">{title}</p>
        </div>
        <span className="rounded-full border border-border/40 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
          {clauses.length}
        </span>
      </div>

      <div className="space-y-2">
        {clauses.map((clause, index) => (
          <article key={String(clause.id ?? `${clause.title}-${index}`)} className="rounded-xl border border-border/30 bg-black/10 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-sm font-semibold leading-5 text-foreground">{clause.title}</p>
              {clause.required && (
                <span className="shrink-0 rounded-full border border-[#ff6600]/30 bg-[#ff6600]/10 px-2 py-0.5 text-[10px] font-semibold text-[#ffb07a]">
                  Obrigatoria
                </span>
              )}
            </div>
            {(clause.category || clause.riskLevel) && (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {[clause.category, clause.riskLevel ? `Risco ${clause.riskLevel}` : null].filter(Boolean).join(" - ")}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

