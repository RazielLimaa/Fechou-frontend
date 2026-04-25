"use client";

import { Search, Sparkles, FileText, Loader2, Save } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { ScrollArea } from "../../ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../ui/accordion";
import { Textarea } from "../../ui/textarea";
import { LegalWarningsList } from "./LegalWarningsList";
import { LegalClausesList } from "./LegalClausesList";
import { EvidenceTimeline } from "../EvidenceTimeline";
import { RiskAlert } from "../RiskAlert";
import { ScoreCard } from "../ScoreCard";
import { ValidationIssueList } from "../ValidationIssueList";
import type { ClauseTemplate, ContractClause, ContractClauseSuggestion } from "../../../service/contracts";
import type { ContractInsights } from "../../../lib/api/types";
import type { AutoGenerateContractResponse } from "../../../types/legal-contracts";

type ClauseExplorerTab = "contrato" | "sugestoes" | "preview";

interface ContractClauseWorkspaceProps {
  clauses: ContractClause[];
  filteredContractClauses: ContractClause[];
  suggestedClauses: ContractClauseSuggestion[];
  filteredSuggestedClauses: ContractClauseSuggestion[];
  hiddenContractClauses: ContractClause[];
  previewOnlySuggestedClauses: ContractClauseSuggestion[];
  clauseIdsInContract: string[];
  clauseSearch: string;
  clauseExplorerTab: ClauseExplorerTab;
  selectedClause: ContractClause | null;
  editContent: string;
  savingClause: boolean;
  autoGenerateResult: AutoGenerateContractResponse | null;
  onSearchChange: (value: string) => void;
  onClauseExplorerTabChange: (value: ClauseExplorerTab) => void;
  onSelectClause: (clause: ContractClause) => void;
  onTogglePreviewClause: (clauseId: string, inContract: boolean) => void;
  onMoveClause: (rowIndex: number, direction: -1 | 1) => void;
  onRemoveClause: (rowId: number) => void;
  onAddSuggestion: (suggestion: ContractClauseSuggestion) => void;
  onEditContentChange: (value: string) => void;
  onSaveClause: () => void;
  onCloseEditor: () => void;
  onOpenLegalContext: () => void;
  isAlreadyAdded: (templateId: string | number) => boolean;
  isClauseVisibleInPreview: (clauseId: string, inContract: boolean) => boolean;
}

export function ContractClauseWorkspace({
  clauses,
  filteredContractClauses,
  suggestedClauses,
  filteredSuggestedClauses,
  hiddenContractClauses,
  previewOnlySuggestedClauses,
  clauseIdsInContract,
  clauseSearch,
  clauseExplorerTab,
  selectedClause,
  editContent,
  savingClause,
  autoGenerateResult,
  onSearchChange,
  onClauseExplorerTabChange,
  onSelectClause,
  onTogglePreviewClause,
  onMoveClause,
  onRemoveClause,
  onAddSuggestion,
  onEditContentChange,
  onSaveClause,
  onCloseEditor,
  onOpenLegalContext,
  isAlreadyAdded,
  isClauseVisibleInPreview,
}: ContractClauseWorkspaceProps) {
  return (
    <div className="grid h-full min-h-0 gap-4 p-4 2xl:grid-cols-[minmax(280px,0.92fr)_minmax(0,1.08fr)]">
      <section className="flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-xl border border-border/40 bg-background/60">
        <div className="border-b border-border/40 p-4">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Mapa de clausulas</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Procure rapido, escolha uma vista e abra so o que interessa. A ideia aqui eh encontrar uma clausula sem rolar a pagina inteira.
          </p>
          <div className="relative mt-3">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={clauseSearch}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar por titulo ou ID da clausula"
              className="h-10 border-border/40 bg-background/70 pl-9 text-sm"
            />
          </div>
        </div>

        <Tabs value={clauseExplorerTab} onValueChange={(value) => onClauseExplorerTabChange(value as ClauseExplorerTab)} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border/40 px-3 py-3">
            <TabsList className="grid h-auto w-full grid-cols-3 bg-background/80">
              <TabsTrigger value="contrato" className="px-2 text-xs">Contrato</TabsTrigger>
              <TabsTrigger value="sugestoes" className="px-2 text-xs">Sugestoes</TabsTrigger>
              <TabsTrigger value="preview" className="px-2 text-xs">Preview</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="contrato" className="mt-0 min-h-0 flex-1">
            <ScrollArea className="h-[360px] sm:h-[420px] 2xl:h-full">
              <div className="space-y-2 p-3">
                {filteredContractClauses.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/40 bg-background/40 p-4 text-sm text-muted-foreground">
                    Nenhuma clausula encontrada. Quando voce adiciona uma clausula ao contrato, ela aparece aqui para edicao, ordem e controle de preview.
                  </div>
                ) : filteredContractClauses.map((clause) => {
                  const clauseId = String(clause.clauseId ?? clause.id);
                  const visibleInPreview = isClauseVisibleInPreview(clauseId, true);
                  const rowIndex = clauses.findIndex((item) => item.id === clause.id);
                  const isSelected = selectedClause?.id === clause.id;
                  return (
                  <div key={clause.id} className={`w-full rounded-xl border p-3 transition-colors ${isSelected ? "border-accent/50 bg-accent/10" : "border-border/30 bg-background/40 hover:border-border/60"}`}>
                      <button type="button" onClick={() => onSelectClause(clause)} className="w-full text-left">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">#{rowIndex + 1}</Badge>
                              <p className="break-words text-sm font-semibold text-foreground">{clause.title}</p>
                            </div>
                            <p className="text-xs leading-5 text-muted-foreground">Clique para editar o texto salvo desta clausula e controlar como ela entra no preview oficial.</p>
                          </div>
                          <Badge variant="outline" className={visibleInPreview ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-border/40 bg-background/60 text-muted-foreground"}>
                            {visibleInPreview ? "No preview" : "Oculta"}
                          </Badge>
                        </div>
                      </button>
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        <Button type="button" variant="outline" size="sm" className="h-8 w-full min-w-0 justify-center border-border/40 px-2" onClick={() => onSelectClause(clause)}>Editar</Button>
                        <Button type="button" variant="outline" size="sm" className="h-8 w-full min-w-0 justify-center border-border/40 px-2" onClick={() => onTogglePreviewClause(clauseId, true)}>{visibleInPreview ? "Ocultar" : "Mostrar"}</Button>
                        <Button type="button" variant="outline" size="sm" className="h-8 w-full min-w-0 justify-center border-border/40 px-2" onClick={() => onMoveClause(rowIndex, -1)} disabled={rowIndex === 0}>Subir</Button>
                        <Button type="button" variant="outline" size="sm" className="h-8 w-full min-w-0 justify-center border-border/40 px-2" onClick={() => onMoveClause(rowIndex, 1)} disabled={rowIndex === clauses.length - 1}>Descer</Button>
                        <Button type="button" variant="outline" size="sm" className="h-8 w-full min-w-0 justify-center border-destructive/30 px-2 text-destructive hover:bg-destructive/10" onClick={() => onRemoveClause(clause.id)}>Remover</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="sugestoes" className="mt-0 min-h-0 flex-1">
            <ScrollArea className="h-[360px] sm:h-[420px] 2xl:h-full">
              <div className="space-y-2 p-3">
                {filteredSuggestedClauses.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/40 bg-background/40 p-4 text-sm text-muted-foreground">
                    Nenhuma sugestao encontrada. Quando o backend sugerir clausulas, elas aparecerao aqui como curadoria visual.
                  </div>
                ) : filteredSuggestedClauses.map((suggestion) => {
                  const alreadyAdded = isAlreadyAdded(suggestion.id);
                  const visibleInPreview = isClauseVisibleInPreview(suggestion.id, alreadyAdded || clauseIdsInContract.includes(suggestion.id));
                  return (
                    <div key={suggestion.id} className="w-full rounded-xl border border-border/30 bg-background/40 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-words text-sm font-semibold text-foreground">{suggestion.title}</p>
                            <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">{suggestion.id}</Badge>
                          </div>
                          <p className="text-xs leading-5 text-muted-foreground">Sugestao visual do backend. O usuario decide se ela entra de vez no contrato ou so influencia o preview.</p>
                        </div>
                        <Badge variant="outline" className={alreadyAdded ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-border/40 bg-background/60 text-muted-foreground"}>
                          {alreadyAdded ? "Ja no contrato" : "Sugestao"}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Button type="button" size="sm" className="h-8 w-full sm:w-auto" disabled={alreadyAdded} onClick={() => onAddSuggestion(suggestion)}>
                          {alreadyAdded ? "No contrato" : "Adicionar ao contrato"}
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="h-8 w-full border-border/40 sm:w-auto" onClick={() => onTogglePreviewClause(suggestion.id, alreadyAdded)}>
                          {visibleInPreview ? "Ocultar do preview" : "Mostrar no preview"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preview" className="mt-0 min-h-0 flex-1">
            <ScrollArea className="h-[360px] sm:h-[420px] 2xl:h-full">
              <div className="space-y-3 p-3">
                <div className="rounded-xl border border-border/30 bg-background/40 p-4">
                  <p className="text-sm font-semibold text-foreground">Como essa aba funciona</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Clausulas do contrato aparecem por padrao no preview. Aqui voce so ve as excecoes: o que foi escondido manualmente e o que foi incluido sem entrar no contrato.</p>
                </div>
                {hiddenContractClauses.filter((clause) => !clauseSearch || clause.title.toLowerCase().includes(clauseSearch)).map((clause) => (
                  <div key={`hidden-${clause.id}`} className="rounded-xl border border-border/30 bg-background/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{clause.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Continua no contrato, mas nao aparece no preview oficial.</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="h-8 border-border/40" onClick={() => onTogglePreviewClause(String(clause.clauseId ?? clause.id), true)}>Reexibir</Button>
                    </div>
                  </div>
                ))}
                {previewOnlySuggestedClauses.filter((suggestion) => !clauseSearch || suggestion.title.toLowerCase().includes(clauseSearch)).map((suggestion) => (
                  <div key={`preview-${suggestion.id}`} className="rounded-xl border border-border/30 bg-background/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{suggestion.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Esta clausula aparece no preview, mas ainda nao foi adicionada formalmente ao contrato.</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="h-8 border-border/40" onClick={() => onTogglePreviewClause(suggestion.id, false)}>Remover do preview</Button>
                    </div>
                  </div>
                ))}
                {hiddenContractClauses.length === 0 && previewOnlySuggestedClauses.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border/40 bg-background/40 p-4 text-sm text-muted-foreground">
                    Nenhuma excecao de preview configurada ate agora.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </section>

      <section className="flex min-h-[360px] min-w-0 flex-col gap-4">
        {selectedClause ? (
          <div className="rounded-xl border border-border/40 bg-background/60 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Editar clausula selecionada</p>
              <p className="text-xs leading-5 text-muted-foreground">{selectedClause.title}. Edite o texto customizado desta clausula e salve para refletir no preview oficial.</p>
            </div>
            <Textarea value={editContent} onChange={(event) => onEditContentChange(event.target.value)} rows={12} className="mt-4 border-border/40 bg-background/60 text-sm" />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" className="gap-2" onClick={onSaveClause} disabled={savingClause}>
                {savingClause ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {savingClause ? "Salvando..." : "Salvar clausula"}
              </Button>
              <Button type="button" variant="outline" className="border-border/40" onClick={onCloseEditor}>Fechar editor</Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border/40 bg-background/60 p-4">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-accent" />
              <p className="text-sm font-semibold text-foreground">O que cada area faz</p>
            </div>
            <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
              {clauseExplorerTab === "contrato" && <p>Aqui ficam as clausulas que ja fazem parte do contrato. Abra uma delas para editar texto, reorganizar ordem e decidir se ela aparece no preview.</p>}
              {clauseExplorerTab === "sugestoes" && <p>Esta lista mostra apenas sugestoes do backend. Elas ajudam a curadoria juridica, mas nao entram sozinhas no contrato.</p>}
              {clauseExplorerTab === "preview" && <p>Esta aba resume as excecoes do preview. Ela deixa visualmente claro o que foi escondido ou exibido a mais no documento final.</p>}
            </div>
          </div>
        )}

        <Accordion type="multiple" defaultValue={autoGenerateResult ? ["warnings", "preview-text"] : ["guide"]} className="rounded-xl border border-border/40 bg-background/60 px-4">
          {autoGenerateResult ? (
            <>
              <AccordionItem value="warnings" className="border-border/30">
                <AccordionTrigger className="py-4 hover:no-underline"><div><p className="text-left text-sm font-semibold text-foreground">Warnings juridicos</p><p className="mt-1 text-left text-xs text-muted-foreground">Alertas e recomendacoes do backend para revisao antes de fechar o contrato.</p></div></AccordionTrigger>
                <AccordionContent><LegalWarningsList warnings={autoGenerateResult.warnings} /></AccordionContent>
              </AccordionItem>
              <AccordionItem value="generated-clauses" className="border-border/30">
                <AccordionTrigger className="py-4 hover:no-underline"><div><p className="text-left text-sm font-semibold text-foreground">Clausulas geradas pelo motor juridico</p><p className="mt-1 text-left text-xs text-muted-foreground">Ordem, risco e obrigatoriedade vindos do backend para consulta.</p></div></AccordionTrigger>
                <AccordionContent><LegalClausesList clauses={autoGenerateResult.clauses} /></AccordionContent>
              </AccordionItem>
              <AccordionItem value="preview-text" className="border-border/30">
                <AccordionTrigger className="py-4 hover:no-underline"><div><p className="text-left text-sm font-semibold text-foreground">Preview textual consolidado</p><p className="mt-1 text-left text-xs text-muted-foreground">Esta e a fonte principal vinda de contractText no backend.</p></div></AccordionTrigger>
                <AccordionContent><div className="rounded-xl border border-border/40 bg-background/70 p-4"><pre className="whitespace-pre-wrap text-sm leading-6 text-foreground">{autoGenerateResult.contractText}</pre></div></AccordionContent>
              </AccordionItem>
            </>
          ) : (
            <AccordionItem value="guide" className="border-border/30">
              <AccordionTrigger className="py-4 hover:no-underline"><div><p className="text-left text-sm font-semibold text-foreground">Como usar o fluxo novo</p><p className="mt-1 text-left text-xs text-muted-foreground">O sistema novo trabalha com contexto juridico, sugestoes visuais e preview oficial do backend.</p></div></AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>1. Configure o contexto juridico para indicar audience, risco e caracteristicas sensiveis do contrato.</p>
                  <p>2. Gere as clausulas automaticamente para receber warnings, clausulas ordenadas e contractText consolidado.</p>
                  <p>3. Revise o que entra no contrato, o que fica so no preview e a aparencia do documento.</p>
                  <Button type="button" className="mt-2 w-full sm:w-auto" onClick={onOpenLegalContext}>Abrir contexto juridico</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </section>
    </div>
  );
}

interface ContractClauseNavigatorProps {
  clauses: ContractClause[];
  filteredContractClauses: ContractClause[];
  filteredSuggestedClauses: ContractClauseSuggestion[];
  hiddenContractClauses: ContractClause[];
  previewOnlySuggestedClauses: ContractClauseSuggestion[];
  clauseIdsInContract: string[];
  clauseSearch: string;
  clauseExplorerTab: ClauseExplorerTab;
  selectedClause: ContractClause | null;
  onSearchChange: (value: string) => void;
  onClauseExplorerTabChange: (value: ClauseExplorerTab) => void;
  onSelectClause: (clause: ContractClause) => void;
  onTogglePreviewClause: (clauseId: string, inContract: boolean) => void;
  onMoveClause: (rowIndex: number, direction: -1 | 1) => void;
  onRemoveClause: (rowId: number) => void;
  onAddSuggestion: (suggestion: ContractClauseSuggestion) => void;
  isAlreadyAdded: (templateId: string | number) => boolean;
  isClauseVisibleInPreview: (clauseId: string, inContract: boolean) => boolean;
}

export function ContractClauseNavigator({
  clauses,
  filteredContractClauses,
  filteredSuggestedClauses,
  hiddenContractClauses,
  previewOnlySuggestedClauses,
  clauseIdsInContract,
  clauseSearch,
  clauseExplorerTab,
  selectedClause,
  onSearchChange,
  onClauseExplorerTabChange,
  onSelectClause,
  onTogglePreviewClause,
  onMoveClause,
  onRemoveClause,
  onAddSuggestion,
  isAlreadyAdded,
  isClauseVisibleInPreview,
}: ContractClauseNavigatorProps) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/40 bg-[#111214]">
        <div className="border-b border-border/40 px-3 py-3">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Camadas do contrato</p>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Navegue como num editor: selecione a clausula, ajuste a ordem e decida o que entra no preview.
        </p>
        <div className="relative mt-3">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={clauseSearch}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar clausula"
            className="h-10 border-border/40 bg-background/70 pl-9 text-sm"
          />
        </div>
      </div>

      <Tabs value={clauseExplorerTab} onValueChange={(value) => onClauseExplorerTabChange(value as ClauseExplorerTab)} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border/40 px-3 py-3">
            <TabsList className="grid h-auto w-full grid-cols-3 bg-background/80">
              <TabsTrigger value="contrato" className="px-1.5 text-[11px] sm:text-xs">Contrato</TabsTrigger>
              <TabsTrigger value="sugestoes" className="px-1.5 text-[11px] sm:text-xs">Sugestoes</TabsTrigger>
              <TabsTrigger value="preview" className="px-1.5 text-[11px] sm:text-xs">Preview</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="contrato" className="mt-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-2 p-3">
              {filteredContractClauses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/40 bg-background/40 p-4 text-sm text-muted-foreground">
                  Nenhuma clausula encontrada.
                </div>
              ) : filteredContractClauses.map((clause) => {
                const clauseId = String(clause.clauseId ?? clause.id);
                const visibleInPreview = isClauseVisibleInPreview(clauseId, true);
                const rowIndex = clauses.findIndex((item) => item.id === clause.id);
                const isSelected = selectedClause?.id === clause.id;
                return (
                  <div key={clause.id} className={`w-full rounded-lg border p-3 transition-colors ${isSelected ? "border-accent/50 bg-accent/10" : "border-border/30 bg-background/40 hover:border-border/60"}`}>
                    <button type="button" onClick={() => onSelectClause(clause)} className="w-full text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-foreground">{clause.title}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">Clausula #{rowIndex + 1}</p>
                        </div>
                        <Badge variant="outline" className={visibleInPreview ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-border/40 bg-background/60 text-muted-foreground"}>
                          {visibleInPreview ? "Visivel" : "Oculta"}
                        </Badge>
                      </div>
                    </button>
                    <div className="mt-3 grid grid-cols-1 gap-1.5">
                      <Button type="button" variant="outline" size="sm" title={visibleInPreview ? "Ocultar do preview" : "Mostrar no preview"} className="h-7 w-full min-w-0 justify-center overflow-hidden border-border/40 px-1.5 text-[10px]" onClick={() => onTogglePreviewClause(clauseId, true)}>
                        {visibleInPreview ? "Ocultar" : "Mostrar"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-7 w-full min-w-0 justify-center overflow-hidden border-border/40 px-1.5 text-[10px]" onClick={() => onMoveClause(rowIndex, -1)} disabled={rowIndex === 0}>Subir</Button>
                      <Button type="button" variant="outline" size="sm" className="h-7 w-full min-w-0 justify-center overflow-hidden border-border/40 px-1.5 text-[10px]" onClick={() => onMoveClause(rowIndex, 1)} disabled={rowIndex === clauses.length - 1}>Descer</Button>
                      <Button type="button" variant="outline" size="sm" className="h-7 w-full min-w-0 justify-center overflow-hidden border-destructive/30 px-1.5 text-[10px] text-destructive hover:bg-destructive/10" onClick={() => onRemoveClause(clause.id)}>Excluir</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="sugestoes" className="mt-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-2 p-3">
              {filteredSuggestedClauses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/40 bg-background/40 p-4 text-sm text-muted-foreground">
                  Sem sugestoes para exibir.
                </div>
              ) : filteredSuggestedClauses.map((suggestion) => {
                const alreadyAdded = isAlreadyAdded(suggestion.id);
                const visibleInPreview = isClauseVisibleInPreview(suggestion.id, alreadyAdded || clauseIdsInContract.includes(suggestion.id));
                return (
                  <div key={suggestion.id} className="rounded-lg border border-border/30 bg-background/40 p-3">
                    <p className="truncate text-sm font-semibold text-foreground">{suggestion.title}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{suggestion.id}</p>
                    <div className="mt-3 grid grid-cols-1 gap-1.5">
                      <Button type="button" size="sm" className="h-7 w-full min-w-0 overflow-hidden px-2 text-[10px]" disabled={alreadyAdded} onClick={() => onAddSuggestion(suggestion)}>
                        {alreadyAdded ? "No contrato" : "Adicionar"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" title={visibleInPreview ? "Ocultar do preview" : "Mostrar no preview"} className="h-7 w-full min-w-0 overflow-hidden border-border/40 px-2 text-[10px]" onClick={() => onTogglePreviewClause(suggestion.id, alreadyAdded)}>
                        {visibleInPreview ? "Ocultar" : "Mostrar"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="preview" className="mt-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-2 p-3">
              {hiddenContractClauses.map((clause) => (
                <div key={`hidden-${clause.id}`} className="rounded-lg border border-border/30 bg-background/40 p-3">
                  <p className="text-sm font-semibold text-foreground">{clause.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Oculta no preview oficial</p>
                </div>
              ))}
              {previewOnlySuggestedClauses.map((suggestion) => (
                <div key={`preview-${suggestion.id}`} className="rounded-lg border border-border/30 bg-background/40 p-3">
                  <p className="text-sm font-semibold text-foreground">{suggestion.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Incluida so no preview</p>
                </div>
              ))}
              {hiddenContractClauses.length === 0 && previewOnlySuggestedClauses.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/40 bg-background/40 p-4 text-sm text-muted-foreground">
                  Nenhuma excecao de preview configurada.
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </section>
  );
}

interface ContractClauseInspectorProps {
  selectedClause: ContractClause | null;
  editContent: string;
  savingClause: boolean;
  autoGenerateResult: AutoGenerateContractResponse | null;
  contractInsights?: ContractInsights;
  clauseExplorerTab: ClauseExplorerTab;
  onEditContentChange: (value: string) => void;
  onSaveClause: () => void;
  onCloseEditor: () => void;
  onOpenLegalContext: () => void;
}

export function ContractClauseInspector({
  selectedClause,
  editContent,
  savingClause,
  autoGenerateResult,
  contractInsights,
  clauseExplorerTab,
  onEditContentChange,
  onSaveClause,
  onCloseEditor,
  onOpenLegalContext,
}: ContractClauseInspectorProps) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/40 bg-[#111214]">
      <ScrollArea className="h-full min-h-0">
        <div className="space-y-3 p-3">
      {selectedClause ? (
        <div className="rounded-xl border border-border/40 bg-background/60 p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Propriedades da clausula</p>
            <p className="text-xs leading-5 text-muted-foreground">{selectedClause.title}</p>
          </div>
          <Textarea value={editContent} onChange={(event) => onEditContentChange(event.target.value)} rows={10} className="mt-4 min-h-[220px] resize-y border-border/40 bg-background/60 text-sm" />
          <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <Button type="button" className="w-full gap-2 sm:w-auto" onClick={onSaveClause} disabled={savingClause}>
              {savingClause ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {savingClause ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="outline" className="w-full border-border/40 sm:w-auto" onClick={onCloseEditor}>Fechar</Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-background/60 p-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <p className="text-sm font-semibold text-foreground">Inspector</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {clauseExplorerTab === "contrato" && "Selecione uma clausula na lateral para editar o texto e revisar seus detalhes."}
            {clauseExplorerTab === "sugestoes" && "As sugestoes servem como curadoria. Adicione so o que fizer sentido para este contrato."}
            {clauseExplorerTab === "preview" && "Esta vista resume as excecoes visuais que afetam o documento final."}
          </p>
        </div>
      )}

          {(contractInsights?.score ||
            contractInsights?.riskProfile ||
            contractInsights?.warnings.length ||
            contractInsights?.validationIssues.length ||
            contractInsights?.evidenceProfile) && (
            <div className="space-y-3">
              <ScoreCard score={contractInsights.score} />
              <RiskAlert riskProfile={contractInsights.riskProfile} warnings={contractInsights.warnings} />
              <ValidationIssueList issues={contractInsights.validationIssues} />
              <EvidenceTimeline profile={contractInsights.evidenceProfile} />
            </div>
          )}

          <Accordion type="multiple" defaultValue={autoGenerateResult ? ["warnings", "preview-text"] : ["guide"]} className="rounded-xl border border-border/40 bg-background/60 px-4">
            {autoGenerateResult ? (
              <>
                <AccordionItem value="warnings" className="border-border/30">
                  <AccordionTrigger className="py-4 hover:no-underline"><div><p className="text-left text-sm font-semibold text-foreground">Warnings</p><p className="mt-1 text-left text-xs text-muted-foreground">Retornados pelo backend juridico.</p></div></AccordionTrigger>
                  <AccordionContent><LegalWarningsList warnings={autoGenerateResult.warnings} /></AccordionContent>
                </AccordionItem>
                <AccordionItem value="generated-clauses" className="border-border/30">
                  <AccordionTrigger className="py-4 hover:no-underline"><div><p className="text-left text-sm font-semibold text-foreground">Motor juridico</p><p className="mt-1 text-left text-xs text-muted-foreground">Clausulas ordenadas e consolidadas.</p></div></AccordionTrigger>
                  <AccordionContent><LegalClausesList clauses={autoGenerateResult.clauses} /></AccordionContent>
                </AccordionItem>
                <AccordionItem value="preview-text" className="border-border/30">
                  <AccordionTrigger className="py-4 hover:no-underline"><div><p className="text-left text-sm font-semibold text-foreground">Texto consolidado</p><p className="mt-1 text-left text-xs text-muted-foreground">Fonte principal vinda de contractText.</p></div></AccordionTrigger>
                  <AccordionContent><div className="rounded-xl border border-border/40 bg-background/70 p-4"><pre className="whitespace-pre-wrap text-sm leading-6 text-foreground">{autoGenerateResult.contractText}</pre></div></AccordionContent>
                </AccordionItem>
              </>
            ) : (
              <AccordionItem value="guide" className="border-border/30">
                <AccordionTrigger className="py-4 hover:no-underline"><div><p className="text-left text-sm font-semibold text-foreground">Como usar</p><p className="mt-1 text-left text-xs text-muted-foreground">Configure, gere e revise sem sair do editor.</p></div></AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                    <p>1. Configure o contexto juridico.</p>
                    <p>2. Gere as clausulas automaticamente.</p>
                    <p>3. Revise o preview e a aparencia.</p>
                    <Button type="button" className="mt-2 w-full sm:w-auto" onClick={onOpenLegalContext}>Abrir contexto juridico</Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      </ScrollArea>
    </section>
  );
}
