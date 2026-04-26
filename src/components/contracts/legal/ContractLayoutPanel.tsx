"use client";

import { useEffect, useRef, useState } from "react";
import { Image, Loader2, Palette, RotateCcw, Sliders, Type, Upload, X } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { ScrollArea } from "../../ui/scroll-area";
import { Textarea } from "../../ui/textarea";
import { toast } from "sonner";
import { removeLogo, type ContractLayout, type ContractLayoutBlockConfig, type ContractLayoutBlockId, uploadLogo } from "../../../service/contracts";

const FONT_OPTIONS = [
  { value: "inter", label: "Inter" },
  { value: "georgia", label: "Georgia" },
  { value: "roboto", label: "Roboto" },
  { value: "playfair", label: "Playfair Display" },
] as const;

const BLOCK_IDS: ContractLayoutBlockId[] = [
  "hero",
  "intro",
  "summary",
  "scope",
  "clauses",
  "signatures",
  "footer",
];

const COLOR_PRESETS = ["#ff6600", "#2563eb", "#16a34a", "#d97706", "#0f172a", "#7c3aed"];

const BLOCK_LABELS: Record<ContractLayoutBlockId, string> = {
  hero: "Hero",
  intro: "Introducao",
  summary: "Resumo",
  scope: "Escopo",
  clauses: "Clausulas",
  signatures: "Assinaturas",
  footer: "Rodape",
};

const DEFAULT_BLOCKS: Record<ContractLayoutBlockId, ContractLayoutBlockConfig> = {
  hero: { enabled: true, title: "Contrato", content: "" },
  intro: { enabled: true, title: "Introducao", content: "" },
  summary: { enabled: true, title: "Resumo", content: "" },
  scope: { enabled: true, title: "Escopo", content: "" },
  clauses: { enabled: true, title: "Clausulas", content: "" },
  signatures: { enabled: true, title: "Assinaturas", content: "" },
  footer: { enabled: true, title: "Rodape", content: "" },
};

export const DEFAULT_EDITOR_LAYOUT: ContractLayout = {
  preview: {
    includeClauseIds: [],
    hiddenClauseIds: [],
  },
  appearance: {
    primaryColor: "#ff6600",
    secondaryColor: "#18181b",
    paperTint: "#ffffff",
    fontFamily: "inter",
    fontScale: 1,
    contentWidth: 820,
    borderRadius: 6,
    sectionSpacing: 24,
    showSummaryCards: true,
    showContractNumber: true,
    showFechouBranding: true,
    logoUrl: null,
  },
  blocks: DEFAULT_BLOCKS,
  customVariables: {},
  contractContext: {},
};

function mergeLayoutState(current: ContractLayout, patch: Partial<ContractLayout>): ContractLayout {
  return {
    ...current,
    ...patch,
    preview: patch.preview ? { ...(current.preview ?? {}), ...patch.preview } : current.preview,
    appearance: patch.appearance ? { ...(current.appearance ?? {}), ...patch.appearance } : current.appearance,
    blocks: patch.blocks
      ? {
          ...(current.blocks ?? {}),
          ...Object.entries(patch.blocks).reduce<Partial<Record<ContractLayoutBlockId, ContractLayoutBlockConfig>>>(
            (acc, [key, value]) => {
              const blockId = key as ContractLayoutBlockId;
              acc[blockId] = {
                ...(current.blocks?.[blockId] ?? {}),
                ...(value ?? {}),
              };
              return acc;
            },
            {},
          ),
        }
      : current.blocks,
    customVariables: patch.customVariables ? { ...patch.customVariables } : current.customVariables,
    contractContext: patch.contractContext ? { ...patch.contractContext } : current.contractContext,
  };
}

function serializeStringMap(map: Record<string, string> | undefined) {
  return Object.entries(map ?? {})
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function parseStringMapInput(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, line) => {
      const [rawKey, ...rest] = line.split("=");
      const key = rawKey?.trim();
      if (!key) return acc;
      acc[key] = rest.join("=").trim();
      return acc;
    }, {});
}

interface ContractLayoutPanelProps {
  contractId: number;
  layout: ContractLayout;
  onChange: (layout: ContractLayout) => void;
  onSavePatch: (patch: Partial<ContractLayout>) => void;
  onPreviewRefresh: () => void;
}

export function ContractLayoutPanel({
  contractId,
  layout,
  onChange,
  onSavePatch,
  onPreviewRefresh,
}: ContractLayoutPanelProps) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const [customVariablesText, setCustomVariablesText] = useState(() => serializeStringMap(layout.customVariables));
  const [contractContextText, setContractContextText] = useState(() => serializeStringMap(layout.contractContext));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCustomVariablesText(serializeStringMap(layout.customVariables));
  }, [layout.customVariables]);

  useEffect(() => {
    setContractContextText(serializeStringMap(layout.contractContext));
  }, [layout.contractContext]);

  const appearance = layout.appearance ?? DEFAULT_EDITOR_LAYOUT.appearance!;
  const blocks = BLOCK_IDS.reduce<Record<ContractLayoutBlockId, ContractLayoutBlockConfig>>((acc, blockId) => {
    acc[blockId] = {
      ...DEFAULT_BLOCKS[blockId],
      ...(layout.blocks?.[blockId] ?? {}),
    };
    return acc;
  }, {} as Record<ContractLayoutBlockId, ContractLayoutBlockConfig>);

  const setLocal = (patch: Partial<ContractLayout>) => {
    onChange(mergeLayoutState(layout, patch));
  };

  const persistPatch = (patch: Partial<ContractLayout>) => {
    setLocal(patch);
    onSavePatch(patch);
  };

  const hasValidImageSignature = async (file: File): Promise<boolean> => {
    const buf = await file.slice(0, 12).arrayBuffer();
    const b = new Uint8Array(buf);
    const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    const isJpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    const isWebp = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    return isPng || isJpeg || isWebp;
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    const maxMb = 2;
    if (!allowed.includes(file.type)) {
      toast.error("Tipo nao permitido. Use JPEG, PNG ou WebP.");
      setInputKey((prev) => prev + 1);
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Limite: ${maxMb} MB.`);
      setInputKey((prev) => prev + 1);
      return;
    }
    if (!(await hasValidImageSignature(file))) {
      toast.error("Arquivo invalido. Envie uma imagem JPEG, PNG ou WebP valida.");
      setInputKey((prev) => prev + 1);
      return;
    }

    setUploadingLogo(true);
    try {
      const result = await uploadLogo(contractId, file);
      setLocal({ appearance: { logoUrl: result.logoUrl } });
      onPreviewRefresh();
      toast.success("Logo enviada com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Nao foi possivel enviar a logo.");
    } finally {
      setUploadingLogo(false);
      setInputKey((prev) => prev + 1);
    }
  };

  const handleLogoRemove = async () => {
    setRemovingLogo(true);
    try {
      await removeLogo(contractId);
      setLocal({ appearance: { logoUrl: null } });
      onPreviewRefresh();
      toast.success("Logo removida.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover logo.");
    } finally {
      setRemovingLogo(false);
    }
  };

  return (
    <ScrollArea className="h-full min-h-0 flex-1">
      <div className="space-y-5 p-4">
        <section className="rounded-xl border border-border/40 bg-background/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-accent/30 bg-accent/10 text-accent">
              Aparencia do documento
            </Badge>
            <Badge variant="outline" className="border-border/40 bg-background/70 text-muted-foreground">
              Salva por bloco
            </Badge>
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">Deixe o contrato mais claro antes de deixá-lo mais bonito.</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Este painel controla leitura, hierarquia visual e placeholders por contrato. O texto juridico continua vindo do backend; aqui voce so orienta como ele aparece.
          </p>
        </section>

        <section className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Image size={11} /> Logo
          </label>
          {appearance.logoUrl ? (
            <div className="relative min-h-[60px] rounded-lg border border-border/40 bg-white p-3 flex items-center justify-center">
              <img src={appearance.logoUrl} className="max-h-10 object-contain" alt="Logo" />
              <button
                onClick={handleLogoRemove}
                disabled={removingLogo}
                className="absolute right-1.5 top-1.5 text-muted-foreground/50 hover:text-destructive transition-colors disabled:opacity-40"
                title="Remover logo"
              >
                {removingLogo ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/50 bg-card/30 text-xs text-muted-foreground transition-all hover:border-accent/50 hover:text-accent"
            >
              {uploadingLogo ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploadingLogo ? "Enviando..." : "Enviar logo"}
            </button>
          )}
          <input key={inputKey} ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Palette size={11} className="text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Aparencia</p>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Cores, tipografia e espacamento ajudam o usuario a bater o olho e entender o documento mais rapido.
          </p>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => persistPatch({ appearance: { primaryColor: color } })}
                className="h-7 w-7 rounded-md border border-border/40 transition-transform hover:scale-105"
                style={{ backgroundColor: color }}
                title={`Usar ${color} como cor primaria`}
              />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { key: "primaryColor", label: "Cor primaria" },
              { key: "secondaryColor", label: "Cor secundaria" },
              { key: "paperTint", label: "Tom do papel" },
            ].map((field) => (
              <label key={field.key} className="space-y-1.5">
                <span className="text-xs text-muted-foreground">{field.label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={String(appearance[field.key as keyof typeof appearance] ?? "#ffffff")}
                    onChange={(event) => persistPatch({ appearance: { [field.key]: event.target.value } })}
                    className="h-9 w-14 rounded border border-border/40 bg-transparent"
                  />
                  <Input
                    value={String(appearance[field.key as keyof typeof appearance] ?? "")}
                    onChange={(event) => setLocal({ appearance: { [field.key]: event.target.value } })}
                    onBlur={(event) => persistPatch({ appearance: { [field.key]: event.target.value } })}
                    className="h-9 border-border/40 bg-background/60 text-sm"
                  />
                </div>
              </label>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Type size={11} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Familia tipografica</p>
            </div>
            {FONT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => persistPatch({ appearance: { fontFamily: option.value } })}
                className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                  appearance.fontFamily === option.value
                    ? "border-accent/40 bg-accent/15 text-accent"
                    : "border-border/30 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { key: "fontScale", label: "Escala da fonte", min: "0.8", max: "1.4", step: "0.05" },
              { key: "contentWidth", label: "Largura do conteudo", min: "640", max: "1200", step: "10" },
              { key: "borderRadius", label: "Raio de borda", min: "0", max: "12", step: "1" },
              { key: "sectionSpacing", label: "Espaco entre secoes", min: "8", max: "48", step: "2" },
            ].map((field) => (
              <label key={field.key} className="space-y-1.5">
                <span className="text-xs text-muted-foreground">{field.label}</span>
                <Input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={String(appearance[field.key as keyof typeof appearance] ?? "")}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    if (Number.isFinite(nextValue)) {
                      setLocal({ appearance: { [field.key]: nextValue } });
                    }
                  }}
                  onBlur={(event) => {
                    const nextValue = Number(event.target.value);
                    if (Number.isFinite(nextValue)) {
                      persistPatch({ appearance: { [field.key]: nextValue } });
                    }
                  }}
                  className="h-9 border-border/40 bg-background/60 text-sm"
                />
              </label>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { key: "showSummaryCards", label: "Mostrar cards de resumo" },
              { key: "showContractNumber", label: "Mostrar numero do contrato" },
              { key: "showFechouBranding", label: "Mostrar branding da Fechou" },
            ].map((field) => (
              <button
                key={field.key}
                type="button"
                onClick={() => persistPatch({ appearance: { [field.key]: !appearance[field.key as keyof typeof appearance] } })}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                  appearance[field.key as keyof typeof appearance]
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-border/30 bg-background/40 text-muted-foreground"
                }`}
              >
                {field.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sliders size={11} className="text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Blocos do documento</p>
          </div>
          {BLOCK_IDS.map((blockId) => {
            const block = blocks[blockId];
            return (
              <div key={blockId} className="space-y-2 rounded-lg border border-border/30 bg-background/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{BLOCK_LABELS[blockId]}</p>
                  <button
                    type="button"
                    onClick={() => persistPatch({ blocks: { [blockId]: { enabled: !block.enabled } } })}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                      block.enabled
                        ? "border-accent/40 bg-accent/10 text-accent"
                        : "border-border/40 text-muted-foreground"
                    }`}
                  >
                    {block.enabled ? "Ativo" : "Oculto"}
                  </button>
                </div>
                <Input
                  value={block.title ?? ""}
                  onChange={(event) => setLocal({ blocks: { [blockId]: { title: event.target.value } } })}
                  onBlur={(event) => persistPatch({ blocks: { [blockId]: { title: event.target.value } } })}
                  placeholder={`Titulo do bloco ${BLOCK_LABELS[blockId].toLowerCase()}`}
                  className="h-9 border-border/40 bg-background/60 text-sm"
                />
                <Textarea
                  value={block.content ?? ""}
                  onChange={(event) => setLocal({ blocks: { [blockId]: { content: event.target.value } } })}
                  onBlur={(event) => persistPatch({ blocks: { [blockId]: { content: event.target.value } } })}
                  rows={3}
                  placeholder={`Texto opcional do bloco ${BLOCK_LABELS[blockId].toLowerCase()}`}
                  className="border-border/40 bg-background/60 text-sm"
                />
              </div>
            );
          })}
        </section>

        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Custom variables</p>
          <p className="text-xs text-muted-foreground">Uma linha por placeholder no formato <code>chave=valor</code>.</p>
          <Textarea
            value={customVariablesText}
            onChange={(event) => setCustomVariablesText(event.target.value)}
            rows={6}
            className="border-border/40 bg-background/60 font-mono text-sm"
            placeholder={"cliente_nome=Maria Silva\nforo=Curitiba/PR"}
          />
          <Button type="button" variant="outline" className="w-full border-border/40" onClick={() => persistPatch({ customVariables: parseStringMapInput(customVariablesText) })}>
            Salvar custom variables
          </Button>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contract context</p>
          <p className="text-xs text-muted-foreground">Contexto adicional por contrato para placeholders juridicos.</p>
          <Textarea
            value={contractContextText}
            onChange={(event) => setContractContextText(event.target.value)}
            rows={6}
            className="border-border/40 bg-background/60 font-mono text-sm"
            placeholder={"natureza_servico=desenvolvimento sob demanda\ncidade_execucao=Sao Paulo/SP"}
          />
          <Button type="button" variant="outline" className="w-full border-border/40" onClick={() => persistPatch({ contractContext: parseStringMapInput(contractContextText) })}>
            Salvar contract context
          </Button>
        </section>

        <button
          type="button"
          onClick={() => {
            onChange(DEFAULT_EDITOR_LAYOUT);
            onSavePatch(DEFAULT_EDITOR_LAYOUT);
          }}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border/30 py-2 text-xs text-muted-foreground/60 transition-all hover:text-muted-foreground hover:border-border/50"
        >
          <RotateCcw size={11} /> Restaurar padrao
        </button>
      </div>
    </ScrollArea>
  );
}
