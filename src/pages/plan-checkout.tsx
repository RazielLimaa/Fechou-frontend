/**
 * plan-checkout.tsx
 * Página de checkout de plano — Mercado Pago Preapproval
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { authStorage } from "../lib/auth-storage";
import {
  ShieldCheck, Lock, ArrowLeft, Crown, Briefcase,
  CheckCircle2, AlertCircle, Loader2, ExternalLink,
  RefreshCw,
} from "lucide-react";
import Navbar from "../components/landing/Navbar";
import { createSubscriptionCheckout, confirmSubscription } from "../service/payment";
import { getSafeRedirectUrl } from "../lib/security";

// ─── Dados dos planos ─────────────────────────────────────────────────────────

const PLAN_MAP = {
  pro: {
    name:    "Pro",
    price:   29,
    icon:    Briefcase,
    color:   "#3b82f6",
    features: [
      "Propostas ilimitadas",
      "Sua marca no PDF",
      "Histórico completo",
      "Remoção parcial da marca",
      "Suporte padrão",
    ],
  },
  premium: {
    name:    "Premium",
    price:   59,
    icon:    Crown,
    color:   "#f59e0b",
    features: [
      "Tudo do Pro",
      "Pagamentos via PIX/cartão",
      "Links de pagamento",
      "Status automático",
      "Remoção total da marca",
      "Suporte prioritário",
    ],
  },
} as const;

type PlanKey = keyof typeof PLAN_MAP;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isLoggedIn(): boolean {
  try {
    const token = authStorage.getAccessToken();
    if (!token || token.trim().length === 0) return false;
    // Valida formato básico de JWT sem expor conteúdo
    const parts = token.split(".");
    return parts.length === 3;
  } catch {
    return false;
  }
}

function getPreapprovalIdFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("preapproval_id") ?? params.get("id");
    if (!id || id.trim().length < 4) return null;
    // Sanitiza — só alfanumérico e hífens
    return id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120) || null;
  } catch {
    return null;
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PlanCheckout() {
  const [, navigate]  = useLocation();
  const [match, params] = useRoute("/checkout/plano/:planId");

  const [phase, setPhase]   = useState<"idle" | "loading" | "confirming" | "success" | "error">("idle");
  const [errorMsg, setError] = useState<string | null>(null);

  const planIdRaw = (params?.planId ?? "").toLowerCase().trim();
  const planId    = (planIdRaw === "pro" || planIdRaw === "premium") ? planIdRaw as PlanKey : null;
  const plan      = planId ? PLAN_MAP[planId] : null;

  // Guard de autenticação
  useEffect(() => {
    if (!isLoggedIn()) {
      localStorage.setItem("after_login_redirect", window.location.pathname);
      navigate("/login");
    }
  }, [navigate]);

  // Confirma assinatura se voltou do MP com preapproval_id
  useEffect(() => {
    const preapprovalId = getPreapprovalIdFromUrl();
    if (!preapprovalId) return;

    setPhase("confirming");
    confirmSubscription(preapprovalId)
      .then((res) => {
        if (res.ok) setPhase("success");
        else throw new Error("Assinatura não confirmada.");
      })
      .catch((err) => {
        setError(err?.message ?? "Erro ao confirmar assinatura.");
        setPhase("error");
      });
  }, []);

  const handleCheckout = async () => {
  if (!planId || !plan) return;
  setPhase("loading");
  setError(null);

  try {
    const { checkoutUrl } = await createSubscriptionCheckout(planId, {});
    const safeUrl = getSafeRedirectUrl(checkoutUrl);
    if (!safeUrl) throw new Error("URL de checkout inválida.");
    window.location.href = safeUrl;
  } catch (err: any) {
    setError(err?.message ?? "Não foi possível iniciar o pagamento.");
    setPhase("error");
  }
};

  // ── Estados especiais ──────────────────────────────────────────────────────

  if (phase === "confirming") return <LoadingScreen message="Confirmando sua assinatura..." />;

  if (phase === "success") return (
    <FullScreenMessage
      icon={<CheckCircle2 size={52} style={{ color: "#22c55e" }} />}
      title="Assinatura ativada!"
      subtitle="Seu plano já está ativo. Aproveite todos os recursos do Fechou!"
      action={{ label: "Ir para o painel", onClick: () => navigate("/propostas") }}
    />
  );

  if (!match || !planId || !plan) return (
    <FullScreenMessage
      icon={<AlertCircle size={52} style={{ color: "#f87171" }} />}
      title="Plano não encontrado"
      subtitle={`"${params?.planId ?? ""}" não é um plano válido.`}
      action={{ label: "Ver planos", onClick: () => navigate("/system") }}
    />
  );

  const PlanIcon = plan.icon;

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fff", fontFamily: "'DM Sans','Inter',sans-serif" }}>

      {/* Spotlight de fundo */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 600, height: 600,
          background: `radial-gradient(circle, ${plan.color}18 0%, transparent 70%)`, borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: "-20%", left: "-10%", width: 500, height: 500,
          background: "radial-gradient(circle, rgba(255,102,0,0.07) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />

        <main style={{ maxWidth: 960, margin: "0 auto", padding: "clamp(32px,6vw,80px) clamp(16px,4vw,32px) 80px" }}>

          {/* Voltar */}
          <motion.button
            onClick={() => window.history.back()}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            whileHover={{ x: -3 }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none",
              color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginBottom: 48 }}>
            <ArrowLeft size={14} /> Voltar
          </motion.button>

          {/* Título */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.28em",
              color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Finalizar assinatura</p>
            <h1 style={{ fontSize: "clamp(28px,5vw,52px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, margin: 0 }}>
              Plano{" "}
              <span style={{ color: plan.color }}>{plan.name}</span>
            </h1>
          </motion.div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>

            {/* ── Card resumo ── */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div style={{ borderRadius: 24, border: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.02)", overflow: "hidden" }}>

                {/* Faixa colorida */}
                <div style={{ height: 3, background: `linear-gradient(90deg, ${plan.color}, ${plan.color}40)` }} />

                <div style={{ padding: "28px 28px 24px" }}>
                  {/* Ícone + nome */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, display: "flex", alignItems: "center",
                      justifyContent: "center", background: `${plan.color}18`, border: `1px solid ${plan.color}30` }}>
                      <PlanIcon size={22} style={{ color: plan.color }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>Plano {plan.name}</p>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>Renovação automática mensal</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                    {plan.features.map((f) => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <CheckCircle2 size={14} style={{ color: plan.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* Preço */}
                  <div style={{ padding: "16px 18px", borderRadius: 14,
                    background: `${plan.color}0d`, border: `1px solid ${plan.color}22`,
                    display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Total hoje</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", color: plan.color }}>
                        R$ {plan.price}
                      </span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>/mês</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Card pagamento ── */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div style={{ borderRadius: 24, border: `1px solid ${plan.color}25`,
                background: `${plan.color}06`, overflow: "hidden", height: "100%",
                display: "flex", flexDirection: "column" }}>

                <div style={{ height: 3, background: `linear-gradient(90deg, ${plan.color}, ${plan.color}40)` }} />

                <div style={{ padding: "28px 28px 24px", flex: 1, display: "flex", flexDirection: "column" }}>

                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em",
                    color: "rgba(255,255,255,0.3)", marginBottom: 20 }}>Pagamento seguro</p>

                  {/* Badges de segurança */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                    {[
                      { icon: <ShieldCheck size={11} />, label: "Mercado Pago" },
                      { icon: <Lock size={11} />,        label: "SSL / TLS" },
                      { icon: <CheckCircle2 size={11} />, label: "Cancele quando quiser" },
                    ].map(({ icon, label }) => (
                      <div key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "5px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.07)",
                        background: "rgba(255,255,255,0.03)", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                        {icon} {label}
                      </div>
                    ))}
                  </div>

                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, marginBottom: 32, fontWeight: 300 }}>
                    Você será redirecionado para o <strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Mercado Pago</strong> para
                    finalizar sua assinatura com segurança. Aceita cartão de crédito e PIX.
                  </p>

                  {/* Erro */}
                  <AnimatePresence>
                    {phase === "error" && errorMsg && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12,
                          border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", marginBottom: 20 }}>
                        <AlertCircle size={13} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 12, color: "#f87171", margin: 0, lineHeight: 1.5 }}>{errorMsg}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Botão */}
                  <motion.button
                    onClick={handleCheckout}
                    disabled={phase === "loading"}
                    whileHover={phase !== "loading" ? { scale: 1.02 } : {}}
                    whileTap={phase !== "loading" ? { scale: 0.98 } : {}}
                    style={{ width: "100%", padding: "16px 0", borderRadius: 14, border: "none",
                      fontSize: 15, fontWeight: 800, cursor: phase === "loading" ? "not-allowed" : "pointer",
                      fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      transition: "all 0.2s", marginTop: "auto",
                      background: phase === "loading" ? "rgba(255,255,255,0.06)" : plan.color,
                      color: phase === "loading" ? "rgba(255,255,255,0.3)" : "#fff" }}>
                    {phase === "loading"
                      ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Redirecionando...</>
                      : <><ExternalLink size={14} /> Pagar R$ {plan.price},00 no Mercado Pago</>}
                  </motion.button>

                  <p style={{ fontSize: 10, textAlign: "center", color: "rgba(255,255,255,0.18)",
                    marginTop: 14, lineHeight: 1.6 }}>
                    Ao continuar você concorda com a renovação automática mensal.
                    Cancele a qualquer momento pelo painel.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Botão tentar novamente */}
          <AnimatePresence>
            {phase === "error" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ textAlign: "center", marginTop: 24 }}>
                <button onClick={() => { setPhase("idle"); setError(null); }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none",
                    color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  <RefreshCw size={12} /> Tentar novamente
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          h1 { font-size: 32px !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function LoadingScreen({ message }: { message: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#09090b", display: "flex", alignItems: "center",
      justifyContent: "center", flexDirection: "column", gap: 20, fontFamily: "'DM Sans',sans-serif" }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
        <Loader2 size={32} style={{ color: "#ff6600" }} />
      </motion.div>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>{message}</p>
    </div>
  );
}

function FullScreenMessage({ icon, title, subtitle, action }: {
  icon:     React.ReactNode;
  title:    string;
  subtitle: string;
  action:   { label: string; onClick: () => void };
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#09090b", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "0 24px", fontFamily: "'DM Sans',sans-serif" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ marginBottom: 24 }}>{icon}</div>
        <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", color: "#fff", marginBottom: 10 }}>{title}</h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 32, lineHeight: 1.6 }}>{subtitle}</p>
        <motion.button onClick={action.onClick} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={{ padding: "13px 32px", borderRadius: 999, background: "#ff6600", border: "none",
            color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {action.label}
        </motion.button>
      </motion.div>
    </div>
  );
}
