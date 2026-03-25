/**
 * RatingModal.tsx
 *
 * Modal de avaliação do freelancer — aparece após assinar ou pagar.
 * Usa estrelas interativas com hover, campo de comentário opcional
 * e integração direta com /api/ratings.
 *
 * Uso:
 *   <RatingModal
 *     open={showRating}
 *     onClose={() => setShowRating(false)}
 *     contractId={proposal.id}
 *     userId={proposal.userId}          // ID do freelancer
 *     freelancerName={proposal.freelancerName}
 *     signerName={signerName}           // nome do cliente que assinou
 *   />
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, Send, CheckCircle, Loader2 } from "lucide-react";
import { api } from "../../services/api";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  contractId: number;
  userId: number;
  freelancerName: string;
  signerName: string;
}

// ─── Labels de estrela ────────────────────────────────────────────────────────

const STAR_LABELS: Record<number, string> = {
  1: "Ruim",
  2: "Regular",
  3: "Bom",
  4: "Ótimo",
  5: "Excelente!",
};

// ─── API call ─────────────────────────────────────────────────────────────────

async function submitRating(payload: {
  contractId: number;
  userId: number;
  raterName: string;
  stars: number;
  comment?: string;
}) {
  const { data } = await api.post("/api/ratings", payload);
  return data as { ok: boolean; ratingId: number };
}

async function checkRated(contractId: number) {
  const { data } = await api.get(`/api/ratings/contract/${contractId}`);
  return data as { rated: boolean };
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function RatingModal({
  open,
  onClose,
  contractId,
  userId,
  freelancerName,
  signerName,
}: RatingModalProps) {
  const [hovered, setHovered]   = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const displayStars = hovered || selected;

  const handleSubmit = async () => {
    if (selected === 0) return;
    setLoading(true);
    setError(null);
    try {
      await submitRating({
        contractId,
        userId,
        raterName: signerName,
        stars: selected,
        comment: comment.trim() || undefined,
      });
      setDone(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Erro ao enviar avaliação.";
      // Avaliação duplicada — trata como sucesso silencioso
      if (err?.response?.status === 409) { setDone(true); return; }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state on close
    setTimeout(() => {
      setHovered(0); setSelected(0); setComment("");
      setDone(false); setError(null);
    }, 300);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={handleClose}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
            background: "rgba(0,0,0,0.82)",
            backdropFilter: "blur(10px)",
          }}>

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 28 }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 440,
              borderRadius: 20,
              border: "1px solid rgba(255,102,0,0.22)",
              background: "#0d0d0d",
              boxShadow: "0 0 80px rgba(255,102,0,0.1), 0 32px 64px rgba(0,0,0,0.9)",
              overflow: "hidden",
              fontFamily: "'DM Sans', sans-serif",
            }}>

            {/* Linha laranja topo */}
            <div style={{ height: 2, background: "linear-gradient(to right, #FF6600, #ff880050, transparent)" }} />

            {/* Header */}
            <div style={{ padding: "22px 24px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", color: "#FF6600", margin: "0 0 4px" }}>
                  ● Avaliação
                </p>
                <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>
                  Como foi trabalhar com<br />
                  <span style={{ color: "#FF6600" }}>{freelancerName}</span>?
                </p>
              </div>
              <button onClick={handleClose}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 4, display: "flex", borderRadius: 8, marginTop: 2 }}>
                <X size={16} />
              </button>
            </div>

            {/* Conteúdo */}
            <div style={{ padding: "24px" }}>
              <AnimatePresence mode="wait">
                {done ? (
                  /* ── Estado de sucesso ── */
                  <motion.div key="done"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ ease: [0.16,1,0.3,1], duration: 0.4 }}
                    style={{ textAlign: "center", padding: "12px 0 20px" }}>
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 220, damping: 16 }}>
                      <CheckCircle size={52} color="#22c55e" style={{ margin: "0 auto 16px", display: "block" }} />
                    </motion.div>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
                      Avaliação enviada!
                    </p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "0 0 24px", lineHeight: 1.6 }}>
                      Obrigado pelo feedback.<br />
                      Sua avaliação ficará visível no perfil público de {freelancerName}.
                    </p>
                    <button onClick={handleClose}
                      style={{ padding: "10px 28px", borderRadius: 10, background: "#FF6600", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>
                      Fechar
                    </button>
                  </motion.div>

                ) : (
                  /* ── Formulário de avaliação ── */
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

                    {/* Estrelas */}
                    <div style={{ marginBottom: 20, textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                        {[1,2,3,4,5].map(n => (
                          <motion.button key={n}
                            onClick={() => setSelected(n)}
                            onMouseEnter={() => setHovered(n)}
                            onMouseLeave={() => setHovered(0)}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 3, display: "flex" }}>
                            <motion.div
                              animate={{ scale: n <= displayStars ? 1.08 : 1 }}
                              transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                              <Star
                                size={36}
                                fill={n <= displayStars ? "#f59e0b" : "none"}
                                stroke={n <= displayStars ? "#f59e0b" : "rgba(255,255,255,0.18)"}
                                strokeWidth={1.5}
                              />
                            </motion.div>
                          </motion.button>
                        ))}
                      </div>

                      <AnimatePresence mode="wait">
                        {displayStars > 0 && (
                          <motion.p key={displayStars}
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", margin: 0, letterSpacing: "0.04em" }}>
                            {STAR_LABELS[displayStars]}
                          </motion.p>
                        )}
                        {displayStars === 0 && (
                          <motion.p key="hint"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", margin: 0 }}>
                            Toque em uma estrela para avaliar
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Comentário (opcional) */}
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "rgba(255,255,255,0.22)", margin: "0 0 6px" }}>
                        Comentário (opcional)
                      </p>
                      <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="Conte como foi a experiência com este freelancer…"
                        style={{
                          width: "100%", boxSizing: "border-box",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 10, padding: "10px 13px",
                          color: "#fff", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                          outline: "none", resize: "vertical",
                          transition: "border-color 0.18s",
                        }}
                        onFocus={e => (e.target.style.borderColor = "rgba(255,102,0,0.4)")}
                        onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                      />
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", margin: "4px 0 0", textAlign: "right" }}>
                        {comment.length}/500
                      </p>
                    </div>

                    {/* Erro */}
                    <AnimatePresence>
                      {error && (
                        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          style={{ fontSize: 12, color: "#f87171", margin: "0 0 12px", padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}>
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Ações */}
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={handleClose}
                        style={{ flex: 1, padding: "11px 0", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Pular
                      </button>
                      <motion.button onClick={handleSubmit}
                        disabled={selected === 0 || loading}
                        whileHover={selected > 0 && !loading ? { scale: 1.02 } : {}}
                        whileTap={selected > 0 && !loading ? { scale: 0.97 } : {}}
                        style={{
                          flex: 2, padding: "11px 0", borderRadius: 10,
                          background: selected > 0 ? "#FF6600" : "rgba(255,102,0,0.2)",
                          border: "none", color: selected > 0 ? "#fff" : "rgba(255,255,255,0.2)",
                          fontSize: 12, fontWeight: 800, cursor: selected > 0 ? "pointer" : "not-allowed",
                          fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                          transition: "background 0.2s, color 0.2s",
                          boxShadow: selected > 0 ? "0 0 20px rgba(255,102,0,0.3)" : "none",
                        }}>
                        {loading
                          ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Enviando…</>
                          : <><Send size={12} /> Enviar avaliação</>
                        }
                      </motion.button>
                    </div>

                    {/* Nota de privacidade */}
                    <p style={{ fontSize: 9, color: "rgba(255,255,255,0.14)", textAlign: "center", margin: "14px 0 0", lineHeight: 1.6 }}>
                      Sua avaliação será exibida publicamente com seu nome no perfil do freelancer.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Export utilitário ────────────────────────────────────────────────────────

export { submitRating, checkRated };
