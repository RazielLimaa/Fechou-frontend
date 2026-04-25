import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

type CompareRow = {
  before: string;
  after: string;
};

type BulletCopy = {
  title: string;
  body: string;
};

function useIsMobile() {
  const [is, setIs] = useState(false);
  useEffect(() => {
    const c = () => setIs(window.innerWidth < 1100);
    c(); window.addEventListener("resize", c);
    return () => window.removeEventListener("resize", c);
  }, []);
  return is;
}

function R({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.span style={{ display: "block" }}
      initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.span>
  );
}

const BULLET_META = [
  { n: "01", icon: "⌨" },
  { n: "02", icon: "◉" },
  { n: "03", icon: "◆" },
  { n: "04", icon: "◎" },
  { n: "05", icon: "◷" },
  { n: "06", icon: "✦" },
];

export default function Features() {
  const { t } = useTranslation();
  const [hov, setHov] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const [, navigate] = useLocation();
  const compare = t("features.compare", { returnObjects: true }) as CompareRow[];
  const bulletCopies = t("features.bullets", { returnObjects: true }) as BulletCopy[];
  const bullets = BULLET_META.map((meta, index) => ({
    ...meta,
    title: bulletCopies[index]?.title ?? "",
    body: bulletCopies[index]?.body ?? "",
  }));
  const ctaPills = t("features.cta.pills", { returnObjects: true }) as string[];
  const ctaPillsMobile = t("features.cta.pillsMobile", { returnObjects: true }) as string[];
  const averageItems = t("features.average.items", { returnObjects: true }) as string[];

  // ── MOBILE ─────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <section style={{ background: "#09090b", color: "#fff", fontFamily: "'DM Sans','Inter',sans-serif" }}>

        {/* ── HEADER: A diferença é clara ── */}
        <div style={{ padding: "48px 20px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.26em", color: "#ff6600", marginBottom: 14 }}>
            ◈ {t("features.eyebrow")}
          </p>
          <div style={{ fontSize: "clamp(24px, 7.5vw, 36px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.0, color: "#fff" }}>
            <R delay={0}>{t("features.headline.line1")}</R>
            <R delay={0.07}>{t("features.headline.line2")} <em style={{ color: "rgba(255,255,255,0.22)", fontStyle: "italic" }}>{t("features.headline.line2Em")}</em></R>
            <R delay={0.14}>{t("features.headline.line3")} <em style={{ color: "#ff6600", fontStyle: "normal" }}>{t("features.headline.line3Em")}</em></R>
          </div>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
            style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", lineHeight: 1.7, fontWeight: 300, marginTop: 16 }}>
            {t("features.proof.prefix")}{" "}
            <strong style={{ color: "#fff", fontWeight: 700 }}>{t("features.proof.strong")}</strong>{" "}
            {t("features.proof.suffix")}
          </motion.p>
        </div>

        {/* ── ANTES × DEPOIS — swipe visual estiloso ── */}
        <div style={{ padding: "0 20px" }}>
          {/* labels */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "14px 0 10px" }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)" }}>{t("features.labels.without")}</p>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#ff6600", textAlign: "right" }}>{t("features.labels.with")}</p>
          </div>

          {compare.map((row, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-10px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "14px 0", gap: 12, alignItems: "start" }}>
              {/* antes */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                  <path d="M3 3l8 8M11 3L3 11" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", fontWeight: 300, lineHeight: 1.4, margin: 0 }}>{row.before}</p>
              </div>
              {/* depois */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                  <circle cx="7" cy="7" r="6" fill="rgba(255,102,0,0.15)" stroke="rgba(255,102,0,0.4)" strokeWidth="1"/>
                  <path d="M4.5 7l1.8 1.8L9.5 5" stroke="#ff6600" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p style={{ fontSize: 12, color: "#fff", fontWeight: 500, lineHeight: 1.4, margin: 0 }}>{row.after}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── BULLETS GRID 3 colunas — compacto e estiloso ── */}
        <div style={{ padding: "32px 20px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "#ff6600", marginBottom: 20 }}>
            ◈ {t("features.bulletsEyebrow")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
            {bullets.map((b, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10px" }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                style={{
                  aspectRatio: "1 / 1",
                  padding: "12px 10px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  position: "relative", overflow: "hidden",
                }}>
                {/* ícone */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(255,102,0,0.1)", border: "1px solid rgba(255,102,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#ff6600" }}>
                    {b.icon}
                  </div>
                  <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,102,0,0.3)", letterSpacing: "0.12em" }}>{b.n}</span>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "-0.01em", lineHeight: 1.2, margin: "0 0 3px" }}>{b.title}</p>
                  <p style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", lineHeight: 1.4, fontWeight: 300, margin: 0 }}>{b.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── CTA banner laranja ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ margin: "32px 0 0", background: "#ff6600", padding: "32px 20px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "rgba(0,0,0,0.45)", marginBottom: 10 }}>
            ◈ {t("features.cta.eyebrow")}
          </p>
          <p style={{ fontSize: "clamp(22px, 6.5vw, 32px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, color: "#000", marginBottom: 12 }}>
            {t("features.cta.titleStart")}{" "}
            <em style={{ fontStyle: "italic", color: "rgba(0,0,0,0.45)" }}>{t("features.cta.titleEm")}</em>
          </p>
          <p style={{ fontSize: 13, color: "rgba(0,0,0,0.5)", fontWeight: 300, lineHeight: 1.6, marginBottom: 20 }}>
            {t("features.cta.bodyMobile")}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {ctaPillsMobile.map((pill) => (
              <span key={pill} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 999, background: "rgba(0,0,0,0.1)", color: "rgba(0,0,0,0.55)", fontWeight: 600 }}>{pill}</span>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <motion.button onClick={() => navigate("/register")} whileTap={{ scale: 0.97 }}
              style={{ padding: "14px", borderRadius: 999, background: "#000", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {t("features.cta.primaryButton")}
            </motion.button>
            <motion.button onClick={() => navigate("/system")} whileTap={{ scale: 0.97 }}
              style={{ padding: "13px", borderRadius: 999, background: "transparent", border: "1.5px solid rgba(0,0,0,0.2)", color: "rgba(0,0,0,0.55)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {t("features.cta.secondaryButton")}
            </motion.button>
          </div>
        </motion.div>

      </section>
    );
  }

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  return (
    <section style={{ background: "#09090b", color: "#fff", fontFamily: "'DM Sans','Inter',sans-serif" }}>
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 56px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ padding: "36px 48px 28px 0", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.26em", color: "#ff6600", marginBottom: 14 }}>◈ {t("features.eyebrow")}</p>
              <div style={{ fontSize: "clamp(28px, 3.8vw, 44px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, color: "#fff" }}>
                <R delay={0}>{t("features.headline.line1")}</R>
                <R delay={0.07}>{t("features.headline.line2")} <em style={{ color: "rgba(255,255,255,0.22)", fontStyle: "italic" }}>{t("features.headline.line2Em")}</em></R>
                <R delay={0.14}>{t("features.headline.line3")} <em style={{ color: "#ff6600", fontStyle: "normal" }}>{t("features.headline.line3Em")}</em></R>
              </div>
            </div>
            <div style={{ padding: "36px 0 28px 48px", display: "flex", alignItems: "center" }}>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, fontWeight: 300 }}>
                {t("features.proof.prefix")} <strong style={{ color: "#fff", fontWeight: 700 }}>{t("features.proof.strong")}</strong> {t("features.proof.desktopSuffix")}
              </p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 36px 1fr" }}>
            <div style={{ padding: "20px 0 12px", borderRight: "1px solid rgba(255,255,255,0.06)", paddingRight: 48 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.18)" }}>{t("features.labels.without")}</p>
            </div>
            <div />
            <div style={{ padding: "20px 0 12px 48px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#ff6600" }}>{t("features.labels.with")}</p>
            </div>
          </div>
          {compare.map((row, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-20px" }} transition={{ duration: 0.5, delay: i * 0.06 }}
              style={{ display: "grid", gridTemplateColumns: "1fr 36px 1fr", borderTop: "1px solid rgba(255,255,255,0.05)", alignItems: "center" }}>
              <div style={{ padding: "20px 48px 20px 0", display: "flex", alignItems: "center", gap: 12, borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}><path d="M3 3l8 8M11 3L3 11" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <p style={{ fontSize: "clamp(13px, 1.4vw, 15px)", color: "rgba(255,255,255,0.3)", fontWeight: 300, lineHeight: 1.4 }}>{row.before}</p>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="rgba(255,102,0,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ padding: "20px 0 20px 48px", display: "flex", alignItems: "center", gap: 12 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="7" cy="7" r="6" fill="rgba(255,102,0,0.15)" stroke="rgba(255,102,0,0.4)" strokeWidth="1"/>
                  <path d="M4.5 7l1.8 1.8L9.5 5" stroke="#ff6600" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p style={{ fontSize: "clamp(13px, 1.4vw, 15px)", color: "#fff", fontWeight: 500, lineHeight: 1.4 }}>{row.after}</p>
              </div>
            </motion.div>
          ))}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} />
        </div>
      </div>

      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 56px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 0 }}>
            <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                {bullets.map((b, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-20px" }}
                    transition={{ duration: 0.55, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                    onHoverStart={() => setHov(i)} onHoverEnd={() => setHov(null)}
                    style={{ aspectRatio: "1 / 1", padding: "28px 24px", borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.05)" : "none", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none", background: hov === i ? "rgba(255,102,0,0.04)" : "transparent", transition: "background 0.25s", cursor: "default", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <motion.div animate={{ scaleX: hov === i ? 1 : 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "#ff6600", transformOrigin: "left" }} />
                    <p style={{ fontSize: 11, fontWeight: 700, color: hov === i ? "#ff6600" : "rgba(255,255,255,0.2)", letterSpacing: "0.14em", transition: "color 0.2s" }}>{b.n}</p>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: hov === i ? "#fff" : "rgba(255,255,255,0.75)", letterSpacing: "-0.02em", marginBottom: 8, transition: "color 0.2s" }}>{b.title}</p>
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.32)", lineHeight: 1.6, fontWeight: 300 }}>{b.body}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                style={{ flex: 1, padding: "36px 32px", background: "#ff6600", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(0,0,0,0.45)", marginBottom: 20 }}>{t("features.average.label")}</p>
                  <p style={{ fontSize: 72, fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 0.85, color: "#000" }}>5<span style={{ fontSize: 32 }}>min</span></p>
                  <p style={{ fontSize: 13, color: "rgba(0,0,0,0.5)", marginTop: 12, lineHeight: 1.55 }}>{t("features.average.body")}</p>
                </div>
                <div style={{ marginTop: 28 }}>
                  {averageItems.map((item) => (
                    <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(0,0,0,0.3)", flexShrink: 0 }} />
                      <p style={{ fontSize: 12, color: "rgba(0,0,0,0.55)", fontWeight: 500 }}>{item}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
                style={{ padding: "32px", background: "rgba(255,255,255,0.03)" }}>
                <p style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2, color: "#fff" }}>{t("features.quote.title")}</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", marginTop: 10, lineHeight: 1.6 }}>{t("features.quote.body")}</p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }} style={{ background: "#ff6600" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "52px 56px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 40 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "rgba(0,0,0,0.45)", marginBottom: 12 }}>◈ {t("features.cta.eyebrow")}</p>
              <p style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, color: "#000", marginBottom: 14 }}>
                {t("features.cta.titleStart")} <em style={{ fontStyle: "italic", color: "rgba(0,0,0,0.5)" }}>{t("features.cta.titleEm")}</em>
              </p>
              <p style={{ fontSize: 14, color: "rgba(0,0,0,0.5)", fontWeight: 300, lineHeight: 1.6 }}>{t("features.cta.bodyDesktop")}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
                {ctaPills.map((pill) => (
                  <span key={pill} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 999, background: "rgba(0,0,0,0.1)", color: "rgba(0,0,0,0.55)", fontWeight: 600 }}>{pill}</span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
              <motion.button onClick={() => navigate("/register")} whileHover={{ scale: 1.04, background: "#09090b" }} whileTap={{ scale: 0.97 }}
                style={{ padding: "15px 36px", borderRadius: 999, background: "#000", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "background 0.2s" }}>
                {t("features.cta.primaryButton")}
              </motion.button>
              <motion.button onClick={() => navigate("/system")} whileHover={{ scale: 1.04, background: "rgba(0,0,0,0.12)" }} whileTap={{ scale: 0.97 }}
                style={{ padding: "15px 36px", borderRadius: 999, background: "transparent", border: "1.5px solid rgba(0,0,0,0.2)", color: "rgba(0,0,0,0.55)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                {t("features.cta.secondaryButton")}
              </motion.button>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.1)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 56px" }}>
            <p style={{ fontSize: 11, color: "rgba(0,0,0,0.35)", letterSpacing: "0.06em" }}>{t("features.cta.footer")}</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
