/**
 * PublicContract.tsx — Contrato público com avaliação pós-assinatura
 *
 * Fluxo:
 *  1. Cliente abre o link → vê detalhes do contrato
 *  2. Assina com nome + documento → contrato marcado como assinado
 *  3. Modal de avaliação abre automaticamente → cliente avalia o freelancer
 *  4. Avaliação enviada → aparece no perfil público do freelancer
 *  5. Se houver pagamento → botão de checkout aparece
 */

import { useState } from "react";
import { useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proposalsService } from "../../services/proposals";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getSafeRedirectUrl } from "../../lib/security";
import {
  CheckCircle, FileSignature, CreditCard, Loader2,
  Shield, User, Hash, Star, ArrowRight,
} from "lucide-react";
import { RatingModal } from "./RatingModal";

// ─── Schema de assinatura ─────────────────────────────────────────────────────

const signSchema = z.object({
  signerName:     z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  signerDocument: z.string().min(11, "Documento inválido").max(18, "Documento inválido"),
});
type SignForm = z.infer<typeof signSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function safe(v: unknown, max = 200) {
  return String(v ?? "").replace(/<[^>]*>/g, "").replace(/javascript:/gi, "").trim().slice(0, max);
}

// ─── Mini star display ────────────────────────────────────────────────────────

function Stars({ n, size = 12 }: { n: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={size}
          fill={s <= n ? "#f59e0b" : "none"}
          stroke={s <= n ? "#f59e0b" : "rgba(255,255,255,0.15)"} strokeWidth={1.5} />
      ))}
    </span>
  );
}

// ─── Constantes de estilo inline ─────────────────────────────────────────────

const ORANGE = "#FF6600";

const card: React.CSSProperties = {
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.02)",
  backdropFilter: "blur(16px)",
  overflow: "hidden",
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PublicContract() {
  const [, params] = useRoute("/p/contract/:token");
  const token = params?.token;
  const queryClient = useQueryClient();

  // Controle do modal de avaliação
  const [showRating, setShowRating]   = useState(false);
  const [signerName, setSignerName]   = useState("");

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
      // Abre modal de avaliação após 600ms (tempo do toast aparecer)
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
      if (!safeUrl) {
        toast.error("Link de pagamento inválido.");
        return;
      }
      window.location.href = safeUrl;
    },
    onError: (err: Error) => { toast.error(err.message || "Erro ao iniciar pagamento."); },
  });

  const { register, handleSubmit, formState: { errors } } = useForm<SignForm>({
    resolver: zodResolver(signSchema),
  });

  // ── Estados de carregamento / erro ────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}>
          <Loader2 size={22} color={ORANGE} />
        </motion.div>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>
          Carregando contrato…
        </span>
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

      {/* Grain sutil */}
      <div style={{ position: "fixed", inset: "-200%", width: "400%", height: "400%", backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, opacity: 0.02, pointerEvents: "none", zIndex: 0 }} />
      {/* Glow laranja */}
      <div style={{ position: "fixed", top: -100, left: "50%", transform: "translateX(-50%)", width: 600, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${ORANGE}10 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />

      {/* Header */}
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

          {/* ── Detalhes do contrato ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.16,1,0.3,1] }}>
            <div style={card}>
              {/* Barra topo */}
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
                  <span style={{
                    fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em",
                    padding: "5px 12px", borderRadius: 999,
                    background: proposal.isSigned
                      ? (proposal.isPaid ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.1)")
                      : "rgba(245,158,11,0.1)",
                    border: `1px solid ${proposal.isSigned ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
                    color: proposal.isSigned ? "#22c55e" : "#f59e0b",
                    whiteSpace: "nowrap",
                  }}>
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

          {/* ── Assinar OU estado pós-assinatura ── */}
          <AnimatePresence mode="wait">
            {!proposal.isSigned ? (

              /* ── Formulário de assinatura ── */
              <motion.div key="sign"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ delay: 0.12, duration: 0.5, ease: [0.16,1,0.3,1] }}>
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
                    <form onSubmit={handleSubmit(data => signMutation.mutate(data))}
                      style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="sign-grid">
                        {/* Nome */}
                        <div>
                          <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                            <User size={10} /> Nome completo
                          </label>
                          <input {...register("signerName")}
                            placeholder="Seu nome completo"
                            style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "10px 13px", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                          {errors.signerName && (
                            <p style={{ fontSize: 11, color: "#f87171", margin: "5px 0 0" }}>{errors.signerName.message}</p>
                          )}
                        </div>
                        {/* Documento */}
                        <div>
                          <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                            <Hash size={10} /> CPF ou CNPJ
                          </label>
                          <input {...register("signerDocument")}
                            placeholder="000.000.000-00"
                            style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "10px 13px", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                          {errors.signerDocument && (
                            <p style={{ fontSize: 11, color: "#f87171", margin: "5px 0 0" }}>{errors.signerDocument.message}</p>
                          )}
                        </div>
                      </div>

                      <motion.button type="submit"
                        disabled={signMutation.isPending}
                        whileHover={!signMutation.isPending ? { scale: 1.01 } : {}}
                        whileTap={!signMutation.isPending ? { scale: 0.98 } : {}}
                        style={{ width: "100%", padding: "14px", borderRadius: 12, background: signMutation.isPending ? `${ORANGE}60` : ORANGE, border: "none", color: "#fff", fontSize: 13, fontWeight: 800, cursor: signMutation.isPending ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, boxShadow: signMutation.isPending ? "none" : `0 0 32px ${ORANGE}40`, transition: "background 0.2s, box-shadow 0.2s" }}>
                        {signMutation.isPending
                          ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={15} /></motion.div> Assinando…</>
                          : <><FileSignature size={15} /> Assinar Digitalmente</>
                        }
                      </motion.button>
                    </form>
                  </div>
                </div>
              </motion.div>

            ) : (

              /* ── Pós-assinatura ── */
              <motion.div key="signed"
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.5, ease: [0.16,1,0.3,1] }}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Confirmação de assinatura */}
                <div style={{ padding: "28px", borderRadius: 20, border: "1px solid rgba(34,197,94,0.28)", background: "rgba(34,197,94,0.06)", textAlign: "center", backdropFilter: "blur(12px)" }}>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 16 }}>
                    <CheckCircle size={44} color="#22c55e" style={{ margin: "0 auto 14px", display: "block" }} />
                  </motion.div>
                  <h3 style={{ fontSize: 22, fontWeight: 900, color: "#22c55e", margin: "0 0 4px", letterSpacing: "-0.03em" }}>
                    Contrato Assinado!
                  </h3>
                  <p style={{ fontSize: 12, color: "rgba(34,197,94,0.6)", margin: 0 }}>
                    O contrato foi validado digitalmente com sucesso.
                  </p>

                  {/* CTA para avaliar (se ainda não abriu o modal) */}
                  {!showRating && signerName && (
                    <motion.button
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                      onClick={() => setShowRating(true)}
                      style={{ marginTop: 20, padding: "9px 20px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 7 }}>
                      <Star size={12} color="#f59e0b" fill="#f59e0b" />
                      Avaliar {safe(proposal.freelancerName, 24)}
                    </motion.button>
                  )}
                </div>

                {/* Pagamento */}
                {!proposal.isPaid ? (
                  <div style={card}>
                    <div style={{ padding: "28px", textAlign: "center" }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: `${ORANGE}15`, border: `1px solid ${ORANGE}25`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <CreditCard size={20} color={ORANGE} />
                      </div>
                      <h3 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.03em" }}>
                        Realizar Pagamento
                      </h3>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "0 0 24px", lineHeight: 1.6 }}>
                        Clique abaixo para prosseguir com o pagamento via Mercado Pago.
                      </p>
                      <motion.button
                        onClick={() => checkoutMutation.mutate()}
                        disabled={checkoutMutation.isPending}
                        whileHover={!checkoutMutation.isPending ? { scale: 1.03 } : {}}
                        whileTap={!checkoutMutation.isPending ? { scale: 0.97 } : {}}
                        style={{ padding: "14px 40px", borderRadius: 999, background: checkoutMutation.isPending ? `${ORANGE}50` : ORANGE, border: "none", color: "#fff", fontSize: 15, fontWeight: 800, cursor: checkoutMutation.isPending ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 10, boxShadow: checkoutMutation.isPending ? "none" : `0 0 40px ${ORANGE}40`, transition: "all 0.2s" }}>
                        {checkoutMutation.isPending
                          ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={16} /></motion.div> Processando…</>
                          : <><CreditCard size={16} /> Ir para Pagamento <ArrowRight size={14} /></>
                        }
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "20px 24px", borderRadius: 16, border: `1px solid ${ORANGE}30`, background: `${ORANGE}08`, textAlign: "center", backdropFilter: "blur(8px)" }}>
                    <p style={{ fontSize: 13, color: ORANGE, fontWeight: 700, margin: 0 }}>
                      ✓ Este contrato já foi pago. Obrigado!
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <p style={{ textAlign: "center", fontSize: 9, color: "rgba(255,255,255,0.15)", paddingTop: 16, letterSpacing: "0.04em" }}>
            Contrato gerado eletronicamente via Fechou! — Plataforma de Gestão para Freelancers
          </p>
        </div>
      </main>

      {/* ── Modal de avaliação ── */}
      <RatingModal
        open={showRating}
        onClose={() => setShowRating(false)}
        contractId={proposal.id}
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
