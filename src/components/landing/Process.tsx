import { motion } from "framer-motion";
import { useRef, useEffect, useState } from "react";

function useIsMobile() {
  const [is, setIs] = useState(false);
  useEffect(() => {
    const c = () => setIs(window.innerWidth < 768);
    c(); window.addEventListener("resize", c);
    return () => window.removeEventListener("resize", c);
  }, []);
  return is;
}

const steps = [
  { num: "01", title: "Escolha o Template", desc: "Selecione entre dezenas de templates profissionais. Personalize com sua marca em segundos.", color: "rgba(255,255,255,0.03)" },
  { num: "02", title: "Envie a Proposta", desc: "Compartilhe com um link. Seu cliente recebe uma proposta elegante que transmite confiança.", color: "rgba(255,102,0,0.06)" },
  { num: "03", title: "Feche o Contrato", desc: "Aceite digital com registro. Acompanhe tudo no seu dashboard e veja suas vendas crescerem.", color: "rgba(255,255,255,0.03)" },
];

export default function Process() {
  const ref = useRef(null);
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <section style={{ background: "#09090b", color: "#fff", fontFamily: "'DM Sans','Inter',sans-serif", padding: "52px 0 48px", overflow: "hidden" }}>

        {/* header mobile */}
        <div style={{ padding: "0 20px 36px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.26em", color: "#ff6600", marginBottom: 12 }}>
            Como Funciona
          </p>
          <h2 style={{ fontSize: "clamp(26px, 7.5vw, 36px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, margin: 0 }}>
            Do primeiro contato<br />ao{" "}
            <span style={{ color: "#ff6600", fontStyle: "italic" }}>Fechou!</span>
          </h2>
        </div>

        {/* timeline vertical estilosa */}
        <div style={{ position: "relative", padding: "0 20px" }}>
          {/* linha vertical laranja */}
          <div style={{ position: "absolute", left: 48, top: 0, bottom: 0, width: 1, background: "linear-gradient(to bottom, transparent, rgba(255,102,0,0.3) 15%, rgba(255,102,0,0.3) 85%, transparent)" }} />

          {steps.map((step, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: "flex", gap: 20, marginBottom: i < steps.length - 1 ? 32 : 0, alignItems: "flex-start" }}>

              {/* número com dot na linha */}
              <div style={{ flexShrink: 0, width: 56, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: i === 1 ? "#ff6600" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${i === 1 ? "#ff6600" : "rgba(255,102,0,0.3)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 1, position: "relative",
                }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: i === 1 ? "#000" : "#ff6600" }}>{step.num}</span>
                </div>
              </div>

              {/* card do step */}
              <motion.div
                whileHover={{ x: 4 }}
                transition={{ duration: 0.2 }}
                style={{
                  flex: 1,
                  padding: "20px 18px",
                  borderRadius: 16,
                  background: step.color,
                  border: `1px solid ${i === 1 ? "rgba(255,102,0,0.2)" : "rgba(255,255,255,0.06)"}`,
                  position: "relative",
                  overflow: "hidden",
                }}>
                {i === 1 && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "#ff6600" }} />
                )}
                <h3 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.03em", color: i === 1 ? "#ff6600" : "#fff", marginBottom: 8, lineHeight: 1.2 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", lineHeight: 1.6, fontWeight: 300, margin: 0 }}>
                  {step.desc}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* CTA mobile */}
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
          style={{ margin: "36px 20px 0", padding: "24px 20px", borderRadius: 20, background: "rgba(255,102,0,0.08)", border: "1px solid rgba(255,102,0,0.2)" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: 6 }}>
            Comece em 5 minutos.
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.55, marginBottom: 16 }}>
            Sem burocracia, sem cartão. Seu primeiro contrato é gratuito.
          </p>
          <motion.button whileTap={{ scale: 0.97 }}
            style={{ width: "100%", padding: "13px", borderRadius: 999, background: "#ff6600", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Criar conta grátis →
          </motion.button>
        </motion.div>

      </section>
    );
  }

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  return (
    <section ref={ref} className="py-40 relative px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h3 className="text-sm font-mono text-accent tracking-widest uppercase mb-4">Como Funciona</h3>
          <h2 className="text-3xl md:text-5xl font-display">
            Do primeiro contato ao <span className="text-accent">Fechou!</span>
          </h2>
          <p className="text-muted-foreground mt-4 text-lg max-w-2xl mx-auto">
            Simplifique seu processo de vendas. Menos burocracia, mais contratos fechados.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.03, y: -10 }}
              style={{ aspectRatio: "1 / 1" }}
              className="relative group p-8 rounded-[2rem] hover:bg-white/[0.03] hover:border hover:border-accent/20 transition-all duration-500 cursor-pointer hover:shadow-[0_25px_70px_rgba(255,102,0,0.1)] flex flex-col justify-between">
              <span className="font-display text-8xl md:text-[10rem] text-white/5 absolute -top-8 -left-4 pointer-events-none group-hover:text-accent/30 group-hover:scale-110 transition-all duration-700 origin-left">
                {step.num}
              </span>
              <div className="relative z-10 pt-10 flex flex-col justify-end h-full">
                <h3 className="text-2xl font-display mb-4 group-hover:text-accent group-hover:translate-x-2 transition-all duration-500">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed font-light group-hover:text-foreground/90 transition-colors duration-500">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}