"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useParams, useLocation } from "wouter";
import {
  Search, Plus, ArrowLeft, FileDown, Loader2, GripVertical,
  Trash2, Eye, Library, AlertCircle, CheckCircle2, Save, X,
  Palette, Type, Image, Lock, Crown, Sliders, ChevronDown,
  RotateCcw, Upload, Pen, Eraser, PenLine,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "sonner";
import {
  listClauses, addClause, deleteClause, updateClause,
  reorderClauses, generatePdf, getContract, updateLayout, uploadLogo, removeLogo,
  type ContractClause, type ClauseTemplate, type Contract,
  CONTRACT_TYPE_LABELS, PAYMENT_FORM_LABELS,
} from "../../service/contracts";
import { getProposalById } from "../../service/proposals";
import { EditorTour } from "../../components/EditorTour";
import { getMyPlan, type PlanId } from "../../service/payment";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type EditorState = "idle" | "loading" | "saving" | "generating-pdf" | "error";
type RightPanelTab = "clausula" | "aparencia";

export interface LayoutCustomization {
  primaryColor: string;
  fontFamily: string;
  logoUrl: string | null;
  showFechouBranding: boolean;
  blocks: BlockConfig[];
  customTextBlocks: CustomTextBlock[];
}

interface BlockConfig {
  id: string;
  visible: boolean;
  order: number;
}

interface CustomTextBlock {
  id: string;
  title: string;
  content: string;
}

const DEFAULT_LAYOUT: LayoutCustomization = {
  primaryColor: "#ff6600",
  fontFamily: "inter",
  logoUrl: null,
  showFechouBranding: true,
  blocks: [
    { id: "header", visible: true, order: 0 },
    { id: "parties", visible: true, order: 1 },
    { id: "conditions", visible: true, order: 2 },
    { id: "scope", visible: true, order: 3 },
    { id: "clauses", visible: true, order: 4 },
    { id: "signatures", visible: true, order: 5 },
  ],
  customTextBlocks: [],
};

const FONT_OPTIONS = [
  { value: "inter", label: "Inter" },
  { value: "georgia", label: "Georgia" },
  { value: "roboto", label: "Roboto" },
  { value: "playfair", label: "Playfair Display" },
];

const PRESET_COLORS = [
  "#ff6600", "#e53535", "#2563eb", "#16a34a",
  "#7c3aed", "#0891b2", "#d97706", "#111111",
];

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

// ── Cache de assinatura por sessão (módulo-level) ──────────────────────────
const _sigCache = new Map<number, string | "none">();
const _provContractCache = new Map<number, string | "none">();
let _provProfileCached: boolean | null = null;

// ─────────────────────────────────────────────────────────────
// CONTRACT HTML BUILDER
// ─────────────────────────────────────────────────────────────

function buildContractHtml(
  contract: Contract,
  clauses: ContractClause[],
  layout: LayoutCustomization,
  isPro: boolean,
  isPremium: boolean,
  signatureObjectUrl: string | null = null,
  providerSignatureUrl: string | null = null,
): string {
  const color = isPro ? layout.primaryColor : "#ff6600";
  const fontMap: Record<string, string> = {
    inter: "'Inter', sans-serif",
    georgia: "Georgia, serif",
    roboto: "'Roboto', sans-serif",
    playfair: "'Playfair Display', serif",
  };
  const font = isPro ? (fontMap[layout.fontFamily] ?? fontMap.inter) : fontMap.inter;

  const fmt = (v: string | number) => {
    const n = typeof v === "string" ? parseFloat(v.replace(/[^\d.-]/g, "")) : v;
    return isNaN(n)
      ? String(v)
      : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  };
  const fmtDate = (d: string) =>
    d
      ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d))
      : d;

  const contractNumber = `FECH-${String(contract.id).padStart(6, "0")}`;
  const today = fmtDate(new Date().toISOString());

  const watermarkRows = Array.from({ length: 40 }).map((_, i) => {
    const row = Math.floor(i / 5);
    const col = i % 5;
    return `<span style="position:absolute;top:${row * 22 - 10}%;left:${col * 22 - 5}%;transform:rotate(-35deg);font-size:28px;font-weight:900;color:rgba(255,102,0,0.07);letter-spacing:0.08em;white-space:nowrap;user-select:none;">FECHOU!</span>`;
  }).join("");
  const watermark = !isPro
    ? `<div style="position:fixed;inset:0;z-index:10;pointer-events:none;overflow:hidden;">${watermarkRows}</div>`
    : "";

  const logoHtml = isPro && layout.logoUrl
    ? `<img src="${layout.logoUrl}" style="height:36px;object-fit:contain;margin-bottom:6px;" />`
    : `<div style="font-size:28px;font-weight:900;letter-spacing:-0.02em;color:#111;">FECHOU<span style="color:${color}">!</span></div>
       <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.25em;color:#888;margin-top:2px;">Plataforma de Contratos</div>`;

  // Premium pode remover totalmente o branding "Fechou"
  // Se for Premium e showFechouBranding for false, remove TUDO (sem nenhum texto)
  // Se for Pro (mas não Premium) ou se showFechouBranding for true, mostra o branding
  const brandingLine = isPremium && !layout.showFechouBranding
    ? `` // Premium com branding desativado = remoção total
    : `<div style="font-size:10px;color:#ccc;text-transform:uppercase;letter-spacing:0.2em;">FECHOU! — fechou.app</div>`;

  const clausesHtml = clauses.length > 0 ? `
    <div style="margin-bottom:32px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.3em;color:${color};font-weight:800;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid ${color}33;">
        Cláusulas Contratuais
        <span style="margin-left:8px;background:#f0f0f0;color:#888;font-size:9px;font-weight:700;padding:1px 6px;border-radius:10px;">${clauses.length}</span>
      </div>
      ${clauses.map((c, i) => `
        <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #f0f0f0;">
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px;">
            <span style="background:#111;color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:3px;flex-shrink:0;">${i + 1}</span>
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#111;">${c.title}</span>
          </div>
          <p style="font-size:12px;line-height:1.8;color:#444;text-align:justify;margin:0;padding-left:20px;">
            ${(c.customContent || c.content)
              .replace(/\{\{cliente\}\}/g, contract.clientName)
              .replace(/\{\{valor\}\}/g, fmt(contract.value))
              .replace(/\{\{data_execucao\}\}/g, fmtDate(contract.executionDate))
              .replace(/\{\{forma_pagamento\}\}/g, PAYMENT_FORM_LABELS[contract.paymentForm] ?? contract.paymentForm)
              .replace(/\{\{escopo\}\}/g, contract.scope)}
          </p>
        </div>`).join("")}
    </div>` : "";

  const customBlocksHtml = isPro && layout.customTextBlocks?.length > 0
    ? layout.customTextBlocks.map(b => `
      <div style="margin-bottom:32px;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.3em;color:${color};font-weight:800;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid ${color}33;">${b.title}</div>
        <p style="font-size:12px;line-height:1.8;color:#444;">${b.content}</p>
      </div>`).join("")
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Roboto:wght@400;500;700&family=Playfair+Display:wght@400;700;800&display=swap" rel="stylesheet"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${font}; background: #fff; color: #111; }
</style>
</head>
<body>
<div style="max-width:800px;margin:0 auto;min-height:1122px;position:relative;background:#fff;">
  ${watermark}
  <div style="position:relative;z-index:20;padding:48px 52px;">

    <!-- Cabeçalho -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:2px solid ${color};">
      <div>${logoHtml}</div>
      <div style="text-align:right;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#aaa;">Nº do Contrato</div>
        <div style="font-size:18px;font-weight:800;color:#111;margin-top:2px;">${contractNumber}</div>
        <div style="margin-top:6px;display:inline-block;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;border:1px solid ${color};color:${color};">
          ${contract.status === "finalizado" ? "Finalizado" : contract.status === "assinado" ? "Assinado" : "Em Edição"}
        </div>
      </div>
    </div>

    <!-- Título -->
    <div style="margin-bottom:36px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.3em;color:#aaa;margin-bottom:6px;">Contrato de Serviço</div>
      <div style="font-size:26px;font-weight:800;color:#111;line-height:1.2;">
        ${CONTRACT_TYPE_LABELS[contract.contractType] ?? "Prestação de Serviços"}
      </div>
    </div>

    <!-- Grid de informações -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:36px;">
      <div style="padding:14px 16px;background:#f8f8f8;border-radius:10px;border:1px solid #eee;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.25em;color:#aaa;margin-bottom:4px;">Cliente</div>
        <div style="font-weight:700;font-size:14px;color:${color};">${contract.clientName}</div>
      </div>
      <div style="padding:14px 16px;background:#f8f8f8;border-radius:10px;border:1px solid #eee;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.25em;color:#aaa;margin-bottom:4px;">Valor do Contrato</div>
        <div style="font-weight:700;font-size:14px;color:${color};">${fmt(contract.value)}</div>
      </div>
      <div style="padding:14px 16px;background:#f8f8f8;border-radius:10px;border:1px solid #eee;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.25em;color:#aaa;margin-bottom:4px;">Data de Execução</div>
        <div style="font-weight:700;font-size:14px;color:#111;">${fmtDate(contract.executionDate)}</div>
      </div>
      <div style="padding:14px 16px;background:#f8f8f8;border-radius:10px;border:1px solid #eee;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.25em;color:#aaa;margin-bottom:4px;">Pagamento</div>
        <div style="font-weight:700;font-size:14px;color:#111;">${PAYMENT_FORM_LABELS[contract.paymentForm] ?? contract.paymentForm}</div>
      </div>
    </div>

    <!-- Escopo -->
    <div style="margin-bottom:32px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.3em;color:${color};font-weight:800;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid ${color}33;">Escopo de Trabalho</div>
      <p style="font-size:13px;line-height:1.8;color:#333;text-align:justify;">${contract.scope}</p>
    </div>

    ${clausesHtml}
    ${customBlocksHtml}

    <!-- Assinaturas -->
    <div style="margin-top:40px;padding-top:24px;border-top:2px solid #111;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.3em;color:${color};font-weight:800;text-align:center;margin-bottom:28px;">Assinatura e Aceite</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;">
        <div style="text-align:center;">
          ${providerSignatureUrl
            ? `<div style="height:64px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:4px;">
                 <img src="${providerSignatureUrl}" alt="Assinatura do contratado" style="max-height:56px;max-width:100%;object-fit:contain;" />
               </div>
               <div style="border-bottom:1.5px solid #333;margin-bottom:10px;"></div>
               <div style="display:inline-flex;align-items:center;gap:4px;font-size:9px;color:#16a34a;font-weight:700;letter-spacing:0.08em;margin-bottom:6px;">
                 <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="6" fill="#16a34a"/><path d="M3.5 6.5l2 2 3-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                 Assinado digitalmente
               </div>`
            : `<div style="height:48px;border-bottom:1.5px solid #333;margin-bottom:10px;"></div>`
          }
          <div style="font-size:12px;font-weight:700;color:#111;">Prestador de Serviços</div>
          <div style="font-size:10px;color:#999;margin-top:2px;">Contratado</div>
        </div>
        <div style="text-align:center;">
          ${signatureObjectUrl
            ? `<div style="height:64px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:4px;">
                 <img src="${signatureObjectUrl}" alt="Assinatura do contratante" style="max-height:56px;max-width:100%;object-fit:contain;" />
               </div>
               <div style="border-bottom:1.5px solid #333;margin-bottom:10px;"></div>
               <div style="display:inline-flex;align-items:center;gap:4px;font-size:9px;color:#16a34a;font-weight:700;letter-spacing:0.08em;margin-bottom:6px;">
                 <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="6" fill="#16a34a"/><path d="M3.5 6.5l2 2 3-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                 Assinado digitalmente
               </div>`
            : `<div style="height:48px;display:flex;align-items:center;justify-content:center;border-bottom:1.5px dashed #d1d5db;margin-bottom:10px;">
                 <span style="font-size:9px;color:#d1d5db;letter-spacing:0.18em;text-transform:uppercase;">Aguardando assinatura</span>
               </div>`
          }
          <div style="font-size:12px;font-weight:700;color:#111;">${contract.clientName}</div>
          <div style="font-size:10px;color:#999;margin-top:2px;">Contratante</div>
        </div>
      </div>
    </div>

    <!-- Rodapé -->
    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
      ${brandingLine}
      <div style="font-size:10px;color:#ccc;">${contractNumber} · ${today}</div>
    </div>

  </div>
</div>
</body>
</html>`;
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

interface AppearancePanelProps {
  layout: LayoutCustomization;
  onChange: (l: LayoutCustomization) => void;
  planId: PlanId;
  contractId: number;
}

function AppearancePanel({ layout, onChange, planId, contractId }: AppearancePanelProps) {
  const isPro = hasPlan(planId, "pro");
  const isPremium = hasPlan(planId, "premium");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0); // Key para forçar reset do input
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<LayoutCustomization>) => onChange({ ...layout, ...patch });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("[v0] handleLogoUpload chamado, file:", file);
    if (!file) {
      console.log("[v0] Nenhum arquivo selecionado");
      return;
    }

    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    const MAX_MB = 2;
    console.log("[v0] Arquivo tipo:", file.type, "tamanho:", file.size);
    if (!ALLOWED.includes(file.type)) {
      toast.error("Tipo não permitido. Use JPEG, PNG ou WebP.");
      setInputKey(prev => prev + 1);
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Limite: ${MAX_MB} MB.`);
      setInputKey(prev => prev + 1);
      return;
    }

    console.log("[v0] Iniciando upload para contractId:", contractId);
    setUploadingLogo(true);
    try {
      const result = await uploadLogo(contractId, file);
      console.log("[v0] Upload sucesso, result:", result);
      set({ logoUrl: result.logoUrl });
      toast.success("Logo enviada com sucesso!");
    } catch (err: any) {
      console.error("[v0] Erro no upload de logo:", err);
      toast.error(err?.message || "Erro ao enviar logo.");
    } finally {
      setUploadingLogo(false);
      // Força reset do input incrementando a key
      setInputKey(prev => prev + 1);
    }
  };

  const handleLogoRemove = async () => {
    setRemovingLogo(true);
    try {
      await removeLogo(contractId);
      set({ logoUrl: null });
      toast.success("Logo removida.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover logo.");
    } finally {
      setRemovingLogo(false);
    }
  };

  const addCustomBlock = () => {
    const newBlock: CustomTextBlock = {
      id: `custom_${Date.now()}`,
      title: "Nova Seção",
      content: "Conteúdo da seção personalizada.",
    };
    set({ customTextBlocks: [...(layout.customTextBlocks ?? []), newBlock] });
  };

  const removeCustomBlock = (id: string) =>
    set({ customTextBlocks: layout.customTextBlocks.filter(b => b.id !== id) });

  const updateCustomBlock = (id: string, patch: Partial<CustomTextBlock>) =>
    set({ customTextBlocks: layout.customTextBlocks.map(b => b.id === id ? { ...b, ...patch } : b) });

  if (!isPro) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-200">Plano Free</span>
          </div>
          <p className="text-xs text-yellow-300/70 leading-relaxed">
            Personalize o visual do seu contrato com o plano <strong>Pro</strong> ou <strong>Premium</strong>.
          </p>
          <Link href="/system">
            <button className="mt-1 w-full text-xs py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/30 transition-colors">
              Ver planos →
            </button>
          </Link>
        </div>
        <div className="space-y-3 opacity-40 pointer-events-none select-none">
          <div className="h-8 rounded-lg bg-card/60 border border-border/30" />
          <div className="h-8 rounded-lg bg-card/60 border border-border/30" />
          <div className="grid grid-cols-4 gap-1.5">
            {PRESET_COLORS.map(c => (
              <div key={c} className="h-7 rounded-md" style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-5">

        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${
          isPremium
            ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
            : "bg-blue-500/10 border-blue-500/30 text-blue-300"
        }`}>
          <Crown size={12} />
          {isPremium ? "Premium — Personalização total" : "Pro — Personalização avançada"}
        </div>

        <section className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Image size={11} /> Logo
          </label>
          {layout.logoUrl ? (
            <div className="relative rounded-lg border border-border/40 bg-white p-3 flex items-center justify-center min-h-[60px]">
              <img src={layout.logoUrl} className="max-h-10 object-contain" alt="Logo" />
              <button
                onClick={handleLogoRemove}
                disabled={removingLogo}
                className="absolute top-1.5 right-1.5 text-muted-foreground/50 hover:text-destructive transition-colors disabled:opacity-40"
                title="Remover logo"
              >
                {removingLogo ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
              className="flex items-center justify-center gap-2 h-12 w-full rounded-lg border border-dashed border-border/50 bg-card/30 text-xs text-muted-foreground hover:border-accent/50 hover:text-accent transition-all"
            >
              {uploadingLogo ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploadingLogo ? "Enviando…" : "Enviar logo"}
            </button>
          )}
          <input key={inputKey} ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />

          {/* Opção de remover branding "Fechou" só disponível no Premium */}
          {isPremium && (
            <label className="flex items-center gap-2 cursor-pointer" onClick={() => set({ showFechouBranding: !layout.showFechouBranding })}>
              <div className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${layout.showFechouBranding ? "bg-accent" : "bg-muted"}`}>
                <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${layout.showFechouBranding ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <span className="text-xs text-muted-foreground">Mostrar "via Fechou!"</span>
            </label>
          )}
          {!isPremium && (
            <div className="flex items-center gap-2 opacity-50">
              <div className="w-8 h-4 rounded-full bg-muted flex items-center px-0.5">
                <div className="w-3 h-3 rounded-full bg-white shadow translate-x-4" />
              </div>
              <span className="text-xs text-muted-foreground">Mostrar "via Fechou!"</span>
              <Crown size={10} className="text-yellow-500" />
            </div>
          )}
        </section>

        <section className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Palette size={11} /> Cor primária
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => set({ primaryColor: c })}
                className={`h-8 rounded-md transition-all ${layout.primaryColor === c ? "ring-2 ring-white ring-offset-1 ring-offset-background scale-105" : "hover:scale-105"}`}
                style={{ background: c }}
              />
            ))}
          </div>
          {isPremium && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">Custom:</span>
              <input
                type="color"
                value={layout.primaryColor}
                onChange={e => set({ primaryColor: e.target.value })}
                className="h-7 w-14 rounded cursor-pointer border border-border/40 bg-transparent"
              />
              <span className="text-xs text-muted-foreground font-mono">{layout.primaryColor}</span>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Type size={11} /> Fonte
          </label>
          <div className="space-y-1">
            {FONT_OPTIONS.map(f => (
              <button
                key={f.value}
                onClick={() => set({ fontFamily: f.value })}
                className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                  layout.fontFamily === f.value
                    ? "bg-accent/15 border-accent/40 text-accent"
                    : "border-border/30 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {isPremium && (
          <section className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Sliders size={11} /> Blocos do contrato
            </label>
            <div className="space-y-1">
              {layout.blocks.map(block => {
                const labels: Record<string, string> = {
                  header: "Cabeçalho", parties: "Partes", conditions: "Condições",
                  scope: "Escopo", clauses: "Cláusulas", signatures: "Assinaturas",
                };
                return (
                  <div key={block.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/30 bg-card/20">
                    <span className="text-xs text-muted-foreground">{labels[block.id] ?? block.id}</span>
                    <button
                      onClick={() => set({
                        blocks: layout.blocks.map(b =>
                          b.id === block.id ? { ...b, visible: !b.visible } : b
                        )
                      })}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
                        block.visible
                          ? "bg-accent/15 border-accent/40 text-accent"
                          : "border-border/40 text-muted-foreground/50"
                      }`}
                    >
                      {block.visible ? "Visível" : "Oculto"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {isPremium && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Seções personalizadas
              </label>
              <button
                onClick={addCustomBlock}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
              >
                <Plus size={11} /> Adicionar
              </button>
            </div>

            {(!layout.customTextBlocks || layout.customTextBlocks.length === 0) && (
              <p className="text-xs text-muted-foreground/50 text-center py-3">Nenhuma seção adicionada</p>
            )}

            {layout.customTextBlocks?.map(block => (
              <div key={block.id} className="rounded-lg border border-border/30 bg-card/20 overflow-hidden">
                <button
                  onClick={() => setExpandedBlock(expandedBlock === block.id ? null : block.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="truncate font-medium">{block.title}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <ChevronDown size={11} className={`transition-transform ${expandedBlock === block.id ? "rotate-180" : ""}`} />
                    <button
                      onClick={e => { e.stopPropagation(); removeCustomBlock(block.id); }}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors ml-1"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </button>
                {expandedBlock === block.id && (
                  <div className="px-3 pb-3 space-y-2 border-t border-border/30">
                    <Input
                      value={block.title}
                      onChange={e => updateCustomBlock(block.id, { title: e.target.value })}
                      placeholder="Título da seção"
                      className="h-7 text-xs bg-background border-border/40 mt-2"
                    />
                    <Textarea
                      value={block.content}
                      onChange={e => updateCustomBlock(block.id, { content: e.target.value })}
                      placeholder="Conteúdo…"
                      rows={4}
                      className="text-xs bg-background border-border/40 resize-none"
                    />
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        <button
          onClick={() => onChange(DEFAULT_LAYOUT)}
          className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border border-border/30 text-muted-foreground/60 hover:text-muted-foreground hover:border-border/50 transition-all"
        >
          <RotateCcw size={11} /> Restaurar padrão
        </button>

      </div>
    </ScrollArea>
  );
}

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

          {savedExists && (
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
          )}

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
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function EditorContratoPage() {
  const { id } = useParams<{ id: string }>();
  const contractIdNum = Number(id || "0");
  const [, navigate] = useLocation();

  const [state, setState] = useState<EditorState>("loading");
  const [contract, setContract] = useState<Contract | null>(null);
  const [clauses, setClauses] = useState<ContractClause[]>([]);
  const [planId, setPlanId] = useState<PlanId>("free");

  const [clauseTemplates, setClauseTemplates] = useState<ClauseTemplate[]>([]);
  const [clausesLoading, setClausesLoading] = useState(false);

  const [previewHtml, setPreviewHtml] = useState("");
  const [selectedClause, setSelectedClause] = useState<ContractClause | null>(null);
  const [editContent, setEditContent] = useState("");
  const [rightTab, setRightTab] = useState<RightPanelTab>("clausula");
  const [layout, setLayout] = useState<LayoutCustomization>(DEFAULT_LAYOUT);

  const [signatureObjectUrl, setSignatureObjectUrl] = useState<string | null>(null);
  const [signatureLoading, setSignatureLoading] = useState(false);
  const signatureObjectUrlRef = useRef<string | null>(null);

  const [providerSignatureUrl, setProviderSignatureUrl] = useState<string | null>(null);
  const [providerSigLoading, setProviderSigLoading] = useState(false);
  const [providerSigSaving, setProviderSigSaving] = useState(false);
  const [providerSigApplying, setProviderSigApplying] = useState(false);
  const [showProviderSigPanel, setShowProviderSigPanel] = useState(false);
  const providerSigObjectUrlRef = useRef<string | null>(null);
  const [providerSavedExists, setProviderSavedExists] = useState(false);
  const [drawnProviderDataUrl, setDrawnProviderDataUrl] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [savingClause, setSavingClause] = useState(false);
  const [previewClause, setPreviewClause] = useState<ClauseTemplate | null>(null);

  // ── MOBILE TAB — declarado aqui, junto com os outros states ──────────────
  const [mobileTab, setMobileTab] = useState<"biblioteca" | "preview" | "editor">("preview");

  const iframeDesktopRef = useRef<HTMLIFrameElement>(null);
  const iframeMobileRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLayoutRender = useRef(true);

  const [layoutSaving, setLayoutSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [showTour, setShowTour] = useState(false);

  const isPro = hasPlan(planId, "pro");
  const isPremium = hasPlan(planId, "premium");

  // ── Muda para aba editor quando cláusula é selecionada em mobile ──────────
  useEffect(() => {
    if (selectedClause && window.innerWidth < 1024) {
      setMobileTab("editor");
    }
  }, [selectedClause]);

const loadContract = useCallback(async () => {
  setState("loading");

  try {
    const [raw, planData] = await Promise.all([
      getContract(contractIdNum),
      getMyPlan().catch(() => ({ plan: { planId: "free" as PlanId } })),
    ]);

    const c = normalizeContract(raw);

    setContract(c);
    setClauses(c.clauses ?? []);
    setPlanId(planData.plan.planId);

    const neverShow = localStorage.getItem("fechou_editor_tour_never") === "1";

if (!neverShow) {
  setShowTour(true);
}

    const savedLayout: Partial<LayoutCustomization> = {};
    if ((raw as any).layoutConfig?.primaryColor) {
      Object.assign(savedLayout, (raw as any).layoutConfig);
    }
    if ((raw as any).logoUrl) {
      savedLayout.logoUrl = (raw as any).logoUrl;
    }
    if (Object.keys(savedLayout).length > 0) {
      setLayout(prev => ({ ...prev, ...savedLayout }));
    }

    setState("idle");
  } catch (err) {
    console.error("Erro ao carregar contrato:", err);
    setState("error");
  }
}, [contractIdNum]);
  const fetchClauses = useCallback(async (searchValue: string, category: string) => {
    setClausesLoading(true);
    try {
      const params: { search?: string; category?: string } = {};
      if (searchValue.trim()) params.search = searchValue.trim();
      if (category !== "todos") params.category = category;
      setClauseTemplates(await listClauses(params));
    } catch (err: any) {
      toast.error(err?.message || "Erro ao buscar cláusulas.");
    } finally {
      setClausesLoading(false);
    }
  }, []);

  useEffect(() => {
    _sigCache.delete(contractIdNum);
    _provContractCache.delete(contractIdNum);
    _provProfileCached = null;
    loadContract();
  }, [loadContract]);

  const fetchSignature = useCallback(async (force = false) => {
    if (!contractIdNum) return;

    if (!force) {
      const cached = _sigCache.get(contractIdNum);
      if (cached === "none") return;
      if (cached) { setSignatureObjectUrl(cached); return; }
    }

    setSignatureLoading(true);
    try {
      const token = localStorage.getItem("access_token") ?? "";
      const res = await fetch(`/api/contracts/${contractIdNum}/signature`, {
        credentials: "include",
        headers: { Accept: "image/png", Authorization: `Bearer ${token}` },
      });
      if (res.status === 204 || !res.ok) {
        _sigCache.set(contractIdNum, "none");
        setSignatureObjectUrl(null);
        return;
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/png")) {
        _sigCache.set(contractIdNum, "none");
        setSignatureObjectUrl(null);
        return;
      }
      const blob = await res.blob();
      if (signatureObjectUrlRef.current) URL.revokeObjectURL(signatureObjectUrlRef.current);
      const objectUrl = URL.createObjectURL(blob);
      signatureObjectUrlRef.current = objectUrl;
      _sigCache.set(contractIdNum, objectUrl);
      setSignatureObjectUrl(objectUrl);
    } catch {
      setSignatureObjectUrl(null);
    } finally {
      setSignatureLoading(false);
    }
  }, [contractIdNum]);

  const handleRefreshSignature = useCallback(() => {
    _sigCache.delete(contractIdNum);
    fetchSignature(true);
  }, [contractIdNum, fetchSignature]);

  const loadProviderSignatures = useCallback(async (force = false) => {
    if (!contractIdNum) return;

    const cachedContract = _provContractCache.get(contractIdNum);
    const profileCached = _provProfileCached;

    if (!force && cachedContract !== undefined && profileCached !== null) {
      if (cachedContract !== "none") setProviderSignatureUrl(cachedContract);
      setProviderSavedExists(profileCached);
      return;
    }

    setProviderSigLoading(true);
    try {
      const token = localStorage.getItem("access_token") ?? "";
      const headers = { Authorization: `Bearer ${token}`, Accept: "image/png" };

      const contractSigRes = await fetch(`/api/contracts/${contractIdNum}/provider-signature`, {
        credentials: "include", headers,
      });
      if (contractSigRes.ok && contractSigRes.headers.get("content-type")?.startsWith("image/png")) {
        const blob = await contractSigRes.blob();
        if (providerSigObjectUrlRef.current) URL.revokeObjectURL(providerSigObjectUrlRef.current);
        const url = URL.createObjectURL(blob);
        providerSigObjectUrlRef.current = url;
        _provContractCache.set(contractIdNum, url);
        setProviderSignatureUrl(url);
      } else {
        _provContractCache.set(contractIdNum, "none");
        setProviderSignatureUrl(null);
      }

      const profileRes = await fetch("/api/contracts/provider-signature", {
        credentials: "include", headers,
      });
      const exists = profileRes.ok && profileRes.status === 200;
      _provProfileCached = exists;
      setProviderSavedExists(exists);
    } catch {
      setProviderSignatureUrl(null);
    } finally {
      setProviderSigLoading(false);
    }
  }, [contractIdNum]);

  const handleSaveProviderSignature = useCallback(async (dataUrl: string) => {
    if (!dataUrl) return;
    setProviderSigSaving(true);
    try {
      const token = localStorage.getItem("access_token") ?? "";
      const base64Only = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      const res = await fetch("/api/contracts/provider-signature", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ signatureDataUrl: base64Only }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      _provProfileCached = true;
      setProviderSavedExists(true);
      toast.success("Assinatura salva no perfil!");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar assinatura.");
    } finally {
      setProviderSigSaving(false);
    }
  }, []);

  const handleApplyProviderSignature = useCallback(async () => {
    if (!contractIdNum) return;
    setProviderSigApplying(true);
    try {
      const token = localStorage.getItem("access_token") ?? "";
      const res = await fetch(`/api/contracts/${contractIdNum}/provider-signature`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      toast.success("Assinatura aplicada ao contrato!");
      _provContractCache.delete(contractIdNum);
      await loadProviderSignatures(true);
      setShowProviderSigPanel(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao aplicar assinatura.");
    } finally {
      setProviderSigApplying(false);
    }
  }, [contractIdNum, loadProviderSignatures]);

  const handleDeleteProviderSignature = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token") ?? "";
      await fetch("/api/contracts/provider-signature", {
        method: "DELETE",
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      _provProfileCached = false;
      setProviderSavedExists(false);
      toast.success("Assinatura removida do perfil.");
    } catch {
      toast.error("Erro ao remover assinatura.");
    }
  }, []);

  useEffect(() => {
    if (!contractIdNum) return;
    loadProviderSignatures();
    return () => {
      if (providerSigObjectUrlRef.current) {
        URL.revokeObjectURL(providerSigObjectUrlRef.current);
        providerSigObjectUrlRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractIdNum]);

  useEffect(() => {
    if (!contractIdNum) return;
    fetchSignature(true);
    return () => {
      if (signatureObjectUrlRef.current) {
        URL.revokeObjectURL(signatureObjectUrlRef.current);
        signatureObjectUrlRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractIdNum]);

  useEffect(() => {
    if (state === "idle") fetchClauses(search, categoryFilter);
  }, [state]);

  useEffect(() => {
    if (state !== "idle") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchClauses(search, categoryFilter), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, categoryFilter, fetchClauses, state]);

  useEffect(() => {
    if (!contract) return;
    const html = buildContractHtml(contract, clauses, layout, isPro, isPremium, signatureObjectUrl, providerSignatureUrl);
    setPreviewHtml(html);
  }, [contract, clauses, layout, isPro, isPremium, signatureObjectUrl, providerSignatureUrl]);

  useEffect(() => {
    if (isFirstLayoutRender.current) {
      isFirstLayoutRender.current = false;
      return;
    }
    if (!contractIdNum || state !== "idle") return;

    if (layoutDebounceRef.current) clearTimeout(layoutDebounceRef.current);
    setLayoutSaving("saving");

    layoutDebounceRef.current = setTimeout(async () => {
      try {
        await updateLayout(contractIdNum, {
          primaryColor: layout.primaryColor,
          fontFamily: layout.fontFamily,
          logoUrl: layout.logoUrl,
          showFechouBranding: layout.showFechouBranding,
          blocks: layout.blocks,
          customTextBlocks: layout.customTextBlocks,
        });
        setLayoutSaving("saved");
        setTimeout(() => setLayoutSaving("idle"), 2000);
      } catch (err: any) {
        setLayoutSaving("idle");
        toast.error(err?.message ?? "Erro ao salvar layout.");
      }
    }, 800);

    return () => { if (layoutDebounceRef.current) clearTimeout(layoutDebounceRef.current); };
  }, [layout, contractIdNum, state]);

  // previewHtml é passado via srcDoc diretamente nos iframes — sem doc.write

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
      toast.success("Cláusula adicionada!", { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao adicionar cláusula.", { id: toastId });
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
      toast.success("Cláusula removida.", { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover cláusula.", { id: toastId });
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
      await updateClause(contractIdNum, selectedClause.clauseId ?? selectedClause.id, editContent);
      setClauses(prev => prev.map(c => c.id === selectedClause.id ? { ...c, customContent: editContent } : c));
      setSelectedClause(prev => prev ? { ...prev, customContent: editContent } : prev);
      toast.success("Cláusula salva!", { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar cláusula.", { id: toastId });
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
    try { await reorderClauses(contractIdNum, draggedIndex, targetIndex); }
    catch (err: any) { toast.error(err?.message || "Erro ao reordenar cláusulas."); }
  };

  const handleGeneratePdf = async () => {
    setState("generating-pdf");
    const toastId = toast.loading("Gerando contrato em PDF...");
    try {
      await generatePdf(contractIdNum);
      toast.success("PDF gerado e baixado!", { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar PDF.", { id: toastId });
    }
    setState("idle");
  };

  const isAlreadyAdded = (templateId: string | number) =>
    clauses.some(c => String(c.clauseId) === String(templateId));

  // ─────────────────────────────────────────────────────────────
  // EARLY RETURNS — depois de todos os hooks
  // ─────────────────────────────────────────────────────────────

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Carregando editor...</p>
        </div>
      </div>
    );
  }

  if (state === "error" || !contract) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={32} className="text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground text-sm mb-4">Contrato não encontrado.</p>
          <Link href="/contratos">
            <Button variant="outline" size="sm">
              <ArrowLeft size={14} className="mr-1.5" /> Voltar para contratos
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="noise-overlay" />

      {showTour && <EditorTour onClose={() => setShowTour(false)} />}

      <div className="relative border-b border-border/50 bg-background/90 backdrop-blur-sm z-40">
        <header className="px-3 sm:px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
              <Link href="/contratos">
                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm shrink-0">
                  <ArrowLeft size={15} /> Contratos
                </button>
              </Link>

              <span className="text-border/40 hidden sm:inline">|</span>

              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="font-display text-sm font-semibold truncate max-w-[180px] sm:max-w-[260px] lg:max-w-none">
                  {contract.clientName}
                </span>

                <span className="text-xs text-muted-foreground/60 shrink-0">
                  #{String(contract.id).padStart(4, "0")}
                </span>

                {signatureLoading && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                    <Loader2 size={9} className="animate-spin" /> verificando...
                  </span>
                )}

                {!signatureLoading && signatureObjectUrl && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 font-semibold">
                    <CheckCircle2 size={9} /> Contratante assinou
                  </span>
                )}

                {!signatureLoading && !signatureObjectUrl && (
                  <button
                    onClick={handleRefreshSignature}
                    title="Verificar se o contratante já assinou"
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-border/40 text-muted-foreground/60 hover:border-accent/50 hover:text-accent transition-all"
                  >
                    <RotateCcw size={9} /> Verificar assinatura
                  </button>
                )}

                <span className="text-border/30 hidden sm:inline">·</span>

                {providerSigLoading ? (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                    <Loader2 size={9} className="animate-spin" /> carregando...
                  </span>
                ) : providerSignatureUrl ? (
                  <button
                    data-tour="btn-signature"
                    onClick={() => setShowProviderSigPanel((p) => !p)}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#ff6600]/15 border border-[#ff6600]/40 text-[#ff6600] font-semibold hover:bg-[#ff6600]/25 transition-all"
                  >
                    <PenLine size={9} /> Minha assinatura ✓
                  </button>
                ) : (
                  <button
                    data-tour="btn-signature"
                    onClick={() => setShowProviderSigPanel((p) => !p)}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-border/40 text-muted-foreground/60 hover:border-[#ff6600]/50 hover:text-[#ff6600] transition-all"
                  >
                    <PenLine size={9} /> Minha assinatura
                  </button>
                )}

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

            {/* navegação mobile */}
            <div data-tour="mobile-nav" className="flex lg:hidden rounded-xl border border-border/40 bg-card/30 p-1">
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
            </div>
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
              savedExists={providerSavedExists}
              saving={providerSigSaving}
              applying={providerSigApplying}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 min-h-0">
        {/* ── DESKTOP ── */}
        <div className="hidden lg:flex h-[calc(100vh-88px)] min-h-0">
          {/* LEFT */}
          <aside data-tour="clause-library" className="w-[320px] xl:w-[340px] min-w-[280px] border-r border-border/50 flex flex-col bg-card/30">
            <div className="px-4 py-3 border-b border-border/40 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <Library size={14} className="text-accent" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Cláusulas
                </span>
                {clausesLoading && <Loader2 size={11} className="animate-spin text-muted-foreground/60 ml-auto" />}
              </div>

              <div className="relative mb-2">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  data-tour="clause-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar cláusula…"
                  className="pl-8 h-8 text-xs bg-background border-border/40"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategoryFilter(cat.value)}
                    className={`text-[11px] px-2 py-1 rounded-full border transition-all ${
                      categoryFilter === cat.value
                        ? "bg-accent border-accent text-white"
                        : "border-border/40 text-muted-foreground hover:border-border"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              {clausesLoading ? (
                <ClauseSkeletons />
              ) : clauseTemplates.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <Library size={24} className="mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground/60">Nenhuma cláusula disponível</p>
                  {search && (
                    <button onClick={() => setSearch("")} className="mt-2 text-xs text-accent hover:underline">
                      Limpar busca
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-2 space-y-1.5">
                  {clauseTemplates.map((template) => {
                    const already = isAlreadyAdded(template.id);
                    const isOpen = previewClause?.id === template.id;

                    return (
                      <div key={String(template.id)}>
                        <div
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setPreviewClause(isOpen ? null : template);
                          }}
                          onClick={() => setPreviewClause(isOpen ? null : template)}
                          className={`rounded-lg border p-3 cursor-pointer transition-all select-none ${
                            isOpen
                              ? "border-accent/60 bg-accent/5"
                              : "border-border/30 bg-background/50 hover:border-border/60 hover:bg-background/80"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-foreground leading-tight flex-1">
                              {template.title}
                            </p>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-[10px] px-1.5 py-0.5 rounded border border-border/30 text-muted-foreground/60 whitespace-nowrap capitalize">
                                {template.category}
                              </span>
                              <ChevronDown
                                size={11}
                                className="text-muted-foreground/50 transition-transform duration-150"
                                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                              />
                            </div>
                          </div>

                          {template.description && !isOpen && (
                            <p className="mt-1 text-[11px] text-muted-foreground/70 line-clamp-2 leading-relaxed">
                              {template.description}
                            </p>
                          )}
                        </div>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                              className="overflow-hidden"
                            >
                              <div className="mt-1 rounded-xl border border-accent/40 bg-card overflow-hidden">
                                <div style={{ height: 3, background: "var(--accent, #ff6600)" }} />

                                <div className="p-3 space-y-2.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs font-semibold text-foreground leading-tight flex-1">
                                      {template.title}
                                    </p>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-accent/30 text-accent capitalize font-medium">
                                        {template.category}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewClause(null);
                                        }}
                                        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-0.5"
                                      >
                                        <X size={11} />
                                      </button>
                                    </div>
                                  </div>

                                  {template.description && (
                                    <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                                      {template.description}
                                    </p>
                                  )}

                                  <div className="rounded-lg bg-background border border-border/30 p-2.5 max-h-36 overflow-y-auto">
                                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 mb-1.5 font-semibold">
                                      Texto da cláusula
                                    </p>
                                    <p className="text-[11px] text-muted-foreground/75 leading-relaxed whitespace-pre-wrap">
                                      {template.content}
                                    </p>
                                  </div>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!already) {
                                        handleAddClause(template);
                                        setPreviewClause(null);
                                      }
                                    }}
                                    disabled={already}
                                    className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                                      already
                                        ? "bg-accent/10 text-accent border border-accent/20 cursor-default"
                                        : "bg-accent text-white hover:bg-accent/90 active:scale-[0.99]"
                                    }`}
                                  >
                                    {already ? (
                                      <><CheckCircle2 size={11} /> Já adicionada</>
                                    ) : (
                                      <><Plus size={11} /> Adicionar ao contrato</>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </aside>

          {/* CENTER */}
          <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-zinc-900/30">
            <div className="px-4 py-2.5 border-b border-border/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Eye size={13} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Preview do contrato</span>
              </div>
              <span className="text-xs text-muted-foreground/60">
                {clauses.length} cláusula{clauses.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex-1 min-h-0 flex overflow-hidden">
              <div className="flex-1 min-w-0 overflow-auto p-4 xl:p-6 flex justify-center">
                <div data-tour="preview" className="w-full max-w-[800px] aspect-[800/1122] min-h-[520px] shadow-2xl rounded-xl overflow-hidden bg-white">
                  <iframe
                    ref={iframeDesktopRef}
                    srcDoc={previewHtml}
                    className="w-full h-full border-0"
                    title="Contract Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>

              {clauses.length > 0 && (
                <aside data-tour="clause-order" className="w-[220px] xl:w-[240px] border-l border-border/40 flex flex-col bg-card/20 shrink-0">
                  <div className="px-3 py-2.5 border-b border-border/40 shrink-0">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Ordem
                    </span>
                  </div>

                  <ScrollArea className="flex-1 min-h-0">
                    <div className="p-2 space-y-1">
                      {clauses.map((clause, i) => (
                        <div
                          key={clause.id}
                          draggable
                          onDragStart={() => handleDragStart(i)}
                          onDragOver={(e) => handleDragOver(e, i)}
                          onDrop={(e) => handleDrop(e, i)}
                          onDragEnd={() => { setDragOver(null); setDraggedIndex(null); }}
                          onClick={() => handleSelectClause(clause)}
                          className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer text-xs transition-all group ${
                            selectedClause?.id === clause.id
                              ? "bg-accent/15 border border-accent/30 text-accent"
                              : dragOver === i
                              ? "bg-accent/10 border border-accent/20"
                              : "hover:bg-card/60 border border-transparent"
                          }`}
                        >
                          <GripVertical size={12} className="text-muted-foreground/40 flex-shrink-0 cursor-grab" />
                          <span className="flex-1 truncate leading-tight">{clause.title}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveClause(clause.id); }}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-all"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </aside>
              )}
            </div>
          </main>

          {/* RIGHT */}
          <aside className="w-[360px] xl:w-[400px] min-w-[320px] border-l border-border/50 flex flex-col bg-card/30">
            <div className="flex border-b border-border/40 shrink-0">
              <button
                onClick={() => setRightTab("clausula")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all border-b-2 ${
                  rightTab === "clausula"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Save size={11} /> Cláusula
              </button>

              <button
                data-tour="tab-aparencia"
                onClick={() => setRightTab("aparencia")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all border-b-2 ${
                  rightTab === "aparencia"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Palette size={11} /> Aparência
                {!isPro && <Lock size={10} className="text-yellow-400 ml-0.5" />}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {rightTab === "clausula" && (
                <motion.div
                  key="clausula"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 min-h-0 flex flex-col overflow-hidden"
                >
                  {selectedClause ? (
                    <>
                      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between shrink-0">
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Editar Cláusula
                        </span>
                        <button
                          onClick={() => setSelectedClause(null)}
                          className="text-muted-foreground/50 hover:text-foreground transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <ScrollArea className="flex-1 min-h-0">
                        <div className="p-4 space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-foreground mb-1">{selectedClause.title}</p>
                            <span className="text-xs text-muted-foreground/60 border border-border/30 rounded px-1.5 py-0.5 capitalize">
                              {selectedClause.category}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground font-medium">Conteúdo personalizado</label>
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={12}
                              className="text-xs bg-background border-border/40 resize-none leading-relaxed min-h-[320px]"
                              placeholder="Personalize o texto desta cláusula…"
                            />
                            <p className="text-xs text-muted-foreground/50">
                              Use {"{{cliente}}"}, {"{{valor}}"}, {"{{data_execucao}}"} como variáveis.
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={handleSaveClause}
                              disabled={savingClause}
                              size="sm"
                              className="flex-1 h-9 text-xs"
                            >
                              {savingClause ? (
                                <><Loader2 size={12} className="animate-spin" /> Salvando…</>
                              ) : (
                                <><Save size={12} /> Salvar</>
                              )}
                            </Button>

                            <Button
                              onClick={() => setEditContent(selectedClause.content)}
                              variant="outline"
                              size="sm"
                              className="border-border/50 text-xs h-9"
                            >
                              Restaurar
                            </Button>
                          </div>

                          <div className="border-t border-border/40 pt-4">
                            <button
                              onClick={() => handleRemoveClause(selectedClause.id)}
                              className="w-full text-xs py-2 rounded-md border border-destructive/30 text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-all flex items-center justify-center gap-1.5"
                            >
                              <Trash2 size={12} /> Remover esta cláusula
                            </button>
                          </div>
                        </div>
                      </ScrollArea>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
                      <Save size={28} className="text-muted-foreground/20" />
                      <p className="text-xs text-muted-foreground/50 leading-relaxed">
                        Clique em uma cláusula na coluna de ordem para editá-la.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {rightTab === "aparencia" && (
                <motion.div
                  key="aparencia"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 min-h-0 flex flex-col overflow-hidden"
                >
                  <AppearancePanel
                    layout={layout}
                    onChange={setLayout}
                    planId={planId}
                    contractId={contractIdNum}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </aside>
        </div>

        {/* ── MOBILE / TABLET ── */}
        <div className="lg:hidden flex flex-col min-h-[calc(100vh-120px)]">
          {mobileTab === "biblioteca" && (
            <section data-tour="clause-library" className="flex-1 min-h-0 flex flex-col bg-card/30">
              <div className="px-4 py-3 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <Library size={14} className="text-accent" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Cláusulas
                  </span>
                  {clausesLoading && <Loader2 size={11} className="animate-spin text-muted-foreground/60 ml-auto" />}
                </div>

                <div className="relative mb-2">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar cláusula…"
                    className="pl-8 h-8 text-xs bg-background border-border/40"
                  />
                </div>

                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategoryFilter(cat.value)}
                      className={`text-[11px] px-2 py-1 rounded-full border transition-all ${
                        categoryFilter === cat.value
                          ? "bg-accent border-accent text-white"
                          : "border-border/40 text-muted-foreground hover:border-border"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 space-y-1.5">
                  {clauseTemplates.map((template) => {
                    const already = isAlreadyAdded(template.id);
                    return (
                      <button
                        key={String(template.id)}
                        onClick={() => { if (!already) handleAddClause(template); }}
                        className="w-full text-left rounded-lg border border-border/30 bg-background/60 p-3 hover:border-border/60 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-foreground">{template.title}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-border/30 text-muted-foreground/60 capitalize">
                            {template.category}
                          </span>
                        </div>
                        {template.description && (
                          <p className="mt-1 text-[11px] text-muted-foreground/70 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </section>
          )}

          {mobileTab === "preview" && (
            <section className="flex-1 min-h-0 flex flex-col bg-zinc-900/30">
              <div className="px-4 py-2.5 border-b border-border/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Eye size={13} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Preview do contrato</span>
                </div>
                <span className="text-xs text-muted-foreground/60">
                  {clauses.length} cláusula{clauses.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-4">
                <div data-tour="preview" className="mx-auto w-full max-w-[800px] aspect-[800/1122] min-h-[420px] rounded-xl overflow-hidden shadow-2xl bg-white">
                  <iframe
                    ref={iframeMobileRef}
                    srcDoc={previewHtml}
                    className="w-full h-full border-0"
                    title="Contract Preview Mobile"
                    sandbox="allow-same-origin"
                  />
                </div>

                {clauses.length > 0 && (
                  <div className="mt-4 rounded-xl border border-border/40 bg-card/30">
                    <div className="px-3 py-2.5 border-b border-border/40">
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Ordem das cláusulas
                      </span>
                    </div>

                    <div className="p-2 space-y-1">
                      {clauses.map((clause) => (
                        <button
                          key={clause.id}
                          onClick={() => {
                            handleSelectClause(clause);
                            setMobileTab("editor");
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all ${
                            selectedClause?.id === clause.id
                              ? "bg-accent/15 border border-accent/30 text-accent"
                              : "border border-transparent hover:bg-card/60"
                          }`}
                        >
                          <GripVertical size={12} className="text-muted-foreground/40 shrink-0" />
                          <span className="flex-1 truncate text-left">{clause.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {mobileTab === "editor" && (
            <section className="flex-1 min-h-0 flex flex-col bg-card/30">
              <div className="flex border-b border-border/40 shrink-0">
                <button
                  onClick={() => setRightTab("clausula")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all border-b-2 ${
                    rightTab === "clausula"
                      ? "border-accent text-accent"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Save size={11} /> Cláusula
                </button>

                <button
                  onClick={() => setRightTab("aparencia")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all border-b-2 ${
                    rightTab === "aparencia"
                      ? "border-accent text-accent"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Palette size={11} /> Aparência
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                {rightTab === "clausula" ? (
                  selectedClause ? (
                    <ScrollArea className="h-full">
                      <div className="p-4 space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-foreground mb-1">{selectedClause.title}</p>
                          <span className="text-xs text-muted-foreground/60 border border-border/30 rounded px-1.5 py-0.5 capitalize">
                            {selectedClause.category}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground font-medium">Conteúdo personalizado</label>
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={12}
                            className="text-xs bg-background border-border/40 resize-none leading-relaxed min-h-[280px]"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button onClick={handleSaveClause} disabled={savingClause} className="flex-1 h-9 text-xs">
                            {savingClause ? (
                              <><Loader2 size={12} className="animate-spin" /> Salvando…</>
                            ) : (
                              <><Save size={12} /> Salvar</>
                            )}
                          </Button>

                          <Button
                            onClick={() => setEditContent(selectedClause.content)}
                            variant="outline"
                            className="border-border/50 text-xs h-9"
                          >
                            Restaurar
                          </Button>
                        </div>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="h-full flex items-center justify-center p-6 text-center">
                      <p className="text-xs text-muted-foreground/50">
                        Selecione uma cláusula na aba de preview para editar.
                      </p>
                    </div>
                  )
                ) : (
                  <AppearancePanel
                    layout={layout}
                    onChange={setLayout}
                    planId={planId}
                    contractId={contractIdNum}
                  />
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
