import { CheckCircle2, Clock3, Fingerprint } from "lucide-react";
import { cn } from "../../lib/utils";
import type { EvidenceEvent, EvidenceProfile } from "../../lib/api/types";

function formatTimestamp(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getEventTitle(event: EvidenceEvent): string {
  return event.title ?? event.name ?? event.type ?? event.key ?? "Evento probatorio";
}

export function EvidenceTimeline({
  profile,
  className,
}: {
  profile?: EvidenceProfile | null;
  className?: string;
}) {
  const events = profile?.events ?? [];
  const hasSummary =
    Boolean(profile?.signatureLevel) ||
    Boolean(profile?.hashAlgorithm) ||
    Boolean(profile?.witnessesRecommended) ||
    Boolean(profile?.witnessesRequired) ||
    Boolean(profile?.gaps?.length) ||
    Boolean(profile?.requirements?.length);

  if (!events.length && !hasSummary) return null;

  return (
    <section className={cn("rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3", className)}>
      <div className="mb-3 flex items-start gap-2">
        <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-sky-200" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-sky-100">Forca probatoria</p>
          <p className="text-xs leading-5 text-sky-100/75">Evidencias e lacunas retornadas pelo backend.</p>
        </div>
      </div>

      {hasSummary && (
        <div className="mb-3 grid grid-cols-1 gap-2 text-xs text-sky-100/80 sm:grid-cols-2">
          {profile?.signatureLevel && <span className="rounded-xl bg-black/12 px-2.5 py-2">Assinatura: {profile.signatureLevel}</span>}
          {profile?.hashAlgorithm && <span className="rounded-xl bg-black/12 px-2.5 py-2">Hash: {profile.hashAlgorithm}</span>}
          {profile?.witnessesRecommended && <span className="rounded-xl bg-black/12 px-2.5 py-2">Testemunhas recomendadas</span>}
          {profile?.witnessesRequired && <span className="rounded-xl bg-black/12 px-2.5 py-2">Testemunhas exigidas</span>}
        </div>
      )}

      {events.length > 0 && (
        <div className="space-y-2">
          {events.map((event, index) => {
            const timestamp = formatTimestamp(event.timestamp ?? event.createdAt);
            const Icon = event.verified ? CheckCircle2 : Clock3;

            return (
              <article key={String(event.id ?? event.key ?? index)} className="flex gap-2 rounded-xl bg-black/12 p-2.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-sky-200" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-5 text-sky-100">{getEventTitle(event)}</p>
                  {(event.description || event.actor || timestamp) && (
                    <p className="text-xs leading-5 text-sky-100/72">
                      {[event.description, event.actor, timestamp].filter(Boolean).join(" - ")}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {profile?.gaps?.length ? (
        <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5 text-xs leading-5 text-amber-100">
          {profile.gaps.slice(0, 3).map((gap) => (
            <p key={gap}>{gap}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

