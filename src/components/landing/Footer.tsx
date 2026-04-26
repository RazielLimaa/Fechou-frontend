import { motion } from "framer-motion";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

function useIsMobile() {
  const [is, setIs] = useState(false);
  useEffect(() => {
    const c = () => setIs(window.innerWidth < 1100);
    c(); window.addEventListener("resize", c);
    return () => window.removeEventListener("resize", c);
  }, []);
  return is;
}

function FooterLink({ label, href }: { label: string; href: string }) {
  return (
    <motion.li initial="rest" whileHover="hover" animate="rest" style={{ listStyle: "none" }}>
      <Link href={href}>
        <motion.span style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <motion.span variants={{ rest: { opacity: 0, scale: 0, x: -4 }, hover: { opacity: 1, scale: 1, x: 0 } }} transition={{ duration: 0.18 }}
            style={{ width: 3, height: 3, borderRadius: "50%", background: "#ff6600", flexShrink: 0 }} />
          <motion.span variants={{ rest: { color: "rgba(255,255,255,0.3)", x: 0 }, hover: { color: "#fff", x: 3 } }} transition={{ duration: 0.18 }}
            style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.02em" }}>
            {label}
          </motion.span>
        </motion.span>
      </Link>
    </motion.li>
  );
}

export default function Footer() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const links = {
    [t("footer.product")]: [
      { label: t("footer.features"), href: "/" },
      { label: t("footer.pricing"), href: "/system" },
      { label: t("footer.vision"), href: "/vision" },
    ],
    [t("footer.legal")]: [
      { label: t("common.privacy"), href: "/privacidade" },
      { label: t("common.terms"), href: "/termos" },
      { label: t("footer.security"), href: "/seguranca" },
      { label: t("footer.signatures"), href: "/assinaturas-e-dados-contratuais" },
    ],
  };

  if (isMobile) {
    return (
      <footer style={{ background: "#09090b", color: "#fff", fontFamily: "'DM Sans','Inter',sans-serif", borderTop: "1px solid rgba(255,255,255,0.06)" }}>

        {/* ── LOGO + tagline ── */}
        <div style={{ padding: "44px 20px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <motion.h2 initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="font-display"
            style={{ fontSize: "clamp(1.8rem, 9vw, 3.2rem)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 0.88, margin: "0 0 16px" }}>
            FECHOU<span style={{ color: "#ff6600", fontStyle: "italic", textShadow: "0 0 32px rgba(255,102,0,0.4)" }}>!</span>
          </motion.h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.32)", fontWeight: 300, lineHeight: 1.6, maxWidth: 260 }}>
            {t("footer.tagline")}
          </p>

          {/* status pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 20 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.6)" }} />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.18em" }}>
              {t("footer.systemsShort")}
            </span>
          </div>
        </div>

        {/* ── CTA pill mobile ── */}
        <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/register">
            <motion.div whileTap={{ scale: 0.97 }}
              style={{ padding: "14px 20px", borderRadius: 999, background: "#ff6600", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "0 0 24px rgba(255,102,0,0.2)" }}>
              {t("common.createFreeAccountArrow")}
            </motion.div>
          </Link>
        </div>

        {/* ── GRID de links — 2 colunas ── */}
        <div style={{ padding: "28px 20px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {Object.entries(links).map(([cat, items], ci) => (
            <motion.div key={cat} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: ci * 0.08 }}>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "#ff6600", marginBottom: 14 }}>{cat}</p>
              <ul style={{ display: "flex", flexDirection: "column", gap: 10, margin: 0, padding: 0 }}>
                {items.map(item => (
                  <li key={item.label} style={{ listStyle: "none" }}>
                    <Link href={item.href}>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* ── rodapé ── */}
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", letterSpacing: "0.04em" }}>
            © {new Date().getFullYear()} Fechou!
          </p>
          <div style={{ display: "flex", gap: 16 }}>
            {[t("common.privacy"), t("common.terms")].map(label => (
              <a key={label} href="#" style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", textDecoration: "none" }}>{label}</a>
            ))}
          </div>
        </div>
      </footer>
    );
  }

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  return (
    <footer style={{ background: "#09090b", color: "#fff", fontFamily: "'DM Sans','Inter',sans-serif", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 56px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "stretch", gap: 0 }}>
          <div style={{ padding: "64px 0 56px", borderRight: "1px solid rgba(255,255,255,0.06)", paddingRight: 64, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="font-display"
                style={{ fontSize: "clamp(48px, 8vw, 96px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 0.88, margin: "0 0 20px" }}>
                <span className="text-reveal">FECHOU</span>
                <span style={{ color: "#ff6600", fontStyle: "italic", textShadow: "0 0 40px rgba(255,102,0,0.5), 0 0 80px rgba(255,102,0,0.2)" }}>!</span>
              </motion.h2>
              <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.15 }}
                style={{ fontSize: 13, color: "rgba(255,255,255,0.32)", fontWeight: 300, lineHeight: 1.65, maxWidth: 280 }}>
                {t("footer.tagline")}
              </motion.p>
            </div>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.25 }}
              style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 40 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px rgba(34,197,94,0.6)" }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.18em" }}>{t("footer.systemsOk")}</span>
            </motion.div>
          </div>
          <div style={{ paddingLeft: 64, padding: "64px 0 56px 64px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 320 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 48px" }}>
              {Object.entries(links).map(([cat, items], ci) => (
                <motion.div key={cat} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: ci * 0.1 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "#ff6600", marginBottom: 16 }}>{cat}</p>
                  <ul style={{ display: "flex", flexDirection: "column", gap: 10, margin: 0, padding: 0 }}>
                    {items.map(item => (
                      <motion.li key={item.label} initial="rest" whileHover="hover" animate="rest" style={{ listStyle: "none" }}>
                        <Link href={item.href}>
                          <motion.span style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                            <motion.span variants={{ rest: { opacity: 0, scale: 0, x: -4 }, hover: { opacity: 1, scale: 1, x: 0 } }} transition={{ duration: 0.18 }}
                              style={{ width: 3, height: 3, borderRadius: "50%", background: "#ff6600", flexShrink: 0 }} />
                            <motion.span variants={{ rest: { color: "rgba(255,255,255,0.3)", x: 0 }, hover: { color: "#fff", x: 3 } }} transition={{ duration: 0.18 }}
                              style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.02em" }}>
                              {item.label}
                            </motion.span>
                          </motion.span>
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }} style={{ marginTop: 40 }}>
              <Link href="/register">
                <motion.span whileHover={{ scale: 1.04, boxShadow: "0 0 24px rgba(255,102,0,0.32)" }} whileTap={{ scale: 0.97 }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 20px", borderRadius: 999, background: "#ff6600", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.14em" }}>
                  {t("common.createFreeAccount")} <span style={{ fontSize: 13 }}>-&gt;</span>
                </motion.span>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "18px 56px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", letterSpacing: "0.04em" }}>© {new Date().getFullYear()} Fechou! · {t("footer.copyright")}</p>
          <div style={{ display: "flex", gap: 20 }}>
            {[t("common.privacy"), t("common.terms")].map(label => (
              <motion.a key={label} href="#" whileHover={{ color: "#ff6600" }}
                style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", textDecoration: "none", letterSpacing: "0.04em", transition: "color 0.15s" }}>{label}</motion.a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
