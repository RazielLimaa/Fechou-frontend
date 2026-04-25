import { BookCopy, DatabaseZap, GitBranch, Loader2, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  EvidenceEventDefinition,
  LegalBlueprintResponse,
  LegalDecisionRule,
  OfficialLegalSource,
} from "@/types/legal-contracts";

type LegalBlueprintDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blueprint: LegalBlueprintResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

function getSourceTitle(source: OfficialLegalSource): string {
  return source.title ?? source.reference ?? source.citation ?? source.issuer ?? "Fonte oficial";
}

function getRuleTitle(rule: LegalDecisionRule): string {
  return rule.title ?? rule.when ?? rule.outcome ?? "Regra juridica";
}

function getEventTitle(event: EvidenceEventDefinition): string {
  return event.title ?? event.name ?? event.event ?? event.key ?? "Evento";
}

export function LegalBlueprintDialog({
  open,
  onOpenChange,
  blueprint,
  loading,
  error,
  onRetry,
}: LegalBlueprintDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden border-border/60 bg-background p-0">
        <DialogHeader className="border-b border-border/40 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookCopy size={18} className="text-accent" />
            Blueprint juridico
          </DialogTitle>
          <DialogDescription>
            Visao informativa do motor juridico curado, das fontes oficiais e do blueprint de evidence pack.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-96px)]">
          <div className="space-y-6 px-6 py-5">
            {loading ? (
              <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/30 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                Carregando blueprint juridico...
              </div>
            ) : error ? (
              <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4">
                <p className="text-sm text-destructive/90">{error}</p>
                <Button size="sm" variant="outline" className="border-destructive/30" onClick={onRetry}>
                  Tentar novamente
                </Button>
              </div>
            ) : !blueprint ? (
              <div className="rounded-lg border border-border/40 bg-card/30 px-4 py-3 text-sm text-muted-foreground">
                Nenhum blueprint carregado ate o momento.
              </div>
            ) : (
              <>
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-accent" />
                    <h3 className="text-sm font-semibold text-foreground">Fontes oficiais</h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {blueprint.sources.map((source, index) => (
                      <div key={`${getSourceTitle(source)}-${index}`} className="rounded-lg border border-border/40 bg-card/30 p-4">
                        <p className="text-sm font-medium text-foreground">{getSourceTitle(source)}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {source.issuer && <Badge variant="outline" className="border-border/40 bg-background/60">{source.issuer}</Badge>}
                          {source.jurisdiction && <Badge variant="outline" className="border-border/40 bg-background/60">{source.jurisdiction}</Badge>}
                          {source.type && <Badge variant="outline" className="border-border/40 bg-background/60">{source.type}</Badge>}
                        </div>
                        {(source.summary || source.note) && (
                          <p className="mt-3 text-sm text-muted-foreground">{source.summary ?? source.note}</p>
                        )}
                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex text-sm text-accent hover:underline"
                          >
                            Abrir referencia
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <GitBranch size={16} className="text-accent" />
                    <h3 className="text-sm font-semibold text-foreground">Regras do motor juridico</h3>
                  </div>
                  <div className="space-y-3">
                    {blueprint.decisionRules.map((rule, index) => (
                      <div key={`${getRuleTitle(rule)}-${index}`} className="rounded-lg border border-border/40 bg-card/30 p-4">
                        <p className="text-sm font-medium text-foreground">{getRuleTitle(rule)}</p>
                        {(rule.description || rule.rationale) && (
                          <p className="mt-2 text-sm text-muted-foreground">{rule.description ?? rule.rationale}</p>
                        )}
                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                          {rule.when && <p><span className="font-medium text-foreground">Quando:</span> {rule.when}</p>}
                          {rule.then && <p><span className="font-medium text-foreground">Entao:</span> {rule.then}</p>}
                          {rule.outcome && <p><span className="font-medium text-foreground">Resultado:</span> {rule.outcome}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DatabaseZap size={16} className="text-accent" />
                    <h3 className="text-sm font-semibold text-foreground">Evidence pack</h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-border/40 bg-card/30 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Hash</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{blueprint.evidencePack.hashAlgorithm}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-card/30 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Append-only log</p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {blueprint.evidencePack.appendOnlyLog ? "Ativado" : "Nao informado"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-card/30 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Exportacoes</p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {blueprint.evidencePack.exportFormats.join(", ") || "Sem formatos informados"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {blueprint.evidencePack.events.map((event, index) => (
                      <div key={`${getEventTitle(event)}-${index}`} className="rounded-lg border border-border/40 bg-card/30 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{getEventTitle(event)}</p>
                          {event.required && (
                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                              Obrigatorio
                            </Badge>
                          )}
                        </div>
                        {event.description && (
                          <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Recomendacoes de versionamento</h3>
                  <div className="space-y-2">
                    {blueprint.versioningRecommendations.map((item, index) => (
                      <div key={`${item}-${index}`} className="rounded-lg border border-border/40 bg-card/30 px-4 py-3 text-sm text-muted-foreground">
                        {item}
                      </div>
                    ))}
                  </div>
                </section>

                {blueprint.migrationRecommendations.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Base para migracoes futuras</h3>
                    <div className="space-y-2">
                      {blueprint.migrationRecommendations.map((item, index) => (
                        <div key={`${item}-${index}`} className="rounded-lg border border-border/40 bg-card/30 px-4 py-3 text-sm text-muted-foreground">
                          {item}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
