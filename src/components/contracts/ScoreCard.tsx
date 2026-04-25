import { ShieldCheck } from "lucide-react";
import { cn } from "../../lib/utils";
import type { ContractScore } from "../../lib/api/types";

type ScoreLike = ContractScore | number | null | undefined;

function clampScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getOverall(score: ScoreLike): number | null {
  if (typeof score === "number") return clampScore(score);
  return clampScore(score?.overall ?? score?.value ?? score?.total);
}

const METRICS: Array<{ key: keyof ContractScore; fallback?: keyof ContractScore; label: string }> = [
  { key: "coverageLegal", fallback: "legalCoverage", label: "Cobertura legal" },
  { key: "financialProtection", label: "Protecao financeira" },
  { key: "clarity", label: "Clareza" },
  { key: "evidenceStrength", label: "Prova" },
  { key: "legalBalance", label: "Equilibrio" },
];

export function ScoreCard({
  score,
  className,
}: {
  score?: ScoreLike;
  className?: string;
}) {
  const overall = getOverall(score);
  if (overall === null) return null;

  const scoreObject = typeof score === "object" && score ? score : null;

  return (
    <section className={cn("rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-100">Score contratual</p>
          <p className="text-xs leading-5 text-emerald-100/75">Calculado pelo backend, exibido como leitura.</p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/25 bg-black/18 text-lg font-black text-emerald-100">
          {overall}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {METRICS.map(({ key, fallback, label }) => {
          const value = clampScore(scoreObject?.[key] ?? (fallback ? scoreObject?.[fallback] : undefined));
          if (value === null) return null;

          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-[11px] text-emerald-100/80">
                <span>{label}</span>
                <span>{value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/20">
                <div className="h-full rounded-full bg-emerald-300" style={{ width: `${value}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {scoreObject?.reasons?.length ? (
        <div className="mt-3 rounded-xl border border-emerald-400/15 bg-black/12 p-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-100">
            <ShieldCheck className="h-3.5 w-3.5" />
            Motivos do score
          </div>
          <ul className="space-y-1 text-xs leading-5 text-emerald-100/78">
            {scoreObject.reasons.slice(0, 3).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

