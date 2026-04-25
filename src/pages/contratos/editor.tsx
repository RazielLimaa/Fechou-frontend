"use client";

import { useEffect, useRef, useState, useCallback, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useParams, useLocation } from "wouter";
import { apiFetch } from "../../service/api";
import {
  ArrowLeft, FileDown, Loader2,
  Trash2, Eye, AlertCircle, CheckCircle2, Save, X,
  Lock, RotateCcw, Pen, Eraser, PenLine, Sparkles, SlidersHorizontal,
  ZoomIn, ZoomOut, GripVertical,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "sonner";
import {
  fetchClauses, fetchLegalBlueprint,
  addClause, deleteClause, updateClause,
  reorderClauses, generatePdf, getContract, renderContract, updateLayout,
  type ContractClause, type ClauseTemplate, type Contract, type ContractClauseSuggestion,
  type ContractLayout, type ContractLayoutBlockId, type ContractLayoutBlockConfig,
} from "../../service/contracts";
import { EditorTour } from "../../components/EditorTour";
import { getMyPlan, type PlanId } from "../../service/payment";
import { isStepUpCancelledError, runWithStepUp } from "../../service/step-up";
import {
  buildLegalBlueprintParams,
  mergeBlueprintDefaults,
  normalizeAutoGeneratePayload,
  parseAuthenticationMethodsInput,
} from "../../lib/legal-contracts";
import { mergeContractInsights } from "../../lib/api/contracts";
import { getFriendlyApiErrorMessage } from "../../lib/api/errors";
import {
  adaptAutoGenerateResponseToMcc,
  runMccAutoGenerate,
  type MccRunResult,
} from "../../lib/api/mcc";
import { getPreviewRefreshDelay } from "../../lib/contract-preview";
import { LegalContextSection } from "../../components/contracts/legal/LegalContextSection";
import { LegalBlueprintDialog } from "../../components/contracts/legal/LegalBlueprintDialog";
import { ContractLayoutPanel, DEFAULT_EDITOR_LAYOUT } from "../../components/contracts/legal/ContractLayoutPanel";
import { ContractClauseInspector, ContractClauseNavigator } from "../../components/contracts/legal/ContractClauseWorkspace";
import type {
  AutoGenerateContractPayload,
  AutoGenerateContractResponse,
  LegalBlueprintResponse,
  LegalContractModel,
} from "../../types/legal-contracts";
import { LanguageToggle } from "../../components/LanguageToggle";
import { useTranslation } from "react-i18next";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type EditorState = "idle" | "loading" | "saving" | "generating-pdf" | "error";
type RightPanelTab = "clausula" | "aparencia";
type ClauseExplorerTab = "contrato" | "sugestoes" | "preview";
type AutoGenerateStatus = "idle" | "loading" | "success" | "error";
type PreviewRefreshMode = "initial" | "manual" | "mutation";
type ProtectedPreviewRefreshReason = PreviewRefreshMode | "expired" | "asset-error";

const BLOCK_IDS: ContractLayoutBlockId[] = [
  "hero",
  "intro",
  "summary",
  "scope",
  "clauses",
  "signatures",
  "footer",
];

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

const DEFAULT_LAYOUT: ContractLayout = DEFAULT_EDITOR_LAYOUT;

function normalizeStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, raw]) => {
    const normalizedKey = key.trim();
    if (!normalizedKey) return acc;
    acc[normalizedKey] = typeof raw === "string" ? raw : String(raw ?? "");
    return acc;
  }, {});
}

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

function normalizeLayout(rawLayout: unknown, logoUrl?: string | null): ContractLayout {
  const source = rawLayout && typeof rawLayout === "object" ? rawLayout as Record<string, unknown> : {};
  const appearance = source.appearance && typeof source.appearance === "object"
    ? source.appearance as Record<string, unknown>
    : source;
  const preview = source.preview && typeof source.preview === "object"
    ? source.preview as Record<string, unknown>
    : {};
  const blocksSource = source.blocks && typeof source.blocks === "object"
    ? source.blocks as Record<string, unknown>
    : {};

  const normalizedBlocks = BLOCK_IDS.reduce<Record<ContractLayoutBlockId, ContractLayoutBlockConfig>>((acc, blockId) => {
    const rawBlock = blocksSource[blockId];
    const block = rawBlock && typeof rawBlock === "object" ? rawBlock as Record<string, unknown> : {};
    acc[blockId] = {
      ...DEFAULT_BLOCKS[blockId],
      enabled: typeof block.enabled === "boolean" ? block.enabled : DEFAULT_BLOCKS[blockId].enabled,
      title: typeof block.title === "string" ? block.title : DEFAULT_BLOCKS[blockId].title,
      content: typeof block.content === "string" ? block.content : DEFAULT_BLOCKS[blockId].content,
    };
    return acc;
  }, {} as Record<ContractLayoutBlockId, ContractLayoutBlockConfig>);

  return mergeLayoutState(DEFAULT_LAYOUT, {
    preview: {
      includeClauseIds: Array.isArray(preview.includeClauseIds) ? preview.includeClauseIds.map(String) : [],
      hiddenClauseIds: Array.isArray(preview.hiddenClauseIds) ? preview.hiddenClauseIds.map(String) : [],
    },
    appearance: {
      primaryColor: typeof appearance.primaryColor === "string" ? appearance.primaryColor : DEFAULT_LAYOUT.appearance?.primaryColor,
      secondaryColor: typeof appearance.secondaryColor === "string" ? appearance.secondaryColor : DEFAULT_LAYOUT.appearance?.secondaryColor,
      paperTint: typeof appearance.paperTint === "string" ? appearance.paperTint : DEFAULT_LAYOUT.appearance?.paperTint,
      fontFamily: typeof appearance.fontFamily === "string"
        ? appearance.fontFamily as NonNullable<ContractLayout["appearance"]>["fontFamily"]
        : DEFAULT_LAYOUT.appearance?.fontFamily,
      fontScale: typeof appearance.fontScale === "number" ? appearance.fontScale : DEFAULT_LAYOUT.appearance?.fontScale,
      contentWidth: typeof appearance.contentWidth === "number" ? appearance.contentWidth : DEFAULT_LAYOUT.appearance?.contentWidth,
      borderRadius: typeof appearance.borderRadius === "number" ? appearance.borderRadius : DEFAULT_LAYOUT.appearance?.borderRadius,
      sectionSpacing: typeof appearance.sectionSpacing === "number" ? appearance.sectionSpacing : DEFAULT_LAYOUT.appearance?.sectionSpacing,
      showSummaryCards: typeof appearance.showSummaryCards === "boolean" ? appearance.showSummaryCards : DEFAULT_LAYOUT.appearance?.showSummaryCards,
      showContractNumber: typeof appearance.showContractNumber === "boolean" ? appearance.showContractNumber : DEFAULT_LAYOUT.appearance?.showContractNumber,
      showFechouBranding: typeof appearance.showFechouBranding === "boolean" ? appearance.showFechouBranding : DEFAULT_LAYOUT.appearance?.showFechouBranding,
      logoUrl: typeof appearance.logoUrl === "string" ? appearance.logoUrl : logoUrl ?? DEFAULT_LAYOUT.appearance?.logoUrl ?? null,
    },
    blocks: normalizedBlocks,
    customVariables: normalizeStringMap(source.customVariables),
    contractContext: normalizeStringMap(source.contractContext),
  });
}

const CATEGORIES: { label: string; value: string }[] = [
  { label: "Todos", value: "todos" },
  { label: "Geral", value: "geral" },
  { label: "Financeiro", value: "financeiro" },
  { label: "Direitos", value: "direitos" },
  { label: "Segurança", value: "seguranca" },
];

const PLAN_ORDER: Record<PlanId, number> = { free: 0, pro: 1, premium: 2 };
function hasPlan(current: PlanId, required: PlanId) {
  return PLAN_ORDER[current] >= PLAN_ORDER[required];
}

const PREVIEW_ASSET_RETRY_LIMIT = 3;
const PREVIEW_ASSET_RETRY_BASE_DELAY_MS = 350;
const PREVIEW_ASSET_RETRY_MAX_DELAY_MS = 2_500;
const PREVIEW_UPDATE_DEBOUNCE_MS = 140;
const PREVIEW_BASE_WIDTH = 794;
const PREVIEW_BASE_HEIGHT = 1123;
const PREVIEW_PAGE_GAP = 36;
const PREVIEW_ABNT_TOP_MARGIN = 113;
const PREVIEW_ABNT_BOTTOM_MARGIN = 76;
const PREVIEW_ABNT_SAFE_CONTENT_HEIGHT = PREVIEW_BASE_HEIGHT - PREVIEW_ABNT_TOP_MARGIN - PREVIEW_ABNT_BOTTOM_MARGIN;
const PREVIEW_PAGE_BREAK_GUARD = 10;
const PREVIEW_MIN_PAGE_ADVANCE = 320;
const PREVIEW_ZOOM_MIN = 0.6;
const PREVIEW_ZOOM_MAX = 2.4;
const PREVIEW_ZOOM_STEP = 0.15;
const PREVIEW_SIGNATURE_UNAVAILABLE_MESSAGE = "Assinatura indisponível no momento. Atualize o preview em alguns instantes.";
const CLAUSE_NAV_MIN_WIDTH = 220;
const CLAUSE_NAV_MAX_WIDTH = 420;
const CLAUSE_NAV_DEFAULT_WIDTH = 240;

function normalizePreviewZoom(value: number): number {
  return Math.min(PREVIEW_ZOOM_MAX, Math.max(PREVIEW_ZOOM_MIN, Number(value.toFixed(2))));
}

function buildAbntPageOffsets(contentHeight: number, candidates: number[]): number[] {
  const normalizedContentHeight = Math.max(PREVIEW_BASE_HEIGHT, Math.ceil(contentHeight));
  const sortedCandidates = [...new Set(candidates.map((candidate) => Math.round(candidate)))]
    .filter((candidate) => candidate > 0 && candidate < normalizedContentHeight)
    .sort((a, b) => a - b);
  const offsets = [0];
  let currentOffset = 0;

  while (currentOffset + PREVIEW_ABNT_SAFE_CONTENT_HEIGHT < normalizedContentHeight) {
    const idealBreak = currentOffset + PREVIEW_ABNT_SAFE_CONTENT_HEIGHT;
    const minBreak = currentOffset + PREVIEW_MIN_PAGE_ADVANCE;
    const maxBreak = idealBreak - PREVIEW_PAGE_BREAK_GUARD;
    const safeBreak = [...sortedCandidates]
      .reverse()
      .find((candidate) => candidate >= minBreak && candidate <= maxBreak);
    const nextOffset = safeBreak ?? maxBreak;

    if (nextOffset <= currentOffset) break;
    offsets.push(nextOffset);
    currentOffset = nextOffset;
  }

  return offsets;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildPreviewHtmlFromUrl(url: string): string {
  const safeUrl = escapeHtmlAttribute(url);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;background:#fff;overflow:hidden}iframe{width:100%;height:100%;border:0;display:block}</style></head><body><iframe src="${safeUrl}" sandbox="allow-same-origin" referrerpolicy="no-referrer"></iframe></body></html>`;
}

// ─────────────────────────────────────────────────────────────
// SKELETONS
// ─────────────────────────────────────────────────────────────

function ClauseSkeletons() {
  return (
    <div className="p-2 space-y-1.5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg border border-border/30 bg-background/50 p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-14 rounded" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-6 w-full rounded-md mt-1" />
        </div>
      ))}
    </div>
  );
}

function ClauseCatalogMetadata({ template }: { template: ClauseTemplate }) {
  const appliesTo = template.appliesTo?.filter(Boolean) ?? [];

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {template.required && (
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          Obrigatoria
        </Badge>
      )}
      {template.riskLevel && (
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 capitalize">
          Risco {template.riskLevel}
        </Badge>
      )}
      {template.version && (
        <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">
          Versao {template.version}
        </Badge>
      )}
      {template.status && (
        <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">
          {template.status}
        </Badge>
      )}
      {appliesTo.slice(0, 2).map((item) => (
        <Badge
          key={`${template.id}-${item}`}
          variant="outline"
          className="border-blue-500/20 bg-blue-500/5 text-blue-300"
        >
          {item}
        </Badge>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NORMALIZE
// ─────────────────────────────────────────────────────────────

function normalizeContract(raw: any): Contract {
  return {
    id: raw.id,
    userId: raw.userId,
    clientName: raw.clientName,
    clientProfession: raw.clientProfession ?? raw.profession,
    contractType: raw.contractType,
    executionDate: raw.executionDate,
    value: raw.value ?? raw.contractValue,
    paymentForm: raw.paymentForm ?? raw.paymentMethod,
    scope: raw.scope ?? raw.serviceScope,
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    suggestedClauses: (raw.suggestedClauses ?? []).map((item: any) => ({
      id: String(item.id ?? ""),
      title: String(item.title ?? ""),
    })).filter((item: ContractClauseSuggestion) => item.id),
    layout: normalizeLayout(raw.layout ?? raw.layoutConfig, raw.logoUrl ?? raw.layout?.appearance?.logoUrl ?? raw.layoutConfig?.appearance?.logoUrl ?? null),
    layoutConfig: normalizeLayout(raw.layout ?? raw.layoutConfig, raw.logoUrl ?? raw.layout?.appearance?.logoUrl ?? raw.layoutConfig?.appearance?.logoUrl ?? null),
    logoUrl: raw.logoUrl ?? null,
    clauses: (raw.clauses ?? []).map((c: any) => ({
      id: c.id,
      clauseId: c.clauseId,
      title: c.title,
      content: c.content,
      category: c.category ?? "",
      customContent: c.customContent ?? null,
      orderIndex: c.orderIndex ?? 0,
    })),
  };
}

// ─────────────────────────────────────────────────────────────
// APPEARANCE PANEL
// ─────────────────────────────────────────────────────────────

// Legacy AppearancePanel removido do fluxo. O editor usa ContractLayoutPanel.

// ─────────────────────────────────────────────────────────────
// PROVIDER SIGNATURE PANEL
// ─────────────────────────────────────────────────────────────

interface ProviderSignaturePanelProps {
  onSave: (dataUrl: string) => Promise<void>;
  onApply: () => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
  savedExists: boolean;
  saving: boolean;
  applying: boolean;
}

function ProviderSignaturePanel({
  onSave, onApply, onDelete, onClose, savedExists, saving, applying,
}: ProviderSignaturePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current || !lastPos.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#ff6600";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
    setIsEmpty(false);
  };

  const stopDraw = () => { isDrawing.current = false; lastPos.current = null; };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      className="absolute top-14 left-4 right-4 z-50 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden"
      style={{ maxWidth: 480 }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div>
          <p className="text-sm font-bold text-white">Minha assinatura</p>
          <p className="text-xs text-zinc-500 mt-0.5">Salva no perfil · reutilizável em todos os contratos</p>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div
          className="relative rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950"
          style={{ touchAction: "none" }}
        >
          <canvas
            ref={canvasRef}
            width={700}
            height={160}
            className="w-full cursor-crosshair"
            style={{ height: "160px" }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-2 text-zinc-600">
                <Pen size={20} />
                <span className="text-xs">Desenhe sua assinatura aqui</span>
              </div>
            </div>
          )}
          <div className="absolute bottom-7 left-5 right-5 h-px bg-zinc-800 pointer-events-none" />
          <div className="absolute bottom-2 left-5 text-[9px] text-zinc-700 uppercase tracking-widest pointer-events-none">Assinatura</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-all"
          >
            <Eraser size={11} /> Limpar
          </button>
        </div>

        <div className="border-t border-zinc-800" />

        <div className="space-y-2">
          <button
            onClick={() => {
              const canvas = canvasRef.current;
              if (!canvas || isEmpty) return;
              const dataUrl = canvas.toDataURL("image/png");
              onSave(dataUrl);
            }}
            disabled={isEmpty || saving}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isEmpty || saving
                ? "bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700"
                : "bg-zinc-700 text-white hover:bg-zinc-600 border border-zinc-600"
            }`}
          >
            {saving
              ? <><Loader2 size={13} className="animate-spin" /> Salvando...</>
              : <><Save size={13} /> {savedExists ? "Substituir assinatura salva" : "Salvar no perfil"}</>
            }
          </button>

          <button
            onClick={onApply}
            disabled={applying}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-[#ff6600] text-white hover:bg-orange-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {applying
              ? <><Loader2 size={13} className="animate-spin" /> Aplicando...</>
              : <><CheckCircle2 size={13} /> Usar assinatura salva</>
            }
          </button>

          {savedExists && (
            <button
              onClick={onDelete}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-zinc-600 hover:text-red-400 transition-colors"
            >
              <Trash2 size={11} /> Remover assinatura do perfil
            </button>
          )}
        </div>

        <p className="text-[10px] text-zinc-700 leading-relaxed text-center">
          Assinatura protegida com criptografia AES-256-GCM · Válida nos termos da MP 2.200-2/2001
        </p>
        <p className="text-[10px] text-zinc-600 leading-relaxed text-center">
          O preview oficial do contrato continua vindo do backend e só muda depois que a assinatura for aplicada no servidor.
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function EditorContratoPage() {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.resolvedLanguage !== "pt-BR";
  const { id } = useParams<{ id: string }>();
  const contractIdNum = Number(id || "0");
  const hasValidContractId = Number.isInteger(contractIdNum) && contractIdNum > 0;
  const [, navigate] = useLocation();

  const [state, setState] = useState<EditorState>("loading");
  const [contract, setContract] = useState<Contract | null>(null);
  const [clauses, setClauses] = useState<ContractClause[]>([]);
  const [planId, setPlanId] = useState<PlanId>("free");

  const [clauseTemplates, setClauseTemplates] = useState<ClauseTemplate[]>([]);
  const [clausesLoading, setClausesLoading] = useState(false);
  // Dados de entrada enviados pelo frontend ao backend para orientar a selecao juridica.
  const [legalContextInput, setLegalContextInput] = useState<AutoGenerateContractPayload>({});
  const [authenticationMethodsInput, setAuthenticationMethodsInput] = useState("");
  // Dados retornados pelo backend como leitura/preview juridico.
  const [legalBlueprint, setLegalBlueprint] = useState<LegalBlueprintResponse | null>(null);
  const [legalBlueprintLoading, setLegalBlueprintLoading] = useState(false);
  const [legalBlueprintError, setLegalBlueprintError] = useState<string | null>(null);
  const [blueprintDialogOpen, setBlueprintDialogOpen] = useState(false);
  const [legalContextOpen, setLegalContextOpen] = useState(false);
  const [autoGenerateStatus, setAutoGenerateStatus] = useState<AutoGenerateStatus>("idle");
  const [autoGenerateError, setAutoGenerateError] = useState<string | null>(null);
  const [autoGenerateResult, setAutoGenerateResult] = useState<AutoGenerateContractResponse | null>(null);
  const [mccRunResult, setMccRunResult] = useState<MccRunResult | null>(null);

  const [previewDocumentUrl, setPreviewDocumentUrl] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewExpiresAt, setPreviewExpiresAt] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewRefreshing, setPreviewRefreshing] = useState(false);
  const [previewManualRefreshing, setPreviewManualRefreshing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoadedOnce, setPreviewLoadedOnce] = useState(false);
  const [previewRenderKey, setPreviewRenderKey] = useState(0);
  const [previewPageCount, setPreviewPageCount] = useState(1);
  const [previewContentHeight, setPreviewContentHeight] = useState(PREVIEW_BASE_HEIGHT);
  const [previewPageOffsets, setPreviewPageOffsets] = useState<number[]>([0]);
  const [selectedClause, setSelectedClause] = useState<ContractClause | null>(null);
  const [clauseExplorerTab, setClauseExplorerTab] = useState<ClauseExplorerTab>("contrato");
  const [editContent, setEditContent] = useState("");
  const [rightTab, setRightTab] = useState<RightPanelTab>("clausula");
  const [layout, setLayout] = useState<ContractLayout>(DEFAULT_LAYOUT);
  const [suggestedClauses, setSuggestedClauses] = useState<ContractClauseSuggestion[]>([]);
  const [providerSigSaving, setProviderSigSaving] = useState(false);
  const [providerSigApplying, setProviderSigApplying] = useState(false);
  const [showProviderSigPanel, setShowProviderSigPanel] = useState(false);
  const [providerSavedExists, setProviderSavedExists] = useState<boolean | null>(null);
  const [clausePanelOpen, setClausePanelOpen] = useState(false);
  const [inspectorPanelOpen, setInspectorPanelOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [mobileTab, setMobileTab] = useState<"biblioteca" | "preview" | "editor">("preview");
  const [savingClause, setSavingClause] = useState(false);
  const [showLegalNotice, setShowLegalNotice] = useState(true);
  const [previewFitScale, setPreviewFitScale] = useState(1);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 });
  const [isPreviewPanning, setIsPreviewPanning] = useState(false);
  const [clauseNavigatorWidth, setClauseNavigatorWidth] = useState(CLAUSE_NAV_DEFAULT_WIDTH);
  const previewScale = previewFitScale * previewZoom;

  // ── MOBILE TAB — declarado aqui, junto com os outros states ──────────────
  const iframeDesktopRef = useRef<HTMLIFrameElement>(null);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const previewPanStartRef = useRef<{
    pointerId: number;
    originX: number;
    originY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const legalBlueprintDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewRequestRef = useRef<Promise<void> | null>(null);
  const queuedPreviewModeRef = useRef<Exclude<ProtectedPreviewRefreshReason, "initial"> | null>(null);
  const previewExpiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewAssetRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewMutationRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewAssetRetryAttemptRef = useRef(0);
  const initialPreviewRequestedRef = useRef(false);
  const clauseResizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const [layoutSaving, setLayoutSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [showTour, setShowTour] = useState(false);


  // ── Muda para aba editor quando cláusula é selecionada em mobile ──────────
  const clearLegalBlueprintDebounce = useCallback(() => {
    if (legalBlueprintDebounceRef.current) {
      clearTimeout(legalBlueprintDebounceRef.current);
      legalBlueprintDebounceRef.current = null;
    }
  }, []);

  const updateLegalContextInput = useCallback((patch: Partial<AutoGenerateContractPayload>) => {
    setLegalContextInput((current) => ({ ...current, ...patch }));
  }, []);

  const handleToggleContractModel = useCallback((value: LegalContractModel) => {
    setLegalContextInput((current) => {
      const currentModels = current.contractModels ?? [];
      const nextModels = currentModels.includes(value)
        ? currentModels.filter((item) => item !== value)
        : [...currentModels, value];

      return {
        ...current,
        contractModels: nextModels,
      };
    });
  }, []);

  const clearPreviewAssetRetryTimer = useCallback(() => {
    if (previewAssetRetryTimerRef.current) {
      clearTimeout(previewAssetRetryTimerRef.current);
      previewAssetRetryTimerRef.current = null;
    }
  }, []);

  const clearPreviewExpiryTimer = useCallback(() => {
    if (previewExpiryTimerRef.current) {
      clearTimeout(previewExpiryTimerRef.current);
      previewExpiryTimerRef.current = null;
    }
  }, []);

  const clearPreviewMutationRefreshTimer = useCallback(() => {
    if (previewMutationRefreshTimerRef.current) {
      clearTimeout(previewMutationRefreshTimerRef.current);
      previewMutationRefreshTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const stage = previewStageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;

    const updatePreviewScale = () => {
      const { clientWidth, clientHeight } = stage;
      if (!clientWidth || !clientHeight) return;

      const availableWidth = Math.max(clientWidth - 16, 1);
      const availableHeight = Math.max(clientHeight - 12, 1);
      const nextScale = Math.min(availableWidth / PREVIEW_BASE_WIDTH, availableHeight / PREVIEW_BASE_HEIGHT, 0.92);
      setPreviewFitScale((currentScale) =>
        Math.abs(currentScale - nextScale) < 0.01 ? currentScale : nextScale,
      );
    };

    updatePreviewScale();

    const observer = new ResizeObserver(updatePreviewScale);
    observer.observe(stage);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const resizeState = clauseResizeStateRef.current;
      if (!resizeState) return;

      const deltaX = event.clientX - resizeState.startX;
      const nextWidth = Math.min(
        CLAUSE_NAV_MAX_WIDTH,
        Math.max(CLAUSE_NAV_MIN_WIDTH, resizeState.startWidth + deltaX),
      );
      setClauseNavigatorWidth(nextWidth);
    };

    const handleMouseUp = () => {
      if (!clauseResizeStateRef.current) return;
      clauseResizeStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleClauseResizeStart = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    clauseResizeStateRef.current = {
      startX: event.clientX,
      startWidth: clauseNavigatorWidth,
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [clauseNavigatorWidth]);

  const refreshProtectedPreview = useCallback(async (
    reason: ProtectedPreviewRefreshReason,
    showToast = false,
  ) => {
    if (!hasValidContractId) return;
    if (previewRequestRef.current) {
      if (reason !== "initial") {
        queuedPreviewModeRef.current = reason === "manual" ? "manual" : (queuedPreviewModeRef.current ?? reason);
      }
      return previewRequestRef.current;
    }

    const shouldBlockInitialPreview = reason === "initial" && !previewLoadedOnce && !previewHtml;
    if (shouldBlockInitialPreview) setPreviewLoading(true);
    if (reason !== "initial") setPreviewRefreshing(true);
    if (reason === "manual" && previewLoadedOnce) setPreviewManualRefreshing(true);
    setPreviewError(null);

    const request = (async () => {
      try {
        const rendered = await renderContract(contractIdNum);
        const nextHtml = typeof rendered.previewHtml === "string" && rendered.previewHtml.trim()
          ? rendered.previewHtml
          : "";
        const nextUrl = typeof rendered.previewDocumentUrl === "string"
          ? rendered.previewDocumentUrl.trim()
          : "";

        if (!nextHtml && !nextUrl) {
          throw new Error("O backend nao retornou previewHtml ou previewDocumentUrl.");
        }

        clearPreviewAssetRetryTimer();
        clearPreviewExpiryTimer();
        previewAssetRetryAttemptRef.current = 0;

        setPreviewHtml(nextHtml);
        setPreviewDocumentUrl(nextUrl);
        setPreviewExpiresAt(rendered.previewExpiresAt ?? null);
        setPreviewPageCount(1);
        setPreviewContentHeight(PREVIEW_BASE_HEIGHT);
        setPreviewPageOffsets([0]);
        setPreviewRenderKey((current) => current + 1);

        const delay = getPreviewRefreshDelay(rendered.previewExpiresAt ?? null);
        if (delay !== null) {
          previewExpiryTimerRef.current = setTimeout(() => {
            void refreshProtectedPreview("expired", true);
          }, delay);
        }
      } catch (err: any) {
        const message = getFriendlyApiErrorMessage(err, "Nao foi possivel atualizar o preview.");
        if (!previewLoadedOnce && !previewHtml) {
          setPreviewError(message);
          setPreviewLoading(false);
        } else {
          setPreviewManualRefreshing(false);
          if (showToast) {
            toast.error(message);
          }
        }
      } finally {
        if (reason !== "initial") {
          setPreviewRefreshing(false);
        }
        if (reason === "manual" && !iframeDesktopRef.current) {
          setPreviewManualRefreshing(false);
        }
        previewRequestRef.current = null;
        if (queuedPreviewModeRef.current) {
          const nextMode = queuedPreviewModeRef.current;
          queuedPreviewModeRef.current = null;
          setTimeout(() => {
            void refreshProtectedPreview(nextMode, nextMode === "manual");
          }, 0);
        }
      }
    })();

    previewRequestRef.current = request;
    return request;
  }, [
    clearPreviewAssetRetryTimer,
    clearPreviewExpiryTimer,
    contractIdNum,
    hasValidContractId,
    previewHtml,
    previewLoadedOnce,
  ]);

  const requestPreviewAssetRetry = useCallback(() => {
    clearPreviewAssetRetryTimer();

    if (previewAssetRetryAttemptRef.current >= PREVIEW_ASSET_RETRY_LIMIT) {
      setPreviewError(PREVIEW_SIGNATURE_UNAVAILABLE_MESSAGE);
      toast.error(PREVIEW_SIGNATURE_UNAVAILABLE_MESSAGE);
      return;
    }

    const attempt = previewAssetRetryAttemptRef.current + 1;
    previewAssetRetryAttemptRef.current = attempt;
    const delay = Math.min(
      PREVIEW_ASSET_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
      PREVIEW_ASSET_RETRY_MAX_DELAY_MS,
    );

    previewAssetRetryTimerRef.current = setTimeout(() => {
      void refreshProtectedPreview("asset-error", true);
    }, delay);
  }, [clearPreviewAssetRetryTimer, refreshProtectedPreview]);

  const handlePreviewFrameLoad = useCallback(() => {
    setPreviewLoadedOnce(true);
    setPreviewLoading(false);
    setPreviewManualRefreshing(false);
    previewAssetRetryAttemptRef.current = 0;
  }, []);

  const measurePreviewPages = useCallback((frame: HTMLIFrameElement | null) => {
    const doc = frame?.contentDocument;
    const body = doc?.body;
    const html = doc?.documentElement;
    if (!doc || !body || !html) return;

    const scrollTop = doc.defaultView?.scrollY ?? html.scrollTop ?? body.scrollTop ?? 0;
    const breakCandidates: number[] = [];
    const maxElementBottom = Array.from(body.querySelectorAll<HTMLElement>("*")).reduce(
      (max, element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return max;
        const bottom = rect.bottom + scrollTop;
        if (/^(P|LI|H[1-6]|TR|TABLE|SECTION|ARTICLE|DIV|UL|OL|BLOCKQUOTE)$/i.test(element.tagName)) {
          breakCandidates.push(bottom + 2);
        }
        return Math.max(max, bottom);
      },
      0,
    );

    const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.textContent?.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    });
    const range = doc.createRange();
    let textNode = walker.nextNode();

    while (textNode) {
      range.selectNodeContents(textNode);
      Array.from(range.getClientRects()).forEach((rect) => {
        if (rect.width > 0 && rect.height > 0) {
          breakCandidates.push(rect.bottom + scrollTop + 4);
        }
      });
      textNode = walker.nextNode();
    }

    range.detach();

    const contentHeight = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.scrollHeight,
      html.offsetHeight,
      maxElementBottom,
    );
    const nextContentHeight = Math.max(PREVIEW_BASE_HEIGHT, Math.ceil(contentHeight + 1));
    const nextPageOffsets = buildAbntPageOffsets(nextContentHeight, breakCandidates);
    const nextPageCount = nextPageOffsets.length;
    setPreviewContentHeight((current) =>
      Math.abs(current - nextContentHeight) < 2 ? current : nextContentHeight,
    );
    setPreviewPageOffsets((current) =>
      current.length === nextPageOffsets.length &&
      current.every((offset, index) => Math.abs(offset - nextPageOffsets[index]) < 2)
        ? current
        : nextPageOffsets,
    );
    setPreviewPageCount((current) => current === nextPageCount ? current : nextPageCount);
  }, []);

  const schedulePreviewPageMeasure = useCallback((frame: HTMLIFrameElement, pageIndex: number) => {
    const doc = frame.contentDocument;
    if (!doc || pageIndex !== 0) return;

    const remeasureFirstPage = () => {
      measurePreviewPages(frame);
    };

    requestAnimationFrame(remeasureFirstPage);
    setTimeout(remeasureFirstPage, 120);
    setTimeout(remeasureFirstPage, 420);
    void doc.fonts?.ready.then(remeasureFirstPage).catch(() => undefined);
    Array.from(doc.images).forEach((image) => {
      if (image.complete) return;
      image.addEventListener("load", remeasureFirstPage, { once: true });
      image.addEventListener("error", remeasureFirstPage, { once: true });
    });
  }, [measurePreviewPages]);

  const handlePreviewPageFrameLoad = useCallback((
    event: React.SyntheticEvent<HTMLIFrameElement>,
    pageIndex: number,
  ) => {
    schedulePreviewPageMeasure(event.currentTarget, pageIndex);
    if (pageIndex === 0) {
      handlePreviewFrameLoad();
    }
  }, [handlePreviewFrameLoad, schedulePreviewPageMeasure]);

  const loadPreview = useCallback((mode: PreviewRefreshMode) => {
    return refreshProtectedPreview(mode, mode === "manual");
  }, [refreshProtectedPreview]);

  const refreshPreviewAfterMutation = useCallback(() => {
    clearPreviewMutationRefreshTimer();
    void loadPreview("mutation");
    previewMutationRefreshTimerRef.current = setTimeout(() => {
      previewMutationRefreshTimerRef.current = null;
      void loadPreview("mutation");
    }, PREVIEW_UPDATE_DEBOUNCE_MS);
  }, [clearPreviewMutationRefreshTimer, loadPreview]);

  const handlePreviewPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button,a,input,textarea,select,[data-no-pan]")) return;

    event.preventDefault();
    previewPanStartRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      startX: previewPan.x,
      startY: previewPan.y,
    };
    setIsPreviewPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [previewPan.x, previewPan.y]);

  const handlePreviewPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const start = previewPanStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;

    setPreviewPan({
      x: start.startX + event.clientX - start.originX,
      y: start.startY + event.clientY - start.originY,
    });
  }, []);

  const endPreviewPan = useCallback((event?: React.PointerEvent<HTMLDivElement>) => {
    if (event && previewPanStartRef.current?.pointerId === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    previewPanStartRef.current = null;
    setIsPreviewPanning(false);
  }, []);

  const handlePreviewWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const direction = event.deltaY > 0 ? -PREVIEW_ZOOM_STEP : PREVIEW_ZOOM_STEP;
      setPreviewZoom((current) => normalizePreviewZoom(current + direction));
      return;
    }

    setPreviewPan((current) => ({
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    }));
  }, []);

  const resetPreviewPan = useCallback(() => {
    previewPanStartRef.current = null;
    setIsPreviewPanning(false);
    setPreviewPan({ x: 0, y: 0 });
  }, []);

  const zoomPreviewOut = useCallback(() => {
    setPreviewZoom((current) => normalizePreviewZoom(current - PREVIEW_ZOOM_STEP));
  }, []);

  const zoomPreviewIn = useCallback(() => {
    setPreviewZoom((current) => normalizePreviewZoom(current + PREVIEW_ZOOM_STEP));
  }, []);

  const resetPreviewView = useCallback(() => {
    setPreviewZoom(1);
    resetPreviewPan();
  }, [resetPreviewPan]);

  const openInspectorPanel = useCallback((tab: RightPanelTab) => {
    setRightTab(tab);
    setInspectorPanelOpen(true);
  }, []);

  const saveLayoutPatch = useCallback(async (patch: Partial<ContractLayout>) => {
    if (!hasValidContractId) return;

    setLayout((current) => mergeLayoutState(current, patch));
    setLayoutSaving("saving");

    try {
      await updateLayout(contractIdNum, patch as Record<string, unknown>);
      setLayoutSaving("saved");
      refreshPreviewAfterMutation();
      setTimeout(() => setLayoutSaving("idle"), 1500);
    } catch (err: any) {
      setLayoutSaving("idle");
      toast.error(getFriendlyApiErrorMessage(err, "Erro ao salvar layout do contrato."));
    }
  }, [contractIdNum, hasValidContractId, refreshPreviewAfterMutation]);

  const loadLegalBlueprint = useCallback(async () => {
    setLegalBlueprintLoading(true);
    setLegalBlueprintError(null);

    try {
      const blueprint = await fetchLegalBlueprint(buildLegalBlueprintParams(legalContextInput));
      setLegalBlueprint(blueprint);
      setLegalContextInput((current) => {
        const merged = mergeBlueprintDefaults(current, blueprint.defaultContext, contract?.contractType);
        return JSON.stringify(merged) === JSON.stringify(current) ? current : merged;
      });
      setAuthenticationMethodsInput((current) => {
        if (current.trim().length > 0) return current;
        return blueprint.defaultContext.authenticationMethods?.join(", ") ?? "";
      });
    } catch (err: any) {
      setLegalBlueprintError(getFriendlyApiErrorMessage(err, "Nao foi possivel carregar o blueprint juridico."));
    } finally {
      setLegalBlueprintLoading(false);
    }
  }, [contract?.contractType, legalContextInput]);

  const loadContract = useCallback(async () => {
    if (!hasValidContractId) {
      setContract(null);
      setClauses([]);
      setState("error");
      return;
    }

    setState("loading");

    try {
      const raw = await getContract(contractIdNum);
      const c = normalizeContract(raw);

      setContract(c);
      setClauses(c.clauses ?? []);
      setSuggestedClauses(c.suggestedClauses ?? []);
      setLayout(c.layout ?? DEFAULT_LAYOUT);
      setProviderSavedExists(null);

      const neverShow = localStorage.getItem("fechou_editor_tour_never") === "1";
      if (!neverShow) {
        setShowTour(true);
      }

      setState("idle");
      void getMyPlan()
        .then((planData) => {
          setPlanId(planData.plan.planId);
        })
        .catch(() => {
          setPlanId("free");
        });
    } catch (err) {
      toast.error("Não foi possível carregar o contrato.");
      setState("error");
    }
  }, [contractIdNum, hasValidContractId]);
  const loadClauseTemplates = useCallback(async (searchValue: string, category: string) => {
    setClausesLoading(true);
    try {
      const params: { search?: string; category?: string } = {};
      if (searchValue.trim()) params.search = searchValue.trim();
      if (category !== "todos") params.category = category;
      setClauseTemplates(await fetchClauses(params));
    } catch (err: any) {
      toast.error(getFriendlyApiErrorMessage(err, "Erro ao buscar clausulas."));
    } finally {
      setClausesLoading(false);
    }
  }, []);

  useEffect(() => {
    clearLegalBlueprintDebounce();
    previewRequestRef.current = null;
    queuedPreviewModeRef.current = null;
    initialPreviewRequestedRef.current = false;
    clearPreviewAssetRetryTimer();
    clearPreviewExpiryTimer();
    clearPreviewMutationRefreshTimer();
    setPreviewDocumentUrl("");
    setPreviewHtml("");
    setPreviewExpiresAt(null);
    setPreviewRenderKey(0);
    setPreviewPageCount(1);
    setPreviewContentHeight(PREVIEW_BASE_HEIGHT);
    setPreviewPageOffsets([0]);
    setPreviewError(null);
    setPreviewLoading(true);
    setPreviewRefreshing(false);
    setPreviewManualRefreshing(false);
    setPreviewLoadedOnce(false);
    setPreviewZoom(1);
    resetPreviewPan();
    setLegalContextInput({});
    setAuthenticationMethodsInput("");
    setLegalBlueprint(null);
    setLegalBlueprintLoading(false);
    setLegalBlueprintError(null);
    setBlueprintDialogOpen(false);
    setLegalContextOpen(false);
    setClausePanelOpen(false);
    setInspectorPanelOpen(false);
    setAutoGenerateStatus("idle");
    setAutoGenerateError(null);
    setAutoGenerateResult(null);
    setMccRunResult(null);
    setSuggestedClauses([]);
    setLayout(DEFAULT_LAYOUT);

    if (!hasValidContractId) {
      setContract(null);
      setClauses([]);
      setSuggestedClauses([]);
      setPreviewLoading(false);
      setState("error");
      return () => {
        clearLegalBlueprintDebounce();
        clearPreviewAssetRetryTimer();
        clearPreviewExpiryTimer();
        clearPreviewMutationRefreshTimer();
      };
    }

    loadContract();
    return () => {
      clearLegalBlueprintDebounce();
      clearPreviewAssetRetryTimer();
      clearPreviewExpiryTimer();
      clearPreviewMutationRefreshTimer();
    };
  }, [clearLegalBlueprintDebounce, clearPreviewAssetRetryTimer, clearPreviewExpiryTimer, clearPreviewMutationRefreshTimer, hasValidContractId, loadContract, resetPreviewPan]);

  const handleSaveProviderSignature = useCallback(async (dataUrl: string) => {
    if (!dataUrl) return;
    setProviderSigSaving(true);
    try {
      const base64Only = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      await runWithStepUp("contracts.provider-signature.save", undefined, (stepUpToken) =>
        apiFetch("/api/contracts/provider-signature", {
          method: "POST",
          json: { signatureDataUrl: base64Only },
          stepUpToken,
        })
      );
      setProviderSavedExists(true);
      toast.success("Assinatura salva no perfil!");
      refreshPreviewAfterMutation();
    } catch (err: any) {
      if (isStepUpCancelledError(err)) return;
      toast.error(getFriendlyApiErrorMessage(err, "Erro ao salvar assinatura."));
    } finally {
      setProviderSigSaving(false);
    }
  }, [refreshPreviewAfterMutation]);

  const handleApplyProviderSignature = useCallback(async () => {
    if (!contractIdNum) return;
    setProviderSigApplying(true);
    try {
      await runWithStepUp("contracts.provider-signature.apply", undefined, (stepUpToken) =>
        apiFetch(`/api/contracts/${contractIdNum}/provider-signature`, {
          method: "POST",
          stepUpToken,
        })
      );
      toast.success("Assinatura aplicada ao contrato!");
      refreshPreviewAfterMutation();
      setShowProviderSigPanel(false);
    } catch (err: any) {
      if (isStepUpCancelledError(err)) return;
      toast.error(getFriendlyApiErrorMessage(err, "Erro ao aplicar assinatura."));
    } finally {
      setProviderSigApplying(false);
    }
  }, [contractIdNum, refreshPreviewAfterMutation]);

  const handleDeleteProviderSignature = useCallback(async () => {
    try {
      await runWithStepUp("contracts.provider-signature.delete", undefined, (stepUpToken) =>
        apiFetch("/api/contracts/provider-signature", {
          method: "DELETE",
          stepUpToken,
        })
      );
      setProviderSavedExists(false);
      toast.success("Assinatura removida do perfil.");
    } catch (err: any) {
      if (isStepUpCancelledError(err)) return;
      toast.error(getFriendlyApiErrorMessage(err, "Erro ao remover assinatura."));
    }
  }, []);

  useEffect(() => {
    if (state !== "idle" || !hasValidContractId) return;
    clearLegalBlueprintDebounce();
    legalBlueprintDebounceRef.current = setTimeout(() => {
      legalBlueprintDebounceRef.current = null;
      void loadLegalBlueprint();
    }, 250);

    return () => {
      clearLegalBlueprintDebounce();
    };
  }, [clearLegalBlueprintDebounce, hasValidContractId, loadLegalBlueprint, state]);

  useEffect(() => {
    if (state !== "idle" || !hasValidContractId) return;
    if (initialPreviewRequestedRef.current) return;
    initialPreviewRequestedRef.current = true;
    void loadPreview("initial");
  }, [hasValidContractId, loadPreview, state]);

  const handleAddClause = async (template: ClauseTemplate) => {
    if (!contract) return;
    const rawId = template.id;
    if (!rawId) { toast.error("Erro: cláusula sem ID válido."); return; }
    const clauseIdStr = String(rawId);
    if (clauses.some(c => String(c.clauseId) === clauseIdStr || String(c.id) === clauseIdStr)) {
      toast.info("Esta cláusula já foi adicionada.");
      return;
    }
    const toastId = toast.loading("Adicionando cláusula...");
    try {
      const newClause = await addClause(contractIdNum, rawId);
      const enriched: ContractClause = {
        id: (newClause as any).id ?? 0,
        clauseId: (newClause as any).clauseId ?? rawId,
        title: (newClause as any).title ?? template.title,
        content: (newClause as any).content ?? template.content,
        customContent: (newClause as any).customContent ?? null,
        category: (newClause as any).category ?? template.category,
        orderIndex: (newClause as any).orderIndex ?? clauses.length,
      };
      setClauses(prev => [...prev, enriched]);
      refreshPreviewAfterMutation();
      toast.success("Cláusula adicionada!", { id: toastId });
    } catch (err: any) {
      toast.error(getFriendlyApiErrorMessage(err, "Erro ao adicionar clausula."), { id: toastId });
    }
  };

  const handleRemoveClause = async (rowId: number) => {
    const toastId = toast.loading("Removendo cláusula...");
    try {
      const target = clauses.find(c => c.id === rowId);
      if (!target) { toast.error("Cláusula não encontrada.", { id: toastId }); return; }
      await deleteClause(contractIdNum, target.clauseId ?? target.id);
      setClauses(prev => prev.filter(c => c.id !== rowId));
      if (selectedClause?.id === rowId) setSelectedClause(null);
      refreshPreviewAfterMutation();
      toast.success("Cláusula removida.", { id: toastId });
    } catch (err: any) {
      toast.error(getFriendlyApiErrorMessage(err, "Erro ao remover clausula."), { id: toastId });
    }
  };

  const handleSelectClause = (clause: ContractClause) => {
    setSelectedClause(clause);
    setEditContent(clause.customContent || clause.content);
    setRightTab("clausula");
  };

  const handleSaveClause = async () => {
    if (!selectedClause) return;
    setSavingClause(true);
    const toastId = toast.loading("Salvando cláusula...");
    try {
      const candidateIds = [...new Set(
        [selectedClause.id, selectedClause.clauseId]
          .filter((value): value is string | number => value !== null && value !== undefined && String(value).length > 0),
      )];

      let updatedClause: ContractClause | null = null;
      let lastError: unknown = null;

      for (const clauseIdentifier of candidateIds) {
        try {
          updatedClause = await updateClause(contractIdNum, clauseIdentifier, editContent);
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!updatedClause) {
        throw lastError ?? new Error("Nao foi possivel salvar a clausula.");
      }

      const savedClause = updatedClause;

      const matchesUpdatedClause = (clause: ContractClause) =>
        clause.id === selectedClause.id ||
        clause.id === savedClause.id ||
        String(clause.clauseId ?? "") === String(selectedClause.clauseId ?? "") ||
        String(clause.clauseId ?? "") === String(savedClause.clauseId ?? "");

      setClauses((prev) =>
        prev.map((clause) =>
          matchesUpdatedClause(clause)
            ? {
                ...clause,
                ...savedClause,
                customContent: savedClause.customContent ?? editContent,
              }
            : clause,
        ),
      );
      setSelectedClause((prev) =>
        prev
          ? {
              ...prev,
              ...savedClause,
              customContent: savedClause.customContent ?? editContent,
            }
          : prev,
      );
      setEditContent(savedClause.customContent ?? editContent);
      await loadContract();
      refreshPreviewAfterMutation();
      toast.success("Cláusula salva!", { id: toastId });
    } catch (err: any) {
      toast.error(getFriendlyApiErrorMessage(err, "Erro ao salvar clausula."), { id: toastId });
    } finally {
      setSavingClause(false);
    }
  };

  const handleDragStart = (i: number) => setDraggedIndex(i);
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOver(i); };
  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) { setDragOver(null); setDraggedIndex(null); return; }
    const reordered = [...clauses];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setClauses(reordered);
    setDragOver(null);
    setDraggedIndex(null);
    try {
      await reorderClauses(contractIdNum, draggedIndex, targetIndex);
      refreshPreviewAfterMutation();
    }
    catch (err: any) { toast.error(getFriendlyApiErrorMessage(err, "Erro ao reordenar clausulas.")); }
  };

  const handleGeneratePdf = async () => {
    setState("generating-pdf");
    const toastId = toast.loading("Gerando contrato em PDF...");
    try {
      await generatePdf(contractIdNum);
      toast.success("PDF gerado e baixado!", { id: toastId });
    } catch (err: any) {
      toast.error(getFriendlyApiErrorMessage(err, "Erro ao gerar PDF."), { id: toastId });
    }
    setState("idle");
  };

  const handleAutoGenerate = useCallback(async () => {
    if (!contract) return;

    setAutoGenerateStatus("loading");
    setAutoGenerateError(null);

    const toastId = toast.loading("Gerando clausulas juridicas...");

    try {
      const payload = normalizeAutoGeneratePayload(
        {
          ...legalContextInput,
          authenticationMethods: parseAuthenticationMethodsInput(authenticationMethodsInput),
        },
        authenticationMethodsInput,
      );

      const result = await runMccAutoGenerate(contract.id, payload);

      setAutoGenerateResult({
        ...result.raw,
        clauses: [...result.raw.clauses].sort((a, b) => a.orderIndex - b.orderIndex),
      });
      setMccRunResult(result.mcc);
      setAutoGenerateStatus("success");
      toast.success("Contrato inteligente gerado com sucesso.", { id: toastId });
      await loadContract();
      refreshPreviewAfterMutation();
    } catch (err: any) {
      const message = getFriendlyApiErrorMessage(err, "Nao foi possivel gerar clausulas juridicas.");
      setAutoGenerateStatus("error");
      setAutoGenerateError(message);
      toast.error(message, { id: toastId });
    }
  }, [authenticationMethodsInput, contract, legalContextInput, loadContract, refreshPreviewAfterMutation]);

  const isAlreadyAdded = (templateId: string | number) =>
    clauses.some(c => String(c.clauseId) === String(templateId));

  const previewIncludeClauseIds = layout.preview?.includeClauseIds ?? [];
  const previewHiddenClauseIds = layout.preview?.hiddenClauseIds ?? [];
  const clauseIdsInContract = clauses.map((clause) => String(clause.clauseId ?? clause.id));

  const isClauseVisibleInPreview = useCallback((clauseId: string, inContract: boolean) => {
    if (inContract) {
      return !previewHiddenClauseIds.includes(clauseId);
    }
    return previewIncludeClauseIds.includes(clauseId);
  }, [previewHiddenClauseIds, previewIncludeClauseIds]);

  const handleTogglePreviewClause = useCallback((clauseId: string, inContract: boolean) => {
    const hidden = new Set(previewHiddenClauseIds);
    const included = new Set(previewIncludeClauseIds);

    if (inContract) {
      if (hidden.has(clauseId)) hidden.delete(clauseId);
      else hidden.add(clauseId);
      included.delete(clauseId);
    } else {
      if (included.has(clauseId)) included.delete(clauseId);
      else included.add(clauseId);
      hidden.delete(clauseId);
    }

    void saveLayoutPatch({
      preview: {
        includeClauseIds: Array.from(included),
        hiddenClauseIds: Array.from(hidden),
      },
    });
  }, [previewHiddenClauseIds, previewIncludeClauseIds, saveLayoutPatch]);

  const moveClause = useCallback(async (rowIndex: number, direction: -1 | 1) => {
    const nextIndex = rowIndex + direction;
    if (nextIndex < 0 || nextIndex >= clauses.length) return;
    try {
      await reorderClauses(contractIdNum, rowIndex, nextIndex);
      setClauses((current) => {
        const reordered = [...current];
        const [moved] = reordered.splice(rowIndex, 1);
        reordered.splice(nextIndex, 0, moved);
        return reordered;
      });
      refreshPreviewAfterMutation();
    } catch (err: any) {
      toast.error(getFriendlyApiErrorMessage(err, "Erro ao reordenar clausulas."));
    }
  }, [clauses.length, contractIdNum, refreshPreviewAfterMutation]);

  const hasConfiguredLegalContext = Boolean(
    legalContextInput.audience ||
    legalContextInput.riskLevel ||
    legalContextInput.contractModels?.length ||
    legalContextInput.ipMode ||
    legalContextInput.supportLevel ||
    typeof legalContextInput.personalData === "boolean" ||
    typeof legalContextInput.sensitiveData === "boolean" ||
    typeof legalContextInput.sourceCodeDelivery === "boolean" ||
    typeof legalContextInput.subscription === "boolean" ||
    typeof legalContextInput.milestoneBilling === "boolean" ||
    typeof legalContextInput.includeArbitration === "boolean" ||
    typeof legalContextInput.includeEscrow === "boolean" ||
    typeof legalContextInput.includePortfolioUse === "boolean" ||
    typeof legalContextInput.includeChargebackRule === "boolean" ||
    typeof legalContextInput.includeHandOver === "boolean" ||
    authenticationMethodsInput.trim() ||
    legalContextInput.forumCityUf?.trim() ||
    legalContextInput.forumConnection?.trim() ||
    legalContextInput.supportSummary?.trim() ||
    legalContextInput.subprocessorSummary?.trim() ||
    legalContextInput.securitySummary?.trim()
  );

  const legalStatusTone = autoGenerateResult
    ? "emerald"
    : hasConfiguredLegalContext
    ? "accent"
    : "amber";

  const legalClauseCount = autoGenerateResult?.clauses.length ?? 0;
  const missingTemplateFields = autoGenerateResult?.missingTemplateFields ?? [];
  const mccRun = mccRunResult ?? (autoGenerateResult ? adaptAutoGenerateResponseToMcc(autoGenerateResult) : null);
  const contractInsights = mergeContractInsights(contract, autoGenerateResult);
  const clauseSearch = search.trim().toLowerCase();
  const filteredContractClauses = clauses.filter((clause) => {
    if (!clauseSearch) return true;
    const title = clause.title?.toLowerCase() ?? "";
    const clauseId = String(clause.clauseId ?? clause.id).toLowerCase();
    return title.includes(clauseSearch) || clauseId.includes(clauseSearch);
  });
  const filteredSuggestedClauses = suggestedClauses.filter((suggestion) => {
    if (!clauseSearch) return true;
    return (
      suggestion.title.toLowerCase().includes(clauseSearch) ||
      suggestion.id.toLowerCase().includes(clauseSearch)
    );
  });
  const hiddenContractClauses = clauses.filter((clause) =>
    previewHiddenClauseIds.includes(String(clause.clauseId ?? clause.id))
  );
  const previewOnlySuggestedClauses = suggestedClauses.filter((suggestion) =>
    previewIncludeClauseIds.includes(suggestion.id) && !isAlreadyAdded(suggestion.id)
  );
  const clauseCountCards = [
    {
      label: "No contrato",
      value: clauses.length,
      helper: "Clausulas que ja fazem parte do contrato e podem ser editadas.",
    },
    {
      label: "Sugestoes",
      value: suggestedClauses.length,
      helper: "Entradas sugeridas pelo backend. Nada entra sozinho no contrato.",
    },
    {
      label: "Ajustes do preview",
      value: hiddenContractClauses.length + previewOnlySuggestedClauses.length,
      helper: "Excecoes que mudam o que aparece no preview oficial.",
    },
    {
      label: "Warnings juridicos",
      value: autoGenerateResult?.warnings.length ?? 0,
      helper: "Alertas de risco e recomendacoes retornadas pelo backend.",
    },
  ];
  const previewPageIndexes = previewPageOffsets.map((_, index) => index);
  const previewCanvasWidth = (PREVIEW_BASE_WIDTH * previewPageCount) + (PREVIEW_PAGE_GAP * Math.max(0, previewPageCount - 1));

  // ─────────────────────────────────────────────────────────────
  // EARLY RETURNS — depois de todos os hooks
  // ─────────────────────────────────────────────────────────────

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">{isEnglish ? "Loading editor..." : "Carregando editor..."}</p>
        </div>
      </div>
    );
  }

  if (state === "error" || !contract) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={32} className="text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground text-sm mb-4">{t("editor.contractNotFound")}</p>
          <Link href="/contratos">
            <Button variant="outline" size="sm">
              <ArrowLeft size={14} className="mr-1.5" /> {t("editor.backToContracts")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#0b0c0f] text-foreground">
      <div className="noise-overlay" />

      {showTour && <EditorTour onClose={() => setShowTour(false)} />}

      <header className="relative z-40 flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-[#0e1014]/95 px-3 py-2 backdrop-blur-sm lg:h-11 lg:flex-nowrap lg:gap-3 lg:py-0">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link href="/contratos">
            <button className="flex shrink-0 items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft size={14} />
            </button>
          </Link>

          <div className="h-3.5 w-px shrink-0 bg-white/10" />

          <span className="max-w-[120px] truncate text-[13px] font-semibold text-foreground/90 sm:max-w-[220px]">
            {contract.clientName}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground/50">
            #{String(contract.id).padStart(4, "0")}
          </span>

          <div className="hidden h-3.5 w-px shrink-0 bg-white/10 sm:block" />

          <div className="hidden items-center gap-1.5 sm:flex">
            {previewLoadedOnce && (
              <span className="flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                <Lock size={8} /> {isEnglish ? "Official" : "Oficial"}
              </span>
            )}
            {previewRefreshing && !previewLoading && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                <Loader2 size={8} className="animate-spin" /> {isEnglish ? "syncing..." : "sincronizando..."}
              </span>
            )}
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                hasPlan(planId, "premium")
                  ? "border-purple-500/25 bg-purple-500/12 text-purple-300"
                  : hasPlan(planId, "pro")
                  ? "border-blue-500/25 bg-blue-500/12 text-blue-300"
                  : "border-zinc-500/25 bg-zinc-500/12 text-zinc-400"
              }`}
            >
              {hasPlan(planId, "premium") ? "Premium" : hasPlan(planId, "pro") ? "Pro" : "Free"}
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-px overflow-hidden rounded-xl border border-white/[0.06] bg-[#111214] xl:flex">
          {clauseCountCards.map((card, index) => (
            <div
              key={card.label}
              title={card.helper}
              className={`flex items-center gap-2 px-3 py-1.5 ${index < clauseCountCards.length - 1 ? "border-r border-white/[0.06]" : ""}`}
            >
              <span className="text-sm font-semibold leading-none text-foreground">{card.value}</span>
              <span className="max-w-[64px] truncate text-[10px] leading-tight text-muted-foreground/60">{card.label}</span>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <button
            data-tour="btn-signature"
            onClick={() => setShowProviderSigPanel((p) => !p)}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] transition-all ${
              providerSavedExists
                ? "border-[#ff6600]/35 bg-[#ff6600]/12 text-[#ff8a3d] hover:bg-[#ff6600]/20"
                : "border-white/[0.08] text-muted-foreground/60 hover:border-[#ff6600]/40 hover:text-[#ff8a3d]"
            }`}
          >
            <PenLine size={10} />
            <span className="hidden sm:inline">{isEnglish ? "Signature" : "Assinatura"}</span>
          </button>

          <button
            onClick={() => void loadPreview("manual")}
            className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-2 py-1 text-[10px] text-muted-foreground/60 transition-all hover:border-accent/40 hover:text-accent"
          >
            <RotateCcw size={10} className={previewManualRefreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{t("dashboard.nav.refresh")}</span>
          </button>

          <button
            type="button"
            onClick={() => setLegalContextOpen(true)}
            className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-2 py-1 text-[10px] text-muted-foreground/60 transition-all hover:border-[#ff6600]/40 hover:text-[#ff9a57]"
          >
            <AlertCircle size={10} />
            <span className="hidden sm:inline">{isEnglish ? "Context" : "Contexto"}</span>
          </button>

          <button
            type="button"
            onClick={() => setClausePanelOpen(true)}
            className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-2 py-1 text-[10px] text-muted-foreground/60 transition-all hover:border-[#ff6600]/40 hover:text-[#ff9a57] xl:hidden"
          >
            <Eye size={10} />
            <span className="hidden sm:inline">{t("editor.clauses")}</span>
          </button>

          <button
            type="button"
            onClick={() => openInspectorPanel("clausula")}
            className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-2 py-1 text-[10px] text-muted-foreground/60 transition-all hover:border-[#ff6600]/40 hover:text-[#ff9a57] xl:hidden"
          >
            <PenLine size={10} />
            <span className="hidden sm:inline">Inspector</span>
          </button>

          <button
            type="button"
            onClick={() => openInspectorPanel("aparencia")}
            className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-2 py-1 text-[10px] text-muted-foreground/60 transition-all hover:border-[#ff6600]/40 hover:text-[#ff9a57] xl:hidden"
          >
            <SlidersHorizontal size={10} />
            <span className="hidden sm:inline">{t("editor.appearance")}</span>
          </button>

          <LanguageToggle compact />

          <div className="h-4 w-px bg-white/10" />

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 border-white/[0.08] bg-transparent px-2.5 text-[11px] hover:bg-white/5"
            onClick={() => setBlueprintDialogOpen(true)}
          >
            Blueprint
          </Button>

          <Button
            type="button"
            size="sm"
            className="h-7 gap-1.5 bg-[#ff6600] px-2.5 text-[11px] text-white hover:bg-[#e45c00]"
            disabled={!legalBlueprint || legalBlueprintLoading || autoGenerateStatus === "loading"}
            onClick={() => void handleAutoGenerate()}
          >
            {autoGenerateStatus === "loading" ? (
              <><Loader2 size={11} className="animate-spin" /> {isEnglish ? "Generating..." : "Gerando..."}</>
            ) : (
              <><Sparkles size={11} /> {isEnglish ? "Generate" : "Gerar"}</>
            )}
          </Button>

          <div className="h-4 w-px bg-white/10" />

          <Button
            data-tour="btn-pdf"
            variant="outline"
            size="sm"
            onClick={handleGeneratePdf}
            disabled={state === "generating-pdf"}
            className="h-7 gap-1.5 border-white/[0.08] bg-transparent px-2.5 text-[11px] hover:bg-white/5"
          >
            {state === "generating-pdf"
              ? <><Loader2 size={11} className="animate-spin" /> PDF...</>
              : <><FileDown size={11} /> PDF</>
            }
          </Button>
        </div>
      </header>

      {previewError && (
        <div className="flex shrink-0 items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-1.5 text-[11px] text-destructive/80">
          <AlertCircle size={11} /> {previewError}
        </div>
      )}

      <AnimatePresence>
        {showLegalNotice && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="shrink-0 overflow-hidden"
          >
            <div className="relative border-b border-[#ff6600]/20 bg-[linear-gradient(90deg,rgba(255,102,0,0.10),rgba(255,102,0,0.04)_60%,transparent)]">
              <div className="absolute inset-y-0 left-0 w-[3px] bg-[#ff6600]" />
              <button
                type="button"
                onClick={() => setLegalContextOpen(true)}
                className="group flex w-full items-center gap-3 px-4 py-2 pl-5 text-left"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#ff6600]/20 bg-[#ff6600]/10 text-[#ff8a3d]">
                  {hasConfiguredLegalContext ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                  <span className="shrink-0 text-[11px] font-semibold text-[#ffb07a]">Aviso juridico</span>
                  <span className="truncate text-[11px] text-zinc-300/80">
                    {hasConfiguredLegalContext
                      ? "Contexto configurado - clique para revisar risco e modelo."
                      : "Configure o contexto juridico antes de gerar clausulas."}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {autoGenerateResult && (
                      <Badge variant="outline" className="h-5 border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-300">
                        {legalClauseCount} geradas
                      </Badge>
                    )}
                    {legalContextInput.audience && (
                      <Badge variant="outline" className="h-5 border-white/10 bg-black/20 text-[10px] uppercase text-zinc-300">
                        {legalContextInput.audience}
                      </Badge>
                    )}
                    {legalContextInput.riskLevel && (
                      <Badge variant="outline" className="h-5 border-white/10 bg-black/20 text-[10px] capitalize text-zinc-300">
                        Risco {legalContextInput.riskLevel}
                      </Badge>
                    )}
                  </div>
                </div>
                <span className="shrink-0 rounded-lg bg-[#ff6600] px-3 py-1 text-[11px] font-semibold text-white transition-transform group-hover:translate-x-0.5">
                  Abrir
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowLegalNotice(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/20 p-1 text-muted-foreground transition-colors hover:text-[#ff8a3d]"
                aria-label="Fechar aviso"
              >
                <X size={11} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {missingTemplateFields.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="shrink-0 overflow-hidden"
          >
            <div className="flex items-center gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2">
              <AlertCircle size={13} className="shrink-0 text-amber-400" />
              <p className="shrink-0 text-[11px] font-medium text-amber-200">Faltam dados das partes.</p>
              <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                {missingTemplateFields.slice(0, 4).map((field) => (
                  <span key={field.key} className="rounded-full border border-amber-500/25 bg-black/15 px-2 py-0.5 text-[10px] text-amber-100/80">
                    {field.label}
                  </span>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 shrink-0 border-amber-500/30 bg-black/15 px-2.5 text-[10px] text-amber-100 hover:bg-amber-500/10"
                onClick={() => setLegalContextOpen(true)}
              >
                Preencher
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProviderSigPanel && (
          <ProviderSignaturePanel
            onSave={handleSaveProviderSignature}
            onApply={handleApplyProviderSignature}
            onDelete={handleDeleteProviderSignature}
            onClose={() => setShowProviderSigPanel(false)}
            savedExists={providerSavedExists === true}
            saving={providerSigSaving}
            applying={providerSigApplying}
          />
        )}
      </AnimatePresence>

      {false && contract && (
        <>
        <header className="flex flex-col gap-2.5 px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between lg:gap-3 lg:py-2.5">
          <div className="min-w-0 flex-1 flex flex-col gap-2.5">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <Link href="/contratos">
                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm shrink-0">
                  <ArrowLeft size={15} /> Contratos
                </button>
              </Link>

              <span className="text-border/40 hidden sm:inline">|</span>

              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="font-display text-sm font-semibold truncate max-w-[180px] sm:max-w-[260px] lg:max-w-none">
                  {contract?.clientName}
                </span>

                <span className="text-xs text-muted-foreground/60 shrink-0">
                  #{String(contract?.id ?? 0).padStart(4, "0")}
                </span>

                {previewRefreshing && !previewLoading && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                    <Loader2 size={9} className="animate-spin" /> sincronizando preview...
                  </span>
                )}

                {previewLoadedOnce && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 font-semibold">
                    <Lock size={9} /> Preview oficial
                  </span>
                )}

                <button
                  onClick={() => void loadPreview("manual")}
                  title="Recarregar preview protegido do backend"
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-border/40 text-muted-foreground/60 hover:border-accent/50 hover:text-accent transition-all"
                >
                  <RotateCcw size={9} /> Atualizar preview
                </button>

                <span className="text-border/30 hidden sm:inline">·</span>

                <button
                  data-tour="btn-signature"
                  onClick={() => setShowProviderSigPanel((p) => !p)}
                  className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-all ${
                    providerSavedExists
                      ? "bg-[#ff6600]/15 border border-[#ff6600]/40 text-[#ff6600] font-semibold hover:bg-[#ff6600]/25"
                      : "border border-border/40 text-muted-foreground/60 hover:border-[#ff6600]/50 hover:text-[#ff6600]"
                  }`}
                >
                  <PenLine size={9} /> Minha assinatura
                </button>

                <span
                  className="text-[10px] px-2 py-0.5 rounded-full border border-border/40 text-muted-foreground/60 shrink-0"
                  title="O preview oficial reflete somente alterações persistidas no backend."
                >
                  alterações salvas
                </span>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${
                    hasPlan(planId, "premium")
                      ? "bg-purple-500/15 border-purple-500/30 text-purple-300"
                      : hasPlan(planId, "pro")
                      ? "bg-blue-500/15 border-blue-500/30 text-blue-300"
                      : "bg-zinc-500/15 border-zinc-500/30 text-zinc-400"
                  }`}
                >
                  {hasPlan(planId, "premium") ? "Premium" : hasPlan(planId, "pro") ? "Pro" : "Free"}
                </span>
              </div>
            </div>

            {previewError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive/90">
                {previewError}
              </div>
            )}

            {/* navegação mobile */}
            {false && <div data-tour="mobile-nav" className="flex lg:hidden rounded-xl border border-border/40 bg-card/30 p-1">
              <button
                onClick={() => setMobileTab("biblioteca")}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
                  mobileTab === "biblioteca"
                    ? "bg-accent text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Cláusulas
              </button>
              <button
                onClick={() => setMobileTab("preview")}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
                  mobileTab === "preview"
                    ? "bg-accent text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setMobileTab("editor")}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
                  mobileTab === "editor"
                    ? "bg-accent text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Editor
              </button>
            </div>}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {state === "generating-pdf" && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Gerando PDF...
              </span>
            )}

            <Button
              data-tour="btn-pdf"
              variant="outline"
              size="sm"
              onClick={handleGeneratePdf}
              disabled={state === "generating-pdf"}
              className="border-border/50 text-sm gap-1.5 h-8 w-full sm:w-auto"
            >
              <FileDown size={14} /> Gerar PDF
            </Button>
          </div>
        </header>

        <AnimatePresence>
          {showProviderSigPanel && (
            <ProviderSignaturePanel
              onSave={handleSaveProviderSignature}
              onApply={handleApplyProviderSignature}
              onDelete={handleDeleteProviderSignature}
              onClose={() => setShowProviderSigPanel(false)}
              savedExists={providerSavedExists === true}
              saving={providerSigSaving}
              applying={providerSigApplying}
            />
          )}
        </AnimatePresence>
        </>
      )}

      <Sheet open={legalContextOpen} onOpenChange={setLegalContextOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto border-border/60 bg-background p-0 sm:max-w-2xl">
          <SheetHeader className="border-b border-border/40 px-6 py-5">
            <SheetTitle>Contexto juridico</SheetTitle>
            <SheetDescription>
              Para configurar melhor o contrato e melhorar a experiencia, use o contexto juridico antes da auto-geracao.
            </SheetDescription>
          </SheetHeader>

          <LegalContextSection
            context={legalContextInput}
            authenticationMethodsInput={authenticationMethodsInput}
            onAuthenticationMethodsInputChange={setAuthenticationMethodsInput}
            onContextChange={updateLegalContextInput}
            onToggleContractModel={handleToggleContractModel}
            blueprint={legalBlueprint}
            blueprintLoading={legalBlueprintLoading}
            blueprintError={legalBlueprintError}
            onRetryBlueprint={() => void loadLegalBlueprint()}
            onOpenBlueprint={() => setBlueprintDialogOpen(true)}
            autoGenerateStatus={autoGenerateStatus}
            autoGenerateError={autoGenerateError}
            autoGenerateResult={autoGenerateResult}
            mccRun={mccRun}
            onGenerate={() => void handleAutoGenerate()}
          />
        </SheetContent>
      </Sheet>

      <LegalBlueprintDialog
        open={blueprintDialogOpen}
        onOpenChange={setBlueprintDialogOpen}
        blueprint={legalBlueprint}
        loading={legalBlueprintLoading}
        error={legalBlueprintError}
        onRetry={() => void loadLegalBlueprint()}
      />

      <Sheet open={clausePanelOpen} onOpenChange={setClausePanelOpen}>
        <SheetContent side="left" className="flex h-full w-full flex-col overflow-hidden border-border/60 bg-[#0e1014] p-0 sm:max-w-sm">
          <SheetHeader className="shrink-0 border-b border-white/[0.06] px-4 py-4 pr-12">
            <SheetTitle>Clausulas</SheetTitle>
            <SheetDescription>
              Selecione, reorganize e controle o preview sem depender da sidebar fixa.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-hidden p-2">
            <ContractClauseNavigator
              clauses={clauses}
              filteredContractClauses={filteredContractClauses}
              filteredSuggestedClauses={filteredSuggestedClauses}
              hiddenContractClauses={hiddenContractClauses}
              previewOnlySuggestedClauses={previewOnlySuggestedClauses}
              clauseIdsInContract={clauseIdsInContract}
              clauseSearch={search}
              clauseExplorerTab={clauseExplorerTab}
              selectedClause={selectedClause}
              onSearchChange={setSearch}
              onClauseExplorerTabChange={setClauseExplorerTab}
              onSelectClause={(clause) => {
                handleSelectClause(clause);
                openInspectorPanel("clausula");
              }}
              onTogglePreviewClause={handleTogglePreviewClause}
              onMoveClause={moveClause}
              onRemoveClause={(rowId) => void handleRemoveClause(rowId)}
              onAddSuggestion={(suggestion) => void handleAddClause({ id: suggestion.id, title: suggestion.title, content: "", category: "geral" } as ClauseTemplate)}
              isAlreadyAdded={isAlreadyAdded}
              isClauseVisibleInPreview={isClauseVisibleInPreview}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={inspectorPanelOpen} onOpenChange={setInspectorPanelOpen}>
        <SheetContent side="right" className="flex h-full w-full flex-col overflow-hidden border-border/60 bg-[#0e1014] p-0 sm:max-w-md">
          <SheetHeader className="shrink-0 border-b border-white/[0.06] px-4 py-4 pr-12">
            <SheetTitle>Inspector</SheetTitle>
            <SheetDescription>
              Edite clausulas, contexto rapido e aparencia com os mesmos controles do painel lateral.
            </SheetDescription>
          </SheetHeader>

          <Tabs value={rightTab} onValueChange={(value) => setRightTab(value as RightPanelTab)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <TabsList className="grid h-9 w-full grid-cols-2 gap-1 rounded-none border-b border-white/[0.06] bg-transparent px-3">
              <TabsTrigger
                value="clausula"
                className="h-7 rounded-md text-[11px] data-[state=active]:bg-white/10 data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/60"
              >
                Juridico
              </TabsTrigger>
              <TabsTrigger
                value="aparencia"
                className="h-7 rounded-md text-[11px] data-[state=active]:bg-white/10 data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/60"
              >
                Aparencia
              </TabsTrigger>
            </TabsList>

            {rightTab === "clausula" ? (
              <TabsContent value="clausula" className="mt-0 h-full min-h-0 overflow-hidden p-2">
                <ContractClauseInspector
                  selectedClause={selectedClause}
                  editContent={editContent}
                  savingClause={savingClause}
                  autoGenerateResult={autoGenerateResult}
                  contractInsights={contractInsights}
                  clauseExplorerTab={clauseExplorerTab}
                  onEditContentChange={setEditContent}
                  onSaveClause={() => void handleSaveClause()}
                  onCloseEditor={() => setSelectedClause(null)}
                  onOpenLegalContext={() => setLegalContextOpen(true)}
                />
              </TabsContent>
            ) : (
              <TabsContent value="aparencia" className="mt-0 flex h-full min-h-0 flex-col overflow-hidden">
                <ContractLayoutPanel
                  layout={layout}
                  onChange={setLayout}
                  onSavePatch={saveLayoutPatch}
                  onPreviewRefresh={refreshPreviewAfterMutation}
                  contractId={contractIdNum}
                />
              </TabsContent>
            )}
          </Tabs>
        </SheetContent>
      </Sheet>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <aside className="relative z-20 hidden h-full w-[232px] shrink-0 flex-col border-r border-white/[0.05] bg-[#0e1014] xl:flex 2xl:w-[264px]">
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
              Clausulas
            </span>
            {clauses.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff6600]/15 px-1 text-[9px] font-semibold text-[#ff9a57]">
                {clauses.length}
              </span>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <ContractClauseNavigator
              clauses={clauses}
              filteredContractClauses={filteredContractClauses}
              filteredSuggestedClauses={filteredSuggestedClauses}
              hiddenContractClauses={hiddenContractClauses}
              previewOnlySuggestedClauses={previewOnlySuggestedClauses}
              clauseIdsInContract={clauseIdsInContract}
              clauseSearch={search}
              clauseExplorerTab={clauseExplorerTab}
              selectedClause={selectedClause}
              onSearchChange={setSearch}
              onClauseExplorerTabChange={setClauseExplorerTab}
              onSelectClause={handleSelectClause}
              onTogglePreviewClause={handleTogglePreviewClause}
              onMoveClause={moveClause}
              onRemoveClause={(rowId) => void handleRemoveClause(rowId)}
              onAddSuggestion={(suggestion) => void handleAddClause({ id: suggestion.id, title: suggestion.title, content: "", category: "geral" } as ClauseTemplate)}
              isAlreadyAdded={isAlreadyAdded}
              isClauseVisibleInPreview={isClauseVisibleInPreview}
            />
          </div>

          {!showLegalNotice && (
            <div className="shrink-0 border-t border-white/[0.05] px-3 py-2">
              <button
                type="button"
                onClick={() => setShowLegalNotice(true)}
                className="flex w-full items-center gap-1.5 rounded-lg border border-[#ff6600]/20 bg-[#ff6600]/10 px-2.5 py-1.5 text-[10px] font-medium text-[#ff9a57] transition-colors hover:bg-[#ff6600]/15"
              >
                <AlertCircle size={10} /> Aviso juridico
              </button>
            </div>
          )}
        </aside>

        <main
          data-tour="preview"
          className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-[#0b0c0f]"
        >
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-[0.16]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="absolute left-1/2 top-2 z-20 w-[calc(100%-1rem)] -translate-x-1/2 px-2 sm:top-3 sm:w-auto sm:px-0">
            <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full border border-white/10 bg-[#0e1014]/90 px-3 py-1 text-center text-[10px] text-muted-foreground shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-sm">
              <Lock size={9} className="text-emerald-400" />
              <span className="sm:hidden">Preview oficial</span>
              <span className="hidden sm:inline">A4 ABNT - arraste para mover</span>
              <span className="hidden text-muted-foreground/50 md:inline">Ctrl + scroll para zoom</span>
              {previewPageCount > 1 && (
                <span className="ml-1 rounded-full border border-white/10 bg-white/5 px-1.5 text-[9px] text-muted-foreground">
                  {previewPageCount} folhas
                </span>
              )}
              {autoGenerateResult && (
                <span className="ml-1 rounded-full border border-emerald-500/20 bg-emerald-500/15 px-1.5 text-[9px] text-emerald-400">
                  {legalClauseCount} cl.
                </span>
              )}
            </div>
          </div>

          <div data-no-pan className="absolute bottom-3 left-1/2 z-20 flex w-[calc(100%-1rem)] -translate-x-1/2 items-center justify-center gap-2 px-2 sm:bottom-auto sm:left-auto sm:right-3 sm:top-3 sm:w-auto sm:translate-x-0 sm:px-0">
            <div className="flex items-center overflow-hidden rounded-xl border border-white/10 bg-[#0e1014]/90 text-muted-foreground shadow-[0_4px_20px_rgba(0,0,0,0.45)] backdrop-blur-sm">
              <button
                type="button"
                onClick={zoomPreviewOut}
                className="flex h-7 w-8 items-center justify-center transition-colors hover:bg-white/5 hover:text-[#ff9a57] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={previewZoom <= PREVIEW_ZOOM_MIN}
                aria-label="Diminuir zoom"
              >
                <ZoomOut size={12} />
              </button>
              <span className="min-w-[46px] border-x border-white/10 px-2 text-center text-[10px] font-semibold text-zinc-300">
                {Math.round(previewZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={zoomPreviewIn}
                className="flex h-7 w-8 items-center justify-center transition-colors hover:bg-white/5 hover:text-[#ff9a57] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={previewZoom >= PREVIEW_ZOOM_MAX}
                aria-label="Aumentar zoom"
              >
                <ZoomIn size={12} />
              </button>
            </div>

            {(previewPan.x !== 0 || previewPan.y !== 0 || previewZoom !== 1) && (
              <button
                type="button"
                onClick={resetPreviewView}
                className="rounded-lg border border-white/10 bg-[#0e1014]/90 px-2.5 py-1 text-[10px] font-medium text-muted-foreground shadow-[0_4px_20px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-colors hover:border-[#ff6600]/40 hover:text-[#ff9a57]"
              >
                Resetar
              </button>
            )}
          </div>

          <div
            ref={previewStageRef}
            className={`absolute inset-0 flex items-center justify-center px-2 pb-16 pt-16 select-none sm:px-4 sm:pb-4 sm:pt-8 ${isPreviewPanning ? "cursor-grabbing" : "cursor-grab"}`}
            style={{ touchAction: "none" }}
            onPointerDown={handlePreviewPointerDown}
            onPointerMove={handlePreviewPointerMove}
            onPointerUp={endPreviewPan}
            onPointerCancel={endPreviewPan}
            onLostPointerCapture={() => endPreviewPan()}
            onWheel={handlePreviewWheel}
          >
            <div
              className="shrink-0 overflow-visible"
              style={{
                width: previewCanvasWidth * previewScale,
                height: PREVIEW_BASE_HEIGHT * previewScale,
                transform: `translate3d(${previewPan.x}px, ${previewPan.y}px, 0)`,
              }}
            >
              <div
                className="flex items-start"
                style={{
                  gap: PREVIEW_PAGE_GAP,
                  width: previewCanvasWidth,
                  height: PREVIEW_BASE_HEIGHT,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                }}
              >
                {previewPageIndexes.map((pageIndex) => (
                  <div
                    key={`${previewRenderKey}-${pageIndex}`}
                    className="relative shrink-0 overflow-hidden rounded-2xl border border-black/30 bg-white shadow-[0_40px_120px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.04)]"
                    style={{
                      width: PREVIEW_BASE_WIDTH,
                      height: PREVIEW_BASE_HEIGHT,
                    }}
                  >
                    {previewPageCount > 1 && (
                      <span className="pointer-events-none absolute right-3 top-3 z-10 rounded-full border border-black/10 bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 shadow-sm">
                        Folha {pageIndex + 1}
                      </span>
                    )}
                    <div
                      className="absolute left-0 overflow-hidden"
                      style={{
                        top: PREVIEW_ABNT_TOP_MARGIN,
                        width: PREVIEW_BASE_WIDTH,
                        height: Math.min(
                          PREVIEW_ABNT_SAFE_CONTENT_HEIGHT,
                          Math.max(
                            PREVIEW_MIN_PAGE_ADVANCE,
                            (previewPageOffsets[pageIndex + 1] ?? previewContentHeight) - (previewPageOffsets[pageIndex] ?? 0),
                          ),
                        ),
                      }}
                    >
                      <iframe
                        ref={pageIndex === 0 ? iframeDesktopRef : undefined}
                        src={previewHtml ? undefined : previewDocumentUrl || undefined}
                        srcDoc={previewHtml || undefined}
                        onLoad={(event) => handlePreviewPageFrameLoad(event, pageIndex)}
                        onError={() => {
                          void refreshProtectedPreview("asset-error", true);
                          requestPreviewAssetRetry();
                        }}
                        className="border-0 pointer-events-none"
                        style={{
                          width: PREVIEW_BASE_WIDTH,
                          height: previewContentHeight,
                          transform: `translate3d(0, -${previewPageOffsets[pageIndex] ?? 0}px, 0)`,
                          transformOrigin: "top left",
                        }}
                        title={`Contract Preview - Folha ${pageIndex + 1}`}
                        sandbox="allow-same-origin"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {((previewLoading && !previewLoadedOnce) || (previewManualRefreshing && previewLoadedOnce)) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0b0c0f]/70 backdrop-blur-[2px]">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111214] px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-xl">
                <Loader2 size={13} className="animate-spin text-[#ff6600]" />
                {previewLoading && !previewLoadedOnce ? "Carregando preview oficial..." : "Atualizando preview..."}
              </div>
            </div>
          )}
        </main>

        <aside className="relative z-20 hidden h-full w-[264px] shrink-0 flex-col border-l border-white/[0.05] bg-[#0e1014] xl:flex 2xl:w-[304px]">
          <Tabs value={rightTab} onValueChange={(value) => setRightTab(value as RightPanelTab)} className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-white/[0.06]">
              <div className="flex h-9 items-center justify-between px-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                  Inspector
                </span>
                <Badge
                  variant="outline"
                  className={`h-4 px-1.5 text-[9px] ${
                    layoutSaving === "saving"
                      ? "border-[#ff6600]/30 bg-[#ff6600]/10 text-[#ff9a57]"
                      : layoutSaving === "saved"
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                      : "border-white/10 bg-transparent text-muted-foreground/50"
                  }`}
                >
                  {layoutSaving === "saving" ? "salvando..." : layoutSaving === "saved" ? "salvo" : "pronto"}
                </Badge>
              </div>
              <TabsList className="grid h-8 w-full grid-cols-2 gap-1 rounded-none border-t border-white/[0.06] bg-transparent px-2">
                <TabsTrigger
                  value="clausula"
                  className="h-6 rounded-md text-[11px] data-[state=active]:bg-white/10 data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/60"
                >
                  Juridico
                </TabsTrigger>
                <TabsTrigger
                  value="aparencia"
                  className="h-6 rounded-md text-[11px] data-[state=active]:bg-white/10 data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/60"
                >
                  Aparencia
                </TabsTrigger>
              </TabsList>
            </div>

            <AnimatePresence mode="wait">
              {rightTab === "clausula" ? (
                <motion.div
                  key="juridico"
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.14 }}
                  className="min-h-0 flex-1 overflow-hidden"
                >
                  <TabsContent value="clausula" className="mt-0 h-full min-h-0 overflow-hidden p-2">
                    <ContractClauseInspector
                      selectedClause={selectedClause}
                      editContent={editContent}
                      savingClause={savingClause}
                      autoGenerateResult={autoGenerateResult}
                      contractInsights={contractInsights}
                      clauseExplorerTab={clauseExplorerTab}
                      onEditContentChange={setEditContent}
                      onSaveClause={() => void handleSaveClause()}
                      onCloseEditor={() => setSelectedClause(null)}
                      onOpenLegalContext={() => setLegalContextOpen(true)}
                    />
                  </TabsContent>
                </motion.div>
              ) : (
                <motion.div
                  key="aparencia"
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.14 }}
                  className="min-h-0 flex-1 overflow-hidden"
                >
                  <TabsContent value="aparencia" className="mt-0 flex h-full min-h-0 flex-col overflow-hidden">
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <ContractLayoutPanel
                        layout={layout}
                        onChange={setLayout}
                        onSavePatch={saveLayoutPatch}
                        onPreviewRefresh={refreshPreviewAfterMutation}
                        contractId={contractIdNum}
                      />
                    </div>
                  </TabsContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Tabs>
        </aside>
      </div>

      {false && contract && (
        <div className="flex min-h-full flex-col gap-2.5 p-2.5 xl:h-full xl:gap-3 xl:p-3">
          <section className="grid shrink-0 gap-2.5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            {showLegalNotice ? (
              <div className="relative min-w-0">
                <button
                  type="button"
                  onClick={() => setLegalContextOpen(true)}
                  className="group relative w-full overflow-hidden rounded-2xl border border-[#ff6600]/30 bg-[linear-gradient(135deg,rgba(255,102,0,0.18),rgba(255,102,0,0.08)_42%,rgba(17,18,20,1)_100%)] px-4 py-3 pr-12 text-left transition-all hover:border-[#ff6600]/55 hover:shadow-[0_18px_50px_rgba(255,102,0,0.12)]"
                >
              <div className="absolute inset-y-0 left-0 w-1 bg-[#ff6600]" />
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ff6600]/25 bg-[#ff6600]/14 text-[#ff8a3d]">
                    {hasConfiguredLegalContext ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-[#ff6600]/30 bg-[#ff6600]/10 text-[#ffb07a]">
                        Aviso juridico
                      </Badge>
                      {autoGenerateResult ? (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                          {legalClauseCount} clausulas geradas
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">
                          Revise antes de gerar
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-foreground xl:text-base">
                      {hasConfiguredLegalContext
                        ? "O contexto juridico esta configurado, mas continua sendo o melhor ponto para revisar risco e modelo."
                        : "Abra o contexto juridico antes de concluir o contrato para evitar geracoes fracas ou incompletas."}
                    </p>

                    <p className="text-xs leading-5 text-zinc-300/85">
                      {autoGenerateResult
                        ? "Use esse aviso rapido para conferir publico, risco e modelos ativos sem perder o foco do editor."
                        : "Esse atalho concentra publico, risco, modelos e warnings num unico lugar para o usuario agir rapido."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {legalContextInput.audience && (
                    <Badge variant="outline" className="border-border/40 bg-black/20 text-zinc-200 uppercase">
                      {legalContextInput.audience}
                    </Badge>
                  )}
                  {legalContextInput.riskLevel && (
                    <Badge variant="outline" className="border-border/40 bg-black/20 text-zinc-200 capitalize">
                      Risco {legalContextInput.riskLevel}
                    </Badge>
                  )}
                  {legalContextInput.contractModels?.slice(0, 2).map((model) => (
                    <Badge key={model} variant="outline" className="border-border/40 bg-black/20 text-zinc-200">
                      {model}
                    </Badge>
                  ))}
                  <span className="inline-flex items-center rounded-xl bg-[#ff6600] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(255,102,0,0.28)] transition-transform group-hover:translate-x-0.5">
                    Abrir aviso juridico
                  </span>
                </div>
              </div>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLegalNotice(false)}
                  className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/20 p-1.5 text-muted-foreground transition-colors hover:border-[#ff6600]/40 hover:text-[#ff8a3d]"
                  aria-label="Remover aviso juridico"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLegalNotice(true)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#ff6600]/30 bg-[#111214] px-4 py-2.5 text-sm font-semibold text-[#ff9a57] transition-all hover:border-[#ff6600]/55 hover:bg-[#ff6600]/10"
              >
                <AlertCircle size={15} />
                Mostrar aviso juridico
              </button>
            )}

            <div className="flex w-full flex-col gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full justify-center border-border/50 bg-[#111214] px-2 text-[11px] sm:text-xs"
                onClick={() => setBlueprintDialogOpen(true)}
              >
                Blueprint juridico
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 w-full justify-center gap-1.5 px-2 text-[11px] sm:text-xs bg-[#ff6600] text-white hover:bg-[#e45c00]"
                disabled={!legalBlueprint || legalBlueprintLoading || autoGenerateStatus === "loading"}
                onClick={() => void handleAutoGenerate()}
              >
                {autoGenerateStatus === "loading" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Gerando clausulas...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Gerar clausulas automaticamente
                  </>
                )}
              </Button>
            </div>
          </section>

          <section className="hidden">
            <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`${
                      legalStatusTone === "emerald"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : legalStatusTone === "accent"
                        ? "border-accent/30 bg-accent/10 text-accent"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    Contexto juridico
                  </Badge>
                  {autoGenerateResult ? (
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                      {legalClauseCount} clausulas geradas
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">
                      Recomendado antes da auto-geracao
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-foreground xl:text-lg">
                    {autoGenerateResult
                      ? "Seu contrato ja esta apoiado pelo motor juridico"
                      : "Antes de gerar clausulas, vale configurar o contexto juridico"}
                  </h2>
                  <p className="max-w-3xl text-sm leading-5 text-muted-foreground xl:max-w-2xl">
                    {autoGenerateResult
                      ? "Aqui voce ajusta o contrato com mais clareza: contexto, sugestoes, preview oficial e aparencia. Sempre que voce salva algo importante, o backend recompõe o documento final."
                      : "O contexto juridico orienta risco, audience, modelos de contrato e warnings. Ele existe para o usuario entender o impacto das escolhas antes de gerar o texto consolidado."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {legalContextInput.audience && (
                    <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground uppercase">
                      {legalContextInput.audience}
                    </Badge>
                  )}
                  {legalContextInput.riskLevel && (
                    <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground capitalize">
                      Risco {legalContextInput.riskLevel}
                    </Badge>
                  )}
                  {legalContextInput.contractModels?.map((model) => (
                    <Badge key={model} variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">
                      {model}
                    </Badge>
                  ))}
                  {!hasConfiguredLegalContext && (
                    <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">
                      Configure o contexto para uma geracao mais precisa
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex w-full flex-col gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full justify-center border-border/50 px-2 text-[11px] sm:text-xs"
                  onClick={() => setBlueprintDialogOpen(true)}
                >
                  Blueprint juridico
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full justify-center border-border/50 px-2 text-[11px] sm:text-xs"
                  onClick={() => setLegalContextOpen(true)}
                >
                  Configurar contexto juridico
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 w-full justify-center gap-1.5 px-2 text-[11px] sm:text-xs"
                  disabled={!legalBlueprint || legalBlueprintLoading || autoGenerateStatus === "loading"}
                  onClick={() => void handleAutoGenerate()}
                >
                  {autoGenerateStatus === "loading" ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Gerando clausulas...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Gerar clausulas automaticamente
                    </>
                  )}
                </Button>
              </div>
            </div>
          </section>

          <section className="grid shrink-0 grid-cols-2 gap-1.5 xl:grid-cols-4">
            {clauseCountCards.map((card) => (
              <div
                key={card.label}
                title={card.helper}
                className="min-w-0 rounded-xl border border-white/5 bg-[linear-gradient(180deg,#171a20_0%,#101215_100%)] px-2.5 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
              >
                <p className="truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{card.label}</p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <span className="text-lg font-semibold leading-none text-foreground">{card.value}</span>
                  <span className="rounded-full border border-border/30 px-1.5 py-0.5 text-[9px] text-muted-foreground">ao vivo</span>
                </div>
              </div>
            ))}
          </section>

          {missingTemplateFields.length > 0 && (
            <section className="shrink-0 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-200">Faltam dados das partes para completar o contrato.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {missingTemplateFields.map((field) => (
                      <span key={field.key} className="rounded-full border border-amber-500/25 bg-black/15 px-2.5 py-1 text-[11px] text-amber-100/85" title={field.helperText}>
                        {field.label}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full shrink-0 border-amber-500/30 bg-black/15 text-amber-100 hover:bg-amber-500/10 sm:w-auto"
                  onClick={() => setLegalContextOpen(true)}
                >
                  Preencher dados
                </Button>
              </div>
            </section>
          )}

          <div
            className="grid min-h-0 flex-1 gap-2.5 md:[grid-template-columns:var(--editor-grid-md)] 2xl:[grid-template-columns:var(--editor-grid-2xl)]"
            style={{
              "--editor-grid-md": `${clauseNavigatorWidth}px 20px minmax(0,1.85fr) 300px`,
              "--editor-grid-2xl": `${clauseNavigatorWidth}px 20px minmax(0,2fr) 320px`,
            } as CSSProperties}
          >
            <aside className="min-h-0 min-w-0 overflow-hidden rounded-2xl border border-border/40 bg-[#111214] md:order-1">
              <ContractClauseNavigator
                clauses={clauses}
                filteredContractClauses={filteredContractClauses}
                filteredSuggestedClauses={filteredSuggestedClauses}
                hiddenContractClauses={hiddenContractClauses}
                previewOnlySuggestedClauses={previewOnlySuggestedClauses}
                clauseIdsInContract={clauseIdsInContract}
                clauseSearch={search}
                clauseExplorerTab={clauseExplorerTab}
                selectedClause={selectedClause}
                onSearchChange={setSearch}
                onClauseExplorerTabChange={setClauseExplorerTab}
                onSelectClause={handleSelectClause}
                onTogglePreviewClause={handleTogglePreviewClause}
                onMoveClause={moveClause}
                onRemoveClause={(rowId) => void handleRemoveClause(rowId)}
                onAddSuggestion={(suggestion) => void handleAddClause({ id: suggestion.id, title: suggestion.title, content: "", category: "geral" } as ClauseTemplate)}
                isAlreadyAdded={isAlreadyAdded}
                isClauseVisibleInPreview={isClauseVisibleInPreview}
              />
            </aside>

            <button
              type="button"
              aria-label="Redimensionar coluna de clausulas"
              onMouseDown={handleClauseResizeStart}
              className="group hidden h-full min-h-[420px] w-5 cursor-col-resize select-none items-center justify-center rounded-2xl border border-transparent bg-transparent md:flex md:order-2"
              title="Arraste para aumentar ou diminuir a coluna de clausulas"
            >
              <span className="flex h-24 w-5 items-center justify-center rounded-full border border-border/70 bg-[#16181d] shadow-[0_10px_25px_rgba(0,0,0,0.35)] transition-all group-hover:border-accent/80 group-hover:bg-[#1b1f26]">
                <GripVertical size={14} className="text-muted-foreground" />
              </span>
            </button>

            <main className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/5 bg-[linear-gradient(180deg,#15181d_0%,#101215_100%)] shadow-[0_18px_50px_rgba(0,0,0,0.22)] md:order-3">
              <div className="shrink-0 border-b border-border/40 px-3 py-2.5 lg:px-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Eye size={14} className="text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">Canvas do contrato</span>
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground 2xl:max-w-xl">
                      Preview oficial maior, centralizado e pronto para revisao visual sem apertar o restante do editor.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-border/40 bg-background/60 text-muted-foreground">
                      {autoGenerateResult ? `${legalClauseCount} clausulas do motor juridico` : "Preview pronto para revisao"}
                    </Badge>
                    <Button type="button" variant="outline" size="sm" className="border-border/50" onClick={() => void loadPreview("manual")}>
                      <RotateCcw size={13} className={previewManualRefreshing ? "animate-spin" : ""} />
                      Atualizar preview
                    </Button>
                  </div>
                </div>
              </div>

              <div className="min-h-[420px] bg-[#0b0c0f] p-2.5 sm:p-3 xl:min-h-0 xl:flex-1 xl:p-3">
                <div
                  data-tour="preview"
                  className="relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_36%),linear-gradient(180deg,#1d2127_0%,#121419_100%)] p-3 sm:p-4 xl:px-5 xl:py-4"
                >
                  <div className="z-10 mx-auto mb-2.5 flex w-fit shrink-0 items-center gap-2 rounded-full border border-border/40 bg-background/85 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
                    <Lock size={11} />
                    Preview oficial
                  </div>

                  <div ref={previewStageRef} className="min-h-0 flex-1 overflow-hidden">
                    <div className="mx-auto flex min-h-full w-full items-start justify-center pt-0.5">
                      <div
                        className="shrink-0 overflow-visible"
                        style={{
                          width: PREVIEW_BASE_WIDTH * previewScale,
                          height: PREVIEW_BASE_HEIGHT * previewScale,
                        }}
                      >
                        <div
                          className="overflow-hidden rounded-[22px] border border-black/10 bg-white shadow-[0_32px_90px_rgba(0,0,0,0.48)]"
                          style={{
                            width: PREVIEW_BASE_WIDTH,
                            height: PREVIEW_BASE_HEIGHT,
                            transform: `scale(${previewScale})`,
                            transformOrigin: "top left",
                          }}
                        >
                          <iframe
                            ref={iframeDesktopRef}
                            srcDoc={previewHtml}
                            onLoad={handlePreviewFrameLoad}
                            onError={() => {
                              void refreshProtectedPreview("asset-error", true);
                              requestPreviewAssetRetry();
                            }}
                            className="h-full w-full border-0"
                            title="Contract Preview"
                            sandbox="allow-same-origin"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {((previewLoading && !previewLoadedOnce) || (previewManualRefreshing && previewLoadedOnce)) && (
                    <div
                      className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-150 ${
                        previewLoading && !previewLoadedOnce
                          ? "bg-white/88 backdrop-blur-[1px]"
                          : "bg-zinc-950/12 backdrop-blur-[1.5px]"
                      }`}
                    >
                      <div className="flex items-center gap-2 rounded-md border border-border/40 bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        <Loader2 size={14} className="animate-spin" />
                        {previewLoading && !previewLoadedOnce ? "Carregando preview oficial..." : "Atualizando preview..."}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </main>

            <aside className="min-h-0 min-w-0 overflow-hidden rounded-2xl border border-border/40 bg-[#111214] md:order-4">
              <Tabs value={rightTab} onValueChange={(value) => setRightTab(value as RightPanelTab)} className="flex h-full min-h-0 flex-col overflow-hidden">
                <div className="border-b border-border/40 px-3 py-3 lg:px-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Inspector</p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        Propriedades do item selecionado e ajustes visuais do documento, no estilo painel lateral de editor.
                      </p>
                    </div>
                    <TabsList className="grid w-full grid-cols-2 bg-background/80 sm:w-[240px]">
                      <TabsTrigger value="clausula">Juridico</TabsTrigger>
                      <TabsTrigger value="aparencia">Aparencia</TabsTrigger>
                    </TabsList>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {rightTab === "clausula" ? (
                    <motion.div
                      key="juridico"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="min-h-0 flex-1 overflow-hidden"
                    >
                      <TabsContent value="clausula" className="mt-0 h-full min-h-0 overflow-hidden p-2.5 lg:p-3">
                        <ContractClauseInspector
                          selectedClause={selectedClause}
                          editContent={editContent}
                          savingClause={savingClause}
                          autoGenerateResult={autoGenerateResult}
                          contractInsights={contractInsights}
                          clauseExplorerTab={clauseExplorerTab}
                          onEditContentChange={setEditContent}
                          onSaveClause={() => void handleSaveClause()}
                          onCloseEditor={() => setSelectedClause(null)}
                          onOpenLegalContext={() => setLegalContextOpen(true)}
                        />
                      </TabsContent>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="aparencia"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="min-h-0 flex-1 overflow-hidden"
                    >
                      <TabsContent value="aparencia" className="mt-0 flex h-full min-h-0 flex-col overflow-hidden">
                        <div className="border-b border-border/40 px-3 py-3 lg:px-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <SlidersHorizontal size={14} className="text-muted-foreground" />
                                <p className="text-sm font-semibold text-foreground">Leitura e identidade visual</p>
                              </div>
                              <p className="text-xs leading-5 text-muted-foreground">
                                Ajuste blocos, cores e placeholders para deixar o documento mais claro sem perder o que vem do backend.
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                layoutSaving === "saving"
                                  ? "border-accent/30 bg-accent/10 text-accent"
                                  : layoutSaving === "saved"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                  : "border-border/40 bg-background/60 text-muted-foreground"
                              }
                            >
                              {layoutSaving === "saving" ? "Salvando alteracoes..." : layoutSaving === "saved" ? "Layout salvo" : "Pronto para editar"}
                            </Badge>
                          </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-hidden">
                          <ContractLayoutPanel
                            layout={layout}
                            onChange={setLayout}
                            onSavePatch={saveLayoutPatch}
                            onPreviewRefresh={refreshPreviewAfterMutation}
                            contractId={contractIdNum}
                          />
                        </div>
                      </TabsContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Tabs>
            </aside>
          </div>
        </div>
      )}

    </div>
  );
}
