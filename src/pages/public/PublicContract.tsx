/**
 * PublicContract.tsx — Contrato público com assinatura em canvas (traço suave)
 *                      + botão "Ver Contrato" antes de assinar
 *
 * Fluxo público:
 *  /c/:token (ou /p/contract/:token) → ver preview no modal → assinar → pagar → avaliar
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proposalsService } from "../../services/proposals";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getSafeRedirectUrl, rateLimiter } from "../../lib/security";
import {
  validateSignerName,
  normalizeSignerDocument,
  validateSignatureDataUrl,
} from "../../lib/signature-security";
import { getCpfCnpjValidationMessage } from "../../lib/cpf-cnpj";
import { HoneypotField, isHoneypotTripped } from "../../components/security/HoneypotField";
import {
  CheckCircle, FileSignature, CreditCard, Loader2,
  Shield, User, Hash, Star, ArrowRight, Eye, Lock,
  CheckCircle2, X, ScrollText, Pen, Eraser,
} from "lucide-react";
import { RatingModal } from "./RatingModal";
import {
  CONTRACT_TYPE_LABELS,
  PAYMENT_FORM_LABELS,
  type ContractType,
  type PaymentForm,
} from "../../service/contracts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getContractTypeLabel = (v: string) =>
  CONTRACT_TYPE_LABELS[v as ContractType] ?? v;

const getPaymentFormLabel = (v: string) =>
  PAYMENT_FORM_LABELS[v as PaymentForm] ?? v;

const signSchema = z.object({
  signerName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  signerDocument: z
    .string()
    .min(11, "Documento inválido")
    .max(18, "Documento inválido"),
  acceptTerms: z.literal(true, {
    errorMap: () => ({
      message: "Você precisa aceitar os termos para continuar",
    }),
  }),
}).superRefine((data, ctx) => {
  const documentError = getCpfCnpjValidationMessage(data.signerDocument, "CPF/CNPJ");
  if (documentError) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["signerDocument"],
      message: documentError,
    });
  }
});
type SignForm = z.infer<typeof signSchema>;

const formatCurrency = (v: number | string) => {
  const n =
    typeof v === "string" ? parseFloat(v.replace(/[^\d.-]/g, "")) : v;
  return isNaN(n)
    ? String(v)
    : new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(n);
};

function safe(v: unknown, max = 200) {
  return String(v ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .trim()
    .slice(0, max);
}

const fmtDate = (d: string) =>
  d
    ? new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(d))
    : d;

// ─── Constantes ───────────────────────────────────────────────────────────────

const ORANGE = "#FF6600";

const card: React.CSSProperties = {
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.02)",
  backdropFilter: "blur(16px)",
  overflow: "hidden",
};

const PLAN_ORDER: Record<string, number> = { free: 0, pro: 1, premium: 2 };
const hasPlan = (current: string, required: string) =>
  (PLAN_ORDER[current] ?? 0) >= (PLAN_ORDER[required] ?? 0);

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ReviewData {
  id: number;
  title: string;
  clientName: string;
  contractType: string;
  executionDate: string;
  value: number | string;
  paymentForm: string;
  scope: string;
  status: string;
  isSigned: boolean;
  isPaid: boolean;
  freelancerName: string;
  planId: "free" | "pro" | "premium";
  layoutConfig: Record<string, any> | null;
  logoUrl: string | null;
  clauses: {
    id: number;
    clauseId: number;
    title: string;
    content: string;
    customContent: string | null;
    category: string;
    orderIndex: number;
  }[];
  clientSignatureUrl: string | null;
  providerSignatureUrl: string | null;
}

// ─── HTML Builder ─────────────────────────────────────────────────────────────

function buildContractHtml(data: ReviewData): string {
  const isPro = hasPlan(data.planId, "pro");
  const clauses = data.clauses ?? [];

  const layout = {
    primaryColor: ORANGE,
    fontFamily: "inter",
    logoUrl: null as string | null,
    showFechouBranding: true,
    customTextBlocks: [] as { title: string; content: string }[],
    ...(data.layoutConfig ?? {}),
    logoUrl2: data.logoUrl ?? data.layoutConfig?.logoUrl ?? null,
  };

  const color = isPro ? layout.primaryColor : ORANGE;
  const fontMap: Record<string, string> = {
    inter: "'Inter', sans-serif",
    georgia: "Georgia, serif",
    roboto: "'Roboto', sans-serif",
    playfair: "'Playfair Display', serif",
  };
  const font = isPro
    ? fontMap[layout.fontFamily] ?? fontMap.inter
    : fontMap.inter;
  const effectiveLogoUrl = layout.logoUrl2 ?? null;
  const contractNumber =
    isPro && !layout.showFechouBranding
      ? `CTR-${String(data.id).padStart(6, "0")}`
      : `FECH-${String(data.id).padStart(6, "0")}`;
  const today = fmtDate(new Date().toISOString());

  const watermarkRows = Array.from({ length: 40 })
    .map((_, i) => {
      const row = Math.floor(i / 5);
      const col = i % 5;
      return `<span style="position:absolute;top:${row * 22 - 10}%;left:${col * 22 - 5}%;transform:rotate(-35deg);font-size:28px;font-weight:900;color:rgba(255,102,0,0.07);letter-spacing:0.08em;white-space:nowrap;user-select:none;">FECHOU!</span>`;
    })
    .join("");
  const watermark = !isPro
    ? `<div style="position:fixed;inset:0;z-index:10;pointer-events:none;overflow:hidden;">${watermarkRows}</div>`
    : "";

  const logoHtml =
    isPro && effectiveLogoUrl
      ? `<img src="${effectiveLogoUrl}" style="height:36px;object-fit:contain;margin-bottom:6px;" />`
      : isPro && !layout.showFechouBranding
        ? ``
        : `<div style="font-size:28px;font-weight:900;letter-spacing:-0.02em;color:#111;">FECHOU<span style="color:${color}">!</span></div>
         <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.25em;color:#888;margin-top:2px;">Plataforma de Contratos</div>`;

  const brandingLine =
    isPro && !layout.showFechouBranding
      ? ``
      : `<div style="font-size:10px;color:#ccc;text-transform:uppercase;letter-spacing:0.2em;">FECHOU! — fechou.app</div>`;

  const clausesHtml =
    clauses.length > 0
      ? `
    <div style="margin-bottom:32px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.3em;color:${color};font-weight:800;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid ${color}33;">
        Cláusulas Contratuais
        <span style="margin-left:8px;background:#f0f0f0;color:#888;font-size:9px;font-weight:700;padding:1px 6px;border-radius:10px;">${clauses.length}</span>
      </div>
      ${clauses
        .map(
          (c, i) => `
        <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #f0f0f0;">
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px;">
            <span style="background:#111;color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:3px;flex-shrink:0;">${i + 1}</span>
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#111;">${c.title}</span>
          </div>
          <p style="font-size:12px;line-height:1.8;color:#444;text-align:justify;margin:0;padding-left:20px;">
            ${(c.customContent || c.content)
              .replace(/\{\{cliente\}\}/g, data.clientName)
              .replace(/\{\{valor\}\}/g, formatCurrency(data.value))
              .replace(/\{\{data_execucao\}\}/g, fmtDate(data.executionDate))
              .replace(
                /\{\{forma_pagamento\}\}/g,
                getPaymentFormLabel(data.paymentForm)
              )
              .replace(/\{\{escopo\}\}/g, data.scope)}
          </p>
        </div>`
        )
        .join("")}
    </div>`
      : "";

  const customBlocksHtml =
    isPro && layout.customTextBlocks?.length > 0
      ? layout.customTextBlocks
        .map(
          (b: any) => `
        <div style="margin-bottom:32px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.3em;color:${color};font-weight:800;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid ${color}33;">${b.title}</div>
          <p style="font-size:12px;line-height:1.8;color:#444;">${b.content}</p>
        </div>`
        )
        .join("")
      : "";

  const clientSig = data.clientSignatureUrl;
  const providerSig = data.providerSignatureUrl;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Roboto:wght@400;500;700&family=Playfair+Display:wght@400;700;800&display=swap" rel="stylesheet"/>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:${font}; background:#fff; color:#111; }
  * { pointer-events:none !important; user-select:none !important; }
</style>
</head>
<body>
<div style="max-width:800px;margin:0 auto;min-height:1122px;position:relative;background:#fff;">
  ${watermark}
  <div style="position:relative;z-index:20;padding:48px 52px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:2px solid ${color};">
      <div>${logoHtml}</div>
      <div style="text-align:right;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#aaa;">Nº do Contrato</div>
        <div style="font-size:18px;font-weight:800;color:#111;margin-top:2px;">${contractNumber}</div>
        <div style="margin-top:6px;display:inline-block;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;border:1px solid ${color};color:${color};">
          ${data.isSigned ? "Assinado" : "Em Revisão"}
        </div>
      </div>
    </div>
    <div style="margin-bottom:36px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.3em;color:#aaa;margin-bottom:6px;">Contrato de Serviço</div>
      <div style="font-size:26px;font-weight:800;color:#111;line-height:1.2;">${getContractTypeLabel(data.contractType)}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:36px;">
      <div style="padding:14px 16px;background:#f8f8f8;border-radius:10px;border:1px solid #eee;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.25em;color:#aaa;margin-bottom:4px;">Cliente</div>
        <div style="font-weight:700;font-size:14px;color:${color};">${data.clientName}</div>
      </div>
      <div style="padding:14px 16px;background:#f8f8f8;border-radius:10px;border:1px solid #eee;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.25em;color:#aaa;margin-bottom:4px;">Valor do Contrato</div>
        <div style="font-weight:700;font-size:14px;color:${color};">${formatCurrency(data.value)}</div>
      </div>
      <div style="padding:14px 16px;background:#f8f8f8;border-radius:10px;border:1px solid #eee;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.25em;color:#aaa;margin-bottom:4px;">Data de Execução</div>
        <div style="font-weight:700;font-size:14px;color:#111;">${fmtDate(data.executionDate)}</div>
      </div>
      <div style="padding:14px 16px;background:#f8f8f8;border-radius:10px;border:1px solid #eee;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.25em;color:#aaa;margin-bottom:4px;">Pagamento</div>
        <div style="font-weight:700;font-size:14px;color:#111;">${getPaymentFormLabel(data.paymentForm)}</div>
      </div>
    </div>
    <div style="margin-bottom:32px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.3em;color:${color};font-weight:800;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid ${color}33;">Escopo de Trabalho</div>
      <p style="font-size:13px;line-height:1.8;color:#333;text-align:justify;">${data.scope}</p>
    </div>
    ${clausesHtml}
    ${customBlocksHtml}
    <div style="margin-top:40px;padding-top:24px;border-top:2px solid #111;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.3em;color:${color};font-weight:800;text-align:center;margin-bottom:28px;">Assinatura e Aceite</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;">
        <div style="text-align:center;">
          ${providerSig
      ? `<div style="height:64px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:4px;"><img src="${providerSig}" style="max-height:56px;max-width:100%;object-fit:contain;" /></div><div style="border-bottom:1.5px solid #333;margin-bottom:10px;"></div><div style="display:inline-flex;align-items:center;gap:4px;font-size:9px;color:#16a34a;font-weight:700;letter-spacing:0.08em;margin-bottom:6px;"><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="6" fill="#16a34a"/><path d="M3.5 6.5l2 2 3-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Assinado digitalmente</div>`
      : `<div style="height:48px;border-bottom:1.5px dashed #d1d5db;margin-bottom:10px;display:flex;align-items:center;justify-content:center;"><span style="font-size:9px;color:#d1d5db;letter-spacing:0.18em;text-transform:uppercase;">Aguardando assinatura</span></div>`
    }
          <div style="font-size:12px;font-weight:700;color:#111;">Prestador de Serviços</div>
          <div style="font-size:10px;color:#999;margin-top:2px;">Contratado</div>
        </div>
        <div style="text-align:center;">
          ${clientSig
      ? `<div style="height:64px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:4px;"><img src="${clientSig}" style="max-height:56px;max-width:100%;object-fit:contain;" /></div><div style="border-bottom:1.5px solid #333;margin-bottom:10px;"></div><div style="display:inline-flex;align-items:center;gap:4px;font-size:9px;color:#16a34a;font-weight:700;letter-spacing:0.08em;margin-bottom:6px;"><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="6" fill="#16a34a"/><path d="M3.5 6.5l2 2 3-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Assinado digitalmente</div>`
      : `<div style="height:48px;display:flex;align-items:center;justify-content:center;border-bottom:1.5px dashed #d1d5db;margin-bottom:10px;"><span style="font-size:9px;color:#d1d5db;letter-spacing:0.18em;text-transform:uppercase;">Aguardando assinatura</span></div>`
    }
          <div style="font-size:12px;font-weight:700;color:#111;">${data.clientName}</div>
          <div style="font-size:10px;color:#999;margin-top:2px;">Contratante</div>
        </div>
      </div>
    </div>
    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
      ${brandingLine}
      <div style="font-size:10px;color:#ccc;">${contractNumber} · ${today}</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

// ─── Signature Canvas (traço suave com Bezier) ────────────────────────────────

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

function SignatureCanvas({
  onSave,
  onClear,
  disabled = false,
}: {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const points = useRef<Point[]>([]);
  const animFrame = useRef<number>(0);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saved, setSaved] = useState(false);

  // Retorna posição normalizada ao DPR do canvas
  const getPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const scaleX = (canvas.width / dpr) / rect.width;
      const scaleY = (canvas.height / dpr) / rect.height;

      let clientX: number, clientY: number, pressure: number | undefined;

      if ("touches" in e && e.touches.length > 0) {
        const t = e.touches[0];
        clientX = t.clientX;
        clientY = t.clientY;
        // Pressão normalizada do toque (0.5 fallback se não suportado)
        pressure =
          (t as any).force !== undefined
            ? Math.max(0.2, Math.min(1, (t as any).force))
            : undefined;
      } else if ("changedTouches" in e && (e as any).changedTouches.length > 0) {
        const t = (e as any).changedTouches[0];
        clientX = t.clientX;
        clientY = t.clientY;
        pressure = undefined;
      } else {
        const me = e as MouseEvent;
        clientX = me.clientX;
        clientY = me.clientY;
        pressure = me.buttons === 1 ? 0.6 : undefined;
      }

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
        pressure,
      };
    },
    []
  );

  // Configura o canvas com DPR correto
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    setupCanvas();
    // Flag para ignorar o disparo inicial do ResizeObserver (acontece no mount
    // enquanto o browser ainda está calculando o layout — largura parte de 0).
    // Sem essa flag o canvas chama onClear() imediatamente e apaga o
    // signatureDataUrl do componente pai antes mesmo de o usuário desenhar.
    let initialized = false;
    const ro = new ResizeObserver(() => {
      if (!initialized) { initialized = true; return; }
      setupCanvas();
      setIsEmpty(true);
      setSaved(false);
      onClear();
    });
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [setupCanvas, onClear]);

  // Desenha uma curva Catmull-Rom suavizada entre os pontos acumulados
  const renderStroke = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || points.current.length < 2) return;

    const pts = points.current;
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];

    // Interpolação de pressão → espessura do traço
    const BASE_WIDTH = 2.2;
    const MAX_WIDTH = 4.5;
    const p = last.pressure ?? 0.5;
    const lineWidth = BASE_WIDTH + (MAX_WIDTH - BASE_WIDTH) * p;

    ctx.beginPath();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = ORANGE;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (pts.length === 2) {
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(last.x, last.y);
    } else {
      // Ponto de controle suavizado (média entre 3 pontos)
      const p0 = pts[pts.length - 3];
      const cp = {
        x: (prev.x + last.x) / 2,
        y: (prev.y + last.y) / 2,
      };
      ctx.moveTo((p0.x + prev.x) / 2, (p0.y + prev.y) / 2);
      ctx.quadraticCurveTo(prev.x, prev.y, cp.x, cp.y);
    }

    ctx.stroke();
  }, []);

  const startDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      isDrawing.current = true;
      points.current = [getPos(e)];
      setSaved(false);
      setIsEmpty(false);
    },
    [disabled, getPos]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled || !isDrawing.current) return;
      e.preventDefault();
      points.current.push(getPos(e));

      // Cancela frame anterior e agenda novo (throttle natural)
      cancelAnimationFrame(animFrame.current);
      animFrame.current = requestAnimationFrame(renderStroke);
    },
    [disabled, getPos, renderStroke]
  );

  const stopDraw = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    // Garante que o último segmento seja renderizado
    cancelAnimationFrame(animFrame.current);
    renderStroke();
    // Mantém apenas último ponto para suavizar a próxima stroke
    if (points.current.length > 0) {
      points.current = [points.current[points.current.length - 1]];
    }
  }, [renderStroke]);

  const handleClear = useCallback(() => {
    if (disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(
      0,
      0,
      canvas.width / (window.devicePixelRatio || 1),
      canvas.height / (window.devicePixelRatio || 1)
    );
    points.current = [];
    setIsEmpty(true);
    setSaved(false);
    onClear();
  }, [disabled, onClear]);

  const handleSave = useCallback(() => {
    if (disabled || isEmpty) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL("image/png");
      // Validação de segurança antes de passar para cima
      const validated = validateSignatureDataUrl(dataUrl);
      onSave(validated);
      setSaved(true);
      toast.success("Assinatura capturada!");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao capturar assinatura.");
    }
  }, [disabled, isEmpty, onSave]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Área do canvas */}
      <div
        style={{
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          border: `1.5px solid ${saved ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.1)"}`,
          background: "rgba(255,255,255,0.025)",
          touchAction: "none",
          cursor: disabled ? "not-allowed" : "crosshair",
          opacity: disabled ? 0.55 : 1,
          transition: "border-color 0.3s",
          // Sombra interna sutil
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: 160,
            display: "block",
            pointerEvents: disabled ? "none" : "auto",
          }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
          onTouchCancel={stopDraw}
        />

        {/* Placeholder */}
        {isEmpty && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              pointerEvents: "none",
            }}
          >
            <Pen size={20} style={{ color: "rgba(255,255,255,0.1)" }} />
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.18)",
                letterSpacing: "0.04em",
              }}
            >
              Assine aqui com o mouse ou dedo
            </span>
          </div>
        )}

        {/* Linha de base */}
        <div
          style={{
            position: "absolute",
            bottom: 30,
            left: 20,
            right: 20,
            height: 1,
            background: "rgba(255,255,255,0.05)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 20,
            fontSize: 8,
            color: "rgba(255,255,255,0.12)",
            textTransform: "uppercase",
            letterSpacing: "0.22em",
            pointerEvents: "none",
          }}
        >
          Assinatura Digital
        </div>
      </div>

      {/* Botões */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || isEmpty}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.07)",
            background: "transparent",
            color:
              disabled || isEmpty
                ? "rgba(255,255,255,0.18)"
                : "rgba(255,255,255,0.4)",
            fontSize: 11,
            fontWeight: 600,
            cursor: disabled || isEmpty ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            transition: "color 0.2s",
          }}
        >
          <Eraser size={11} />
          Limpar
        </button>

        <motion.button
          type="button"
          onClick={handleSave}
          disabled={isEmpty || disabled}
          whileHover={!isEmpty && !disabled ? { scale: 1.02 } : {}}
          whileTap={!isEmpty && !disabled ? { scale: 0.97 } : {}}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 18px",
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 700,
            cursor: isEmpty || disabled ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            transition: "all 0.2s",
            background: saved
              ? "rgba(34,197,94,0.1)"
              : isEmpty || disabled
                ? "rgba(255,255,255,0.03)"
                : ORANGE,
            border: saved
              ? "1px solid rgba(34,197,94,0.3)"
              : isEmpty || disabled
                ? "1px solid rgba(255,255,255,0.06)"
                : "none",
            color: saved
              ? "#22c55e"
              : isEmpty || disabled
                ? "rgba(255,255,255,0.18)"
                : "#fff",
            boxShadow:
              !saved && !isEmpty && !disabled
                ? `0 0 20px ${ORANGE}30`
                : "none",
          }}
        >
          <CheckCircle2 size={11} />
          {saved ? "Assinatura salva ✓" : "Usar esta assinatura"}
        </motion.button>
      </div>
    </div>
  );
}

// ─── Modal de Preview do Contrato ─────────────────────────────────────────────

function ContractPreviewModal({
  open,
  onClose,
  htmlContent,
  documentUrl,
}: {
  open: boolean;
  onClose: () => void;
  htmlContent?: string;
  documentUrl?: string | null;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(6px)",
            }}
          />

          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1001,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: "20px 16px 16px",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 860,
                maxHeight: "calc(100vh - 36px)",
                display: "flex",
                flexDirection: "column",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "#111",
                boxShadow: "0 40px 120px rgba(0,0,0,0.8)",
                overflow: "hidden",
                pointerEvents: "all",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.02)",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: `${ORANGE}18`,
                      border: `1px solid ${ORANGE}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ScrollText size={13} color={ORANGE} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "#fff",
                        margin: 0,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      Visualizar Contrato
                    </p>
                    <p
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.3)",
                        margin: 0,
                      }}
                    >
                      Somente leitura — leia com atenção antes de assinar
                    </p>
                  </div>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <Lock size={9} color="rgba(255,255,255,0.3)" />
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.2em",
                        color: "rgba(255,255,255,0.3)",
                      }}
                    >
                      Somente leitura
                    </span>
                  </div>
                  <button
                    onClick={onClose}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.5)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.1)")
                    }
                    onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.05)")
                    }
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Barra colorida */}
              <div
                style={{
                  height: 2,
                  background: `linear-gradient(to right, ${ORANGE}80, transparent)`,
                  flexShrink: 0,
                }}
              />

              {/* Conteúdo scrollável */}
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  background: "#f5f5f5",
                  scrollbarGutter: "stable both-edges",
                }}
              >
                <div style={{ padding: "24px" }}>
                  <div
                    style={{
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "rgba(17,17,17,0.55)",
                      }}
                    >
                      Role dentro do documento para ver o contrato completo
                    </p>
                    <span
                      style={{
                        fontSize: 11,
                        color: "rgba(17,17,17,0.48)",
                      }}
                    >
                      Scroll liberado
                    </span>
                  </div>
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: 12,
                      boxShadow: "0 4px 32px rgba(0,0,0,0.15)",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <iframe
                      src={htmlContent ? undefined : documentUrl ?? undefined}
                      srcDoc={htmlContent || undefined}
                      title="Pré-visualização do Contrato"
                      sandbox="allow-same-origin"
                      referrerPolicy="no-referrer"
                      style={{
                        width: "100%",
                        border: "none",
                        display: "block",
                        height: "min(78vh, 980px)",
                        minHeight: 640,
                        background: "#fff",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "12px 20px",
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.02)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexShrink: 0,
                  flexWrap: "wrap",
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.2)",
                    margin: 0,
                  }}
                >
                  Leia todo o contrato antes de prosseguir com a assinatura.
                </p>
                <button
                  onClick={onClose}
                  style={{
                    padding: "9px 22px",
                    borderRadius: 10,
                    background: ORANGE,
                    border: "none",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    boxShadow: `0 0 24px ${ORANGE}40`,
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.opacity = "0.88")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <CheckCircle2 size={13} />
                  Entendido — Fechar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════

export default function PublicContract() {
  const [, contractParams] = useRoute("/p/contract/:token");
  const [, shortParams] = useRoute("/c/:token");
  const rawToken = (
    contractParams?.token ??
    shortParams?.token ??
    ""
  ).trim();
  const token = /^[a-f0-9]{64}$/i.test(rawToken)
    ? rawToken.toLowerCase()
    : null;

  const queryClient = useQueryClient();
  const [showRating, setShowRating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [signerName, setSignerName] = useState("");
  const honeypotRef = useRef<HTMLInputElement>(null);

  // Estado da assinatura em canvas
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const {
    data: proposal,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public-proposal", token],
    queryFn: () => proposalsService.getPublic(token!),
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const signMutation = useMutation({
    mutationFn: (data: SignForm & { signatureDataUrl: string }) =>
      proposalsService.signContract(token!, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["public-proposal", token] });
      setSignerName(variables.signerName);
      toast.success("Contrato assinado com sucesso!");
      setTimeout(() => setShowRating(true), 600);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao assinar contrato.");
    },
  });

  const buildFeedbackUrl = (status: "success" | "failure" | "pending") => {
    const params = new URLSearchParams({ status });
    const resolvedContractId = Number(
      proposal?.contractId ?? proposal?.proposalId ?? proposal?.id,
    );

    if (Number.isFinite(resolvedContractId) && resolvedContractId > 0) {
      params.set("contractId", String(resolvedContractId));
    }

    if (token && /^[a-f0-9]{64}$/i.test(token)) {
      params.set("token", token.toLowerCase());
    }

    const freelancerNameSafe = safe(proposal?.freelancerName ?? "", 60).trim();
    if (freelancerNameSafe) {
      params.set("freelancer", freelancerNameSafe);
    }

    const signerNameSafe = signerName.trim();
    if (signerNameSafe) {
      params.set("signer", signerNameSafe);
    }

    return `${window.location.origin}/p/feedback?${params.toString()}`;
  };

  const checkoutMutation = useMutation({
    mutationFn: () =>
      proposalsService.checkout(token!, {
        successUrl: buildFeedbackUrl("success"),
        failureUrl: buildFeedbackUrl("failure"),
        pendingUrl: buildFeedbackUrl("pending"),
      }),
    onSuccess: (data) => {
      const safeUrl = getSafeRedirectUrl(data.checkoutUrl);
      if (!safeUrl) {
        toast.error("Link de pagamento inválido.");
        return;
      }
      window.location.href = safeUrl;
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao iniciar pagamento.");
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignForm>({
    resolver: zodResolver(signSchema),
  });

  // Submit com validações de segurança completas
  const onSubmit = (data: SignForm) => {
    if (isHoneypotTripped(honeypotRef)) {
      toast.error("Não foi possível concluir a solicitação.");
      return;
    }

    if (!signatureDataUrl) {
      toast.error("Desenhe sua assinatura antes de continuar.");
      return;
    }

    // Rate limiting
    if (!rateLimiter.check(`sign-contract:${token ?? "public"}`, 6, 5 * 60 * 1000)) {
      toast.error("Muitas tentativas em sequência. Aguarde um pouco.");
      return;
    }

    try {
      const signerNameSafe = validateSignerName(data.signerName);
      const signerDocumentSafe = normalizeSignerDocument(data.signerDocument);
      const signatureDataUrlSafe = validateSignatureDataUrl(signatureDataUrl);

      signMutation.mutate({
        ...data,
        signerName: signerNameSafe,
        signerDocument: signerDocumentSafe,
        signatureDataUrl: signatureDataUrlSafe,
      });
    } catch (err: any) {
      toast.error(err?.message ?? "Dados inválidos. Verifique e tente novamente.");
    }
  };

  useEffect(() => {
    return () => {
      setSignatureDataUrl(null);
      setSignerName("");
      setShowPreview(false);
      setShowRating(false);
      if (token) {
        queryClient.removeQueries({ queryKey: ["public-proposal", token], exact: true });
      }
    };
  }, [queryClient, token]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#080808",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
        >
          <Loader2 size={22} color={ORANGE} />
        </motion.div>
        <span
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.3)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Carregando contrato…
        </span>
      </div>
    );
  }

  // ── Erro ──
  if (error || !proposal) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#080808",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <Shield
            size={44}
            color="rgba(239,68,68,0.4)"
            style={{ margin: "0 auto 20px", display: "block" }}
          />
          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: "#fff",
              margin: "0 0 8px",
              letterSpacing: "-0.03em",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Contrato não encontrado
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.35)",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Este link pode ter expirado ou ser inválido. Entre em contato com
            o freelancer que enviou a proposta.
          </p>
        </div>
      </div>
    );
  }

  const previewData: ReviewData = {
    id: Number(proposal.id) || 0,
    title: proposal.title ?? "",
    clientName: proposal.clientName ?? proposal.signerName ?? "",
    contractType: proposal.contractType ?? "",
    executionDate: proposal.executionDate ?? "",
    value: (() => {
      const raw = proposal.amount ?? proposal.value ?? 0;
      const n = Number(raw);
      return isNaN(n) ? 0 : n;
    })(),
    paymentForm: proposal.paymentForm ?? "",
    scope: proposal.description ?? "",
    status: proposal.status ?? "",
    isSigned: proposal.isSigned ?? false,
    isPaid: proposal.isPaid ?? false,
    freelancerName: proposal.freelancerName ?? "",
    planId: (proposal.planId as "free" | "pro" | "premium") ?? "free",
    layoutConfig: proposal.layoutConfig ?? null,
    logoUrl: proposal.logoUrl ?? null,
    clauses: proposal.clauses ?? [],
    clientSignatureUrl: proposal.clientSignatureUrl ?? null,
    providerSignatureUrl: proposal.providerSignatureUrl ?? null,
  };

  const previewDocumentUrl = proposal.previewDocumentUrl?.trim() || null;
  const officialPreviewHtml = proposal.previewHtml?.trim() || "";
  const hasOfficialPreview = Boolean(previewDocumentUrl || officialPreviewHtml);
  const previewHtml = hasOfficialPreview ? officialPreviewHtml : buildContractHtml(previewData);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#fff",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Grain */}
      <div
        style={{
          position: "fixed",
          inset: "-200%",
          width: "400%",
          height: "400%",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.02,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Glow */}
      <div
        style={{
          position: "fixed",
          top: -100,
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${ORANGE}10 0%, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Header */}
      <header
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
          zIndex: 1,
          backdropFilter: "blur(16px)",
        }}
      >
        <div
          style={{
            maxWidth: 700,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 900,
              letterSpacing: "-0.01em",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            FECHOU<span style={{ color: ORANGE }}>!</span>
          </span>
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.3em",
              color: "rgba(255,255,255,0.25)",
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Contrato público
          </span>
        </div>
      </header>

      <main
        style={{
          padding: "clamp(24px,5vw,48px) 24px 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: 700,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* ── Card de detalhes ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <div style={card}>
              <div
                style={{
                  height: 2,
                  background: `linear-gradient(to right, ${ORANGE}80, transparent)`,
                }}
              />
              <div
                style={{
                  padding: "28px 28px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h1
                      style={{
                        fontSize: "clamp(20px,4vw,28px)",
                        fontWeight: 900,
                        letterSpacing: "-0.04em",
                        margin: "0 0 6px",
                      }}
                    >
                      {safe(proposal.title, 80)}
                    </h1>
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.35)",
                        margin: 0,
                      }}
                    >
                      Proposta de{" "}
                      <strong style={{ color: "rgba(255,255,255,0.6)" }}>
                        {safe(proposal.freelancerName, 60)}
                      </strong>
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      padding: "5px 12px",
                      borderRadius: 999,
                      background: proposal.isSigned
                        ? "rgba(34,197,94,0.1)"
                        : "rgba(245,158,11,0.1)",
                      border: `1px solid ${proposal.isSigned
                          ? "rgba(34,197,94,0.3)"
                          : "rgba(245,158,11,0.3)"
                        }`,
                      color: proposal.isSigned ? "#22c55e" : "#f59e0b",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {proposal.isSigned
                      ? proposal.isPaid
                        ? "Pago"
                        : "Assinado"
                      : "Aguardando assinatura"}
                  </span>
                </div>
              </div>

              <div style={{ padding: "24px 28px" }}>
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.24em",
                    color: "rgba(255,255,255,0.22)",
                    margin: "0 0 8px",
                  }}
                >
                  Descrição do projeto
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.5)",
                    lineHeight: 1.75,
                    margin: "0 0 24px",
                  }}
                >
                  {safe(proposal.description, 1000)}
                </p>

                <div
                  style={{
                    paddingTop: 20,
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.24em",
                        color: "rgba(255,255,255,0.22)",
                        margin: "0 0 4px",
                      }}
                    >
                      Valor do investimento
                    </p>
                    <p
                      style={{
                        fontSize: "clamp(28px,5vw,40px)",
                        fontWeight: 900,
                        letterSpacing: "-0.05em",
                        color: ORANGE,
                        margin: 0,
                        lineHeight: 1,
                      }}
                    >
                      {formatCurrency(previewData.value)}
                    </p>
                  </div>

                  {/* Botão Ver Contrato */}
                  <motion.button
                    onClick={() => setShowPreview(true)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "11px 20px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      letterSpacing: "0.04em",
                      transition: "background 0.2s, border-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.09)";
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.05)";
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.12)";
                    }}
                  >
                    <ScrollText size={14} color={ORANGE} />
                    Ver Contrato Completo
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Assinar OU pós-assinatura ── */}
          <AnimatePresence mode="wait">
            {!proposal.isSigned ? (
              <motion.div
                key="sign"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div style={card}>
                  {/* Cabeçalho do card de assinatura */}
                  <div
                    style={{
                      padding: "22px 28px",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: `${ORANGE}15`,
                        border: `1px solid ${ORANGE}25`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FileSignature size={16} color={ORANGE} />
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: "#fff",
                          margin: 0,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        Assinar Contrato
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.28)",
                          margin: 0,
                        }}
                      >
                        Preencha seus dados e desenhe sua assinatura
                      </p>
                    </div>
                  </div>

                  <div style={{ padding: "24px 28px" }}>
                    {/* Aviso para ler antes de assinar */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 14px",
                        borderRadius: 9,
                        background: `${ORANGE}0A`,
                        border: `1px solid ${ORANGE}25`,
                        marginBottom: 20,
                      }}
                    >
                      <Eye size={12} color={ORANGE} style={{ flexShrink: 0 }} />
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.45)",
                          margin: 0,
                        }}
                      >
                        Recomendamos{" "}
                        <button
                          onClick={() => setShowPreview(true)}
                          style={{
                            background: "none",
                            border: "none",
                            color: ORANGE,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            padding: 0,
                            fontFamily: "inherit",
                          }}
                        >
                          ler o contrato completo
                        </button>{" "}
                        antes de assinar.
                      </p>
                    </div>

                    <form
                      onSubmit={handleSubmit(onSubmit)}
                      style={{ display: "flex", flexDirection: "column", gap: 18, position: "relative" }}
                    >
                      <HoneypotField inputRef={honeypotRef} />
                      {/* Campos de identificação */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 14,
                        }}
                        className="sign-grid"
                      >
                        <div>
                          <label
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.22em",
                              color: "rgba(255,255,255,0.25)",
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              marginBottom: 6,
                            }}
                          >
                            <User size={10} /> Nome completo
                          </label>
                          <input
                            {...register("signerName")}
                            placeholder="Seu nome completo"
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: 9,
                              padding: "10px 13px",
                              color: "#fff",
                              fontSize: 13,
                              fontFamily: "inherit",
                              outline: "none",
                            }}
                          />
                          {errors.signerName && (
                            <p
                              style={{
                                fontSize: 11,
                                color: "#f87171",
                                margin: "5px 0 0",
                              }}
                            >
                              {errors.signerName.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.22em",
                              color: "rgba(255,255,255,0.25)",
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              marginBottom: 6,
                            }}
                          >
                            <Hash size={10} /> CPF ou CNPJ
                          </label>
                          <input
                            {...register("signerDocument")}
                            placeholder="000.000.000-00"
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: 9,
                              padding: "10px 13px",
                              color: "#fff",
                              fontSize: 13,
                              fontFamily: "inherit",
                              outline: "none",
                            }}
                          />
                          {errors.signerDocument && (
                            <p
                              style={{
                                fontSize: 11,
                                color: "#f87171",
                                margin: "5px 0 0",
                              }}
                            >
                              {errors.signerDocument.message}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* ── Canvas de assinatura ── */}
                      <div>
                        <label
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.22em",
                            color: "rgba(255,255,255,0.25)",
                            display: "block",
                            marginBottom: 8,
                          }}
                        >
                          <Pen
                            size={10}
                            style={{
                              display: "inline",
                              marginRight: 5,
                              verticalAlign: "middle",
                            }}
                          />
                          Assinatura *
                        </label>

                        <SignatureCanvas
                          onSave={(url) => setSignatureDataUrl(url)}
                          onClear={() => setSignatureDataUrl(null)}
                          disabled={signMutation.isPending}
                        />

                        {/* Preview da assinatura capturada */}
                        <AnimatePresence>
                          {signatureDataUrl && (
                            <motion.div
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              style={{
                                marginTop: 10,
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: "1px solid rgba(34,197,94,0.2)",
                                background: "rgba(34,197,94,0.04)",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <CheckCircle2
                                size={12}
                                style={{ color: "#22c55e", flexShrink: 0 }}
                              />
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "#22c55e",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.14em",
                                }}
                              >
                                Assinatura capturada
                              </span>
                              <img
                                src={signatureDataUrl}
                                alt="Pré-visualização da assinatura"
                                style={{
                                  maxHeight: 32,
                                  objectFit: "contain",
                                  marginLeft: "auto",
                                  opacity: 0.85,
                                }}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Checkbox de aceite */}
                      <div>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            fontSize: 11,
                            color: "rgba(255,255,255,0.55)",
                            lineHeight: 1.5,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            {...register("acceptTerms")}
                            style={{ marginTop: 2, accentColor: ORANGE }}
                          />
                          <span>
                            Li e aceito os termos deste contrato e concordo com
                            a assinatura digital.
                          </span>
                        </label>
                        {errors.acceptTerms && (
                          <p
                            style={{
                              fontSize: 11,
                              color: "#f87171",
                              margin: "6px 0 0",
                            }}
                          >
                            {errors.acceptTerms.message}
                          </p>
                        )}
                      </div>

                      {/* Botão de submit */}
                      <motion.button
                        type="submit"
                        disabled={signMutation.isPending}
                        whileHover={!signMutation.isPending ? { scale: 1.01 } : {}}
                        whileTap={!signMutation.isPending ? { scale: 0.98 } : {}}
                        style={{
                          width: "100%",
                          padding: "14px",
                          borderRadius: 12,
                          background: signMutation.isPending
                            ? `${ORANGE}60`
                            : ORANGE,
                          border: "none",
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: signMutation.isPending
                            ? "not-allowed"
                            : "pointer",
                          fontFamily: "inherit",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 9,
                          boxShadow: signMutation.isPending
                            ? "none"
                            : `0 0 32px ${ORANGE}40`,
                          transition: "background 0.2s, box-shadow 0.2s",
                        }}
                      >
                        {signMutation.isPending ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                repeat: Infinity,
                                duration: 1,
                                ease: "linear",
                              }}
                            >
                              <Loader2 size={15} />
                            </motion.div>
                            Assinando…
                          </>
                        ) : (
                          <>
                            <FileSignature size={15} />
                            Assinar Digitalmente
                          </>
                        )}
                      </motion.button>
                    </form>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* ── Pós-assinatura ── */
              <motion.div
                key="signed"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div
                  style={{
                    padding: "28px",
                    borderRadius: 20,
                    border: "1px solid rgba(34,197,94,0.28)",
                    background: "rgba(34,197,94,0.06)",
                    textAlign: "center",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.2,
                      type: "spring",
                      stiffness: 200,
                      damping: 16,
                    }}
                  >
                    <CheckCircle
                      size={44}
                      color="#22c55e"
                      style={{ margin: "0 auto 14px", display: "block" }}
                    />
                  </motion.div>
                  <h3
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      color: "#22c55e",
                      margin: "0 0 4px",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    Contrato Assinado!
                  </h3>
                  <p
                    style={{
                      fontSize: 12,
                      color: "rgba(34,197,94,0.6)",
                      margin: 0,
                    }}
                  >
                    O contrato foi validado digitalmente com sucesso.
                  </p>
                  {!showRating && signerName && (
                    <motion.button
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      onClick={() => setShowRating(true)}
                      style={{
                        marginTop: 20,
                        padding: "9px 20px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.6)",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        letterSpacing: "0.06em",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      <Star size={12} color="#f59e0b" fill="#f59e0b" />
                      Avaliar {safe(proposal.freelancerName, 24)}
                    </motion.button>
                  )}
                </div>

                {!proposal.isPaid ? (
                  <div style={card}>
                    <div style={{ padding: "28px", textAlign: "center" }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          background: `${ORANGE}15`,
                          border: `1px solid ${ORANGE}25`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 16px",
                        }}
                      >
                        <CreditCard size={20} color={ORANGE} />
                      </div>
                      <h3
                        style={{
                          fontSize: 20,
                          fontWeight: 900,
                          color: "#fff",
                          margin: "0 0 6px",
                          letterSpacing: "-0.03em",
                        }}
                      >
                        Realizar Pagamento
                      </h3>
                      <p
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,0.35)",
                          margin: "0 0 24px",
                          lineHeight: 1.6,
                        }}
                      >
                        Clique abaixo para prosseguir com o pagamento via
                        Mercado Pago.
                      </p>
                      <motion.button
                        onClick={() => checkoutMutation.mutate()}
                        disabled={checkoutMutation.isPending}
                        whileHover={
                          !checkoutMutation.isPending ? { scale: 1.03 } : {}
                        }
                        whileTap={
                          !checkoutMutation.isPending ? { scale: 0.97 } : {}
                        }
                        style={{
                          padding: "14px 40px",
                          borderRadius: 999,
                          background: checkoutMutation.isPending
                            ? `${ORANGE}50`
                            : ORANGE,
                          border: "none",
                          color: "#fff",
                          fontSize: 15,
                          fontWeight: 800,
                          cursor: checkoutMutation.isPending
                            ? "not-allowed"
                            : "pointer",
                          fontFamily: "inherit",
                          letterSpacing: "0.04em",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 10,
                          boxShadow: checkoutMutation.isPending
                            ? "none"
                            : `0 0 40px ${ORANGE}40`,
                          transition: "all 0.2s",
                        }}
                      >
                        {checkoutMutation.isPending ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                repeat: Infinity,
                                duration: 1,
                                ease: "linear",
                              }}
                            >
                              <Loader2 size={16} />
                            </motion.div>
                            Processando…
                          </>
                        ) : (
                          <>
                            <CreditCard size={16} /> Ir para Pagamento{" "}
                            <ArrowRight size={14} />
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "20px 24px",
                      borderRadius: 16,
                      border: `1px solid ${ORANGE}30`,
                      background: `${ORANGE}08`,
                      textAlign: "center",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 13,
                        color: ORANGE,
                        fontWeight: 700,
                        margin: 0,
                      }}
                    >
                      ✓ Este contrato já foi pago. Obrigado!
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <p
            style={{
              textAlign: "center",
              fontSize: 9,
              color: "rgba(255,255,255,0.15)",
              paddingTop: 16,
              letterSpacing: "0.04em",
            }}
          >
            Contrato gerado eletronicamente via Fechou! — Plataforma de Gestão
            para Freelancers
          </p>
        </div>
      </main>

      {/* Modal de preview */}
      <ContractPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        htmlContent={previewHtml}
        documentUrl={previewDocumentUrl}
      />

      <RatingModal
        open={showRating}
        onClose={() => setShowRating(false)}
        contractId={Number(proposal.contractId ?? proposal.proposalId ?? proposal.id) || 0}
        freelancerName={safe(proposal.freelancerName, 60)}
        signerName={signerName || "Cliente"}
        publicToken={token ?? undefined}
      />

      <style>{`
        @media (max-width: 520px) {
          .sign-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
