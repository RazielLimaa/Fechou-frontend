import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";

function useIsMobile() {
  const [is, setIs] = useState(false);
  useEffect(() => {
    const c = () => setIs(window.innerWidth < 768);
    c(); window.addEventListener("resize", c);
    return () => window.removeEventListener("resize", c);
  }, []);
  return is;
}

function R({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.span style={{ display: "block" }}
      initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.72, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.span>
  );
}

const ITEMS = [
  { n: "01", title: "Contratos em minutos", body: "Templates para +10 tipos de serviço. Escopo, cláusulas e valores — você preenche, a plataforma formata.", tag: "Criação", icon: "⌨" },
  { n: "02", title: "Cliente assina pelo link", body: "Envie um link seguro. Seu cliente assina com validade jurídica sem precisar baixar nada.", tag: "Assinatura", icon: "◉" },
  { n: "03", title: "Receba via PIX direto", body: "Configure sua chave. Libere o pagamento após a assinatura. Sem intermediários.", tag: "Pagamento", icon: "◆" },
  { n: "04", title: "Sua identidade visual", body: "Logo, cor e fonte personalizados. Seu contrato, sua marca, sua credibilidade.", tag: "Design", icon: "◎" },
];

export default function Narrative() {
  const [active, setActive] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const imgRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: imgRef, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  const imgScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.15, 1.05, 1.15]);

  // ── MOBILE ─────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <section style={{ background: "#09090b", color: "#fff", fontFamily: "'DM Sans','Inter',sans-serif", overflow: "hidden" }}>

        {/* ── HEADER MOBILE com número decorativo ── */}
        <div style={{ padding: "52px 20px 36px", position: "relative", overflow: "hidden" }}>
          {/* número outline gigante de fundo */}
          <div style={{ position: "absolute", top: -10, right: -10, fontSize: "45vw", fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 1, color: "transparent", WebkitTextStroke: "1px rgba(255,255,255,0.05)", userSelect: "none", pointerEvents: "none" }}>
            02
          </div>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.26em", color: "#ff6600", marginBottom: 16, position: "relative" }}>
            ◈ Por que a Fechou?
          </motion.p>
          <div style={{ position: "relative" }}>
            <h2 style={{ fontSize: "clamp(28px, 8.5vw, 40px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, margin: "0 0 18px" }}>
              <R delay={0}>Pare de negociar</R>
              <R delay={0.08}>no WhatsApp.</R>
              <R delay={0.16}><span style={{ color: "rgba(255,255,255,0.22)" }}>Feche com classe.</span></R>
            </h2>
            <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
              style={{ fontSize: 14, color: "rgba(255,255,255,0.38)", lineHeight: 1.7, fontWeight: 300, maxWidth: 300 }}>
              Propostas profissionais em segundos, acompanhe suas vendas e receba com segurança.
            </motion.p>
          </div>
          <motion.button initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.45 }}
            whileTap={{ scale: 0.97 }}
            style={{ marginTop: 24, padding: "13px 28px", borderRadius: 999, background: "#ff6600", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", width: "100%", boxShadow: "0 0 24px rgba(255,102,0,0.2)" }}>
            Criar conta grátis →
          </motion.button>
        </div>

        {/* ── GRID 2×2 de features — cards estilosos ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "rgba(255,255,255,0.06)", margin: "0 0 1px" }}>
          {ITEMS.map((item, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              onClick={() => setExpanded(expanded === i ? null : i)}
              style={{
                background: expanded === i ? "rgba(255,102,0,0.06)" : "#09090b",
                padding: "20px 16px",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                transition: "background 0.3s",
                aspectRatio: "1 / 1",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
              }}>
              {/* linha laranja topo quando ativo */}
              <motion.div animate={{ scaleX: expanded === i ? 1 : 0 }} transition={{ duration: 0.3 }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "#ff6600", transformOrigin: "left" }} />

              {/* número + ícone */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: expanded === i ? "#ff6600" : "rgba(255,255,255,0.2)", transition: "color 0.2s" }}>
                  {item.n}
                </span>
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: expanded === i ? "rgba(255,102,0,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${expanded === i ? "rgba(255,102,0,0.3)" : "rgba(255,255,255,0.08)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, color: "#ff6600", transition: "all 0.2s",
                }}>
                  {item.icon}
                </div>
              </div>

              {/* título */}
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: expanded === i ? "#fff" : "rgba(255,255,255,0.7)", letterSpacing: "-0.02em", lineHeight: 1.2, margin: "12px 0 0", transition: "color 0.2s" }}>
                  {item.title}
                </p>

                {/* corpo — expande ao toque */}
                <motion.div
                  animate={{ height: expanded === i ? "auto" : 0, opacity: expanded === i ? 1 : 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ overflow: "hidden" }}>
                  <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, fontWeight: 300, marginTop: 8 }}>
                    {item.body}
                  </p>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "#ff6600", border: "1px solid rgba(255,102,0,0.3)", borderRadius: 999, padding: "2px 8px", display: "inline-block", marginTop: 8 }}>
                    {item.tag}
                  </span>
                </motion.div>
              </div>

              {/* + / × */}
              <motion.span animate={{ rotate: expanded === i ? 45 : 0 }} transition={{ duration: 0.2 }}
                style={{ position: "absolute", bottom: 14, right: 18, fontSize: 18, color: expanded === i ? "#ff6600" : "rgba(255,255,255,0.15)", lineHeight: 1 }}>
                +
              </motion.span>
            </motion.div>
          ))}
        </div>

        {/* ── CARD STAT: 5min laranja ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ margin: "1px 0 0", background: "#ff6600", padding: "28px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(0,0,0,0.45)", marginBottom: 8 }}>
              Tempo médio
            </p>
            <p style={{ fontSize: 52, fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 0.85, color: "#000", margin: 0 }}>
              5<span style={{ fontSize: 24 }}>min</span>
            </p>
            <p style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", marginTop: 8 }}>
              do zero ao contrato enviado
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            {["R$ 0 para começar", "Sem cartão", "AES-256"].map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(0,0,0,0.35)" }} />
                <p style={{ fontSize: 11, color: "rgba(0,0,0,0.55)", fontWeight: 600, whiteSpace: "nowrap" }}>{t}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── FRASE TIPOGRÁFICA + dois cards plano ── */}
        <div style={{ padding: "44px 20px 0" }}>
          <div style={{ fontSize: "clamp(24px, 7.5vw, 36px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, marginBottom: 28 }}>
            <R delay={0}>Um contrato bem feito</R>
            <R delay={0.08}>não é detalhe —</R>
            <R delay={0.16}>
              é o que separa{" "}
              <span style={{ color: "#ff6600", fontStyle: "italic", textDecoration: "underline", textDecorationColor: "rgba(255,102,0,0.3)", textDecorationThickness: 2, textUnderlineOffset: 5 }}>
                profissionais
              </span>
            </R>
            <R delay={0.22}><span style={{ color: "rgba(255,255,255,0.18)" }}>de amadores.</span></R>
          </div>
        </div>

        {/* planos mobile — lado a lado */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "0 20px 48px" }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            style={{ aspectRatio: "1 / 1", padding: "22px 16px", background: "#ff6600", borderRadius: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(0,0,0,0.45)" }}>Gratuito</p>
            <div>
              <p style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: "#000" }}>R$ 0</p>
              <p style={{ fontSize: 11, color: "rgba(0,0,0,0.5)", marginTop: 6, lineHeight: 1.5 }}>Contratos ilimitados. Para sempre.</p>
            </div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(0,0,0,0.45)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Começar →</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.18 }}
            style={{ aspectRatio: "1 / 1", padding: "22px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "#ff6600" }}>Pro & Premium</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.3 }}>Logo própria e PDF sem marca d'água.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {["Sua logo", "PDF limpo", "Cor primária"].map((t) => (
                <span key={t} style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>· {t}</span>
              ))}
            </div>
          </motion.div>
        </div>

      </section>
    );
  }

  // ── DESKTOP (original) ───────────────────────────────────────────────────
  return (
    <section style={{ background: "#09090b", color: "#fff", fontFamily: "'DM Sans','Inter',sans-serif", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ padding: "72px 56px 64px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            style={{ fontSize: "clamp(100px, 18vw, 220px)", fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 0.85, color: "transparent", WebkitTextStroke: "1px rgba(255,255,255,0.29)", userSelect: "none", margin: 0 }}>
            02
          </motion.p>
          <div>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.26em", color: "#ff6600", marginBottom: 24 }}>
              ◈ Por que a Fechou?
            </motion.p>
            <h2 style={{ fontSize: "clamp(34px, 4vw, 52px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, margin: "0 0 32px" }}>
              <R delay={0}>Pare de negociar</R>
              <R delay={0.08}>no WhatsApp.</R>
              <R delay={0.16}><span style={{ color: "rgba(255,255,255,0.22)" }}>Feche com classe.</span></R>
            </h2>
            <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.35 }}
              style={{ fontSize: 15, color: "rgba(255,255,255,0.38)", lineHeight: 1.75, fontWeight: 300, maxWidth: 360 }}>
              Com a Fechou! você envia propostas profissionais em segundos, acompanha suas vendas e recebe com segurança.
            </motion.p>
            <motion.button initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.03, background: "#e55a00" }} whileTap={{ scale: 0.97 }}
              style={{ marginTop: 36, padding: "13px 28px", borderRadius: 999, background: "#ff6600", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s" }}>
              Criar conta grátis →
            </motion.button>
          </div>
        </div>
        <div ref={imgRef} style={{ position: "relative", overflow: "hidden" }}>
          <motion.img src="./publicpeople.png" alt="Profissional"
            style={{ width: "100%", height: "100%", objectFit: "cover", y: imgY, scale: imgScale }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(9,9,11,0.5) 0%, transparent 40%)" }} />
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {ITEMS.map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            onHoverStart={() => setActive(i)} onHoverEnd={() => setActive(null)}
            style={{ display: "grid", gridTemplateColumns: "72px 1fr auto", alignItems: "center", gap: 0, padding: "32px 64px", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "default", position: "relative", overflow: "hidden", transition: "background 0.3s", background: active === i ? "rgba(255,102,0,0.04)" : "transparent" }}>
            <motion.div animate={{ scaleX: active === i ? 1 : 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: "absolute", inset: 0, background: "rgba(255,102,0,0.03)", transformOrigin: "left", zIndex: 0 }} />
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: active === i ? "#ff6600" : "rgba(255,255,255,0.18)", transition: "color 0.2s", position: "relative", zIndex: 1 }}>{item.n}</p>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
                <p style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 300, letterSpacing: "-0.025em", color: active === i ? "#fff" : "rgba(255,255,255,0.6)", transition: "color 0.2s", margin: 0 }}>{item.title}</p>
                <motion.span animate={{ opacity: active === i ? 1 : 0, x: active === i ? 0 : -8 }} transition={{ duration: 0.2 }}
                  style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "#ff6600", border: "1px solid rgba(255,102,0,0.3)", borderRadius: 999, padding: "2px 10px" }}>
                  {item.tag}
                </motion.span>
              </div>
              <motion.p animate={{ height: active === i ? "auto" : 0, opacity: active === i ? 1 : 0, marginTop: active === i ? 8 : 0 }} transition={{ duration: 0.25 }}
                style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", lineHeight: 1.65, overflow: "hidden", fontWeight: 300, maxWidth: 480 }}>
                {item.body}
              </motion.p>
            </div>
            <motion.div animate={{ opacity: active === i ? 1 : 0, x: active === i ? 0 : 12 }} transition={{ duration: 0.25 }}
              style={{ position: "relative", zIndex: 1, color: "#ff6600", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" /></svg>
            </motion.div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ padding: "72px 64px", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: "clamp(32px, 4.5vw, 58px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95 }}>
            <R delay={0}>Um contrato bem feito</R>
            <R delay={0.08}>não é detalhe —</R>
            <R delay={0.16}>é o que separa{" "}<span style={{ color: "#ff6600", fontStyle: "italic", textDecoration: "underline", textDecorationColor: "rgba(255,102,0,0.3)", textDecorationThickness: 2, textUnderlineOffset: 6 }}>profissionais</span></R>
            <R delay={0.22}><span style={{ color: "rgba(255,255,255,0.18)" }}>de amadores.</span></R>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }}
            style={{ flex: 1, padding: "36px 32px", background: "#ff6600", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(0,0,0,0.45)" }}>Plano gratuito</p>
            <div>
              <p style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: "#000" }}>R$ 0</p>
              <p style={{ fontSize: 13, color: "rgba(0,0,0,0.5)", marginTop: 8, lineHeight: 1.6 }}>Contratos ilimitados, assinatura digital e PDF profissional — sem pagar nada.</p>
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(0,0,0,0.45)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Comece agora →</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 }}
            style={{ flex: 1, padding: "36px 32px", background: "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "#ff6600" }}>Pro & Premium</p>
            <div>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.2 }}>Logo própria, fontes personalizadas e contratos sem marca d'água.</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Sua logo", "PDF sem marca", "Cor primária"].map((t) => (
                <span key={t} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)" }}>{t}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}