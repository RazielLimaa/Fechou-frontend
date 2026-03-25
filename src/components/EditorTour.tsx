import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface StepDef {
  id: string;
  tourId: string;
  title: string;
  desc: string;
  cardSide: "right" | "left" | "bottom" | "top";
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

const STEPS_DESKTOP: StepDef[] = [
  {
    id: "library",
    tourId: "clause-library",
    title: "Biblioteca de cláusulas",
    desc: "Filtre por categoria e clique em qualquer cláusula para expandi-la e adicioná-la ao contrato.",
    cardSide: "right",
  },
  {
    id: "search",
    tourId: "clause-search",
    title: "Busca inteligente",
    desc: "Digite palavras-chave para encontrar cláusulas específicas na biblioteca.",
    cardSide: "right",
  },
  {
    id: "preview",
    tourId: "preview",
    title: "Preview em tempo real",
    desc: "Cada alteração aparece aqui instantaneamente, exatamente como sairá no PDF.",
    cardSide: "left",
  },
  {
    id: "order",
    tourId: "clause-order",
    title: "Ordenar cláusulas",
    desc: "Arraste as cláusulas para reorganizá-las. A ordem reflete no PDF gerado.",
    cardSide: "left",
  },
  {
    id: "aparencia",
    tourId: "tab-aparencia",
    title: "Aparência do contrato",
    desc: "Aqui você personaliza cor, fonte e logo do contrato.",
    cardSide: "left",
  },
  {
    id: "signature",
    tourId: "btn-signature",
    title: "Minha assinatura",
    desc: "Desenhe sua assinatura e reutilize em todos os contratos.",
    cardSide: "bottom",
  },
  {
    id: "pdf",
    tourId: "btn-pdf",
    title: "Gerar PDF",
    desc: "Baixa o contrato completo com cláusulas, assinaturas e layout personalizado.",
    cardSide: "left",
  },
];

const STEPS_MOBILE: StepDef[] = [
  {
    id: "mobile-nav",
    tourId: "mobile-nav",
    title: "Navegação do editor",
    desc: "Alterne entre as abas de Cláusulas, Preview e Editor.",
    cardSide: "bottom",
    mobileOnly: true,
  },
  {
    id: "library-mobile",
    tourId: "clause-library",
    title: "Biblioteca de cláusulas",
    desc: "Toque em qualquer cláusula para adicioná-la ao contrato.",
    cardSide: "bottom",
    mobileOnly: true,
  },
  {
    id: "preview-mobile",
    tourId: "preview",
    title: "Preview do contrato",
    desc: "Veja o contrato completo antes de gerar o PDF.",
    cardSide: "bottom",
    mobileOnly: true,
  },
  {
    id: "signature-mobile",
    tourId: "btn-signature",
    title: "Minha assinatura",
    desc: "Toque aqui para desenhar e salvar sua assinatura.",
    cardSide: "bottom",
    mobileOnly: true,
  },
  {
    id: "pdf-mobile",
    tourId: "btn-pdf",
    title: "Gerar PDF",
    desc: "Baixa o contrato finalizado com tudo incluído.",
    cardSide: "bottom",
    mobileOnly: true,
  },
];

function HandSVG({ pointing }: { pointing: "right" | "left" | "up" | "down" }) {
  const rotMap = { right: 0, down: 90, left: 180, up: 270 };
  const rot = rotMap[pointing];

  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 52 52"
      fill="none"
      style={{ transform: `rotate(${rot}deg)`, display: "block" }}
    >
      <ellipse cx="26" cy="46" rx="13" ry="4" fill="rgba(0,0,0,0.18)" />
      <path
        d="M14 34V22a3.5 3.5 0 0 1 7 0v5"
        fill="url(#hand_skin)"
        stroke="#c96a00"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M21 27V19a3.5 3.5 0 0 1 7 0v8"
        fill="url(#hand_skin)"
        stroke="#c96a00"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M28 27V21a3.5 3.5 0 0 1 7 0v6"
        fill="url(#hand_skin)"
        stroke="#c96a00"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M35 27v-3a3.5 3.5 0 0 1 7 0v8c0 7.5-4.5 13-14 13-6 0-10-4-10-10v-2.5"
        fill="url(#hand_skin)"
        stroke="#c96a00"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M21 19V11a3.5 3.5 0 0 1 7 0v8"
        fill="url(#hand_highlight)"
        stroke="#c96a00"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      <defs>
        <linearGradient id="hand_skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff8c38" />
          <stop offset="100%" stopColor="#ff6600" />
        </linearGradient>
        <linearGradient id="hand_highlight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffaa5e" />
          <stop offset="100%" stopColor="#ff7a20" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Spotlight({ rect }: { rect: Rect }) {
  const PAD = 10;
  const r = {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };

  return (
    <svg
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 1001,
      }}
    >
      <defs>
        <mask id="spot_mask">
          <rect width="100%" height="100%" fill="white" />
          <rect x={r.left} y={r.top} width={r.width} height={r.height} rx="10" fill="black" />
        </mask>
      </defs>

      <rect width="100%" height="100%" fill="rgba(0,0,0,0.62)" mask="url(#spot_mask)" />
      <rect
        x={r.left}
        y={r.top}
        width={r.width}
        height={r.height}
        rx="10"
        fill="none"
        stroke="#ff6600"
        strokeWidth="2"
        strokeDasharray="6 4"
        opacity="0.85"
      />
    </svg>
  );
}

function ConnectorLine({
  from,
  to,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
}) {
  return (
    <svg
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 1004,
      }}
    >
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="#ff6600"
        strokeWidth="1.5"
        strokeDasharray="5 4"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

const CARD_W = 248;
const CARD_H_EST = 200;
const HAND_SIZE = 52;
const GAP = 14;

function calcPositions(rect: Rect, side: StepDef["cardSide"], vw: number, vh: number) {
  const PAD = 10;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  let handX = 0;
  let handY = 0;
  let cardX = 0;
  let cardY = 0;
  let connFrom = { x: 0, y: 0 };
  let connTo = { x: 0, y: 0 };
  let handPointing: "right" | "left" | "up" | "down" = "right";

  switch (side) {
    case "right":
      handX = rect.left + rect.width + PAD;
      handY = cy - HAND_SIZE / 2;
      cardX = handX + HAND_SIZE + GAP;
      cardY = cy - 80;
      handPointing = "right";
      connFrom = { x: handX + HAND_SIZE, y: handY + HAND_SIZE / 2 };
      connTo = { x: cardX, y: cardY + 60 };
      break;

    case "left":
      handX = rect.left - HAND_SIZE - PAD;
      handY = cy - HAND_SIZE / 2;
      cardX = handX - CARD_W - GAP;
      cardY = cy - 80;
      handPointing = "left";
      connFrom = { x: handX, y: handY + HAND_SIZE / 2 };
      connTo = { x: cardX + CARD_W, y: cardY + 60 };
      break;

    case "bottom":
      handX = cx - HAND_SIZE / 2;
      handY = rect.top + rect.height + PAD;
      cardX = cx - CARD_W / 2;
      cardY = handY + HAND_SIZE + GAP;
      handPointing = "down";
      connFrom = { x: handX + HAND_SIZE / 2, y: handY + HAND_SIZE };
      connTo = { x: cardX + CARD_W / 2, y: cardY };
      break;

    case "top":
      handX = cx - HAND_SIZE / 2;
      handY = rect.top - HAND_SIZE - PAD;
      cardX = cx - CARD_W / 2;
      cardY = handY - CARD_H_EST - GAP;
      handPointing = "up";
      connFrom = { x: handX + HAND_SIZE / 2, y: handY };
      connTo = { x: cardX + CARD_W / 2, y: cardY + CARD_H_EST };
      break;
  }

  const MARGIN = 8;
  cardX = Math.max(MARGIN, Math.min(vw - CARD_W - MARGIN, cardX));
  cardY = Math.max(MARGIN, Math.min(vh - CARD_H_EST - MARGIN, cardY));
  handX = Math.max(MARGIN, Math.min(vw - HAND_SIZE - MARGIN, handX));
  handY = Math.max(MARGIN, Math.min(vh - HAND_SIZE - MARGIN, handY));

  return { handX, handY, cardX, cardY, connFrom, connTo, handPointing };
}

export function EditorTour({ onClose }: { onClose: () => void }) {
  const [isMobile, setIsMobile] = useState(false);
  const [cur, setCur] = useState(0);
  const [neverShow, setNeverShow] = useState(false);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [vw, setVw] = useState(1200);
  const [vh, setVh] = useState(800);
  const [loadingStep, setLoadingStep] = useState(false);

  const rafRef = useRef<number>(0);
  const retryTimeoutRef = useRef<number | null>(null);
  const stepRetryCountRef = useRef(0);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth < 1024);
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const steps = useMemo(() => {
    return isMobile ? STEPS_MOBILE : STEPS_DESKTOP;
  }, [isMobile]);

  const step = steps[cur];
  const isLast = cur === steps.length - 1;

  const finish = useCallback(() => {
    if (neverShow) {
      localStorage.setItem("fechou_editor_tour_never", "1");
    }
    onClose();
  }, [neverShow, onClose]);

  const goNext = useCallback(() => {
    setCur((prev) => {
      if (prev >= steps.length - 1) {
        finish();
        return prev;
      }
      return prev + 1;
    });
  }, [steps.length, finish]);

  const measureTarget = useCallback(() => {
    if (!step) return;

    const el = document.querySelector(`[data-tour="${step.tourId}"]`) as HTMLElement | null;

    if (!el) {
      setTargetRect(null);
      return false;
    }

    const r = el.getBoundingClientRect();

    if (r.width === 0 || r.height === 0) {
      setTargetRect(null);
      return false;
    }

    setTargetRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    });

    return true;
  }, [step]);

  useEffect(() => {
    if (!step) return;

    setLoadingStep(true);
    setTargetRect(null);
    stepRetryCountRef.current = 0;

    const tryMeasure = () => {
      cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const found = measureTarget();

        if (found) {
          setLoadingStep(false);
          return;
        }

        stepRetryCountRef.current += 1;

        if (stepRetryCountRef.current >= 12) {
          setLoadingStep(false);

          if (cur < steps.length - 1) {
            setTimeout(() => {
              setCur((prev) => Math.min(prev + 1, steps.length - 1));
            }, 150);
          }

          return;
        }

        retryTimeoutRef.current = window.setTimeout(tryMeasure, 250);
      });
    };

    tryMeasure();

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [cur, step, steps.length, measureTarget]);

  useEffect(() => {
    const onResize = () => {
      measureTarget();
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [measureTarget]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };

    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [finish]);

  if (!step) return null;

  const pos = targetRect ? calcPositions(targetRect, step.cardSide, vw, vh) : null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          cursor: "pointer",
        }}
        onClick={finish}
      />

      {targetRect && <Spotlight rect={targetRect} />}
      {pos && <ConnectorLine from={pos.connFrom} to={pos.connTo} />}

      <AnimatePresence mode="wait">
        {pos && (
          <motion.div
            key={`hand-${cur}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
            style={{
              position: "fixed",
              top: pos.handY,
              left: pos.handX,
              zIndex: 1006,
              pointerEvents: "none",
              filter: "drop-shadow(0 4px 12px rgba(255,102,0,0.45))",
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.9, 1], opacity: [0.55, 0, 0.55] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                inset: -6,
                borderRadius: "50%",
                background: "rgba(255,102,0,0.25)",
              }}
            />
            <HandSVG pointing={pos.handPointing} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {pos && (
          <motion.div
            key={`card-${cur}`}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            style={{
              position: "fixed",
              top: pos.cardY,
              left: pos.cardX,
              width: CARD_W,
              zIndex: 1007,
              pointerEvents: "all",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: "linear-gradient(145deg, #1c1c1f 0%, #141416 100%)",
                border: "1px solid rgba(255,102,0,0.25)",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: [
                  "0 20px 60px rgba(0,0,0,0.65)",
                  "0 0 0 1px rgba(255,102,0,0.12)",
                  "inset 0 1px 0 rgba(255,255,255,0.05)",
                ].join(", "),
              }}
            >
              <div
                style={{
                  height: 3,
                  background: "linear-gradient(90deg, #ff6600, #ff9a3c)",
                }}
              />

              <div style={{ padding: "14px 16px 13px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                      color: "#ff6600",
                      fontFamily: "Inter, sans-serif",
                      background: "rgba(255,102,0,0.12)",
                      padding: "2px 7px",
                      borderRadius: 20,
                      border: "1px solid rgba(255,102,0,0.2)",
                    }}
                  >
                    {cur + 1} / {steps.length}
                  </span>

                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {steps.map((_, i) => (
                      <div
                        key={i}
                        onClick={() => setCur(i)}
                        style={{
                          height: 5,
                          width: i === cur ? 20 : 5,
                          borderRadius: 3,
                          background:
                            i === cur
                              ? "linear-gradient(90deg, #ff6600, #ff9a3c)"
                              : "#333",
                          cursor: "pointer",
                          transition: "all 0.22s ease",
                          boxShadow: i === cur ? "0 0 6px rgba(255,102,0,0.5)" : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>

                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#f4f4f5",
                    lineHeight: 1.3,
                    marginBottom: 6,
                    fontFamily: "Inter, sans-serif",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {step.title}
                </p>

                <p
                  style={{
                    fontSize: 12,
                    color: "#a1a1aa",
                    lineHeight: 1.6,
                    marginBottom: 13,
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {step.desc}
                </p>

                {isLast && (
                  <label
                    onClick={() => setNeverShow((v) => !v)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 11,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 5,
                        border: `1.5px solid ${neverShow ? "#ff6600" : "#444"}`,
                        background: neverShow
                          ? "linear-gradient(135deg, #ff6600, #ff9a3c)"
                          : "rgba(255,255,255,0.03)",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.15s",
                        boxShadow: neverShow ? "0 0 8px rgba(255,102,0,0.4)" : "none",
                      }}
                    >
                      {neverShow && (
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                          <path
                            d="M1.5 5l2.5 2.5L8.5 2"
                            stroke="#fff"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>

                    <span
                      style={{
                        fontSize: 11,
                        color: "#71717a",
                        fontFamily: "Inter, sans-serif",
                        userSelect: "none",
                      }}
                    >
                      Não mostrar novamente
                    </span>
                  </label>
                )}

                <div style={{ display: "flex", gap: 6 }}>
                  {cur > 0 && (
                    <button
                      onClick={() => setCur((c) => c - 1)}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        borderRadius: 10,
                        border: "1px solid #333",
                        background: "rgba(255,255,255,0.03)",
                        color: "#a1a1aa",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      ← Voltar
                    </button>
                  )}

                  <button
                    onClick={isLast ? finish : goNext}
                    style={{
                      flex: 2,
                      padding: "8px 0",
                      borderRadius: 10,
                      border: "none",
                      background: "linear-gradient(135deg, #ff6600, #ff8c33)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "Inter, sans-serif",
                      boxShadow: "0 4px 14px rgba(255,102,0,0.35)",
                    }}
                  >
                    {isLast ? "Entendi! ✓" : "Próximo →"}
                  </button>
                </div>

                {!isLast && (
                  <button
                    onClick={finish}
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 8,
                      background: "none",
                      border: "none",
                      fontSize: 11,
                      color: "#52525b",
                      cursor: "pointer",
                      textAlign: "center",
                      fontFamily: "Inter, sans-serif",
                      padding: "3px 0",
                    }}
                  >
                    Pular tour
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!targetRect && loadingStep && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1010,
            background: "#1c1c1f",
            border: "1px solid #333",
            borderRadius: 14,
            padding: "20px 24px",
            textAlign: "center",
            fontFamily: "Inter, sans-serif",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p style={{ color: "#a1a1aa", fontSize: 13, marginBottom: 12 }}>
            Carregando elemento do tour...
          </p>

          <button
            onClick={finish}
            style={{
              padding: "7px 18px",
              borderRadius: 8,
              background: "#ff6600",
              border: "none",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Fechar
          </button>
        </div>
      )}
    </>
  );
}