import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, Send, CheckCircle, Loader2 } from "lucide-react";
import { api } from "../../services/api";
import { HoneypotField, isHoneypotTripped } from "../../components/security/HoneypotField";
import { getSafeHttpErrorMessage } from "../../lib/http-error";

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  contractId?: number | string;
  proposalId?: number | string; // legado, caso o componente pai ainda use esse nome
  freelancerName: string;
  signerName: string;
  publicToken?: string;
}

const STAR_LABELS: Record<number, string> = {
  1: "Ruim",
  2: "Regular",
  3: "Bom",
  4: "Ótimo",
  5: "Excelente!",
};

type SubmitRatingPayload = {
  contractId: number;
  publicToken: string;
  raterName: string;
  stars: number;
  comment?: string | null;
};

type SubmitRatingResponse = {
  ok: boolean;
  duplicate?: boolean;
  ratingId?: number;
  message?: string;
};

function toPositiveNumber(value: number | string | undefined, field: string): number {
  const parsed =
    typeof value === "number" ? value : Number(String(value ?? "").trim());

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${field} inválido.`);
  }

  return parsed;
}

function getErrorStatus(error: any): number | undefined {
  return error?.status ?? error?.response?.status;
}

function getErrorMessage(error: any, fallback: string): string {
  const status = getErrorStatus(error);
  const payload = error?.response?.data;
  const message = typeof error?.message === "string" ? error.message : "";

  if (status === 403) {
    return "Avaliacao indisponivel para este link.";
  }

  if (typeof status === "number") {
    return getSafeHttpErrorMessage(status, payload || { message: message || fallback });
  }

  if (message && message.length <= 160 && !/[<>]/.test(message)) {
    return message;
  }

  return fallback;
}

function getErrorRatingId(error: any): number | undefined {
  return error?.response?.data?.ratingId ?? error?.details?.ratingId;
}

async function submitRatingPublic(
  payload: SubmitRatingPayload
): Promise<SubmitRatingResponse> {
  try {
    const { data } = await api.post<SubmitRatingResponse>("/api/ratings", payload);
    return data;
  } catch (error: any) {
    const status = getErrorStatus(error);

    if (status === 409) {
      return {
        ok: true,
        duplicate: true,
        ratingId: getErrorRatingId(error),
        message: getErrorMessage(error, "Este contrato já foi avaliado."),
      };
    }

    throw new Error(getErrorMessage(error, "Erro ao enviar avaliação."));
  }
}

export function RatingModal({
  open,
  onClose,
  contractId,
  proposalId,
  freelancerName,
  signerName,
  publicToken,
}: RatingModalProps) {
  const honeypotRef = useRef<HTMLInputElement>(null);
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("Avaliação enviada!");

  const displayStars = hovered || selected;

  const handleSubmit = async () => {
    if (isHoneypotTripped(honeypotRef)) {
      setError("Não foi possível concluir a solicitação.");
      return;
    }

    if (selected === 0) {
      setError("Selecione uma nota antes de enviar.");
      return;
    }

    if (!publicToken || !/^[a-f0-9]{64}$/i.test(publicToken.trim())) {
      setError("Token público inválido.");
      return;
    }

    if (!signerName || signerName.trim().length < 2) {
      setError("Nome do avaliador inválido.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resolvedContractId = toPositiveNumber(
        contractId ?? proposalId,
        "Contrato"
      );

      const result = await submitRatingPublic({
        contractId: resolvedContractId,
        publicToken: publicToken.trim().toLowerCase(),
        raterName: signerName.trim(),
        stars: selected,
        comment: comment.trim() || null,
      });

      setSuccessMessage(
        result.message ??
          (result.duplicate
            ? "Este contrato já havia sido avaliado."
            : "Avaliação enviada!")
      );
      setDone(true);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao enviar avaliação.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setHovered(0);
      setSelected(0);
      setComment("");
      setDone(false);
      setError(null);
      setSuccessMessage("Avaliação enviada!");
    }, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(0,0,0,0.82)",
            backdropFilter: "blur(10px)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 28 }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              borderRadius: 20,
              border: "1px solid rgba(255,102,0,0.22)",
              background: "#0d0d0d",
              boxShadow:
                "0 0 80px rgba(255,102,0,0.1), 0 32px 64px rgba(0,0,0,0.9)",
              overflow: "hidden",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <div
              style={{
                height: 2,
                background:
                  "linear-gradient(to right, #FF6600, #ff880050, transparent)",
              }}
            />

            <div
              style={{
                padding: "22px 24px 0",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.3em",
                    color: "#FF6600",
                    margin: "0 0 4px",
                  }}
                >
                  ● Avaliação
                </p>

                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#fff",
                    margin: 0,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Como foi trabalhar com
                  <br />
                  <span style={{ color: "#FF6600" }}>{freelancerName}</span>?
                </p>
              </div>

              <button
                onClick={handleClose}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.3)",
                  padding: 4,
                  display: "flex",
                  borderRadius: 8,
                  marginTop: 2,
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "24px" }}>
              {done ? (
                <div style={{ textAlign: "center", padding: "12px 0 20px" }}>
                  <CheckCircle
                    size={52}
                    color="#22c55e"
                    style={{ margin: "0 auto 16px", display: "block" }}
                  />
                  <p
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#fff",
                      margin: "0 0 6px",
                    }}
                  >
                    {successMessage}
                  </p>
                  <button
                    onClick={handleClose}
                    style={{
                      padding: "10px 28px",
                      borderRadius: 10,
                      background: "#FF6600",
                      border: "none",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ position: "relative" }}>
                    <HoneypotField inputRef={honeypotRef} />
                  </div>
                  <div style={{ marginBottom: 20, textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setSelected(n)}
                          onMouseEnter={() => setHovered(n)}
                          onMouseLeave={() => setHovered(0)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 3,
                            display: "flex",
                          }}
                        >
                          <Star
                            size={36}
                            fill={n <= displayStars ? "#f59e0b" : "none"}
                            stroke={
                              n <= displayStars
                                ? "#f59e0b"
                                : "rgba(255,255,255,0.18)"
                            }
                            strokeWidth={1.5}
                          />
                        </button>
                      ))}
                    </div>

                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color:
                          displayStars > 0
                            ? "#f59e0b"
                            : "rgba(255,255,255,0.2)",
                        margin: 0,
                      }}
                    >
                      {displayStars > 0
                        ? STAR_LABELS[displayStars]
                        : "Toque em uma estrela para avaliar"}
                    </p>
                  </div>

                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Conte como foi a experiência com este freelancer..."
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      padding: "10px 13px",
                      color: "#fff",
                      fontSize: 13,
                      outline: "none",
                      resize: "vertical",
                      marginBottom: 12,
                    }}
                  />

                  {error && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#f87171",
                        margin: "0 0 12px",
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "rgba(239,68,68,0.07)",
                        border: "1px solid rgba(239,68,68,0.15)",
                      }}
                    >
                      {error}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={handleClose}
                      style={{
                        flex: 1,
                        padding: "11px 0",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.4)",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        textTransform: "uppercase",
                      }}
                    >
                      Pular
                    </button>

                    <button
                      onClick={handleSubmit}
                      disabled={selected === 0 || loading}
                      style={{
                        flex: 2,
                        padding: "11px 0",
                        borderRadius: 10,
                        background:
                          selected > 0 ? "#FF6600" : "rgba(255,102,0,0.2)",
                        border: "none",
                        color: selected > 0 ? "#fff" : "rgba(255,255,255,0.2)",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: selected > 0 ? "pointer" : "not-allowed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 7,
                        textTransform: "uppercase",
                      }}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={13} />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send size={12} />
                          Enviar avaliação
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
