import { AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "../../lib/utils";
import type { RiskProfile, RiskWarning } from "../../lib/api/types";

const RISK_STYLES: Record<string, string> = {
  baixo: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
  low: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
  medio: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  alto: "border-red-500/35 bg-red-500/10 text-red-200",
  high: "border-red-500/35 bg-red-500/10 text-red-200",
  critical: "border-red-500/45 bg-red-500/15 text-red-100",
};

export function RiskAlert({
  riskProfile,
  warnings,
  className,
}: {
  riskProfile?: RiskProfile | null;
  warnings?: RiskWarning[];
  className?: string;
}) {
  const visibleWarnings = warnings?.filter((warning) => warning.message) ?? [];
  if (!riskProfile && visibleWarnings.length === 0) return null;

  const level = (riskProfile?.level ?? visibleWarnings[0]?.severity ?? "medio").toLowerCase();

  return (
    <section
      className={cn(
        "rounded-2xl border p-3",
        RISK_STYLES[level] ?? RISK_STYLES.medio,
        className,
      )}
    >
      <div className="flex items-start gap-2">
        {riskProfile?.blocked ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
        <div className="min-w-0 space-y-2">
          <div>
            <p className="text-sm font-semibold">
              {riskProfile?.blocked ? "Bloqueio juridico retornado pelo backend" : "Alertas de risco"}
            </p>
            {riskProfile?.summary && (
              <p className="mt-1 text-xs leading-5 opacity-85">{riskProfile.summary}</p>
            )}
          </div>

          {visibleWarnings.length > 0 && (
            <div className="space-y-2">
              {visibleWarnings.map((warning, index) => (
                <div key={String(warning.id ?? `${warning.message}-${index}`)} className="rounded-xl bg-black/12 p-2.5">
                  <p className="text-xs font-semibold leading-5">{warning.message}</p>
                  {warning.recommendation && (
                    <p className="mt-1 text-xs leading-5 opacity-85">{warning.recommendation}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

