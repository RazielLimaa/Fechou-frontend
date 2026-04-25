import { Fingerprint } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MccRunResult } from "@/lib/api/mcc";
import type { LegalBlueprintResponse } from "@/types/legal-contracts";
import { cn } from "@/lib/utils";

type EvidenceProfile = NonNullable<MccRunResult["draft"]["evidenceProfile"]>;

const SIGNATURE_LABELS: Record<EvidenceProfile["recommendedSignature"], string> = {
  simple: "Simples",
  advanced: "Avancada",
  qualified: "Qualificada",
};

const WITNESS_LABELS: Record<EvidenceProfile["witnesses"], string> = {
  not_needed: "Nao indicada",
  recommended: "Recomendada",
  required_for_target: "Necessaria para o objetivo",
};

export function EvidenceProfilePanel({
  profile,
  evidencePack,
  className,
}: {
  profile?: EvidenceProfile | null;
  evidencePack?: LegalBlueprintResponse["evidencePack"] | null;
  className?: string;
}) {
  const events = profile?.requiredEvents ?? evidencePack?.events ?? [];

  return (
    <section className={cn("rounded-xl border border-border/40 bg-card/30 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Fingerprint size={16} className="text-sky-300" />
            <p className="text-sm font-semibold text-foreground">Forca probatoria</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Estrutura para assinatura, evidencias e lastro probatorio retornados pelo MCC.
          </p>
        </div>
        {evidencePack?.hashAlgorithm && (
          <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">
            {evidencePack.hashAlgorithm}
          </Badge>
        )}
      </div>

      {!profile && !evidencePack ? (
        <div className="mt-3 rounded-lg border border-dashed border-border/40 bg-background/50 px-4 py-3 text-sm text-muted-foreground">
          Evidence profile ainda nao retornado pelo backend.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {profile && (
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Assinatura</p>
                <p className="mt-1 text-sm font-medium text-foreground">{SIGNATURE_LABELS[profile.recommendedSignature]}</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Testemunhas</p>
                <p className="mt-1 text-sm font-medium text-foreground">{WITNESS_LABELS[profile.witnesses]}</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Titulo executivo</p>
                <p className="mt-1 text-sm font-medium text-foreground">{profile.executiveTitleReadiness}</p>
              </div>
            </div>
          )}

          {events.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Eventos/evidencias</p>
              {events.slice(0, 6).map((event, index) => (
                <div key={index} className="rounded-lg border border-border/40 bg-background/40 px-3 py-2 text-sm text-foreground">
                  {typeof event === "string"
                    ? event
                    : typeof event === "object" && event !== null && "title" in event
                    ? String(event.title)
                    : `Evento ${index + 1}`}
                </div>
              ))}
            </div>
          )}

          {profile?.notes.length ? (
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-3 text-sm text-sky-100">
              {profile.notes.slice(0, 3).map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

