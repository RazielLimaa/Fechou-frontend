import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MccRunResult } from "@/lib/api/mcc";
import { cn } from "@/lib/utils";

type MccScore = NonNullable<MccRunResult["draft"]["score"]>;

const SCORE_DIMENSIONS: Array<{ key: keyof MccScore["dimensions"]; label: string }> = [
  { key: "legalCoverage", label: "Cobertura legal" },
  { key: "financialProtection", label: "Protecao financeira" },
  { key: "clarity", label: "Clareza" },
  { key: "evidence", label: "Prova" },
  { key: "legalBalance", label: "Equilibrio juridico" },
];

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function ContractScorePanel({ score, className }: { score?: MccScore | null; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border/40 bg-card/30 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-300" />
            <p className="text-sm font-semibold text-foreground">Score contratual</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Quando o MCC completo retornar score, ele aparece aqui como indicador de robustez, nao como garantia juridica.
          </p>
        </div>
        {score && (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            Nota {score.grade}
          </Badge>
        )}
      </div>

      {!score ? (
        <div className="mt-3 rounded-lg border border-dashed border-border/40 bg-background/50 px-4 py-3 text-sm text-muted-foreground">
          Score ainda nao retornado pelo backend atual.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <span className="text-3xl font-semibold text-foreground">{clamp(score.total)}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
          {SCORE_DIMENSIONS.map((dimension) => {
            const value = clamp(score.dimensions[dimension.key]);
            return (
              <div key={dimension.key} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{dimension.label}</span>
                  <span>{value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-background">
                  <div className="h-full rounded-full bg-emerald-300" style={{ width: `${value}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

