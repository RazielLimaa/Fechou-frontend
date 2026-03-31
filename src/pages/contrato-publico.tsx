/**
 * PublicContract.tsx — Contrato público com avaliação pós-assinatura
 *                      + modo de revisão somente leitura (/p/review/:token)
 *
 * Fluxos:
 *  A) /p/contract/:token  → assinar, pagar, avaliar  (comportamento original)
 *  B) /p/review/:token    → preview somente leitura do contrato completo
 *                           usa o shareToken gerado por POST /api/contracts/:id/share-link
 *
 * NOTA: A detecção de rota usa useLocation() diretamente para não depender
 * de como o App.tsx registra as rotas. Basta que o App.tsx monte este
 * componente para /p/review/:token (ou /p/*).
 */

import { useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proposalsService } from "../services/proposals";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getSafeRedirectUrl } from "../lib/security";
import {
  CheckCircle, FileSignature, CreditCard, Loader2,
  Shield, User, Hash, Star, ArrowRight, Eye, Lock,
  FileText, Clock, CheckCircle2,
} from "lucide-react";
import { RatingModal } from "./public/RatingModal";
import {
  CONTRACT_TYPE_LABELS,
  PAYMENT_FORM_LABELS,
  type ContractType,
  type PaymentForm,
} from "../service/contracts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getContractTypeLabel = (v: string) =>
  CONTRACT_TYPE_LABELS[v as ContractType] ?? v;

const getPaymentFormLabel = (v: string) =>
  PAYMENT_FORM_LABELS[v as PaymentForm] ?? v;

const signSchema = z.object({
  signerName:     z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  signerDocument: z.string().min(11, "Documento inválido").max(18, "Documento inválido"),
});
type SignForm = z.infer<typeof signSchema>;

const formatCurrency = (v: number | string) => {
  const n = typeof v === "string" ? parseFloat(v.replace(/[^\d.-]/g, "")) : v;
  return isNaN(n)
    ? String(v)
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
};

function safe(v: unknown, max = 200) {
  return String(v ?? "").replace(/<[^>]*>/g, "").replace(/javascript:/gi, "").trim().slice(0, max);
}

const fmtDate = (d: string) =>
  d
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(
        new Date(d)
      )
    : d;

function Stars({ n, size = 12 }: { n: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s} size={size}
          fill={s <= n ? "#f59e0b" : "none"}
          stroke={s <= n ? "#f59e0b" : "rgba(255,255,255,0.15)"}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

// ─── Constantes de estilo ─────────────────────────────────────────────────────

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

function buildReviewHtml(data: ReviewData): string {
  const isPro     = hasPlan(data.planId, "pro");

  const layout = {
    primaryColor:       ORANGE,
    fontFamily:         "inter",
    logoUrl:            null as string | null,
    showFechouBranding: true,
    customTextBlocks:   [] as { title: string; content: string }[],
    ...(data.layoutConfig ?? {}),
    logoUrl2:           data.logoUrl ?? data.layoutConfig?.logoUrl ?? null,
  };

  const color = isPro ? layout.primaryColor : ORANGE;
  const fontMap: Record<string, string> = {
    inter:    "'Inter', sans-serif",
    georgia:  "Georgia, serif",
    roboto:   "'Roboto', sans-serif",
    playfair: "'Playfair Display', serif",
  };
  const font = isPro ? (fontMap[layout.fontFamily] ?? fontMap.inter) : fontMap.inter;
  const effectiveLogoUrl: string | null = layout.logoUrl2 ?? null;

  const contractNumber = isPro && !layout.showFechouBranding
    ? `CTR-${String(data.id).padStart(6, "0")}`
    : `FECH-${String(data.id).padStart(6, "0")}`;

  const today = fmtDate(new Date().toISOString());

  const watermarkRows = Array.from({ length: 40 }).map((_, i) => {
    const row = Math.floor(i / 5);
    const col = i % 5;
    return `<span style="position:absolute;top:${row * 22 - 10}%;left:${col * 22 - 5}%;transform:rotate(-35deg);font-size:28px;font-weight:900;color:rgba(255,102,0,0.07);letter-spacing:0.08em;white-space:nowrap;user-select:none;">FECHOU!</span>`;
  }).join("");
  const watermark = !isPro
    ? `<div style="position:fixed;inset:0;z-index:10;pointer-events:none;overflow:hidden;">${watermarkRows}</div>`
    : "";

  const logoHtml = isPro && effectiveLogoUrl
    ? `<img src="${effectiveLogoUrl}" style="height:36px;object-fit:contain;margin-bottom:6px;" />`
    : isPro && !layout.showFechouBranding
      ? ``
      : `<div style="font-size:28px;font-weight:900;letter-spacing:-0.02em;color:#111;">FECHOU<span style="color:${color}">!</span></div>
         <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.25em;color:#888;margin-top:2px;">Plataforma de Contratos</div>`;

  const brandingLine = isPro && !layout.showFechouBranding
    ? ``
    : `<div style="font-size:10px;color:#ccc;text-transform:uppercase;letter-spacing:0.2em;">FECHOU! — fechou.app</div>`;

  const clausesHtml = data.clauses.length > 0 ? `
    <div style="margin-bottom:32px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.3em;color:${color};font-weight:800;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid ${color}33;">
        Cláusulas Contratuais
        <span style="margin-left:8px;background:#f0f0f0;color:#888;font-size:9px;font-weight:700;padding:1px 6px;border-radius:10px;">${data.clauses.length}</span>
      </div>
      ${data.clauses.map((c, i) => `
        <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #f0f0f0;">
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px;">
            <span style="background:#111;color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:3px;flex-shrink:0;">${i + 1}</span>
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#111;">${c.title}</span>
          </div>
          <p style="font-size:12px;line-height:1.8;color:#444;text-align:justify;margin:0;padding-left:20px;">
            ${(c.customContent || c.content)
              .replace(/\{\{cliente\}\}/g,        data.clientName)
              .replace(/\{\{valor\}\}/g,           formatCurrency(data.value))
              .replace(/\{\{data_execucao\}\}/g,   fmtDate(data.executionDate))
              .replace(/\{\{forma_pagamento\}\}/g, getPaymentFormLabel(data.paymentForm))
              .replace(/\{\{escopo\}\}/g,          data.scope)}
          </p>
        </div>`).join("")}
    </div>` : "";

  const customBlocksHtml = isPro && layout.customTextBlocks?.length > 0
    ? layout.customTextBlocks.map((b: any) => `
        <div style="margin-bottom:32px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.3em;color:${color};font-weight:800;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid ${color}33;">${b.title}</div>
          <p style="font-size:12px;line-height:1.8;color:#444;">${b.content}</p>
        </div>`).join("")
    : "";

  const clientSig   = data.clientSignatureUrl;
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
            : `<div style="height:48px;border-bottom:1.5px dashed #d1d5db;margin-bottom:10px;display:flex;align-items:center;justify-content:center;"><span style="font-size:9px;color:#d1d5db;letter-spacing:0.18em;text-transform:uppercase;">Aguardando assinatura</span></div>`}
          <div style="font-size:12px;font-weight:700;color:#111;">Prestador de Serviços</div>
          <div style="font-size:10px;color:#999;margin-top:2px;">Contratado</div>
        </div>
        <div style="text-align:center;">
          ${clientSig
            ? `<div style="height:64px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:4px;"><img src="${clientSig}" style="max-height:56px;max-width:100%;object-fit:contain;" /></div><div style="border-bottom:1.5px solid #333;margin-bottom:10px;"></div><div style="display:inline-flex;align-items:center;gap:4px;font-size:9px;color:#16a34a;font-weight:700;letter-spacing:0.08em;margin-bottom:6px;"><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="6" fill="#16a34a"/><path d="M3.5 6.5l2 2 3-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Assinado digitalmente</div>`
            : `<div style="height:48px;display:flex;align-items:center;justify-content:center;border-bottom:1.5px dashed #d1d5db;margin-bottom:10px;"><span style="font-size:9px;color:#d1d5db;letter-spacing:0.18em;text-transform:uppercase;">Aguardando assinatura</span></div>`}
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

// ═════════════════════════════════════════════════════════════════════════════
// MODO REVISÃO
// ═════════════════════════════════════════════════════════════════════════════

function ReviewMode({ token }: { token: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data, isLoading, error } = useQuery<ReviewData>({
    queryKey: ["contract-review", token],
    queryFn: async () => {
      const res = await fetch(`/api/contracts/review/${token}`, {
        credentials: "omit",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Contrato não encontrado");
      }
      return res.json();
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "'DM Sans', sans-serif" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}>
          <Loader2 size={22} color={ORANGE} />
        </motion.div>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Carregando revisão…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <Shield size={44} color="rgba(239,68,68,0.4)" style={{ margin: "0 auto 20px", display: "block" }} />
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: "0 0 8px", letterSpacing: "-0.03em" }}>
            Revisão não encontrada
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, margin: 0 }}>
            Este link pode ter expirado ou ser inválido. Peça ao freelancer um novo link de revisão.
          </p>
        </div>
      </div>
    );
  }

  const previewHtml = buildReviewHtml(data);

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ position: "fixed", inset: "-200%", width: "400%", height: "400%", backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, opacity: 0.02, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", top: -100, left: "50%", transform: "translateX(-50%)", width: 600, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${ORANGE}10 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />

      <header style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative", zIndex: 1, backdropFilter: "blur(16px)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.01em" }}>
            FECHOU<span style={{ color: ORANGE }}>!</span>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Eye size={9} color="rgba(255,255,255,0.35)" />
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.25em", color: "rgba(255,255,255,0.35)" }}>
                Somente leitura
              </span>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", padding: "4px 10px", borderRadius: 999, background: data.isSigned ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", border: `1px solid ${data.isSigned ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`, color: data.isSigned ? "#22c55e" : "#f59e0b" }}>
              {data.isPaid ? "Pago" : data.isSigned ? "Assinado" : "Em revisão"}
            </span>
          </div>
        </div>
      </header>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} style={{ position: "relative", zIndex: 1, padding: "20px 24px 0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", backdropFilter: "blur(16px)", padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${ORANGE}15`, border: `1px solid ${ORANGE}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileText size={15} color={ORANGE} />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>
                  {safe(data.title || getContractTypeLabel(data.contractType), 80)}
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", margin: 0 }}>
                  Proposta de <strong style={{ color: "rgba(255,255,255,0.5)" }}>{safe(data.freelancerName, 50)}</strong>
                  {" · "}
                  <span style={{ color: ORANGE, fontWeight: 700 }}>{formatCurrency(data.value)}</span>
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { label: "Freelancer", signed: !!data.providerSignatureUrl },
                { label: "Cliente",    signed: !!data.clientSignatureUrl },
              ].map(({ label, signed }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, fontSize: 10, background: signed ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${signed ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.07)"}`, color: signed ? "#86efac" : "rgba(255,255,255,0.25)" }}>
                  {signed ? <CheckCircle2 size={9} /> : <Clock size={9} />}
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <main style={{ padding: "20px 24px 60px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }} style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 8 }}>
            <Lock size={11} color="rgba(255,255,255,0.25)" />
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>
              Visualização de revisão — <strong style={{ color: "rgba(255,255,255,0.45)" }}>somente leitura</strong>. Nenhuma alteração pode ser feita aqui.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", background: "#fff", position: "relative" }}>
            <div style={{ height: 3, background: `linear-gradient(to right, ${ORANGE}80, transparent)` }} />
            <div style={{ width: "100%", aspectRatio: "800 / 1122", minHeight: 500, position: "relative" }}>
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                title="Revisão do Contrato"
                sandbox="allow-same-origin"
                style={{ width: "100%", height: "100%", border: "none", display: "block", pointerEvents: "none" }}
              />
              <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "transparent", cursor: "default" }} />
            </div>
          </motion.div>

          <p style={{ textAlign: "center", fontSize: 9, color: "rgba(255,255,255,0.12)", paddingTop: 24, letterSpacing: "0.04em" }}>
            Revisão gerada eletronicamente via Fechou! — Plataforma de Gestão para Freelancers
          </p>
        </div>
      </main>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// Usa useLocation() para detectar o modo sem depender do router pai.
// ═════════════════════════════════════════════════════════════════════════════

export default function PublicContract() {
  const [location] = useLocation();

  // ── Detecta modo revisão diretamente pela URL ─────────────────────────────
  // Funciona mesmo se o App.tsx montar este componente via rota curinga /p/*
  if (location.startsWith("/p/review/")) {
    const token = location.slice("/p/review/".length).split("?")[0].trim();
    if (token) return <ReviewMode token={token} />;
  }

  // ── Modo assinatura (comportamento original) ──────────────────────────────
  const [, contractParams] = useRoute("/p/contract/:token");
  const token = contractParams?.token ?? (
    location.startsWith("/p/contract/")
      ? location.slice("/p/contract/".length).split("?")[0].trim()
      : null
  );

  const queryClient = useQueryClient();
  const [showRating, setShowRating] = useState(false);
  const [signerName, setSignerName] = useState("");

  const { data: proposal, isLoading, error } = useQuery({
    queryKey: ["public-proposal", token],
    queryFn: () => proposalsService.getPublic(token!),
    enabled: !!token,
  });

  const signMutation = useMutation({
    mutationFn: (data: SignForm) => proposalsService.signContract(token!, data),
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

  const checkoutMutation = useMutation({
    mutationFn: () =>
      proposalsService.checkout(token!, {
        successUrl: `${window.location.origin}/p/feedback?status=success`,
        failureUrl:  `${window.location.origin}/p/feedback?status=failure`,
        pendingUrl:  `${window.location.origin}/p/feedback?status=pending`,
      }),
    onSuccess: (data) => {
      const safeUrl = getSafeRedirectUrl(data.checkoutUrl);
      if (!safeUrl) { toast.error("Link de pagamento inválido."); return; }
      window.location.href = safeUrl;
    },
    onError: (err: Error) => { toast.error(err.message || "Erro ao iniciar pagamento."); },
  });

  const { register, handleSubmit, formState: { errors } } = useForm<SignForm>({
    resolver: zodResolver(signSchema),
  });

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}>
          <Loader2 size={22} color={ORANGE} />
        </motion.div>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>Carregando contrato…</span>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <Shield size={44} color="rgba(239,68,68,0.4)" style={{ margin: "0 auto 20px", display: "block" }} />
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: "0 0 8px", letterSpacing: "-0.03em", fontFamily: "'DM Sans', sans-serif" }}>
            Contrato não encontrado
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, margin: 0 }}>
            Este link pode ter expirado ou ser inválido. Entre em contato com o freelancer que enviou a proposta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ position: "fixed", inset: "-200%", width: "400%", height: "400%", backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, opacity: 0.02, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", top: -100, left: "50%", transform: "translateX(-50%)", width: 600, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${ORANGE}10 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />

      <header style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative", zIndex: 1, backdropFilter: "blur(16px)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.01em", fontFamily: "'DM Sans', sans-serif" }}>
            FECHOU<span style={{ color: ORANGE }}>!</span>
          </span>
          <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", color: "rgba(255,255,255,0.25)", padding: "4px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)" }}>
            Contrato público
          </span>
        </div>
      </header>

      <main style={{ padding: "clamp(24px,5vw,48px) 24px 80px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.16,1,0.3,1] }}>
            <div style={card}>
              <div style={{ height: 2, background: `linear-gradient(to right, ${ORANGE}80, transparent)` }} />
              <div style={{ padding: "28px 28px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <h1 style={{ fontSize: "clamp(20px,4vw,28px)", fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 6px" }}>
                      {safe(proposal.title, 80)}
                    </h1>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
                      Proposta de <strong style={{ color: "rgba(255,255,255,0.6)" }}>{safe(proposal.freelancerName, 60)}</strong>
                    </p>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", padding: "5px 12px", borderRadius: 999, background: proposal.isSigned ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", border: `1px solid ${proposal.isSigned ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`, color: proposal.isSigned ? "#22c55e" : "#f59e0b", whiteSpace: "nowrap" }}>
                    {proposal.isSigned ? (proposal.isPaid ? "Pago" : "Assinado") : "Aguardando assinatura"}
                  </span>
                </div>
              </div>
              <div style={{ padding: "24px 28px" }}>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.24em", color: "rgba(255,255,255,0.22)", margin: "0 0 8px" }}>
                  Descrição do projeto
                </p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, margin: "0 0 24px" }}>
                  {safe(proposal.description, 1000)}
                </p>
                <div style={{ paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.24em", color: "rgba(255,255,255,0.22)", margin: "0 0 4px" }}>
                      Valor do investimento
                    </p>
                    <p style={{ fontSize: "clamp(28px,5vw,40px)", fontWeight: 900, letterSpacing: "-0.05em", color: ORANGE, margin: 0, lineHeight: 1 }}>
                      {formatCurrency(proposal.amount)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {!proposal.isSigned ? (
              <motion.div key="sign" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.12, duration: 0.5, ease: [0.16,1,0.3,1] }}>
                <div style={card}>
                  <div style={{ padding: "22px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${ORANGE}15`, border: `1px solid ${ORANGE}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FileSignature size={16} color={ORANGE} />
                    </div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>Assinar Contrato</p>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", margin: 0 }}>Preencha seus dados para validar digitalmente</p>
                    </div>
                  </div>
                  <div style={{ padding: "24px 28px" }}>
                    <form onSubmit={handleSubmit(data => signMutation.mutate(data))} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="sign-grid">
                        <div>
                          <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                            <User size={10} /> Nome completo
                          </label>
                          <input {...register("signerName")} placeholder="Seu nome completo" style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "10px 13px", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                          {errors.signerName && <p style={{ fontSize: 11, color: "#f87171", margin: "5px 0 0" }}>{errors.signerName.message}</p>}
                        </div>
                        <div>
                          <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                            <Hash size={10} /> CPF ou CNPJ
                          </label>
                          <input {...register("signerDocument")} placeholder="000.000.000-00" style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "10px 13px", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                          {errors.signerDocument && <p style={{ fontSize: 11, color: "#f87171", margin: "5px 0 0" }}>{errors.signerDocument.message}</p>}
                        </div>
                      </div>
                      <motion.button type="submit" disabled={signMutation.isPending} whileHover={!signMutation.isPending ? { scale: 1.01 } : {}} whileTap={!signMutation.isPending ? { scale: 0.98 } : {}} style={{ width: "100%", padding: "14px", borderRadius: 12, background: signMutation.isPending ? `${ORANGE}60` : ORANGE, border: "none", color: "#fff", fontSize: 13, fontWeight: 800, cursor: signMutation.isPending ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, boxShadow: signMutation.isPending ? "none" : `0 0 32px ${ORANGE}40`, transition: "background 0.2s, box-shadow 0.2s" }}>
                        {signMutation.isPending
                          ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={15} /></motion.div> Assinando…</>
                          : <><FileSignature size={15} /> Assinar Digitalmente</>}
                      </motion.button>
                    </form>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="signed" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.5, ease: [0.16,1,0.3,1] }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ padding: "28px", borderRadius: 20, border: "1px solid rgba(34,197,94,0.28)", background: "rgba(34,197,94,0.06)", textAlign: "center", backdropFilter: "blur(12px)" }}>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 16 }}>
                    <CheckCircle size={44} color="#22c55e" style={{ margin: "0 auto 14px", display: "block" }} />
                  </motion.div>
                  <h3 style={{ fontSize: 22, fontWeight: 900, color: "#22c55e", margin: "0 0 4px", letterSpacing: "-0.03em" }}>Contrato Assinado!</h3>
                  <p style={{ fontSize: 12, color: "rgba(34,197,94,0.6)", margin: 0 }}>O contrato foi validado digitalmente com sucesso.</p>
                  {!showRating && signerName && (
                    <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} onClick={() => setShowRating(true)} style={{ marginTop: 20, padding: "9px 20px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 7 }}>
                      <Star size={12} color="#f59e0b" fill="#f59e0b" /> Avaliar {safe(proposal.freelancerName, 24)}
                    </motion.button>
                  )}
                </div>
                {!proposal.isPaid ? (
                  <div style={card}>
                    <div style={{ padding: "28px", textAlign: "center" }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: `${ORANGE}15`, border: `1px solid ${ORANGE}25`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <CreditCard size={20} color={ORANGE} />
                      </div>
                      <h3 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.03em" }}>Realizar Pagamento</h3>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "0 0 24px", lineHeight: 1.6 }}>Clique abaixo para prosseguir com o pagamento via Mercado Pago.</p>
                      <motion.button onClick={() => checkoutMutation.mutate()} disabled={checkoutMutation.isPending} whileHover={!checkoutMutation.isPending ? { scale: 1.03 } : {}} whileTap={!checkoutMutation.isPending ? { scale: 0.97 } : {}} style={{ padding: "14px 40px", borderRadius: 999, background: checkoutMutation.isPending ? `${ORANGE}50` : ORANGE, border: "none", color: "#fff", fontSize: 15, fontWeight: 800, cursor: checkoutMutation.isPending ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 10, boxShadow: checkoutMutation.isPending ? "none" : `0 0 40px ${ORANGE}40`, transition: "all 0.2s" }}>
                        {checkoutMutation.isPending
                          ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={16} /></motion.div> Processando…</>
                          : <><CreditCard size={16} /> Ir para Pagamento <ArrowRight size={14} /></>}
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "20px 24px", borderRadius: 16, border: `1px solid ${ORANGE}30`, background: `${ORANGE}08`, textAlign: "center", backdropFilter: "blur(8px)" }}>
                    <p style={{ fontSize: 13, color: ORANGE, fontWeight: 700, margin: 0 }}>✓ Este contrato já foi pago. Obrigado!</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <p style={{ textAlign: "center", fontSize: 9, color: "rgba(255,255,255,0.15)", paddingTop: 16, letterSpacing: "0.04em" }}>
            Contrato gerado eletronicamente via Fechou! — Plataforma de Gestão para Freelancers
          </p>
        </div>
      </main>

      <RatingModal
        open={showRating}
        onClose={() => setShowRating(false)}
        contractId={Number(proposal.id) || 0}
        userId={proposal.userId}
        freelancerName={safe(proposal.freelancerName, 60)}
        signerName={signerName || "Cliente"}
      />

      <style>{`
        @media (max-width: 520px) {
          .sign-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}