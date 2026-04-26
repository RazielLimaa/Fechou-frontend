import { motion } from "framer-motion";
import { Link } from "wouter";
import { useEffect, useRef } from "react";

function AmbientCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random(),
      y: Math.random(),
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.004,
      r: 0.8 + Math.random() * 1.4,
    }));

    const draw = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);
      t += 0.012;
      ctx.strokeStyle = "rgba(255,255,255,0.025)";
      ctx.lineWidth = 0.5;

      for (let i = 1; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo((w * i) / 6, 0);
        ctx.lineTo((w * i) / 6, h);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, (h * i) / 6);
        ctx.lineTo(w, (h * i) / 6);
        ctx.stroke();
      }

      particles.forEach((p) => {
        p.phase += p.speed;
        const px = (p.x + Math.sin(p.phase) * 0.04) * w;
        const py = (p.y + Math.cos(p.phase * 0.7) * 0.03) * h;
        const alpha = (Math.sin(p.phase * 1.3) * 0.5 + 0.5) * 0.18;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,102,0,${alpha})`;
        ctx.fill();
      });

      const pulse = 0.5 + 0.5 * Math.sin(t * 0.7);
      const g = ctx.createRadialGradient(0, h, 0, 0, h, w * 0.75);
      g.addColorStop(0, `rgba(255,80,0,${0.14 + pulse * 0.06})`);
      g.addColorStop(0.5, "rgba(255,50,0,0.04)");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createRadialGradient(w, 0, 0, w, 0, w * 0.5);
      g2.addColorStop(0, "rgba(255,102,0,0.05)");
      g2.addColorStop(1, "transparent");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        display: "block",
      }}
    />
  );
}

export function AuthField({
  label,
  type,
  value,
  onChange,
  placeholder,
  focused,
  onFocus,
  onBlur,
  right,
  autoComplete,
  name,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  right?: React.ReactNode;
  autoComplete?: string;
  name?: string;
}) {
  return (
    <div>
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.28)",
          marginBottom: 8,
        }}
      >
        {label}
      </p>
      <div style={{ position: "relative" }}>
        <motion.div
          animate={{
            borderColor: focused
              ? "rgba(255,102,0,0.55)"
              : "rgba(255,255,255,0.08)",
          }}
          transition={{ duration: 0.2 }}
          style={{ borderRadius: 14, border: "1px solid", overflow: "hidden" }}
        >
          <input
            type={type}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            onFocus={onFocus}
            onBlur={onBlur}
            autoComplete={autoComplete}
            spellCheck={false}
            style={{
              width: "100%",
              padding: right ? "15px 48px 15px 18px" : "15px 18px",
              background: focused
                ? "rgba(255,102,0,0.03)"
                : "rgba(255,255,255,0.03)",
              border: "none",
              color: "#fff",
              fontSize: 14,
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
              transition: "background 0.2s",
            }}
          />
        </motion.div>
        {right && (
          <div
            style={{
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            {right}
          </div>
        )}
      </div>
    </div>
  );
}

export function AuthSplitLayout({
  sideEyebrow,
  sideTitle,
  sideDescription,
  sideQuote,
  sideQuoteAuthor,
  sideMark = "↺",
  eyebrow,
  title,
  subtitle,
  children,
}: {
  sideEyebrow: string;
  sideTitle: React.ReactNode;
  sideDescription: string;
  sideQuote: string;
  sideQuoteAuthor: string;
  sideMark?: string;
  eyebrow: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#09090b",
        color: "#fff",
        minHeight: "100vh",
        display: "flex",
        fontFamily: "'DM Sans','Inter',sans-serif",
        overflow: "hidden",
      }}
    >
      <div className="noise-overlay" />
      <div
        className="hidden lg:flex"
        style={{
          width: "48%",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <AmbientCanvas />
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            background:
              "linear-gradient(to top, rgba(9,9,11,0.7) 0%, transparent 50%)",
          }}
        />
        <div style={{ position: "relative", zIndex: 2, padding: "40px 48px" }}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link href="/">
              <span
                className="font-display"
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  cursor: "pointer",
                }}
              >
                FECHOU<span style={{ color: "#ff6600", fontStyle: "italic" }}>!</span>
              </span>
            </Link>
          </motion.div>
        </div>
        <div
          style={{
            position: "absolute",
            zIndex: 1,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -52%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: "clamp(120px, 18vw, 220px)",
              fontWeight: 900,
              letterSpacing: "-0.06em",
              lineHeight: 1,
              color: "transparent",
              WebkitTextStroke: "1px rgba(255,255,255,0.06)",
              userSelect: "none",
            }}
          >
            {sideMark}
          </motion.p>
        </div>
        <div style={{ position: "relative", zIndex: 2, padding: "0 48px 44px" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.8 }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                color: "#ff6600",
                marginBottom: 14,
              }}
            >
              {sideEyebrow}
            </p>
            <h1
              style={{
                fontSize: "clamp(32px, 4vw, 48px)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 0.95,
                marginBottom: 16,
              }}
            >
              {sideTitle}
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.35)",
                lineHeight: 1.7,
                fontWeight: 300,
                maxWidth: 320,
                marginBottom: 28,
              }}
            >
              {sideDescription}
            </p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              style={{
                padding: "18px 20px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.45)",
                  lineHeight: 1.65,
                  fontStyle: "italic",
                  fontWeight: 300,
                  marginBottom: 14,
                }}
              >
                "{sideQuote}"
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "rgba(255,102,0,0.12)",
                    border: "1px solid rgba(255,102,0,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#ff6600" }}>
                    {sideQuoteAuthor.slice(0, 1).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>
                    {sideQuoteAuthor}
                  </p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                    Comunidade Fechou!
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px 32px",
          position: "relative",
        }}
      >
        <div className="lg:hidden" style={{ position: "absolute", top: 28, left: 28 }}>
          <Link href="/">
            <span
              className="font-display"
              style={{
                fontSize: 20,
                fontWeight: 900,
                letterSpacing: "-0.04em",
                cursor: "pointer",
              }}
            >
              FECHOU<span style={{ color: "#ff6600", fontStyle: "italic" }}>!</span>
            </span>
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: "100%", maxWidth: 430 }}
        >
          <div style={{ marginBottom: 32 }}>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                color: "#ff6600",
                marginBottom: 12,
              }}
            >
              {eyebrow}
            </motion.p>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 40px)",
                fontWeight: 900,
                letterSpacing: "-0.045em",
                lineHeight: 0.95,
                marginBottom: 10,
              }}
            >
              {title}
            </h2>
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.32)",
                fontWeight: 300,
                lineHeight: 1.7,
              }}
            >
              {subtitle}
            </div>
          </div>
          {children}
        </motion.div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        input::placeholder { color: rgba(255,255,255,0.2) }
      `}</style>
    </div>
  );
}
