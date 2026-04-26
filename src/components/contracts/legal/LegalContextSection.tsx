import { useState } from "react";
import { BookCopy, ChevronDown, FileText, Loader2, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  CUSTOM_CLAUSE_COUNT_OPTIONS,
  DEFAULT_CLAUSE_MODE,
  DEFAULT_TARGET_CLAUSE_COUNT,
  LEGAL_CLAUSE_COMPLETENESS_OPTIONS,
  LEGAL_AUDIENCE_OPTIONS,
  LEGAL_CONTRACT_MODEL_OPTIONS,
  LEGAL_IP_MODE_OPTIONS,
  LEGAL_RISK_LEVEL_OPTIONS,
  LEGAL_SUPPORT_LEVEL_OPTIONS,
  PARTY_QUALIFICATION_FIELDS,
} from "@/lib/legal-contracts";
import { cn } from "@/lib/utils";
import type {
  AutoGenerateContractPayload,
  AutoGenerateContractResponse,
  LegalBlueprintResponse,
  LegalContractModel,
} from "@/types/legal-contracts";
import type { MccRunResult } from "@/lib/api/mcc";
import {
  ContractGraphSummary,
  ContractScorePanel,
  DecisionLogPanel,
  EvidenceProfilePanel,
  RiskWarningsPanel,
  SelectedClausesPanel,
  ValidationIssuesPanel,
} from "../mcc";
import { LegalClausesList } from "./LegalClausesList";
import { LegalWarningsList } from "./LegalWarningsList";

type AutoGenerateStatus = "idle" | "loading" | "success" | "error";

type LegalContextSectionProps = {
  context: AutoGenerateContractPayload;
  authenticationMethodsInput: string;
  onAuthenticationMethodsInputChange: (value: string) => void;
  onContextChange: (patch: Partial<AutoGenerateContractPayload>) => void;
  onToggleContractModel: (value: LegalContractModel) => void;
  blueprint: LegalBlueprintResponse | null;
  blueprintLoading: boolean;
  blueprintError: string | null;
  onRetryBlueprint: () => void;
  onOpenBlueprint: () => void;
  autoGenerateStatus: AutoGenerateStatus;
  autoGenerateError: string | null;
  autoGenerateResult: AutoGenerateContractResponse | null;
  mccRun: MccRunResult | null;
  onGenerate: () => void;
};

function SectionHeader({
  title,
  description,
  open,
}: {
  title: string;
  description: string;
  open: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronDown
        size={16}
        className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
      />
    </div>
  );
}

function FieldLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-foreground">{title}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function BooleanField({
  title,
  hint,
  checked,
  onCheckedChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/40 bg-card/30 px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function LegalContextSection({
  context,
  authenticationMethodsInput,
  onAuthenticationMethodsInputChange,
  onContextChange,
  onToggleContractModel,
  blueprint,
  blueprintLoading,
  blueprintError,
  onRetryBlueprint,
  onOpenBlueprint,
  autoGenerateStatus,
  autoGenerateError,
  autoGenerateResult,
  mccRun,
  onGenerate,
}: LegalContextSectionProps) {
  const [essentialsOpen, setEssentialsOpen] = useState(true);
  const [partiesOpen, setPartiesOpen] = useState(true);
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [forumOpen, setForumOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [mccContextOpen, setMccContextOpen] = useState(false);

  const blueprintWarnings = blueprint?.warnings ?? [];
  const canGenerate = Boolean(blueprint) && !blueprintLoading && autoGenerateStatus !== "loading";
  const selectedClauseMode = context.clauseMode ?? DEFAULT_CLAUSE_MODE;
  const selectedTargetClauseCount = context.targetClauseCount ?? DEFAULT_TARGET_CLAUSE_COUNT;

  const updateClauseCompleteness = (
    clauseMode: NonNullable<AutoGenerateContractPayload["clauseMode"]>,
    targetClauseCount?: number,
  ) => {
    onContextChange({
      clauseMode,
      targetClauseCount: targetClauseCount ?? (
        clauseMode === "custom"
          ? selectedTargetClauseCount
          : LEGAL_CLAUSE_COMPLETENESS_OPTIONS.find((option) => option.value === clauseMode)?.targetClauseCount
      ),
    });
  };

  return (
    <section className="border-b border-border/40 bg-card/20">
      <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4">
        <div className="rounded-xl border border-border/40 bg-background/70">
          <div className="flex flex-col gap-4 border-b border-border/40 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-accent" />
                <h2 className="text-base font-semibold text-foreground">Contexto juridico</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure o contexto do MCC para gerar, revisar e entender o contrato com alertas, robustez e lastro juridico.
              </p>
              <div className="flex max-w-full flex-wrap gap-2">
                {blueprint?.contractModelText && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 max-w-full min-w-0 gap-2 border-border/40 bg-background/60 px-2.5 text-xs text-muted-foreground"
                    aria-expanded={mccContextOpen}
                    onClick={() => setMccContextOpen((current) => !current)}
                  >
                    <FileText size={13} className="shrink-0" />
                    <span className="min-w-0 truncate">Ver contexto do MCC</span>
                    <ChevronDown size={13} className={cn("shrink-0 transition-transform", mccContextOpen && "rotate-180")} />
                  </Button>
                )}
                <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">
                  {blueprint?.sources.length ?? 0} fontes oficiais
                </Badge>
                <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">
                  {blueprintWarnings.length} warnings de pre-validacao
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="border-border/50" onClick={onOpenBlueprint}>
                <BookCopy size={14} />
                Blueprint juridico
              </Button>
              <Button type="button" size="sm" className="gap-2" disabled={!canGenerate} onClick={onGenerate}>
                {autoGenerateStatus === "loading" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Gerando contrato inteligente...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Gerar contrato inteligente
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4">
            {blueprint?.contractModelText && mccContextOpen && (
              <div className="max-w-full overflow-hidden rounded-xl border border-border/40 bg-card/40">
                <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border/35 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Contexto usado pelo MCC</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Texto completo enviado para orientar geracao, revisao, alertas, robustez e lastro juridico.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 shrink-0 p-0 text-muted-foreground"
                    aria-label="Fechar contexto do MCC"
                    onClick={() => setMccContextOpen(false)}
                  >
                    <X size={14} />
                  </Button>
                </div>
                <div className="max-h-[min(60vh,520px)] overflow-y-auto overflow-x-hidden px-4 py-4">
                  <pre className="m-0 max-w-full whitespace-pre-wrap break-words text-sm leading-6 text-foreground [overflow-wrap:anywhere]">
                    {blueprint.contractModelText}
                  </pre>
                </div>
              </div>
            )}

            {blueprintLoading && (
              <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/30 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                Carregando defaults e warnings do blueprint juridico...
              </div>
            )}

            {blueprintError && (
              <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4">
                <p className="text-sm text-destructive/90">{blueprintError}</p>
                <Button type="button" size="sm" variant="outline" className="border-destructive/30" onClick={onRetryBlueprint}>
                  Tentar novamente
                </Button>
              </div>
            )}

            {!blueprintError && (
              <LegalWarningsList
                warnings={blueprintWarnings}
                title="Warnings antes da auto-geracao"
                emptyMessage="O blueprint nao retornou warnings preventivos para o contexto atual."
              />
            )}

            <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
              <div className="space-y-3">
                <Collapsible open={essentialsOpen} onOpenChange={setEssentialsOpen}>
                  <div className="rounded-lg border border-border/40 bg-card/30">
                    <CollapsibleTrigger asChild>
                      <button type="button" className="w-full px-4 py-4 text-left">
                        <SectionHeader
                          title="Essencial"
                          description="Campos que mais impactam a curadoria juridica."
                          open={essentialsOpen}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border-t border-border/40 px-4 py-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <FieldLabel title="Publico" />
                          <Select
                            value={context.audience}
                            onValueChange={(value) => onContextChange({ audience: value as AutoGenerateContractPayload["audience"] })}
                          >
                            <SelectTrigger className="bg-background/60">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {LEGAL_AUDIENCE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <FieldLabel title="Nivel de risco" />
                          <Select
                            value={context.riskLevel}
                            onValueChange={(value) => onContextChange({ riskLevel: value as AutoGenerateContractPayload["riskLevel"] })}
                          >
                            <SelectTrigger className="bg-background/60">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {LEGAL_RISK_LEVEL_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <FieldLabel
                          title="Modelo de contrato"
                          hint="Mais de um modelo pode orientar o motor juridico."
                        />
                        <div className="flex flex-wrap gap-2">
                          {LEGAL_CONTRACT_MODEL_OPTIONS.map((option) => {
                            const active = context.contractModels?.includes(option.value) ?? false;

                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => onToggleContractModel(option.value)}
                                className={cn(
                                  "rounded-lg border px-3 py-2 text-sm transition-colors",
                                  active
                                    ? "border-accent bg-accent/10 text-accent"
                                    : "border-border/40 bg-background/60 text-muted-foreground hover:border-border",
                                )}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          <FieldLabel
                            title="Tamanho do contrato"
                            hint="Mantemos as clausulas essenciais mesmo em contratos curtos."
                          />
                          <Badge variant="outline" className="w-fit border-border/40 bg-background/60 text-muted-foreground">
                            ate {selectedTargetClauseCount} clausulas
                          </Badge>
                        </div>

                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                          {LEGAL_CLAUSE_COMPLETENESS_OPTIONS.map((option) => {
                            const active = selectedClauseMode === option.value;

                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => updateClauseCompleteness(option.value, option.targetClauseCount)}
                                className={cn(
                                  "rounded-lg border px-3 py-3 text-left transition-colors",
                                  active
                                    ? "border-accent bg-accent/10 text-accent"
                                    : "border-border/40 bg-background/60 text-muted-foreground hover:border-border",
                                )}
                              >
                                <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                                <span className="mt-1 block text-xs font-medium">{option.range}</span>
                                <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                                  {option.description}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div
                          className={cn(
                            "rounded-lg border px-3 py-3",
                            selectedClauseMode === "custom"
                              ? "border-accent bg-accent/10"
                              : "border-border/40 bg-background/60",
                          )}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <FieldLabel
                              title="Personalizado"
                              hint="Escolha um limite aproximado. O motor corta apenas opcionais."
                            />
                            <div className="flex flex-wrap gap-2">
                              {CUSTOM_CLAUSE_COUNT_OPTIONS.map((count) => {
                                const active = selectedClauseMode === "custom" && selectedTargetClauseCount === count;

                                return (
                                  <button
                                    key={count}
                                    type="button"
                                    onClick={() => updateClauseCompleteness("custom", count)}
                                    className={cn(
                                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                                      active
                                        ? "border-accent bg-accent text-accent-foreground"
                                        : "border-border/40 bg-card/30 text-muted-foreground hover:border-border",
                                    )}
                                  >
                                    ate {count}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <BooleanField
                          title="Dados pessoais"
                          hint="Afeta selecao de clausulas e warnings."
                          checked={Boolean(context.personalData)}
                          onCheckedChange={(checked) => onContextChange({ personalData: checked })}
                        />
                        <BooleanField
                          title="Dados sensiveis"
                          hint="Mantido visivel por impacto juridico direto."
                          checked={Boolean(context.sensitiveData)}
                          onCheckedChange={(checked) => onContextChange({ sensitiveData: checked })}
                        />
                        <BooleanField
                          title="Entrega de codigo-fonte"
                          hint="Mantido visivel por impacto em PI e handover."
                          checked={Boolean(context.sourceCodeDelivery)}
                          onCheckedChange={(checked) => onContextChange({ sourceCodeDelivery: checked })}
                        />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                <Collapsible open={partiesOpen} onOpenChange={setPartiesOpen}>
                  <div className="rounded-lg border border-border/40 bg-card/30">
                    <CollapsibleTrigger asChild>
                      <button type="button" className="w-full px-4 py-4 text-left">
                        <SectionHeader
                          title="Qualificacao das partes"
                          description="Documentos e enderecos usados no contrato gerado."
                          open={partiesOpen}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border-t border-border/40 px-4 py-4">
                      <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-300">
                        Contratos antigos podem precisar gerar novamente para trocar placeholders pelos dados preenchidos.
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {PARTY_QUALIFICATION_FIELDS.map((field) => (
                          <div key={field.key} className="space-y-2">
                            <FieldLabel title={field.label} hint={field.helperText} />
                            {field.multiline ? (
                              <Textarea
                                value={context[field.key] ?? ""}
                                onChange={(event) => onContextChange({ [field.key]: event.target.value } as Partial<AutoGenerateContractPayload>)}
                                placeholder={field.placeholder}
                                className="min-h-[84px] resize-none bg-background/60"
                              />
                            ) : (
                              <Input
                                value={context[field.key] ?? ""}
                                onChange={(event) => onContextChange({ [field.key]: event.target.value } as Partial<AutoGenerateContractPayload>)}
                                placeholder={field.placeholder}
                                className="bg-background/60"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                <Collapsible open={operationsOpen} onOpenChange={setOperationsOpen}>
                  <div className="rounded-lg border border-border/40 bg-card/30">
                    <CollapsibleTrigger asChild>
                      <button type="button" className="w-full px-4 py-4 text-left">
                        <SectionHeader
                          title="Operacao e propriedade intelectual"
                          description="Parametros de uso, suporte e faturamento."
                          open={operationsOpen}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border-t border-border/40 px-4 py-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <FieldLabel title="Modo de PI" />
                          <Select
                            value={context.ipMode}
                            onValueChange={(value) => onContextChange({ ipMode: value as AutoGenerateContractPayload["ipMode"] })}
                          >
                            <SelectTrigger className="bg-background/60">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {LEGAL_IP_MODE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <FieldLabel title="Nivel de suporte" />
                          <Select
                            value={context.supportLevel}
                            onValueChange={(value) => onContextChange({ supportLevel: value as AutoGenerateContractPayload["supportLevel"] })}
                          >
                            <SelectTrigger className="bg-background/60">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {LEGAL_SUPPORT_LEVEL_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <BooleanField
                          title="Assinatura recorrente"
                          hint="Indique se existe logica de assinatura ou mensalidade."
                          checked={Boolean(context.subscription)}
                          onCheckedChange={(checked) => onContextChange({ subscription: checked })}
                        />
                        <BooleanField
                          title="Cobranca por marcos"
                          hint="Impacta clausulas de aceite e entrega."
                          checked={Boolean(context.milestoneBilling)}
                          onCheckedChange={(checked) => onContextChange({ milestoneBilling: checked })}
                        />
                        <BooleanField
                          title="Substituir clausulas atuais"
                          hint="Controla o replaceExisting no backend."
                          checked={Boolean(context.replaceExisting)}
                          onCheckedChange={(checked) => onContextChange({ replaceExisting: checked })}
                        />
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <BooleanField
                          title="Arbitragem"
                          hint="Backend deve validar destaque/aceite quando houver adesao."
                          checked={Boolean(context.includeArbitration)}
                          onCheckedChange={(checked) => onContextChange({ includeArbitration: checked })}
                        />
                        <BooleanField
                          title="Escrow"
                          hint="Sugere reforco para dependencias criticas ou alto valor."
                          checked={Boolean(context.includeEscrow)}
                          onCheckedChange={(checked) => onContextChange({ includeEscrow: checked })}
                        />
                        <BooleanField
                          title="Uso em portfolio"
                          hint="Controla permissao de divulgacao comercial."
                          checked={Boolean(context.includePortfolioUse)}
                          onCheckedChange={(checked) => onContextChange({ includePortfolioUse: checked })}
                        />
                        <BooleanField
                          title="Chargeback"
                          hint="Ativa regras de contestacao e evidencias de pagamento."
                          checked={Boolean(context.includeChargebackRule)}
                          onCheckedChange={(checked) => onContextChange({ includeChargebackRule: checked })}
                        />
                        <BooleanField
                          title="Handover"
                          hint="Inclui transicao, documentacao e entrega assistida."
                          checked={Boolean(context.includeHandOver)}
                          onCheckedChange={(checked) => onContextChange({ includeHandOver: checked })}
                        />
                      </div>

                      <div className="mt-4 space-y-2">
                        <FieldLabel
                          title="Metodos de autenticacao"
                          hint="Separe por virgula. Ex.: senha forte, 2fa, certificado"
                        />
                        <Input
                          value={authenticationMethodsInput}
                          onChange={(event) => onAuthenticationMethodsInputChange(event.target.value)}
                          placeholder="senha, 2fa, link magico"
                          className="bg-background/60"
                        />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                  <div className="rounded-lg border border-border/40 bg-card/30">
                    <CollapsibleTrigger asChild>
                      <button type="button" className="w-full px-4 py-4 text-left">
                        <SectionHeader
                          title="Resumos operacionais"
                          description="Detalhes livres que ajudam o backend a modelar suporte, LGPD e seguranca."
                          open={advancedOpen}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border-t border-border/40 px-4 py-4">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <FieldLabel title="Resumo de suporte" />
                          <Textarea
                            value={context.supportSummary ?? ""}
                            onChange={(event) => onContextChange({ supportSummary: event.target.value })}
                            placeholder="Ex.: atendimento em dias uteis, SLA inicial, canais e horarios"
                            className="min-h-[92px] resize-none bg-background/60"
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel title="Subprocessadores" />
                          <Textarea
                            value={context.subprocessorSummary ?? ""}
                            onChange={(event) => onContextChange({ subprocessorSummary: event.target.value })}
                            placeholder="Ex.: provedores de nuvem, email, analytics e pagamentos"
                            className="min-h-[92px] resize-none bg-background/60"
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel title="Resumo de seguranca" />
                          <Textarea
                            value={context.securitySummary ?? ""}
                            onChange={(event) => onContextChange({ securitySummary: event.target.value })}
                            placeholder="Ex.: controles de acesso, backups, logs, criptografia e resposta a incidentes"
                            className="min-h-[92px] resize-none bg-background/60"
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                <Collapsible open={forumOpen} onOpenChange={setForumOpen}>
                  <div className="rounded-lg border border-border/40 bg-card/30">
                    <CollapsibleTrigger asChild>
                      <button type="button" className="w-full px-4 py-4 text-left">
                        <SectionHeader
                          title="Foro"
                          description="Campo mantido explicito porque influencia a redacao juridica."
                          open={forumOpen}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border-t border-border/40 px-4 py-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <FieldLabel title="Cidade/UF do foro" />
                          <Input
                            value={context.forumCityUf ?? ""}
                            onChange={(event) => onContextChange({ forumCityUf: event.target.value })}
                            placeholder="Ex.: Sao Paulo/SP"
                            className="bg-background/60"
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel title="Conexao com o foro" hint="Por que esse foro faz sentido para a relacao." />
                          <Textarea
                            value={context.forumConnection ?? ""}
                            onChange={(event) => onContextChange({ forumConnection: event.target.value })}
                            placeholder="Ex.: execucao principal do contrato ocorre nesse local"
                            className="min-h-[96px] resize-none bg-background/60"
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-border/40 bg-card/30 p-4">
                  <p className="text-sm font-semibold text-foreground">Resumo rapido</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {context.audience && (
                      <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground uppercase">
                        {context.audience}
                      </Badge>
                    )}
                    {context.riskLevel && (
                      <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground capitalize">
                        Risco {context.riskLevel}
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">
                      ate {selectedTargetClauseCount} clausulas
                    </Badge>
                    {(context.contractModels ?? []).map((model) => (
                      <Badge key={model} variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">
                        {LEGAL_CONTRACT_MODEL_OPTIONS.find((option) => option.value === model)?.label ?? model}
                      </Badge>
                    ))}
                  </div>
                </div>

                {autoGenerateError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive/90">
                    {autoGenerateError}
                  </div>
                )}

                {autoGenerateResult && autoGenerateResult.clauses.length > selectedTargetClauseCount && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-300">
                    Para este caso, o minimo recomendado ficou acima do limite escolhido. O backend manteve as clausulas essenciais e retornou {autoGenerateResult.clauses.length} clausulas.
                  </div>
                )}

                {autoGenerateResult && Boolean(autoGenerateResult.missingTemplateFields?.length) && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                    <p className="text-sm font-semibold text-amber-300">Faltam dados das partes para completar o contrato.</p>
                    <div className="mt-3 space-y-2">
                      {autoGenerateResult.missingTemplateFields?.map((field) => (
                        <div key={field.key} className="rounded-lg border border-amber-500/20 bg-background/50 px-3 py-2">
                          <p className="text-sm font-medium text-foreground">{field.label}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{field.helperText}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mccRun && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    MCC executado: {mccRun.summary.classification}. Revise os alertas antes de assinar ou enviar.
                  </div>
                )}
              </div>
            </div>

            {autoGenerateResult && (
              <div className="space-y-4 rounded-xl border border-[#ff6600]/20 bg-[#ff6600]/5 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-foreground">Revisao inteligente do contrato</p>
                    <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                      O backend retornou contexto, warnings, clausulas e texto consolidado. Esta revisao aponta robustez,
                      pontos de atencao e lastro juridico, sem prometer validade juridica absoluta.
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit border-[#ff6600]/30 bg-[#ff6600]/10 text-[#ffb07a]">
                    Revisao manual recomendada
                  </Badge>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {Boolean(autoGenerateResult.missingTemplateFields?.length) && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 xl:col-span-2">
                      <p className="text-sm font-semibold text-amber-300">Faltam dados das partes para completar o contrato.</p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {autoGenerateResult.missingTemplateFields?.map((field) => (
                          <div key={field.key} className="rounded-lg border border-amber-500/20 bg-background/50 px-3 py-2">
                            <p className="text-sm font-medium text-foreground">{field.label}</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{field.helperText}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <RiskWarningsPanel warnings={autoGenerateResult.warnings} summary={mccRun?.summary} />
                  <SelectedClausesPanel clauses={autoGenerateResult.clauses} />
                  <ValidationIssuesPanel issues={mccRun?.draft.validationIssues} />
                  <ContractScorePanel score={mccRun?.draft.score} />
                  <EvidenceProfilePanel profile={mccRun?.draft.evidenceProfile} evidencePack={blueprint?.evidencePack} />
                  <ContractGraphSummary graph={mccRun?.draft.graph} />
                  <DecisionLogPanel decisions={mccRun?.draft.decisions} className="xl:col-span-2" />
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Texto consolidado para revisao</p>
                      <p className="text-xs text-muted-foreground">
                        Fonte principal retornada em <code>contractText</code>. Confira antes de assinatura, envio ou PDF.
                      </p>
                    </div>
                    <div className="max-h-[460px] overflow-auto rounded-lg border border-border/40 bg-background/60 p-4">
                      <pre className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                        {autoGenerateResult.contractText}
                      </pre>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                    <p className="text-sm font-semibold text-foreground">Proximos passos</p>
                    <div className="mt-3 space-y-2">
                      {(mccRun?.summary.suggestedActions.length
                        ? mccRun.summary.suggestedActions
                        : ["Revise manualmente as clausulas antes de assinar ou enviar."]
                      ).slice(0, 4).map((action, index) => (
                        <div key={`${action}-${index}`} className="rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
