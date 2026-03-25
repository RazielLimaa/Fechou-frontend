import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { ArrowDownRight } from "lucide-react";
import { useLocation } from "wouter";
import LaunchExperiencePopup from "./LaunchExperiencePopup";

function useVW() {

  const [vw, setVw] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 390
  );

  useEffect(() => {
    const update = () => setVw(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return vw;
}

function BgCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;

    const draw = () => {
      const W = (canvas.width = canvas.offsetWidth);
      const H = (canvas.height = canvas.offsetHeight);

      ctx.clearRect(0, 0, W, H);

      const vx = W / 2;
      const vy = H * 0.48;
      const cols = 14;

      for (let i = -cols; i <= cols; i++) {
        const bx = vx + (i / cols) * W * 1.05;
        const a = (1 - Math.abs(i / cols)) * 0.055;

        ctx.beginPath();
        ctx.moveTo(vx + (i / cols) * 4, vy);
        ctx.lineTo(bx, H);
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      t += 0.22;
      const rows = 20;

      for (let r = 0; r < rows; r++) {
        const prog = ((r / rows) + t / 100) % 1;
        const y = vy + (H - vy) * (prog * prog);
        if (y < vy) continue;

        const w = (y - vy) / (H - vy);

        ctx.beginPath();
        ctx.moveTo(vx - w * W * 0.56, y);
        ctx.lineTo(vx + w * W * 0.56, y);
        ctx.strokeStyle = `rgba(255,255,255,${w * 0.07})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      const pulse = 0.5 + 0.5 * Math.sin(t * 0.035);

      const g1 = ctx.createRadialGradient(vx, vy, 0, vx, vy, H * 0.55);
      g1.addColorStop(0, `rgba(255,90,0,${0.18 * pulse})`);
      g1.addColorStop(0.5, `rgba(255,60,0,${0.07 * pulse})`);
      g1.addColorStop(1, "transparent");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      const g2 = ctx.createRadialGradient(W, 0, 0, W, 0, W * 0.65);
      g2.addColorStop(0, "rgba(255,102,0,0.07)");
      g2.addColorStop(1, "transparent");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

export default function Hero() {
  const [, setLocation] = useLocation();
  const ref = useRef<HTMLElement | null>(null);

  // ✅ POPUP CONTROL
  const [openPopup, setOpenPopup] = useState(false);

  useEffect(() => {
    setOpenPopup(true); // abre sempre ao entrar/refresh
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const vw = useVW();  
  const isMobile = vw < 768;
  const isSmallMobile = vw < 420;
  const fadeOut = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const logoY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);

  const mobileLogoSize = isSmallMobile
    ? "clamp(3.4rem, 16vw, 5.5rem)"
    : "clamp(4rem, 17vw, 7rem)";

  const containerPaddingX = isSmallMobile ? 16 : 20;
  const ctaDirection = isSmallMobile ? "column" : "row";

  if (isMobile) {
    return (
      <section
        ref={ref}
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: "100dvh",
          background: "#09090b",
          color: "#fff",
          fontFamily: "'DM Sans','Inter',sans-serif",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <BgCanvas />

      
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 150% 80% at 50% 55%, transparent 15%, rgba(9,9,11,0.92) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "15%",
            right: "-15%",
            width: "70%",
            height: "35%",
            zIndex: 1,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse, rgba(255,102,0,0.10) 0%, transparent 70%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            opacity: 0.3,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
          }}
        />

        <motion.div
          style={{
            opacity: fadeOut,
            position: "relative",
            zIndex: 2,
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: `clamp(24px, 5vw, 40px) ${containerPaddingX}px`,
              textAlign: "center",
            }}
          >
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              style={{
                fontSize: "clamp(0.58rem, 1.7vw, 0.72rem)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.24em",
                color: "#ff6600",
                margin: "0 0 16px 0",
              }}
            >
              Contratos · Assinatura · PIX
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.85,
                delay: 0.2,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                width: "100%",
                maxWidth: 680,
              }}
            >
              <h1
                className="font-display"
                style={{
                  margin: 0,
                  fontSize: "clamp(1.6rem, 8.5vw, 3rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.055em",
                  lineHeight: 0.88,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  maxWidth: "100%",
                  textShadow:
                    "0 0 60px rgba(255,102,0,0.18), 0 0 120px rgba(255,102,0,0.08)",
                }}
              >
                FECHOU
                <span style={{ color: "#ff6600", fontStyle: "italic" }}>!</span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.7 }}
              style={{
                margin: "16px 0 0 0",
                fontSize: "clamp(0.9rem, 3.5vw, 1rem)",
                color: "rgba(255,255,255,0.45)",
                fontWeight: 300,
                lineHeight: 1.6,
                maxWidth: 320,
              }}
            >
              Do orçamento ao PIX — contratos profissionais em minutos.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.52, duration: 0.65 }}
              style={{
                display: "flex",
                flexDirection: ctaDirection as "row" | "column",
                gap: 12,
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                maxWidth: 320,
                marginTop: 28,
              }}
            >
              <motion.button
                whileHover={{ scale: 1.03, background: "#e55a00" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setLocation("/register")}
                style={{
                  width: isSmallMobile ? "100%" : "auto",
                  minWidth: isSmallMobile ? "100%" : 200,
                  padding: "14px 24px",
                  borderRadius: 999,
                  background: "#ff6600",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  letterSpacing: "0.01em",
                  boxShadow: "0 0 24px rgba(255,102,0,0.25)",
                }}
              >
                Começar grátis →
              </motion.button>

              <motion.button
                onClick={() => setLocation("/vision")}
                whileHover={{
                  scale: 1.06,
                  borderColor: "rgba(255,102,0,0.6)",
                }}
                whileTap={{ scale: 0.93 }}
                style={{
                  width: isSmallMobile ? "100%" : 46,
                  height: 46,
                  borderRadius: isSmallMobile ? 999 : "50%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.5)",
                  flexShrink: 0,
                }}
              >
                <ArrowDownRight size={16} />
              </motion.button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.68, duration: 0.55 }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              borderTop: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {[
              { v: "10+", l: "Templates" },
              { v: "5min", l: "Do zero ao envio" },
              { v: "R$0", l: "Para começar" },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  padding: isSmallMobile ? "12px 6px" : "14px 8px",
                  textAlign: "center",
                  borderRight:
                    i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none",
                }}
              >
                <p
                  style={{
                    fontSize: "clamp(0.95rem, 4vw, 1.15rem)",
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                    color: "#fff",
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {s.v}
                </p>
                <p
                  style={{
                    fontSize: "clamp(0.42rem, 2vw, 0.56rem)",
                    color: "rgba(255,255,255,0.28)",
                    marginTop: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    lineHeight: 1.2,
                  }}
                >
                  {s.l}
                </p>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.78 }}
            style={{
              display: "grid",
              gridTemplateColumns: isSmallMobile ? "1fr" : "repeat(3, 1fr)",
              borderTop: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {[
              { label: "Jurídico", desc: "MP 2.200-2" },
              { label: "Sem taxa", desc: "R$ 0 inicial" },
              { label: "5 minutos", desc: "Do zero ao PIX" },
            ].map((item, i, arr) => (
              <div
                key={i}
                style={{
                  padding: "12px 10px",
                  borderRight:
                    !isSmallMobile && i < arr.length - 1
                      ? "1px solid rgba(255,255,255,0.07)"
                      : "none",
                  borderBottom:
                    isSmallMobile && i < arr.length - 1
                      ? "1px solid rgba(255,255,255,0.07)"
                      : "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 3,
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "#ff6600",
                    marginBottom: 2,
                  }}
                />
                <p
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.58)",
                    margin: 0,
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    fontSize: "0.62rem",
                    color: "rgba(255,255,255,0.24)",
                    fontWeight: 300,
                    margin: 0,
                  }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>
    );
  }

  return (
    
    <><LaunchExperiencePopup
      open={openPopup}
      onClose={() => setOpenPopup(false)} /><section
        ref={ref}
        style={{
          background: "#09090b",
          color: "#fff",
          fontFamily: "'DM Sans','Inter',sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <BgCanvas />

        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            background: "radial-gradient(ellipse 100% 90% at 50% 50%, transparent 30%, rgba(9,9,11,0.75) 100%)",
          }} />

        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            opacity: 0.45,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
          }} />

        <motion.div
          style={{
            opacity: fadeOut,
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              style={{
                padding: "22px 44px",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                gap: 9,
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 60,
                  borderRadius: "50%",
                  flexShrink: 0,
                }} />
            </motion.div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                padding: "44px 44px 40px",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 32,
              }}
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                  fontSize: "clamp(64px, 10vw, 120px)",
                  fontWeight: 900,
                  letterSpacing: "-0.06em",
                  lineHeight: 1,
                  color: "transparent",
                  WebkitTextStroke: "1px rgba(255,255,255,0.07)",
                  userSelect: "none",
                  margin: 0,
                }}
              >
                01
              </motion.p>

              <div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.38, duration: 0.65 }}
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.38)",
                    fontWeight: 300,
                    lineHeight: 1.72,
                    maxWidth: 300,
                    marginBottom: 28,
                  }}
                >
                  Crie, envie e assine contratos profissionais com validade
                  jurídica. Do orçamento ao PIX — tudo em um lugar, em minutos.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  style={{ display: "flex" }}
                >
                  {[
                    { v: "10+", l: "tipos de contrato" },
                    { v: "5min", l: "do zero ao enviado" },
                    { v: "R$0", l: "para começar" },
                  ].map((s, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        paddingRight: i < 2 ? 18 : 0,
                        paddingLeft: i > 0 ? 18 : 0,
                        borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 20,
                          fontWeight: 900,
                          letterSpacing: "-0.04em",
                          color: "#fff",
                          lineHeight: 1,
                          margin: 0,
                        }}
                      >
                        {s.v}
                      </p>
                      <p
                        style={{
                          fontSize: 9,
                          color: "rgba(255,255,255,0.25)",
                          marginTop: 3,
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                        }}
                      >
                        {s.l}
                      </p>
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>

            <div
              style={{
                padding: "48px 44px 56px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                minHeight: 220,
              }}
            >
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.85,
                  delay: 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  y: logoY,
                  margin: 0,
                  lineHeight: 0.9,
                  textAlign: "center",
                  position: "relative",
                  zIndex: 1,
                }}
                className="font-display"
              >
                <span
                  style={{
                    fontSize: "clamp(48px, 8vw, 140px)",
                    fontWeight: 900,
                    letterSpacing: "-0.05em",
                    lineHeight: 0.9,
                    color: "#fff",
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  }}
                >
                  FECHOU
                  <span style={{ color: "#ff6600", fontStyle: "italic" }}>!</span>
                </span>
              </motion.h1>

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 2,
                  pointerEvents: "none",
                  background: "linear-gradient(to top, rgba(9,9,11,1) 0%, rgba(9,9,11,0.88) 18%, rgba(9,9,11,0.65) 32%, rgba(9,9,11,0.35) 48%, rgba(9,9,11,0.12) 62%, transparent 78%)",
                }} />

              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "75%",
                  zIndex: 3,
                  pointerEvents: "none",
                  opacity: 0.55,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23g)' opacity='0.18'/%3E%3C/svg%3E")`,
                  maskImage: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
                }} />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <div style={{ flex: 1, overflow: "hidden", padding: "15px 0" }}>
              <motion.div
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
                style={{ display: "flex", whiteSpace: "nowrap" }}
              >
                {[...Array(2)].map((_, r) => (
                  <span
                    key={r}
                    style={{ display: "inline-flex", alignItems: "center" }}
                  >
                    {[
                      "CONTRATOS PROFISSIONAIS",
                      "◦",
                      "ASSINATURA DIGITAL",
                      "◦",
                      "PIX DIRETO",
                      "◦",
                      "VALIDADE JURÍDICA",
                      "◦",
                      "FECHE COM CLASSE",
                      "◦",
                    ].map((t, j) => (
                      <span
                        key={j}
                        style={{
                          fontSize: 10,
                          fontWeight: t === "◦" ? 400 : 700,
                          color: t === "◦"
                            ? "rgba(255,102,0,0.4)"
                            : "rgba(255,255,255,0.13)",
                          textTransform: "uppercase",
                          letterSpacing: t === "◦" ? "0.1em" : "-0.005em",
                          padding: "0 16px",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </span>
                ))}
              </motion.div>
            </div>

            <div
              style={{
                borderLeft: "1px solid rgba(255,255,255,0.06)",
                padding: "12px 24px",
                flexShrink: 0,
              }}
            >
              <motion.button
                onClick={() => setLocation("/vision")}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{
                  scale: 1.15,
                  backgroundColor: "#ff6600",
                  boxShadow: "0 0 60px rgba(255,102,0,0.7)",
                  borderColor: "#ff6600",
                }}
                whileTap={{ scale: 0.9 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 400, damping: 17 }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "transparent",
                  border: "2px solid #ff6600",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                  color: "#ff6600",
                }}
              >
                <motion.div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "#ff6600",
                    borderRadius: "50%",
                    scale: 0,
                  }}
                  whileHover={{ scale: 1 }}
                  transition={{ duration: 0.25 }} />
                <motion.div
                  style={{
                    position: "relative",
                    zIndex: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ff6600",
                  }}
                  whileHover={{ rotate: 45, color: "#fff" }}
                  transition={{ type: "spring", stiffness: 350, damping: 40 }}
                >
                  <ArrowDownRight size={50} />
                </motion.div>
              </motion.button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}
          >
            {[
              { label: "Validade jurídica", desc: "MP 2.200-2/2001 · AES-256" },
              { label: "Sem burocracia", desc: "Do contrato ao PIX em minutos" },
              { label: "Plano gratuito", desc: "Contratos ilimitados · R$ 0" },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "18px clamp(12px, 2vw, 28px)",
                  borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "#ff6600",
                    flexShrink: 0,
                  }} />
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "clamp(9px, 1.2vw, 11px)",
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.65)",
                      margin: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.label}
                  </p>
                  <p
                    style={{
                      fontSize: "clamp(8px, 1vw, 10px)",
                      color: "rgba(255,255,255,0.2)",
                      fontWeight: 300,
                      margin: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section></>
  );
}