import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  Bug,
  CheckCircle2,
  MessageCircle,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

type LaunchExperiencePopupProps = {
  open: boolean;
  onClose: () => void;
  whatsappNumber?: string;
};

type Step = 0 | 1 | 2;

type BaseStep = {
  eyebrow: string;
  icon: ReactNode;
  title: string;
  description: string;
  badge: string;
  accent: string;
  buttonLabel: string;
  heroGlow: string;
};

type ActionStep = BaseStep & {
  kind: "action";
  onAction: () => void;
};

type LinkStep = BaseStep & {
  kind: "link";
  href: string;
};

type PopupStep = ActionStep | LinkStep;

const AUTO_STEP_MS = 4200;

export default function LaunchExperiencePopup({
  open,
  onClose,
  whatsappNumber = "5511949507668",
}: LaunchExperiencePopupProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);

  useSpring(mouseX, { stiffness: 120, damping: 22, mass: 0.5 });
  useSpring(mouseY, { stiffness: 120, damping: 22, mass: 0.5 });

  const whatsappMessage = t("launchPopup.whatsappMessage");
  const whatsappHref = useMemo(() => {
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
      whatsappMessage
    )}`;
  }, [whatsappMessage, whatsappNumber]);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setIsPaused(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || isPaused) return;
    if (step === 2) return;

    const timer = window.setTimeout(() => {
      setStep((prev) => (prev < 2 ? ((prev + 1) as Step) : prev));
    }, AUTO_STEP_MS);

    return () => window.clearTimeout(timer);
  }, [open, step, isPaused]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;

      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") {
        setStep((prev) => (prev < 2 ? ((prev + 1) as Step) : prev));
      }
      if (event.key === "ArrowLeft") {
        setStep((prev) => (prev > 0 ? ((prev - 1) as Step) : prev));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const steps: PopupStep[] = [
    {
      kind: "action",
      eyebrow: t("launchPopup.steps.0.eyebrow"),
      icon: <CheckCircle2 size={20} />,
      title: t("launchPopup.steps.0.title"),
      description: t("launchPopup.steps.0.body"),
      badge: t("launchPopup.steps.0.badge"),
      accent: "#ff6600",
      buttonLabel: t("launchPopup.steps.0.buttonLabel"),
      onAction: () => setStep(1),
      heroGlow: "rgba(255,102,0,0.22)",
    },
    {
      kind: "action",
      eyebrow: t("launchPopup.steps.1.eyebrow"),
      icon: <Sparkles size={20} />,
      title: t("launchPopup.steps.1.title"),
      description: t("launchPopup.steps.1.body"),
      badge: t("launchPopup.steps.1.badge"),
      accent: "#ffffff",
      buttonLabel: t("launchPopup.steps.1.buttonLabel"),
      onAction: () => setStep(2),
      heroGlow: "rgba(255,255,255,0.14)",
    },
    {
      kind: "link",
      eyebrow: t("launchPopup.steps.2.eyebrow"),
      icon: <Bug size={20} />,
      title: t("launchPopup.steps.2.title"),
      description: t("launchPopup.steps.2.body"),
      badge: t("launchPopup.steps.2.badge"),
      accent: "#ff6600",
      buttonLabel: t("launchPopup.steps.2.buttonLabel"),
      href: whatsappHref,
      heroGlow: "rgba(255,102,0,0.18)",
    },
  ];

  const current = steps[step];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1200,
              background: "rgba(0,0,0,0.76)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
            }}
          />

          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1201,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "18px",
              fontFamily: "'DM Sans','Inter',sans-serif",
            }}
          >
            <motion.div
              ref={containerRef}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                mouseX.set(x);
                mouseY.set(y);
              }}
              initial={{ opacity: 0, y: 36, scale: 0.94, rotateX: 8 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "relative",
                width: "min(100%, 820px)",
                minHeight: 560,
                borderRadius: 40,
                overflow: "hidden",
                background:
                  "linear-gradient(180deg, rgba(16,16,18,0.96) 0%, rgba(7,7,9,0.985) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 40px 140px rgba(0,0,0,0.62)",
                transformStyle: "preserve-3d",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.02), transparent 24%)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  insetInline: 0,
                  top: 0,
                  height: 1,
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
                }}
              />

              <button
                onClick={onClose}
                aria-label={t("launchPopup.close")}
                style={{
                  position: "absolute",
                  top: 18,
                  right: 18,
                  zIndex: 3,
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.045)",
                  color: "rgba(255,255,255,0.82)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                }}
              >
                <X size={16} />
              </button>

              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 560,
                  padding: "28px 28px 24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 28,
                  }}
                >
                  {[0, 1, 2].map((index) => {
                    const active = index <= step;
                    return (
                      <div
                        key={index}
                        style={{
                          flex: 1,
                          height: 7,
                          borderRadius: 999,
                          overflow: "hidden",
                          background: active
                            ? "rgba(255,102,0,0.18)"
                            : "rgba(255,255,255,0.08)",
                          position: "relative",
                        }}
                      >
                        {active && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{
                              duration: 0.5,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            style={{
                              height: "100%",
                              borderRadius: 999,
                              background:
                                "linear-gradient(90deg, #ff6600, #ff9b57)",
                              boxShadow: "none",
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{
                      opacity: 0,
                      y: 24,
                      scale: 0.985,
                      filter: "blur(8px)",
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      filter: "blur(0px)",
                    }}
                    exit={{
                      opacity: 0,
                      y: -14,
                      scale: 0.985,
                      filter: "blur(6px)",
                    }}
                    transition={{
                      duration: 0.55,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      flex: 1,
                    }}
                  >
                    <div>
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.08, duration: 0.45 }}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            step === 1
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(255,102,0,0.12)",
                          border:
                            step === 1
                              ? "1px solid rgba(255,255,255,0.08)"
                              : "1px solid rgba(255,102,0,0.18)",
                          color: current.accent,
                          marginBottom: 24,
                          boxShadow: "none",
                        }}
                      >
                        {current.icon}
                      </motion.div>

                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 14px",
                          borderRadius: 999,
                          background:
                            step === 1
                              ? "rgba(255,255,255,0.05)"
                              : "rgba(255,102,0,0.08)",
                          border:
                            step === 1
                              ? "1px solid rgba(255,255,255,0.08)"
                              : "1px solid rgba(255,102,0,0.15)",
                          color:
                            step === 1
                              ? "rgba(255,255,255,0.7)"
                              : "rgba(255,193,153,0.95)",
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: 18,
                          backdropFilter: "blur(10px)",
                        }}
                      >
                        {current.badge}
                      </div>

                      <p
                        style={{
                          margin: "0 0 10px 0",
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.2em",
                          color:
                            step === 1
                              ? "rgba(255,255,255,0.36)"
                              : "#ff6600",
                        }}
                      >
                        {current.eyebrow}
                      </p>

                      <div
                        style={{
                          position: "relative",
                          width: "fit-content",
                          maxWidth: 650,
                        }}
                      >
                        <h2
                          style={{
                            margin: 0,
                            fontSize: "clamp(2.15rem, 5vw, 4.8rem)",
                            lineHeight: 0.93,
                            letterSpacing: "-0.09em",
                            fontWeight: 900,
                            maxWidth: 650,
                            color: "rgba(255,255,255,0.92)",
                            textShadow: "none",
                          }}
                        >
                          {current.title}
                        </h2>
                      </div>

                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.45 }}
                        style={{
                          margin: "20px 0 0 0",
                          maxWidth: 580,
                          fontSize: "clamp(0.98rem, 1.55vw, 1.08rem)",
                          lineHeight: 1.85,
                          color: "rgba(255,255,255,0.44)",
                          fontWeight: 300,
                        }}
                      >
                        {current.description}
                      </motion.p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 34,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <Pill>{t("launchPopup.premiumFeel")}</Pill>
                        <Pill>{t("launchPopup.experience")}</Pill>
                        <Pill>{step === 2 ? t("launchPopup.openFeedback") : t("launchPopup.newPhase")}</Pill>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        {step > 0 && (
                          <button
                            onClick={() =>
                              setStep((prev) =>
                                prev > 0 ? ((prev - 1) as Step) : prev
                              )
                            }
                            style={secondaryButtonStyle}
                          >
                            {t("launchPopup.back")}
                          </button>
                        )}

                        {current.kind === "link" ? (
                          <motion.a
                            href={current.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.985 }}
                            style={primaryButtonStyle(step)}
                          >
                            <MessageCircle size={16} />
                            {current.buttonLabel}
                          </motion.a>
                        ) : (
                          <motion.button
                            onClick={current.onAction}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.985 }}
                            style={primaryButtonStyle(step)}
                          >
                            {current.buttonLabel}
                            <ArrowRight size={16} />
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        color: "rgba(255,255,255,0.44)",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        backdropFilter: "blur(8px)",
      }}
    >
      {children}
    </div>
  );
}

const secondaryButtonStyle: CSSProperties = {
  height: 52,
  padding: "0 18px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  backdropFilter: "blur(10px)",
};

function primaryButtonStyle(step: number): CSSProperties {
  return {
    height: 52,
    padding: "0 22px",
    borderRadius: 999,
    border:
      step === 1
        ? "1px solid rgba(255,255,255,0.1)"
        : "1px solid rgba(255,102,0,0.18)",
    background:
      step === 1
        ? "rgba(255,255,255,0.07)"
        : "linear-gradient(180deg, #ff6600 0%, #ea580c 100%)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 800,
    textDecoration: "none",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    boxShadow: "none",
    backdropFilter: "blur(10px)",
  };
}
