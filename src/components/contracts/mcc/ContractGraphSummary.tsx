import { Network } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MccRunResult } from "@/lib/api/mcc";
import { cn } from "@/lib/utils";

type MccGraph = MccRunResult["draft"]["graph"];

export function ContractGraphSummary({ graph, className }: { graph?: MccGraph | null; className?: string }) {
  const nodeEntries = Object.entries(graph?.nodes ?? {});
  const edges = graph?.edges ?? [];

  return (
    <section className={cn("rounded-xl border border-border/40 bg-card/30 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Network size={16} className="text-violet-300" />
            <p className="text-sm font-semibold text-foreground">Contract graph</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Estrutura viva do contrato: nucleo, financeiro, execucao, risco, legal, disputas e anexos.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">
            {nodeEntries.length} nos
          </Badge>
          <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">
            {edges.length} links
          </Badge>
        </div>
      </div>

      {nodeEntries.length === 0 && edges.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-border/40 bg-background/50 px-4 py-3 text-sm text-muted-foreground">
          Graph contratual ainda nao retornado pelo backend atual.
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {nodeEntries.slice(0, 8).map(([key]) => (
            <div key={key} className="rounded-lg border border-border/40 bg-background/40 px-3 py-2 text-sm text-foreground">
              {key}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

