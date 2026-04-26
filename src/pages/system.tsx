import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Navbar from "../components/landing/Navbar";
import Footer from "../components/landing/Footer";
import { Check, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { setPostAuthRedirect } from "../lib/navigation-intent";
import { useSession } from "../context/session-context";

type SystemPlan = {
  id: "free" | "pro" | "premium";
  name: string;
  price: number;
  tag: string;
  highlight?: boolean;
  features: string[];
};
type SystemPlanMeta = Record<string, { note: string; chips: string[]; cta: string }>;
type SystemTestimonial = { q: string; a: string; r: string };

// ── hook mobile ───────────────────────────────────────────────────────────────
function useIsMobile(bp = 1100) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < bp);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [bp]);
  return mobile;
}

// ── Reveal ────────────────────────────────────────────────────────────────────
function R({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.span style={{ display: "block" }}
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.span>
  );
}

// ── Planos mobile: cards empilhados ──────────────────────────────────────────
function PlanCards({ goToPlan }: { goToPlan: (id: string) => void }) {
  const { t } = useTranslation();
  const plans = t("systemPage.plans", { returnObjects: true }) as SystemPlan[];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 0 32px" }}>
      {plans.map((plan, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ delay: i * 0.1 }}
          style={{
            borderRadius: 20,
            border: plan.highlight
              ? "1.5px solid rgba(255,102,0,0.5)"
              : "1px solid rgba(255,255,255,0.08)",
            background: plan.highlight ? "rgba(255,102,0,0.04)" : "rgba(255,255,255,0.02)",
            overflow: "hidden",
            position: "relative",
          }}>

          {/* barra topo destaque */}
          {plan.highlight && (
            <div style={{ height: 2, background: "#ff6600", width: "100%" }} />
          )}

          <div style={{ padding: "24px 24px 20px" }}>
            {/* tag + nome */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: plan.highlight ? "#ff6600" : "rgba(255,255,255,0.28)", marginBottom: 4 }}>
                  {plan.tag}
                </p>
                <p style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.035em", color: "#fff", lineHeight: 1 }}>{plan.name}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                {plan.price === 0 ? (
                  <p style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1 }}>{t("systemPage.freePrice")}</p>
                ) : (
                  <>
                    <p style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>R$</span>
                      {plan.price}
                      <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>{t("systemPage.month")}</span>
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* divisor */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 16 }} />

            {/* features */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {plan.features.map((feat, fi) => (
                <div key={fi} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, background: "rgba(255,102,0,0.12)", border: "1px solid rgba(255,102,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={8} style={{ color: "#ff6600" }} />
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 300 }}>{feat}</p>
                </div>
              ))}
            </div>

            {/* botão */}
            <motion.button
              onClick={() => goToPlan(plan.id)}
              whileTap={{ scale: 0.97 }}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 999,
                background: plan.highlight ? "#ff6600" : "transparent",
                border: plan.highlight ? "none" : "1px solid rgba(255,255,255,0.1)",
                color: plan.highlight ? "#fff" : "rgba(255,255,255,0.45)",
                fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
              {t(`systemPage.buttons.${plan.id}`)}
              <ArrowRight size={13} />
            </motion.button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Testimonials + CTA final ──────────────────────────────────────────────────
function PlanCardsRefined({ goToPlan }: { goToPlan: (id: string) => void }) {
  const { t } = useTranslation();
  const plans = t("systemPage.plans", { returnObjects: true }) as SystemPlan[];
  const meta = t("systemPage.cardMeta", { returnObjects: true }) as SystemPlanMeta;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 0 32px" }}>
      {plans.map((plan, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          style={{
            borderRadius: 24,
            border: plan.highlight ? "1.5px solid rgba(255,102,0,0.5)" : "1px solid rgba(255,255,255,0.08)",
            background: plan.highlight ? "rgba(255,102,0,0.04)" : "rgba(255,255,255,0.02)",
            overflow: "hidden",
            position: "relative",
            boxShadow: plan.highlight ? "0 18px 48px rgba(255,102,0,0.12)" : "none",
          }}
        >
          {plan.highlight && <div style={{ height: 2, background: "#ff6600", width: "100%" }} />}
          <div style={{ padding: "22px 22px 20px", position: "relative" }}>
            <div style={{ position: "absolute", top: 16, right: 16, width: plan.highlight ? 52 : 42, height: plan.highlight ? 52 : 42, borderRadius: "50%", background: plan.highlight ? "rgba(255,102,0,0.14)" : "rgba(255,255,255,0.04)", border: plan.highlight ? "1px solid rgba(255,102,0,0.24)" : "1px solid rgba(255,255,255,0.05)", pointerEvents: "none" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16, position: "relative", zIndex: 1 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: plan.highlight ? "#ff6600" : "rgba(255,255,255,0.28)", marginBottom: 4 }}>{plan.tag}</p>
                <p style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.035em", color: "#fff", lineHeight: 1 }}>{plan.name}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  {meta[plan.id].chips.map((chip) => (
                    <span key={chip} style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", padding: "4px 8px", borderRadius: 999, background: plan.highlight ? "rgba(255,102,0,0.12)" : "rgba(255,255,255,0.04)", color: plan.highlight ? "#ff6600" : "rgba(255,255,255,0.45)", border: plan.highlight ? "1px solid rgba(255,102,0,0.18)" : "1px solid rgba(255,255,255,0.06)" }}>{chip}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, paddingRight: 18 }}>
                {plan.price === 0 ? (
                  <p style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1 }}>{t("systemPage.freePrice")}</p>
                ) : (
                  <>
                    <p style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>R$</span>
                      {plan.price}
                      <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>{t("systemPage.month")}</span>
                    </p>
                  </>
                )}
              </div>
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 16 }} />
            <p style={{ fontSize: 12.5, color: plan.highlight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.44)", lineHeight: 1.55, marginBottom: 18, maxWidth: 360 }}>{meta[plan.id].note}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {plan.features.map((feat, fi) => (
                <div key={fi} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, background: "rgba(255,102,0,0.12)", border: "1px solid rgba(255,102,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={8} style={{ color: "#ff6600" }} />
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 300, lineHeight: 1.45 }}>{feat}</p>
                </div>
              ))}
            </div>
            <motion.button
              onClick={() => goToPlan(plan.id)}
              whileTap={{ scale: 0.97 }}
              style={{ width: "auto", minHeight: 42, padding: "11px 16px", borderRadius: 999, background: plan.highlight ? "#ff6600" : "transparent", border: plan.highlight ? "none" : "1px solid rgba(255,255,255,0.1)", color: plan.highlight ? "#fff" : "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, alignSelf: "flex-start" }}
            >
              {meta[plan.id].cta}
              <ArrowRight size={13} />
            </motion.button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function TestimonialsSection({ goToPlan, navigate }: { goToPlan: (id: string) => void; navigate: (to: string) => void }) {
  const { t } = useTranslation();
  const isMobile = useIsMobile(1100);
  const colRef = useRef(null);
  const ctaRef = useRef(null);

  const { scrollYProgress: colP } = useScroll({ target: colRef, offset: ["start end", "end start"] });
  const { scrollYProgress: ctaP } = useScroll({ target: ctaRef, offset: ["start end", "end start"] });

  // parallax só no desktop
  const col1Y = useTransform(colP, [0, 1], isMobile ? ["0px", "0px"] : ["40px", "-40px"]);
  const col2Y = useTransform(colP, [0, 1], isMobile ? ["0px", "0px"] : ["-30px", "30px"]);
  const col3Y = useTransform(colP, [0, 1], isMobile ? ["0px", "0px"] : ["20px", "-20px"]);
  const ctaScale = useTransform(ctaP, [0, 0.6], [0.94, 1]);
  const ctaOp    = useTransform(ctaP, [0, 0.3], [0, 1]);
  const testimonials = t("systemPage.testimonials", { returnObjects: true }) as SystemTestimonial[];
  const ctaChips = t("systemPage.ctaChips", { returnObjects: true }) as string[];

  return (
    <>
      {/* ── DEPOIMENTOS ── */}
      <section style={{ background: "#09090b", overflow: "hidden", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="sys-wrap">

          {/* header */}
          <div className="sys-test-header">
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.26em", color: "#ff6600", alignSelf: "center" }}>
              ◈ {t("systemPage.testimonialsEyebrow")}
            </motion.p>
            <div className="sys-test-title" style={{ fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.93 }}>
              <R delay={0}>{t("systemPage.testimonialsTitleA")}</R>
              <R delay={0.07}><span style={{ color: "#ff6600" }}>{t("systemPage.testimonialsTitleB")}</span></R>
            </div>
          </div>

          {/* grid depoimentos */}
          <div ref={colRef} className="sys-test-grid">

            {/* col 1 */}
            <motion.div className="sys-test-col1" style={{ y: col1Y }}>
              <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.7 }}
                style={{ padding: "32px 28px", borderRadius: 20, background: "#ff6600", marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(0,0,0,0.45)", marginBottom: 16 }}>{t("systemPage.featuredTestimonial")}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#000", letterSpacing: "-0.02em", lineHeight: 1.3, marginBottom: 20 }}>
                  "{testimonials[0]?.q}"
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#000" }}>{testimonials[0]?.a?.[0]}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#000" }}>{testimonials[0]?.a}</p>
                    <p style={{ fontSize: 10, color: "rgba(0,0,0,0.5)" }}>{testimonials[0]?.r}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: 0.15 }}
                style={{ padding: "24px 28px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-0.05em", color: "#fff", lineHeight: 1 }}>3×</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 6, lineHeight: 1.5 }}>
                  {t("systemPage.fasterStat")}
                </p>
              </motion.div>
            </motion.div>

            {/* col 2 */}
            <motion.div className="sys-test-col2" style={{ y: col2Y }}>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: 0.1 }}
                style={{ padding: "28px 24px", borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 16 }}>
                <p style={{ fontSize: 48, lineHeight: 0.7, color: "rgba(255,102,0,0.2)", fontWeight: 900, marginBottom: 12 }}>"</p>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, fontWeight: 300, marginBottom: 20 }}>{testimonials[1]?.q}</p>
                <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 14 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,102,0,0.1)", border: "1px solid rgba(255,102,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#ff6600" }}>{testimonials[1]?.a?.[0]}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{testimonials[1]?.a}</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{testimonials[1]?.r}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.25 }}
                style={{ padding: "16px 20px", borderRadius: 999, border: "1px solid rgba(255,102,0,0.2)", background: "rgba(255,102,0,0.06)", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff6600" }} />
                <p style={{ fontSize: 11, fontWeight: 600, color: "#ff6600" }}>{t("systemPage.activeFreelancers")}</p>
              </motion.div>
            </motion.div>

            {/* col 3 */}
            <motion.div className="sys-test-col3" style={{ y: col3Y }}>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: 0.2 }}
                style={{ padding: "28px 24px", borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 16 }}>
                <p style={{ fontSize: 48, lineHeight: 0.7, color: "rgba(255,102,0,0.2)", fontWeight: 900, marginBottom: 12 }}>"</p>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, fontWeight: 300, marginBottom: 20 }}>{testimonials[2]?.q}</p>
                <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 14 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,102,0,0.1)", border: "1px solid rgba(255,102,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#ff6600" }}>{testimonials[2]?.a?.[0]}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{testimonials[2]?.a}</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{testimonials[2]?.r}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: 0.3 }}
                style={{ padding: "22px 24px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1 }}>5min</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 5, lineHeight: 1.5 }}>
                  {t("systemPage.firstContractStat")}
                </p>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section ref={ctaRef} style={{ overflow: "hidden" }}>
        <motion.div style={{ scale: ctaScale, opacity: ctaOp, transformOrigin: "bottom center" }}>
          <div style={{ background: "#09090b", borderTop: "1px solid rgba(255,255,255,0.06)" }} className="sys-cta-outer">
            <div className="sys-wrap">
              <div className="sys-cta-grid">
                <div>
                  <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                    style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.26em", color: "#ff6600", marginBottom: 20 }}>
                    ◈ {t("systemPage.ctaEyebrow")}
                  </motion.p>
                  <div className="sys-cta-title" style={{ fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 0.9 }}>
                    <R delay={0}>{t("systemPage.ctaTitleA")}</R>
                    <R delay={0.07}>{t("systemPage.ctaTitleB")}</R>
                    <R delay={0.14}><span style={{ color: "rgba(255,255,255,0.18)" }}>{t("systemPage.ctaTitleC")}</span></R>
                  </div>
                </div>
                <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.25 }}
                  className="sys-cta-btns">
                  <motion.button onClick={() => goToPlan("free")}
                    whileHover={{ scale: 1.04, background: "#e55a00", boxShadow: "0 0 40px rgba(255,102,0,0.3)" }}
                    whileTap={{ scale: 0.97 }}
                    style={{ padding: "14px 26px", borderRadius: 999, background: "#ff6600", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                    {t("systemPage.createFree")}
                  </motion.button>
                  <motion.button onClick={() => navigate("/login")}
                    whileHover={{ scale: 1.04, borderColor: "rgba(255,255,255,0.2)" }}
                    whileTap={{ scale: 0.97 }}
                    style={{ padding: "14px 22px", borderRadius: 999, background: "transparent", border: "1.5px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.38)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                    {t("systemPage.alreadyHaveAccount")}
                  </motion.button>
                </motion.div>
              </div>

              <div className="sys-cta-foot">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {ctaChips.map(chip => (
                    <span key={chip} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.28)", fontWeight: 500 }}>{chip}</span>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.14)", letterSpacing: "0.06em", flexShrink: 0 }}>
                  {t("systemPage.footerLine")}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function System() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { status } = useSession();
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);
  const isMobile = useIsMobile(1100);
  const plans = t("systemPage.plans", { returnObjects: true }) as SystemPlan[];
  const maxFeatureRows = Math.max(...plans.map((plan) => plan.features.length));

  const goToPlan = (id: string) => {
    const logged = status === "authenticated";
    if (id === "free") {
      if (logged) { navigate("/propostas"); return; }
      setPostAuthRedirect("/propostas");
      navigate("/register"); return;
    }
    if (logged) { navigate(`/checkout/plano/${encodeURIComponent(id)}`); return; }
    setPostAuthRedirect(`/checkout/plano/${encodeURIComponent(id)}`);
    navigate("/register");
  };

  const headerRef = useRef(null);
  const plansRef  = useRef(null);
  const { scrollYProgress: hP } = useScroll({ target: headerRef, offset: ["start end", "end start"] });
  const hY2 = useTransform(hP, [0, 1], isMobile ? ["0px", "0px"] : ["-30px", "30px"]);

  return (
    <div style={{ background: "#09090b", color: "#fff", fontFamily: "'DM Sans','Inter',sans-serif", minHeight: "100vh", width: "100%", overflowX: "hidden" }}>

      <style>{`
        /* ─── wrappers ─── */
        .sys-wrap { max-width: 1200px; margin: 0 auto; padding: 0 56px; width: 100%; box-sizing: border-box; }

        /* ─── HEADER ─── */
        .sys-hdr-grid  { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .sys-hdr-left  { padding: 72px 56px 56px 0; border-right: 1px solid rgba(255,255,255,0.06); }
        .sys-hdr-right { padding: 72px 0 56px 56px; display: flex; flex-direction: column; justify-content: space-between; }
        .sys-hdr-title { font-size: clamp(36px,6vw,72px); }

        /* ─── PLANOS DESKTOP ─── */
        .sys-plans-row  { display: grid; grid-template-columns: 200px repeat(3,1fr); }
        .sys-plan-label { padding: 28px 40px 28px 0; border-right: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; }

        /* ─── DEPOIMENTOS ─── */
        .sys-test-header { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 48px 0 40px; }
        .sys-test-title  { font-size: clamp(24px,3.2vw,40px); text-align: right; }
        .sys-test-grid   { display: grid; grid-template-columns: 1.1fr 0.9fr 1fr; gap: 0; padding: 0 0 64px; align-items: start; }
        .sys-test-col1   { padding-top: 48px; padding-right: 32px; border-right: 1px solid rgba(255,255,255,0.06); }
        .sys-test-col2   { padding-top: 80px; padding-left: 24px; padding-right: 24px; border-right: 1px solid rgba(255,255,255,0.06); }
        .sys-test-col3   { padding-top: 32px; padding-left: 32px; }

        /* ─── CTA ─── */
        .sys-cta-outer { padding: 72px 0 0; }
        .sys-cta-grid  { display: grid; grid-template-columns: 1fr auto; align-items: flex-end; gap: 48px;
                         padding-bottom: 56px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .sys-cta-title { font-size: clamp(36px,6vw,76px); }
        .sys-cta-btns  { display: flex; flex-direction: column; gap: 10; flex-shrink: 0; }
        .sys-cta-foot  { display: flex; align-items: center; justify-content: space-between; padding: 20px 0; gap: 12px; flex-wrap: wrap; }

        /* ═══════════════ TABLET ═══════════════ */
        @media (max-width: 1100px) {
          .sys-wrap { padding: 0 32px !important; }

          .sys-hdr-grid  { grid-template-columns: 1fr !important; }
          .sys-hdr-left  { padding: 56px 0 28px !important; border-right: none !important;
                           border-bottom: 1px solid rgba(255,255,255,0.06); }
          .sys-hdr-right { padding: 28px 0 40px !important; gap: 24px; }
          .sys-hdr-title { font-size: clamp(34px, 7vw, 56px) !important; }

          .sys-test-header { grid-template-columns: 1fr !important; gap: 10px; padding: 36px 0 28px !important; }
          .sys-test-title  { text-align: left !important; font-size: clamp(24px, 5vw, 34px) !important; }
          .sys-test-grid   { grid-template-columns: 1fr !important; gap: 16px; padding: 24px 0 48px !important; }
          .sys-test-col1   { padding: 0 !important; border-right: none !important; }
          .sys-test-col2   { padding: 0 !important; border-right: none !important; }
          .sys-test-col3   { padding: 0 !important; }

          .sys-cta-outer { padding: 56px 0 0 !important; }
          .sys-cta-grid  { grid-template-columns: 1fr !important; align-items: flex-start !important; gap: 28px !important;
                           padding-bottom: 36px !important; }
          .sys-cta-title { font-size: clamp(34px, 7vw, 58px) !important; }
          .sys-cta-btns  { width: auto !important; flex-direction: row !important; flex-wrap: wrap !important; justify-content: flex-start !important; }
          .sys-cta-btns button { flex: 0 0 auto; padding: 12px 20px !important; font-size: 13px !important; }
        }

        /* ════════════════ MOBILE ════════════════ */
        @media (max-width: 767px) {
          .sys-wrap { padding: 0 20px !important; }

          /* HEADER */
          .sys-hdr-grid  { grid-template-columns: 1fr !important; }
          .sys-hdr-left  { padding: 44px 0 24px !important; border-right: none !important;
                           border-bottom: 1px solid rgba(255,255,255,0.06); }
          .sys-hdr-right { padding: 22px 0 32px !important; }
          .sys-hdr-title { font-size: clamp(32px,9vw,48px) !important; }

          /* DEPOIMENTOS */
          .sys-test-header { grid-template-columns: 1fr !important; gap: 10px; padding: 32px 0 24px !important; }
          .sys-test-title  { text-align: left !important; font-size: clamp(22px,7vw,32px) !important; }
          .sys-test-grid   { grid-template-columns: 1fr !important; gap: 16px; padding: 24px 0 40px !important; }
          .sys-test-col1   { padding: 0 !important; border-right: none !important; }
          .sys-test-col2   { padding: 0 !important; border-right: none !important; }
          .sys-test-col3   { padding: 0 !important; }

          /* CTA */
          .sys-cta-outer { padding: 40px 0 0 !important; }
          .sys-cta-grid  { grid-template-columns: 1fr !important; gap: 24px !important; padding-bottom: 28px !important; }
          .sys-cta-title { font-size: clamp(30px,8.5vw,48px) !important; }
          .sys-cta-btns  { flex-direction: row !important; flex-wrap: wrap !important; width: auto !important; gap: 10px !important; }
          .sys-cta-btns button { width: auto !important; flex: 0 0 auto !important; padding: 12px 18px !important; font-size: 13px !important; }
          .sys-cta-foot  { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; padding: 16px 0 !important; }
        }
      `}</style>

      <div className="noise-overlay" />
      <Navbar />

      {/* ══ HEADER ══ */}
      <section ref={headerRef} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div className="sys-wrap">
          <div className="sys-hdr-grid">

            <div className="sys-hdr-left">
              <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.26em", color: "#ff6600", marginBottom: 20 }}>
                ◈ {t("systemPage.headerEyebrow")}
              </motion.p>
              <div className="sys-hdr-title" style={{ fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 0.92 }}>
                <R delay={0}>{t("systemPage.headerTitleA")}</R>
                <R delay={0.07}>{t("systemPage.headerTitleB")}</R>
                <R delay={0.14}><span style={{ color: "rgba(255,255,255,0.2)" }}>{t("systemPage.headerTitleC")}</span></R>
              </div>
            </div>

            <motion.div style={{ y: hY2 }} className="sys-hdr-right">
              <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.25 }}
                style={{ fontSize: 15, color: "rgba(255,255,255,0.38)", lineHeight: 1.72, fontWeight: 300, maxWidth: 340 }}>
                {t("systemPage.headerBody")}
              </motion.p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ PLANOS ══ */}
      <section ref={plansRef} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

        {/* ── MOBILE: cards empilhados ── */}
        {isMobile && (
          <div style={{ padding: "32px 20px 0" }}>
            <PlanCardsRefined goToPlan={goToPlan} />
          </div>
        )}

        {/* ── DESKTOP: grid tabela ── */}
        {!isMobile && (
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>

            {/* nomes */}
            <div className="sys-plans-row">
              <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }} />
              {plans.map((plan, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.09 }}
                  onHoverStart={() => setHoveredPlan(i)}
                  onHoverEnd={() => setHoveredPlan(null)}
                  style={{
                    padding: "32px 40px 24px",
                    borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    background: hoveredPlan === i ? "rgba(255,102,0,0.03)" : "transparent",
                    transition: "background 0.25s", position: "relative",
                  }}>
                  <motion.div animate={{ scaleX: hoveredPlan === i ? 1 : 0 }} transition={{ duration: 0.3 }}
                    style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "#ff6600", transformOrigin: "left" }} />
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: plan.highlight ? "#ff6600" : "rgba(255,255,255,0.28)", marginBottom: 8 }}>{plan.tag}</p>
                  <p style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 900, letterSpacing: "-0.035em", color: "#fff" }}>{plan.name}</p>
                </motion.div>
              ))}
            </div>

            {/* preços */}
            <div className="sys-plans-row" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="sys-plan-label">
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(255,255,255,0.22)" }}>{t("systemPage.investment")}</p>
              </div>
              {plans.map((plan, i) => (
                <div key={i}
                  onMouseEnter={() => setHoveredPlan(i)} onMouseLeave={() => setHoveredPlan(null)}
                  style={{
                    padding: "24px 40px",
                    borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    background: hoveredPlan === i ? "rgba(255,102,0,0.03)" : "transparent",
                    transition: "background 0.25s",
                  }}>
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                    {plan.price === 0 ? (
                      <p style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.05em", color: "#fff", lineHeight: 1 }}>{t("systemPage.freePrice")}</p>
                    ) : (
                      <p style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.05em", color: "#fff", lineHeight: 1 }}>
                        <span style={{ fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>R$</span>
                        {plan.price}
                        <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>{t("systemPage.month")}</span>
                      </p>
                    )}
                  </motion.div>
                </div>
              ))}
            </div>

            {/* features */}
            {Array.from({ length: maxFeatureRows }).map((_, row) => (
              <div key={row} className="sys-plans-row" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }} />
                {plans.map((plan, col) => {
                  const feature = plan.features[row];

                  return (
                    <div key={col}
                      onMouseEnter={() => setHoveredPlan(col)} onMouseLeave={() => setHoveredPlan(null)}
                      style={{
                        padding: "16px 40px",
                        borderRight: col < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
                        background: hoveredPlan === col ? "rgba(255,102,0,0.03)" : "transparent",
                        transition: "background 0.25s",
                        display: "flex", alignItems: "center", gap: 10,
                        minHeight: 52,
                      }}>
                      {feature ? (
                        <>
                          <div style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, background: "rgba(255,102,0,0.12)", border: "1px solid rgba(255,102,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Check size={8} style={{ color: "#ff6600" }} />
                          </div>
                          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 300 }}>{feature}</p>
                        </>
                      ) : (
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.16)", fontWeight: 300 }}>—</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* botões */}
            <div className="sys-plans-row" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="sys-plan-label">
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(255,255,255,0.18)" }}>{t("systemPage.start")}</p>
              </div>
              {plans.map((plan, i) => (
                <div key={i}
                  onMouseEnter={() => setHoveredPlan(i)} onMouseLeave={() => setHoveredPlan(null)}
                  style={{
                    padding: "28px 40px",
                    borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    background: hoveredPlan === i ? "rgba(255,102,0,0.03)" : "transparent",
                    transition: "background 0.25s",
                  }}>
                  <motion.button onClick={() => goToPlan(plan.id)}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    style={{
                      width: "100%", padding: "12px 0", borderRadius: 999,
                      background: plan.highlight ? "#ff6600" : "transparent",
                      border: plan.highlight ? "none" : "1px solid rgba(255,255,255,0.1)",
                      color: plan.highlight ? "#fff" : "rgba(255,255,255,0.45)",
                      fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      transition: "all 0.2s",
                    }}>
                    {t(`systemPage.buttons.${plan.id}`)}
                    <ArrowRight size={13} />
                  </motion.button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <TestimonialsSection goToPlan={goToPlan} navigate={navigate} />

      <Footer />
    </div>
  );
}
