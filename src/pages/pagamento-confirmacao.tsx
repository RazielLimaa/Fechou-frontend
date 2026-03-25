/**
 * pagamento-confirmacao.tsx
 * Página de retorno após o usuário assinar no Mercado Pago.
 *
 * Rota: /pagamento/confirmacao
 * MP redireciona para cá com ?preapproval_id=XXX ou ?status=approved/pending/failure
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  CheckCircle2, Clock, XCircle, Loader2, ArrowRight,
} from "lucide-react";
import Navbar from "../components/landing/Navbar";
import { confirmSubscription } from "../service/payment";

type Phase = "loading" | "success" | "pending" | "error";

/** Sanitiza parâmetros da URL — nunca confia em query string */
function getUrlParams(): { preapprovalId: string | null; status: string | null } {
  try {
    const p = new URLSearchParams(window.location.search);
    const rawId = p.get("preapproval_id") ?? p.get("id") ?? null;
    const rawStatus = p.get("status") ?? null;

    const preapprovalId = rawId
      ? rawId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120) || null
      : null;

    const status = rawStatus
      ? rawStatus.replace(/[^a-zA-Z_]/g, "").slice(0, 40) || null
      : null;

    return { preapprovalId, status };
  } catch {
    return { preapprovalId: null, status: null };
  }
}

const CONTENT: Record<Phase, {
  icon:     React.ReactNode;
  iconBg:   string;
  title:    string;
  subtitle: string;
  color:    string;
}> = {
  loading: {
    icon:     <Loader2 size={40} style={{ color: "#ff6600", animation: "spin 1s linear infinite" }} />,
    iconBg:   "rgba(255,102,0,0.1)",
    title:    "Confirmando assinatura...",
    subtitle: "Aguarde enquanto verificamos seu pagamento.",
    color:    "#ff6600",
  },
  success: {
    icon:     <CheckCircle2 size={40} style={{ color: "#22c55e" }} />,
    iconBg:   "rgba(34,197,94,0.1)",
    title:    "Assinatura ativada!",
    subtitle: "Seu plano já está ativo. Todos os recursos foram liberados.",
    color:    "#22c55e",
  },
  pending: {
    icon:     <Clock size={40} style={{ color: "#f59e0b" }} />,
    iconBg:   "rgba(245,158,11,0.1)",
    title:    "Pagamento em análise",
    subtitle: "Seu pagamento está sendo processado. Assim que confirmado, seu plano será ativado automaticamente.",
    color:    "#f59e0b",
  },
  error: {
    icon:     <XCircle size={40} style={{ color: "#f87171" }} />,
    iconBg:   "rgba(248,113,113,0.1)",
    title:    "Erro na assinatura",
    subtitle: "Não foi possível confirmar seu pagamento. Tente novamente ou entre em contato com o suporte.",
    color:    "#f87171",
  },
};

export default function PagamentoConfirmacao() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("loading");
  const [planId, setPlanId] = useState<string | null>(null);

  useEffect(() => {
    const { preapprovalId, status } = getUrlParams();

    // Se o MP mandou status diretamente (sem preapproval_id)
    if (!preapprovalId) {
      if (status === "approved") { setPhase("success"); return; }
      if (status === "pending")  { setPhase("pending"); return; }
      if (status === "failure")  { setPhase("error");   return; }
      // Sem parâmetros — chegou direto na página
      setPhase("error");
      return;
    }

    // Confirma via API
    confirmSubscription(preapprovalId)
      .then((res) => {
        if (res.ok && res.status === "authorized") {
          setPlanId(res.planId);
          setPhase("success");
        } else if (res.status === "pending") {
          setPhase("pending");
        } else {
          setPhase("error");
        }
      })
      .catch(() => setPhase("error"));
  }, []);

  const content = CONTENT[phase];

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fff",
      fontFamily: "'DM Sans','Inter',sans-serif" }}>

      {/* Fundo */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 600,
          background: `radial-gradient(circle, ${content.color}10 0%, transparent 70%)`,
          borderRadius: "50%", transition: "background 0.5s" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />

        <main style={{ maxWidth: 520, margin: "0 auto",
          padding: "clamp(80px,15vw,140px) clamp(16px,4vw,32px) 80px",
          display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>

          <motion.div
            key={phase}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1,   y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>

            {/* Ícone */}
            <div style={{ width: 80, height: 80, borderRadius: 24,
              background: content.iconBg, border: `1px solid ${content.color}25`,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              {content.icon}
            </div>

            {/* Texto */}
            <div>
              <h1 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 900,
                letterSpacing: "-0.03em", color: "#fff", marginBottom: 10 }}>
                {content.title}
              </h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 380, margin: "0 auto" }}>
                {content.subtitle}
              </p>
            </div>

            {/* Info do plano */}
            {phase === "success" && planId && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                style={{ padding: "12px 20px", borderRadius: 12,
                  background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.18)",
                  fontSize: 13, color: "#22c55e", fontWeight: 600 }}>
                Plano {planId.charAt(0).toUpperCase() + planId.slice(1)} ativo ✓
              </motion.div>
            )}

            {/* Ações */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300 }}>
              {phase === "success" && (
                <motion.button onClick={() => navigate("/propostas")}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "13px 0", borderRadius: 14, background: "#ff6600", border: "none",
                    color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Ir para o painel <ArrowRight size={14} />
                </motion.button>
              )}

              {phase === "pending" && (
                <motion.button onClick={() => navigate("/propostas")}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "13px 0", borderRadius: 14, background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)",
                    fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Ir para o painel
                </motion.button>
              )}

              {phase === "error" && (
                <>
                  <motion.button onClick={() => navigate(-1)}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      padding: "13px 0", borderRadius: 14, background: "#ff6600", border: "none",
                      color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Tentar novamente
                  </motion.button>
                  <button onClick={() => navigate("/system")}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)",
                      fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    Ver outros planos
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </main>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
