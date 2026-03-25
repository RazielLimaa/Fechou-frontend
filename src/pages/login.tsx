import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { login } from "../service/api/auth";
import { rateLimiter, isValidEmail, sanitizeInput, preventClickjacking } from "../lib/security";

const GOOGLE_CLIENT_ID =
  "773668316637-ajvug1pnn2flcjv0gl3f1sc4rsnfth54.apps.googleusercontent.com";

// ── Canvas ────────────────────────────────────────────────────────────────────
function Bg() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let raf: number, t = 0;
    const pts = Array.from({ length: 80 }, () => ({
      x: Math.random(), y: Math.random(),
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.004,
      r: 0.8 + Math.random() * 1.4,
    }));
    const draw = () => {
      c.width = c.offsetWidth; c.height = c.offsetHeight;
      const W = c.width, H = c.height;
      ctx.clearRect(0, 0, W, H);
      t += 0.012;
      ctx.strokeStyle = "rgba(255,255,255,0.025)";
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 6; i++) {
        ctx.beginPath(); ctx.moveTo(W * i / 6, 0); ctx.lineTo(W * i / 6, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, H * i / 6); ctx.lineTo(W, H * i / 6); ctx.stroke();
      }
      pts.forEach(p => {
        p.phase += p.speed;
        const px = (p.x + Math.sin(p.phase) * 0.04) * W;
        const py = (p.y + Math.cos(p.phase * 0.7) * 0.03) * H;
        const a = (Math.sin(p.phase * 1.3) * 0.5 + 0.5) * 0.18;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,102,0,${a})`;
        ctx.fill();
      });
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.7);
      const g = ctx.createRadialGradient(0, H, 0, 0, H, W * 0.75);
      g.addColorStop(0, `rgba(255,80,0,${0.14 + pulse * 0.06})`);
      g.addColorStop(0.5, `rgba(255,50,0,${0.04})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const g2 = ctx.createRadialGradient(W, 0, 0, W, 0, W * 0.5);
      g2.addColorStop(0, "rgba(255,102,0,0.05)");
      g2.addColorStop(1, "transparent");
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas ref={ref} style={{
      position: "absolute", inset: 0, width: "100%", height: "100%",
      zIndex: 0, pointerEvents: "none", display: "block",
    }} />
  );
}

// ── Ícone Google ──────────────────────────────────────────────────────────────
function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ── Input estilizado ──────────────────────────────────────────────────────────
function Field({
  label, type, value, onChange, placeholder, right, focused, onFocus, onBlur, autoComplete,
}: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string;
  right?: React.ReactNode; focused: boolean;
  onFocus: () => void; onBlur: () => void;
  autoComplete?: string;
}) {
  return (
    <div>
      <p style={{
        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.18em", color: "rgba(255,255,255,0.28)", marginBottom: 8,
      }}>
        {label}
      </p>
      <div style={{ position: "relative" }}>
        <motion.div
          animate={{ borderColor: focused ? "rgba(255,102,0,0.55)" : "rgba(255,255,255,0.08)" }}
          transition={{ duration: 0.2 }}
          style={{ borderRadius: 14, border: "1px solid", overflow: "hidden" }}
        >
          <input
            type={type} value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} onFocus={onFocus} onBlur={onBlur} required
            autoComplete={autoComplete}
            spellCheck={type === "password" ? false : undefined}
            style={{
              width: "100%", padding: right ? "15px 48px 15px 18px" : "15px 18px",
              background: focused ? "rgba(255,102,0,0.03)" : "rgba(255,255,255,0.03)",
              border: "none", color: "#fff", fontSize: 14, outline: "none",
              fontFamily: "inherit", boxSizing: "border-box", transition: "background 0.2s",
            }}
          />
        </motion.div>
        {right && (
          <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}>
            {right}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Formulário principal ──────────────────────────────────────────────────────
function LoginForm() {
  const [, navigate] = useLocation();
  const [showPwd, setShowPwd]             = useState(false);
  const [email, setEmail]                 = useState("");
  const [pwd, setPwd]                     = useState("");
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [focused, setFocused]             = useState<string | null>(null);

  useEffect(() => { try { preventClickjacking(); } catch {} }, []);

  // ── flow: "implicit" — retorna access_token direto, sem redirect_uri ──────
  // Elimina o redirect_uri_mismatch de vez: o Google entrega o token
  // diretamente no popup, sem precisar de callback no backend.
  const googleLogin = useGoogleLogin({
    flow: "implicit",
    scope: "openid email profile",

    onSuccess: async (tokenResponse) => {
      setError(null);
      setGoogleLoading(true);
      try {
        // Envia o access_token para o backend verificar com a API do Google
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest", // proteção CSRF
          },
          credentials: "include",
          body: JSON.stringify({
            access_token: tokenResponse.access_token,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message ?? "Falha ao autenticar com Google.");
        }

        const r = await res.json();
        localStorage.setItem("access_token", r.token);
        localStorage.setItem("user", JSON.stringify(r.user));
        navigate("/propostas");
      } catch (err: any) {
        setError(err?.message ?? "Falha ao entrar com Google.");
      } finally {
        setGoogleLoading(false);
      }
    },

    onError: (err) => {
      console.error("[GoogleLogin] onError:", err);
      setError("Login com Google cancelado ou falhou. Tente novamente.");
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    const trimEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimEmail)) { setError("Email inválido."); return; }
    if (!pwd.length) { setError("Insira sua senha."); return; }
    if (!rateLimiter.check("login", 5, 120000)) {
      setError(`Muitas tentativas. Aguarde ${Math.ceil(rateLimiter.getRetryAfter("login", 120000) / 1000)}s.`);
      return;
    }
    setLoading(true);
    try {
      const r = await login(sanitizeInput(trimEmail), pwd);
      localStorage.setItem("access_token", r.token);
      localStorage.setItem("user", JSON.stringify(r.user));
      navigate("/propostas");
    } catch (err: any) { setError(err?.message ?? "Falha ao entrar."); }
    finally { setLoading(false); }
  };

  const isAnyLoading = loading || googleLoading;

  return (
    <div style={{
      background: "#09090b", color: "#fff", minHeight: "100vh",
      display: "flex", fontFamily: "'DM Sans','Inter',sans-serif", overflow: "hidden",
    }}>
      <div className="noise-overlay" />

      {/* ══ ESQUERDA ══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex" style={{
        width: "48%", flexDirection: "column", justifyContent: "space-between",
        position: "relative", overflow: "hidden",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}>
        <Bg />
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "linear-gradient(to top, rgba(9,9,11,0.7) 0%, transparent 50%)" }} />

        <div style={{ position: "relative", zIndex: 2, padding: "40px 48px" }}>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Link href="/">
              <span className="font-display" style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", cursor: "pointer" }}>
                FECHOU<span style={{ color: "#ff6600", fontStyle: "italic" }}>!</span>
              </span>
            </Link>
          </motion.div>
        </div>

        <div style={{ position: "absolute", zIndex: 1, top: "50%", left: "50%", transform: "translate(-50%, -52%)", textAlign: "center", pointerEvents: "none" }}>
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ fontSize: "clamp(120px, 18vw, 220px)", fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 1, color: "transparent", WebkitTextStroke: "1px rgba(255,255,255,0.06)", userSelect: "none" }}>
            ←
          </motion.p>
        </div>

        <div style={{ position: "relative", zIndex: 2, padding: "0 48px 44px" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.8 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "#ff6600", marginBottom: 14 }}>◈ Bem-vindo de volta</p>
            <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, marginBottom: 16 }}>
              Bom te ver<br /><span style={{ color: "#ff6600", fontStyle: "italic" }}>de volta.</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, fontWeight: 300, maxWidth: 300, marginBottom: 28 }}>
              Continue de onde parou. Seus projetos, propostas e clientes estão te esperando.
            </p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
              style={{ padding: "18px 20px", borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, fontStyle: "italic", fontWeight: 300, marginBottom: 14 }}>
                "O Fechou! mudou completamente minha forma de trabalhar. Fecho com muito mais confiança."
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,102,0,0.12)", border: "1px solid rgba(255,102,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#ff6600" }}>R</span>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>Rafael Costa</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>UX Designer</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ══ DIREITA: formulário ══════════════════════════════════════════════ */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        padding: "40px 32px", position: "relative",
      }}>
        <div className="lg:hidden" style={{ position: "absolute", top: 28, left: 28 }}>
          <Link href="/">
            <span className="font-display" style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.04em", cursor: "pointer" }}>
              FECHOU<span style={{ color: "#ff6600", fontStyle: "italic" }}>!</span>
            </span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: "100%", maxWidth: 400 }}
        >
          <div style={{ marginBottom: 32 }}>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
              style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "#ff6600", marginBottom: 12 }}>
              ◈ Acessar conta
            </motion.p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 0.95, marginBottom: 10 }}>
              Entrar
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.32)", fontWeight: 300 }}>
              Não tem conta?{" "}
              <Link href="/register">
                <span style={{ color: "#ff6600", cursor: "pointer", fontWeight: 600 }}>Criar agora →</span>
              </Link>
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              role="alert" aria-live="assertive"
              style={{ marginBottom: 20, padding: "11px 15px", borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#fca5a5" }}>
              {error}
            </motion.div>
          )}

          {/* ── Botão Google ── */}
          <div style={{ marginBottom: 20 }}>
            <motion.button
              type="button"
              onClick={() => googleLogin()}
              disabled={isAnyLoading}
              aria-label="Continuar com Google"
              aria-busy={googleLoading}
              whileHover={!isAnyLoading ? { scale: 1.02, borderColor: "rgba(255,102,0,0.35)", background: "rgba(255,102,0,0.05)" } : {}}
              whileTap={!isAnyLoading ? { scale: 0.97 } : {}}
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 600,
                cursor: isAnyLoading ? "not-allowed" : "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "all 0.2s", opacity: isAnyLoading ? 0.5 : 1,
              }}
            >
              {googleLoading
                ? <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
                : <><GoogleIcon size={16} /><span>Continuar com Google</span></>
              }
            </motion.button>
          </div>

          {/* divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              ou entre com email
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>

          <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Field
              label="Email" type="email" value={email} onChange={setEmail} placeholder="seu@email.com"
              focused={focused === "email"} onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
              autoComplete="email"
            />
            <Field
              label="Senha" type={showPwd ? "text" : "password"} value={pwd} onChange={setPwd} placeholder="Sua senha"
              focused={focused === "pwd"} onFocus={() => setFocused("pwd")} onBlur={() => setFocused(null)}
              autoComplete="current-password"
              right={
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.28)", cursor: "pointer", padding: 0, display: "flex" }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            <div style={{ marginTop: -10, textAlign: "right" }}>
              <Link href="/forgot-password">
                <span style={{ fontSize: 11, color: "rgba(255,102,0,0.7)", cursor: "pointer" }}>Esqueceu a senha?</span>
              </Link>
            </div>

            <motion.button
              type="submit" disabled={isAnyLoading}
              aria-busy={loading}
              whileHover={!isAnyLoading ? { scale: 1.02, boxShadow: "0 0 40px rgba(255,102,0,0.32)" } : {}}
              whileTap={!isAnyLoading ? { scale: 0.97 } : {}}
              style={{
                padding: "15px", borderRadius: 14, background: "#ff6600", border: "none",
                color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: isAnyLoading ? "not-allowed" : "pointer", opacity: isAnyLoading ? 0.65 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontFamily: "inherit", transition: "opacity 0.2s",
              }}>
              {loading
                ? <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
                : <><span>Entrar</span><ArrowRight size={16} /></>
              }
            </motion.button>
          </form>

          <p style={{ marginTop: 24, fontSize: 10, color: "rgba(255,255,255,0.18)", textAlign: "center", letterSpacing: "0.02em" }}>
            Ao entrar, você concorda com os{" "}
            <span style={{ color: "rgba(255,102,0,0.6)", cursor: "pointer" }}>Termos</span> e{" "}
            <span style={{ color: "rgba(255,102,0,0.6)", cursor: "pointer" }}>Privacidade</span>
          </p>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        input::placeholder { color: rgba(255,255,255,0.2) }
      `}</style>
    </div>
  );
}

// ── Wrapper com GoogleOAuthProvider ───────────────────────────────────────────
export default function Login() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LoginForm />
    </GoogleOAuthProvider>
  );
}