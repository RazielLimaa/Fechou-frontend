import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import Navbar from "../components/landing/Navbar";
import Footer from "../components/landing/Footer";
import Phone3D from "../components/Phone3D";
import { ArrowRight, Focus, Target, Rocket, Eye, Shield, Layers } from "lucide-react";
import { Link } from "wouter";

// ─────────────────────────────────────────────────────────────────────────────
// PhonePinnedSection
// ─────────────────────────────────────────────────────────────────────────────
function PhonePinnedSection() {
  const sectionRef   = useRef<HTMLDivElement>(null);
  const progressRef  = useRef(0);
  const activeRef    = useRef(false);
  const doneRef      = useRef(false);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [progress, setProgress] = useState(0);
  const [active,   setActive  ] = useState(false);
  const [done,     setDone    ] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const cp   = Math.min(1, Math.max(0, progress / 0.45));
  const sp   = Math.min(1, Math.max(0, (progress - 0.45) / 0.4));
  const step = progress < 0.12 ? 0 : progress < 0.45 ? 1 : progress < 0.78 ? 2 : 3;

  function lock() {
    if (activeRef.current || doneRef.current) return;
    const el = sectionRef.current;
    if (!el) return;
    window.scrollTo({ top: el.offsetTop, behavior: "instant" as ScrollBehavior });
    activeRef.current = true;
    setActive(true);
    document.documentElement.style.overflow = "hidden";
  }

  function unlock() {
    if (!activeRef.current) return;
    activeRef.current = false;
    setActive(false);
    document.documentElement.style.overflow = "";
    const el = sectionRef.current;
    if (el) window.scrollTo({ top: el.offsetTop + el.offsetHeight, behavior: "smooth" });
  }

  function advance(delta: number) {
    if (!activeRef.current) return;
    const next = Math.min(1, Math.max(0, progressRef.current + delta));
    progressRef.current = next;
    setProgress(next);
    if (next >= 1 && !doneRef.current) {
      doneRef.current = true;
      setDone(true);
      setTimeout(unlock, 1400);
    }
  }

  useEffect(() => {
    const onScroll = () => {
      if (doneRef.current) return;
      const el = sectionRef.current;
      if (!el) return;
      const inZone = window.scrollY + window.innerHeight > el.offsetTop && window.scrollY < el.offsetTop + el.offsetHeight;
      if (inZone && !activeRef.current) {
        if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
        snapTimerRef.current = setTimeout(lock, 80);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!activeRef.current) return;
      e.preventDefault();
      advance(e.deltaY / 2800);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    let startY = 0;
    const onStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
    const onMove  = (e: TouchEvent) => {
      if (!activeRef.current) return;
      e.preventDefault();
      const dy = startY - e.touches[0].clientY;
      startY = e.touches[0].clientY;
      advance(dy / 1400);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove",  onMove,  { passive: false });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove",  onMove);
    };
  }, []);

  useEffect(() => () => {
    document.documentElement.style.overflow = "";
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
  }, []);

  const steps = [
    { num: "01", tag: "Template",   title: "Escolha o contrato",       body: "Dezenas de modelos para design, dev, foto e mais. Sua marca em segundos." },
    { num: "02", tag: "Proposta",   title: "Preencha e gere o PDF",    body: "Escopo, prazo, valor e cláusulas num formulário intuitivo. PDF profissional na hora." },
    { num: "03", tag: "Assinatura", title: "Cliente assina pelo link", body: "Sem app, sem burocracia. Validade jurídica. Notificação em tempo real." },
    { num: "04", tag: "PIX",        title: "Fechou! Receba na hora",   body: "Pagamento liberado direto na sua chave após a assinatura. Sem intermediários." },
  ];

  const RAYS = 24; const RINGS = 7; const CX = 50; const CY = 50; const MAX_R = 72;

  return (
    <div
      ref={sectionRef}
      style={{
        position: "relative",
        height: "100vh",
        minHeight: isMobile ? 560 : 480,
        background: "#09090b",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Teia de aranha */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ opacity: 0.07 }}>
          {Array.from({ length: RAYS }).map((_, i) => {
            const angle = (i / RAYS) * 2 * Math.PI;
            return <line key={`r${i}`} x1={`${CX}%`} y1={`${CY}%`} x2={`${CX + MAX_R * Math.cos(angle)}%`} y2={`${CY + MAX_R * Math.sin(angle)}%`} stroke="white" strokeWidth="0.18" />;
          })}
          {Array.from({ length: RINGS }).map((_, i) => (
            <circle key={`c${i}`} cx={`${CX}%`} cy={`${CY}%`} r={`${((i + 1) / RINGS) * MAX_R}%`} fill="none" stroke="white" strokeWidth="0.18" />
          ))}
        </svg>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 65% 65% at 50% 50%, transparent 30%, #09090b 80%)" }} />
      </div>

      {/* Glow base estático */}
      <div style={{ position: "absolute", bottom: "-15%", left: "50%", transform: "translateX(-50%)", width: "min(800px,120vw)", height: "min(800px,120vw)", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,102,0,0.09) 0%, transparent 65%)", filter: "blur(60px)", pointerEvents: "none", zIndex: 0 }} />

      {/* Glow pulsante */}
      <motion.div
        animate={done ? { opacity: 0 } : { opacity: [0.4, 0.85, 0.4] }}
        transition={done ? { duration: 0.3 } : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", bottom: "-15%", left: "50%", transform: "translateX(-50%)", width: "min(800px,120vw)", height: "min(800px,120vw)", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,102,0,0.13) 0%, transparent 65%)", filter: "blur(60px)", pointerEvents: "none", zIndex: 0, willChange: "opacity" }}
      />

      {/* Explosão ao concluir */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: done ? 1 : 0 }} transition={{ duration: 0.7 }}
        style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(255,90,0,0.45) 0%, rgba(255,60,0,0.18) 45%, transparent 72%)", pointerEvents: "none", zIndex: 0, willChange: "opacity" }} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: done ? 0.7 : 0 }} transition={{ duration: 1.0, delay: 0.05 }}
        style={{ position: "absolute", inset: "-20%", background: "radial-gradient(ellipse 60% 55% at 50% 52%, rgba(255,120,0,0.28) 0%, rgba(255,70,0,0.08) 55%, transparent 75%)", pointerEvents: "none", zIndex: 0, willChange: "opacity" }} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: done ? [0, 0.6, 0] : 0 }} transition={{ duration: 0.55 }}
        style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 90% 65% at 50% 50%, rgba(255,140,0,0.22) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0, willChange: "opacity" }} />

      {/* Label topo */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", paddingTop: "clamp(12px,3vh,36px)", flexShrink: 0 }}>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.28em", color: "#ff6600", margin: 0 }}>◈ Veja na prática</p>
      </div>

      {/* ── DESKTOP ── */}
      {!isMobile && (
        <div style={{ position: "relative", zIndex: 1, flex: 1, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", maxWidth: 1100, margin: "0 auto", width: "100%", padding: "0 clamp(16px,4vw,56px)", minHeight: 0 }}>

          {/* esquerda */}
          <div style={{ paddingRight: "clamp(16px,3vw,40px)", position: "relative", height: 180 }}>
            {steps.map((s, i) => (
              <motion.div key={i}
                animate={{ opacity: step === i ? 1 : 0, y: step === i ? 0 : step > i ? -14 : 14 }}
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", width: "100%" }}>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#ff6600", border: "1px solid rgba(255,102,0,0.3)", borderRadius: 999, padding: "3px 10px", display: "inline-block", marginBottom: 12 }}>{s.tag}</span>
                <h3 style={{ fontSize: "clamp(15px,2vw,24px)", fontWeight: 900, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1.1, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: "clamp(12px,1.1vw,14px)", color: "rgba(255,255,255,0.35)", lineHeight: 1.7, fontWeight: 300, maxWidth: 300 }}>{s.body}</p>
              </motion.div>
            ))}
          </div>

          {/* centro: phone */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <motion.div
              animate={done ? { opacity: 0.9 } : { opacity: [0.3, 0.65, 0.3] }}
              transition={done ? { duration: 0.7 } : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ position: "absolute", inset: -50, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,102,0,0.22) 0%, transparent 65%)", filter: "blur(28px)", pointerEvents: "none", willChange: "opacity" }}
            />
            <Phone3D contractProgress={cp} signingProgress={sp} isComplete={done} />
          </div>

          {/* direita: indicadores */}
          <div style={{ paddingLeft: "clamp(16px,3vw,40px)", display: "flex", flexDirection: "column", gap: 16 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 2, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden", flexShrink: 0 }}>
                  <motion.div
                    animate={{ scaleX: step > i ? 1 : step === i ? Math.min(1, Math.max(0, (progress - i * 0.25) / 0.25)) : 0 }}
                    transition={{ duration: 0.1 }}
                    style={{ height: "100%", background: "#ff6600", transformOrigin: "left", borderRadius: 999 }}
                  />
                </div>
                <motion.span
                  animate={{ color: step === i ? "#fff" : step > i ? "rgba(255,102,0,0.5)" : "rgba(255,255,255,0.16)" }}
                  style={{ fontSize: 11, fontWeight: step === i ? 700 : 400, whiteSpace: "nowrap" }}>
                  {s.num} — {s.tag}
                </motion.span>
              </div>
            ))}

            <motion.div animate={{ opacity: done ? 0 : active ? 1 : 0.3 }} style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}>
                <svg width="12" height="18" viewBox="0 0 12 18" fill="none">
                  <rect x="1" y="1" width="10" height="16" rx="5" stroke="rgba(255,255,255,0.22)" strokeWidth="1.3" />
                  <motion.rect animate={{ y: [0, 5, 0] }} transition={{ duration: 1.3, repeat: Infinity }} x="5" y="4" width="2" height="3" rx="1" fill="rgba(255,255,255,0.3)" />
                </svg>
              </motion.div>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.18em" }}>role para assinar</span>
            </motion.div>

            <motion.div animate={{ opacity: done ? 1 : 0, y: done ? 0 : 10 }} transition={{ duration: 0.5 }} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <motion.div animate={{ scale: done ? [0.8, 1.3, 1] : 1 }} transition={{ duration: 0.5 }} style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 12px rgba(34,197,94,0.8)" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", letterSpacing: "-0.01em" }}>Contrato assinado!</span>
            </motion.div>
          </div>
        </div>
      )}

      {/* ── MOBILE ── */}
      {isMobile && (
        <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 20px 0", minHeight: 0, overflow: "hidden" }}>

          {/* phone — escalonado para caber */}
          <div style={{ position: "relative", flexShrink: 0, transform: "scale(0.76)", transformOrigin: "top center", marginBottom: -20 }}>
            <motion.div
              animate={done ? { opacity: 0.9 } : { opacity: [0.3, 0.65, 0.3] }}
              transition={done ? { duration: 0.7 } : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ position: "absolute", inset: -30, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,102,0,0.22) 0%, transparent 65%)", filter: "blur(20px)", pointerEvents: "none", willChange: "opacity" }}
            />
            <Phone3D contractProgress={cp} signingProgress={sp} isComplete={done} />
          </div>

          {/* step text */}
          <div style={{ position: "relative", width: "100%", height: 116, flexShrink: 0 }}>
            {steps.map((s, i) => (
              <motion.div key={i}
                animate={{ opacity: step === i ? 1 : 0, y: step === i ? 0 : step > i ? -10 : 10 }}
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                style={{ position: "absolute", inset: 0, pointerEvents: "none", textAlign: "center", padding: "0 8px" }}>
                <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "#ff6600", border: "1px solid rgba(255,102,0,0.3)", borderRadius: 999, padding: "2px 10px", display: "inline-block", marginBottom: 8 }}>{s.tag}</span>
                <h3 style={{ fontSize: 15, fontWeight: 900, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.15, marginBottom: 6 }}>{s.title}</h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, fontWeight: 300, maxWidth: 280, margin: "0 auto" }}>{s.body}</p>
              </motion.div>
            ))}
          </div>

          {/* indicadores em linha */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
            {steps.map((_, i) => (
              <div key={i} style={{ height: 2, width: 32, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                <motion.div
                  animate={{ scaleX: step > i ? 1 : step === i ? Math.min(1, Math.max(0, (progress - i * 0.25) / 0.25)) : 0 }}
                  transition={{ duration: 0.1 }}
                  style={{ height: "100%", background: "#ff6600", transformOrigin: "left", borderRadius: 999 }}
                />
              </div>
            ))}
          </div>

          {/* hint / done badge */}
          <div style={{ marginTop: 10, flexShrink: 0, height: 24, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
            <motion.div animate={{ opacity: done ? 0 : active ? 1 : 0.4 }} style={{ display: "flex", alignItems: "center", gap: 6, position: "absolute" }}>
              <motion.div animate={{ y: [0, 4, 0] }} transition={{ duration: 1.3, repeat: Infinity }}>
                <svg width="10" height="15" viewBox="0 0 12 18" fill="none">
                  <rect x="1" y="1" width="10" height="16" rx="5" stroke="rgba(255,255,255,0.22)" strokeWidth="1.3" />
                  <motion.rect animate={{ y: [0, 5, 0] }} transition={{ duration: 1.3, repeat: Infinity }} x="5" y="4" width="2" height="3" rx="1" fill="rgba(255,255,255,0.3)" />
                </svg>
              </motion.div>
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.15em" }}>role para assinar</span>
            </motion.div>
            <motion.div animate={{ opacity: done ? 1 : 0, y: done ? 0 : 8 }} transition={{ duration: 0.5 }} style={{ display: "flex", alignItems: "center", gap: 6, position: "absolute" }}>
              <motion.div animate={{ scale: done ? [0.8, 1.3, 1] : 1 }} transition={{ duration: 0.5 }} style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px rgba(34,197,94,0.8)" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>Contrato assinado!</span>
            </motion.div>
          </div>
        </div>
      )}

      {/* Barra de progresso */}
      <div style={{ position: "relative", zIndex: 1, height: 2, background: "rgba(255,255,255,0.05)", flexShrink: 0 }}>
        <motion.div style={{ height: "100%", background: "linear-gradient(90deg, #ff6600, rgba(255,102,0,0.3))", scaleX: progress, transformOrigin: "left" }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pillar type + R helper
// ─────────────────────────────────────────────────────────────────────────────
type Pillar = {
  number: string; title: string; subtitle: string; description: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  gradient: string;
};

function R({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.span style={{ display: "block" }} className={className}
      initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.72, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vision page
// ─────────────────────────────────────────────────────────────────────────────
export default function Vision() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale   = useTransform(scrollYProgress, [0, 0.15], [1, 0.8]);

  const pillars: Pillar[] = [
    { number: "01", title: "Clareza",   subtitle: "", description: "Cada proposta, cada acordo, cada detalhe fica cristalino. Sem espaco para mal-entendidos.", icon: Eye,    gradient: "" },
    { number: "02", title: "Confianca", subtitle: "", description: "Mostre ao cliente que existe metodo, organizacao e compromisso por tras de cada entrega.",  icon: Target, gradient: "" },
    { number: "03", title: "Autonomia", subtitle: "", description: "Ferramentas que respeitam seu tempo, seu esforco e sua forma unica de trabalhar.",           icon: Rocket, gradient: "" },
  ];

  return (
    <div ref={containerRef} className="bg-background min-h-screen text-foreground selection:bg-accent selection:text-white overflow-hidden">

      <style>{`
        /* ─── BLOCO 2 ─── */
        .vis-b2-wrap   { padding: 0 56px; }
        .vis-b2-header { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .vis-b2-left   { padding: 56px 56px 48px 0; border-right: 1px solid rgba(255,255,255,0.06); }
        .vis-b2-right  { padding: 56px 0 48px 56px; display: flex; align-items: center; }
        .vis-pillar    { display: grid; grid-template-columns: 72px 1fr auto; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 30px 0; cursor: default; }

        /* ─── BLOCO 3 ─── */
        .vis-b3-grid  { display: grid; grid-template-columns: 1fr 1fr; }
        .vis-b3-left  { padding: 72px 56px; border-right: 1px solid rgba(255,255,255,0.06); }
        .vis-b3-right { padding: 72px 56px; display: flex; flex-direction: column; justify-content: space-between; gap: 28px; }

        /* ─── BLOCO 4 ─── */
        .vis-b4-inner { max-width: 1200px; margin: 0 auto; padding: 48px 56px; }
        .vis-b4-grid  { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 48px; }
        .vis-b4-foot  { max-width: 1200px; margin: 0 auto; padding: 13px 56px; }

        /* ─── PONTE ─── */
        .vis-bridge-grid    { display: grid; grid-template-columns: 1fr 1px 1fr; gap: 0 40px; align-items: start; }
        .vis-bridge-divider { background: rgba(255,255,255,0.06); align-self: stretch; }
        .vis-bridge-foot    { margin-top: 64px; padding-top: 36px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }

        /* ─── MOBILE ─── */
        @media (max-width: 767px) {
          .vis-hero-h1 { font-size: clamp(3rem, 17vw, 5rem) !important; }

          .vis-b2-wrap   { padding: 0 20px !important; }
          .vis-b2-header { grid-template-columns: 1fr !important; }
          .vis-b2-left   { padding: 40px 0 24px !important; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.06); }
          .vis-b2-right  { padding: 24px 0 36px !important; }
          .vis-pillar    { grid-template-columns: 40px 1fr 24px !important; padding: 20px 0 !important; gap: 0 8px; }

          .vis-b3-grid  { grid-template-columns: 1fr !important; }
          .vis-b3-left  { padding: 40px 20px 28px !important; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.06); }
          .vis-b3-right { padding: 28px 20px 40px !important; }

          .vis-bridge-grid    { grid-template-columns: 1fr !important; gap: 32px 0 !important; }
          .vis-bridge-divider { display: none !important; }
          .vis-bridge-foot    { margin-top: 36px !important; padding-top: 24px !important; }

          .vis-b4-inner { padding: 36px 20px !important; }
          .vis-b4-grid  { grid-template-columns: 1fr !important; gap: 24px !important; }
          .vis-b4-btns  { flex-direction: column !important; }
          .vis-b4-btns button { width: 100% !important; }
          .vis-b4-foot  { padding: 12px 20px !important; }
        }
      `}</style>

      <div className="noise-overlay" />
      <Navbar />

      {/* ══ HERO ══ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="blur-blob bg-accent/30 top-[-20%] right-[-10%] w-[800px] h-[800px]" />
        <div className="blur-blob bg-white/5 bottom-[-20%] left-[-10%] w-[600px] h-[600px]" />
        <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="relative z-10 text-center px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
            <span className="inline-block px-6 py-2 rounded-full border border-accent/30 text-accent text-xs uppercase tracking-[0.3em] bg-accent/5 backdrop-blur-sm">Nossa Visao</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}
            className="vis-hero-h1 font-display text-[15vw] md:text-[12rem] leading-[0.85] tracking-[-0.04em] mb-8">
            <span className="text-reveal">VISION</span>
            <span className="text-accent italic">!</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            className="text-xl md:text-3xl font-light text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Nao construimos apenas uma ferramenta.<br />
            <span className="text-foreground font-normal">Construimos a estrutura da sua autonomia.</span>
          </motion.p>
        </motion.div>
      </section>

      {/* ══ PONTE CINEMATOGRÁFICA ══ */}
      <section style={{ position: "relative", background: "#09090b", borderTop: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", padding: "clamp(56px,10vh,130px) 0" }}>

        {/* Spotlight — reflexo/feixe sem bola de origem */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", top: "-5%", left: "-8%", width: "90%", height: "130%", background: "conic-gradient(from 18deg at 0% 0%, rgba(255,100,0,0) 0deg, rgba(255,100,0,0.18) 14deg, rgba(255,130,0,0.22) 22deg, rgba(255,100,0,0.18) 30deg, rgba(255,100,0,0) 44deg)", transformOrigin: "0% 0%", filter: "blur(18px)" }} />
          <div style={{ position: "absolute", top: "-5%", left: "-8%", width: "70%", height: "110%", background: "conic-gradient(from 20deg at 0% 0%, rgba(255,120,0,0) 0deg, rgba(255,140,0,0.28) 18deg, rgba(255,160,0,0.35) 23deg, rgba(255,140,0,0.28) 28deg, rgba(255,120,0,0) 38deg)", transformOrigin: "0% 0%", filter: "blur(8px)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(158deg, rgba(255,110,0,0.06) 0%, rgba(255,100,0,0.10) 18%, transparent 42%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: "5%", width: "55%", height: "35%", background: "radial-gradient(ellipse at 20% 100%, rgba(255,90,0,0.06) 0%, transparent 65%)", filter: "blur(30px)" }} />
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.06 }} preserveAspectRatio="none">
            <line x1="0%" y1="0%" x2="55%" y2="100%" stroke="rgba(255,140,0,1)" strokeWidth="0.4" />
            <line x1="0%" y1="0%" x2="48%" y2="100%" stroke="rgba(255,140,0,1)" strokeWidth="0.25" />
            <line x1="0%" y1="0%" x2="62%" y2="100%" stroke="rgba(255,140,0,1)" strokeWidth="0.25" />
            <line x1="0%" y1="0%" x2="38%" y2="100%" stroke="rgba(255,120,0,1)" strokeWidth="0.15" />
          </svg>
        </div>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "0 clamp(20px,5vw,56px)" }}>

          {/* eyebrow */}
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "clamp(20px,4vh,40px)" }}>
            <span style={{ display: "inline-block", width: 28, height: 1, background: "#ff6600", flexShrink: 0 }} />
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.32em", color: "#ff6600" }}>Veja como funciona na prática</span>
          </motion.div>

          {/* headline */}
          <div style={{ marginBottom: "clamp(28px,5vh,52px)" }}>
            <div style={{ fontSize: "clamp(28px,6.5vw,88px)", fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 0.92 }}>
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
                <span style={{ color: "#fff", textShadow: "0 0 80px rgba(255,110,0,0.45), -4px -2px 40px rgba(255,90,0,0.25)" }}>Enquanto você hesita,</span>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}>
                <span style={{ color: "#fff", textShadow: "0 0 60px rgba(255,110,0,0.35), -4px -2px 30px rgba(255,90,0,0.18)" }}>outro freelancer já</span>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}>
                <span style={{ color: "#ff6600", fontStyle: "italic", textShadow: "0 0 120px rgba(255,102,0,0.9), 0 0 60px rgba(255,130,0,0.7), -6px -3px 50px rgba(255,80,0,0.4)" }}>fechou o contrato.</span>
              </motion.div>
            </div>
          </div>

          {/* grid dor | divisor | processo */}
          <div className="vis-bridge-grid">

            {/* esquerda — dor + stats */}
            <motion.div initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.65, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}>
              <p style={{ fontSize: "clamp(13px,1.5vw,17px)", color: "rgba(255,255,255,0.38)", lineHeight: 1.78, fontWeight: 300, marginBottom: 24 }}>
                Cada proposta enviada no WhatsApp, cada "combinado" sem papel, cada projeto entregue sem contrato —
                são <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>brechas que custam caro.</span>
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { num: "73%",   label: "dos freelancers já tomaram calote sem contrato" },
                  { num: "4×",    label: "mais rápido fechar com proposta profissional" },
                  { num: "0 seg", label: "para gerar seu primeiro contrato no Fechou!" },
                ].map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.35 + i * 0.08 }}
                    style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: "clamp(16px,2vw,24px)", fontWeight: 900, color: "#ff6600", letterSpacing: "-0.03em", minWidth: 52, lineHeight: 1, flexShrink: 0 }}>{s.num}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", lineHeight: 1.5, fontWeight: 300 }}>{s.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* divisor */}
            <div className="vis-bridge-divider" />

            {/* direita — processo */}
            <motion.div initial={{ opacity: 0, x: 18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.65, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "rgba(255,102,0,0.6)", marginBottom: 20 }}>O que acontece agora ↓</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { tag: "01", text: "Você escolhe o template certo para o seu serviço" },
                  { tag: "02", text: "Preenche escopo, prazo e valor — o PDF sai pronto" },
                  { tag: "03", text: "O cliente assina pelo link, sem baixar nada" },
                  { tag: "04", text: "Pagamento cai direto na sua chave PIX. Simples assim." },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: 0.4 + i * 0.07 }}
                    style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#ff6600", letterSpacing: "0.1em", marginTop: 3, flexShrink: 0, opacity: 0.7 }}>{item.tag}</span>
                    <span style={{ fontSize: "clamp(13px,1.2vw,15px)", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, fontWeight: 300 }}>{item.text}</span>
                  </motion.div>
                ))}
              </div>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.75 }}
                style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 10 }}>
                <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff6600", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", fontWeight: 300, letterSpacing: "0.04em" }}>Role para ver o processo completo ao vivo</span>
              </motion.div>
            </motion.div>
          </div>

          {/* frase de impacto */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.5 }}
            className="vis-bridge-foot">
            <p style={{ fontSize: "clamp(13px,2.2vw,22px)", fontWeight: 700, letterSpacing: "-0.03em", color: "rgba(255,255,255,0.12)", lineHeight: 1.35, maxWidth: 540 }}>
              "Da conversa ao contrato assinado em{" "}
              <span style={{ color: "rgba(255,102,0,0.55)", fontStyle: "italic" }}>menos de 3 minutos.</span>
              {" "}Sem advogado. Sem burocracia. Sem desculpa."
            </p>
            <motion.div animate={{ x: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,102,0,0.4)" }}>veja ao vivo</span>
              <ArrowRight size={13} style={{ color: "rgba(255,102,0,0.4)" }} />
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* ══ PHONE3D — scroll pinned ══ */}
      <PhonePinnedSection />

      {/* ══ BLOCO 2 ══ */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="vis-b2-wrap" style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="vis-b2-header">
            <div className="vis-b2-left">
              <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.26em", color: "#ff6600", marginBottom: 20 }}>
                ◈ A origem
              </motion.p>
              <div style={{ fontSize: "clamp(26px,4vw,48px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95 }}>
                <R delay={0}>Por que o Fechou!</R>
                <R delay={0.08}><span style={{ color: "#ff6600", fontStyle: "italic" }}>existe.</span></R>
              </div>
            </div>
            <div className="vis-b2-right">
              <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
                style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.75, fontWeight: 300 }}>
                O Fechou! nasceu da vivência real de quem trabalha como freelancer e entende que o maior desafio
                não é executar bem um projeto — mas conseguir transformar conversas em{" "}
                <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>acordos claros e respeitados.</span>
              </motion.p>
            </div>
          </div>
          {pillars.map((p: Pillar, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }} transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{ backgroundColor: "rgba(255,102,0,0.03)" }} className="vis-pillar">
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#ff6600" }}>{p.number}</p>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 7 }}>
                  <p style={{ fontSize: "clamp(20px,2.8vw,32px)", fontWeight: 300, letterSpacing: "-0.025em", color: "#fff", margin: 0 }}>{p.title}</p>
                  <p.icon size={15} style={{ color: "#ff6600", flexShrink: 0, opacity: 0.6 }} />
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.65, fontWeight: 300, maxWidth: 520 }}>{p.description}</p>
              </div>
              <ArrowRight size={14} style={{ color: "rgba(255,102,0,0.25)", flexShrink: 0 }} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ BLOCO 3 ══ */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="vis-b3-grid">
          <div className="vis-b3-left">
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.26em", color: "#ff6600", marginBottom: 22 }}>
              ◈ O manifesto
            </motion.p>
            <div style={{ fontSize: "clamp(22px,3.5vw,44px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.96 }}>
              <R delay={0}>Fechar com o Fechou!</R>
              <R delay={0.08}>é assumir uma postura</R>
              <R delay={0.16}><span style={{ color: "#ff6600", fontStyle: "italic" }}>madura</span> diante do</R>
              <R delay={0.22}><span style={{ color: "rgba(255,255,255,0.2)" }}>próprio trabalho.</span></R>
            </div>
          </div>
          <div className="vis-b3-right">
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[
                { t: "É mostrar ao cliente que existe organização, método e compromisso por trás de cada entrega.", strong: false },
                { t: "É deixar para trás o improviso constante e construir uma relação baseada em clareza e respeito mútuo.", strong: false },
                { t: "O Fechou! existe para que você foque no que faz de melhor, enquanto a plataforma cuida da estrutura.", strong: true },
              ].map((item, i) => (
                <motion.p key={i} initial={{ opacity: 0, x: 14 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  style={{ fontSize: 14, color: item.strong ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.32)", lineHeight: 1.72, fontWeight: item.strong ? 500 : 300, borderLeft: "2px solid rgba(255,102,0,0.18)", paddingLeft: 14, margin: 0 }}>
                  {item.t}
                </motion.p>
              ))}
            </div>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.35 }}>
              <Link href="/system">
                <motion.button whileHover={{ scale: 1.04, background: "#e55a00", boxShadow: "0 0 36px rgba(255,102,0,0.28)" }} whileTap={{ scale: 0.97 }}
                  style={{ padding: "13px 28px", borderRadius: 999, background: "#ff6600", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  Ver planos <ArrowRight size={13} />
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ BLOCO 4 — CTA ══ */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ background: "#ff6600" }}>
        <div className="vis-b4-inner">
          <div className="vis-b4-grid">
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "rgba(0,0,0,0.45)", marginBottom: 10 }}>
                ◈ Freelancers não precisam de mais promessas
              </p>
              <p style={{ fontSize: "clamp(20px,3.2vw,38px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, color: "#000", marginBottom: 14 }}>
                Precisam de ferramentas bem <em style={{ fontStyle: "italic", color: "rgba(0,0,0,0.45)" }}>construídas.</em>
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Sem promessas vazias", "Sem burocracia", "Sem complexidade"].map(t => (
                  <span key={t} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 999, background: "rgba(0,0,0,0.1)", color: "rgba(0,0,0,0.55)", fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </div>
            <div className="vis-b4-btns" style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
              <Link href="/register">
                <motion.button whileHover={{ scale: 1.04, background: "#09090b" }} whileTap={{ scale: 0.97 }}
                  style={{ padding: "13px 28px", borderRadius: 999, background: "#000", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "background 0.2s" }}>
                  Criar conta grátis →
                </motion.button>
              </Link>
              <Link href="/system">
                <motion.button whileHover={{ scale: 1.04, background: "rgba(0,0,0,0.1)" }} whileTap={{ scale: 0.97 }}
                  style={{ padding: "13px 28px", borderRadius: 999, background: "transparent", border: "1.5px solid rgba(0,0,0,0.2)", color: "rgba(0,0,0,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                  Ver planos
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.1)" }}>
          <div className="vis-b4-foot">
            <p style={{ fontSize: 11, color: "rgba(0,0,0,0.28)", letterSpacing: "0.06em" }}>FECHOU! · Plataforma de contratos para freelancers brasileiros</p>
          </div>
        </div>
      </motion.div>

      <Footer />
    </div>
  );
}