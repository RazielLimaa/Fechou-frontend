/**
 * PaymentFeedback.tsx — Tela de feedback de pagamento com avaliação
 *
 * Além do status de pagamento, exibe o modal de avaliação quando:
 *  - status = "success" (pagamento confirmado)
 *  - contractId e userId estão presentes na URL
 *
 * URL esperada:
 *   /p/feedback?status=success&contractId=42&userId=7&freelancer=Jo%C3%A3o&signer=Maria
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, ArrowLeft, Star } from "lucide-react";
import { RatingModal } from "./RatingModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getParams() {
  const p = new URLSearchParams(window.location.search);
  const status = p.get("status");
  return {
    status: (status === "success" || status === "failure" || status === "pending")
      ? status as "success" | "failure" | "pending"
      : "pending" as const,
    contractId:    Number(p.get("contractId")) || 0,
    userId:        Number(p.get("userId"))     || 0,
    freelancerName: decodeURIComponent(p.get("freelancer") ?? ""),
    signerName:     decodeURIComponent(p.get("signer")     ?? "Cliente"),
  };
}

// ─── Config por status ────────────────────────────────────────────────────────

const ORANGE = "#FF6600";

const CONFIG = {
  success: {
    Icon: CheckCircle, iconColor: "#22c55e",
    title: "Pagamento Confirmado!",
    message: "Sua transação foi processada com sucesso. O freelancer foi notificado e em breve dará continuidade ao projeto.",
    tagText: "Transação aprovada",
    borderColor: "rgba(34,197,94,0.25)", tagBg: "rgba(34,197,94,0.08)", tagColor: "#22c55e",
  },
  failure: {
    Icon: XCircle, iconColor: "#ef4444",
    title: "Pagamento não realizado",
    message: "Não foi possível processar seu pagamento. Verifique os dados e tente novamente, ou entre em contato com o freelancer.",
    tagText: "Tente novamente ou use outro método",
    borderColor: "rgba(239,68,68,0.25)", tagBg: "rgba(239,68,68,0.07)", tagColor: "#f87171",
  },
  pending: {
    Icon: Clock, iconColor: "#f59e0b",
    title: "Pagamento em processamento",
    message: "Seu pagamento está sendo analisado. Você e o freelancer serão notificados assim que for confirmado.",
    tagText: "Aguardando confirmação da operadora",
    borderColor: "rgba(245,158,11,0.25)", tagBg: "rgba(245,158,11,0.07)", tagColor: "#fbbf24",
  },
} as const;

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PaymentFeedback() {
  const { status, contractId, userId, freelancerName, signerName } = getParams();
  const cfg = CONFIG[status];
  const { Icon } = cfg;

  // Abre o modal de avaliação automaticamente após pagamento confirmado (1.2s)
  const canRate = status === "success" && contractId > 0 && userId > 0;
  const [showRating, setShowRating] = useState(false);

  useEffect(() => {
    if (canRate) {
      const t = setTimeout(() => setShowRating(true), 1200);
      return () => clearTimeout(t);
    }
  }, [canRate]);

  return (
    <div style={{
      minHeight: "100vh", background: "#080808", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", fontFamily: "'DM Sans', sans-serif",
      position: "relative", overflow: "hidden",
    }}>

      {/* Grain */}
      <div style={{ position: "fixed", inset: "-200%", width: "400%", height: "400%", backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, opacity: 0.02, pointerEvents: "none", zIndex: 0 }} />

      {/* Glow colorido conforme status */}
      <div style={{ position: "fixed", top: -80, left: "50%", transform: "translateX(-50%)", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${cfg.iconColor}12 0%, transparent 65%)`, pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440 }}>

        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.01em" }}>
            FECHOU<span style={{ color: ORANGE }}>!</span>
          </span>
        </motion.div>

        {/* Card principal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{
            borderRadius: 22,
            border: `1px solid ${cfg.borderColor}`,
            background: "rgba(255,255,255,0.02)",
            backdropFilter: "blur(20px)",
            overflow: "hidden",
          }}>

          {/* Linha topo colorida */}
          <div style={{ height: 2, background: `linear-gradient(to right, ${cfg.iconColor}80, transparent)` }} />

          <div style={{ padding: "40px 36px", textAlign: "center" }}>

            {/* Ícone */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 200, damping: 14 }}
              style={{ marginBottom: 24 }}>
              <Icon size={56} color={cfg.iconColor} style={{ margin: "0 auto", display: "block" }} />
            </motion.div>

            {/* Título */}
            <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              style={{ fontSize: "clamp(20px,4vw,26px)", fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 12px" }}>
              {cfg.title}
            </motion.h1>

            {/* Mensagem */}
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42 }}
              style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.75, margin: "0 0 24px" }}>
              {cfg.message}
            </motion.p>

            {/* Tag de status */}
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              style={{ padding: "11px 16px", borderRadius: 12, background: cfg.tagBg, border: `1px solid ${cfg.borderColor}`, marginBottom: 28 }}>
              <p style={{ fontSize: 12, color: cfg.tagColor, fontWeight: 700, margin: 0, letterSpacing: "0.02em" }}>
                {cfg.tagText}
              </p>
            </motion.div>

            {/* CTA para avaliar (só quando sucesso e dados disponíveis) */}
            {canRate && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                style={{ marginBottom: 20 }}>
                <button onClick={() => setShowRating(true)}
                  style={{ padding: "11px 22px", borderRadius: 12, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 7, width: "100%", justifyContent: "center" }}>
                  <Star size={13} color="#f59e0b" fill="#f59e0b" />
                  Avaliar {freelancerName || "o freelancer"}
                </button>
              </motion.div>
            )}

            {/* Voltar */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>
              <Link href="/">
                <button style={{ padding: "11px 22px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 7, width: "100%", justifyContent: "center" }}>
                  <ArrowLeft size={13} /> Voltar para o site
                </button>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Rodapé */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          style={{ textAlign: "center", fontSize: 9, color: "rgba(255,255,255,0.15)", marginTop: 24, letterSpacing: "0.04em" }}>
          Fechou! — Plataforma de Gestão para Freelancers
        </motion.p>
      </div>

      {/* Modal de avaliação */}
      {canRate && (
        <RatingModal
          open={showRating}
          onClose={() => setShowRating(false)}
          contractId={contractId}
          userId={userId}
          freelancerName={freelancerName || "o freelancer"}
          signerName={signerName}
        />
      )}
    </div>
  );
}
