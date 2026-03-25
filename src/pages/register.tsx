import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { register } from "../service/api/auth";
import { authStorage } from "../lib/auth-storage";
import { rateLimiter, isValidEmail, sanitizeInput, isStrongPassword } from "../lib/security";
import { useSession } from "../context/session-context";

// ── canvas: linhas diagonais animadas ────────────────────────────────────────
function DiagBg() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let raf: number, t = 0;
    const draw = () => {
      c.width = c.offsetWidth; c.height = c.offsetHeight;
      const W = c.width, H = c.height;
      ctx.clearRect(0, 0, W, H);
      t += 0.006;
      const n = 18;
      for (let i = 0; i < n; i++) {
        const progress = ((i / n) + t * 0.08) % 1;
        const x = progress * (W + H) - H;
        const alpha = Math.sin(progress * Math.PI) * 0.055;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + H, H);
        ctx.strokeStyle = `rgba(255,102,0,${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // glow central
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.9);
      const g = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.min(W, H) * 0.65);
      g.addColorStop(0, `rgba(255,80,0,${0.08 + pulse * 0.04})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }} />;
}

export default function Register() {
  const [, navigate] = useLocation();
  const { refreshSession } = useSession();
  const [showPwd, setShowPwd] = useState(false);
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [step, setStep] = useState(0); // 0=nome+email, 1=senha

  const strength = useMemo(() => {
    if (!pwd) return 0;
    return [pwd.length >= 8, /[A-Z]/.test(pwd), /[0-9]/.test(pwd), /[^A-Za-z0-9]/.test(pwd)].filter(Boolean).length;
  }, [pwd]);
  const sColor = ["#ef4444","#f97316","#eab308","#22c55e"][Math.max(0,strength-1)] ?? "#ef4444";

  const canNext = name.trim().length >= 2 && isValidEmail(email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    const n = name.trim(), em = email.trim().toLowerCase();
    if (n.length < 2) { setError("Nome deve ter ao menos 2 caracteres."); return; }
    if (!isValidEmail(em)) { setError("Email inválido."); return; }
    const pc = isStrongPassword(pwd);
    if (!pc.valid) { setError(pc.message); return; }
    if (!rateLimiter.check("register", 3, 300000)) {
      setError(`Aguarde ${Math.ceil(rateLimiter.getRetryAfter("register",300000)/1000)}s.`); return;
    }
    setLoading(true);
    try {
      await register(sanitizeInput(n), sanitizeInput(em), pwd);
      await refreshSession();
      navigate("/propostas");
    } catch (err: any) { setError(err?.message ?? "Falha ao criar conta."); }
    finally { setLoading(false); }
  };

  const iStyle = (k: string, pr = 16): React.CSSProperties => ({
    width: "100%", padding: `13px 16px 13px ${pr}px`,
    borderRadius: 12, fontSize: 14, background: "transparent",
    border: `1.5px solid ${focused === k ? "rgba(255,102,0,0.5)" : "rgba(255,255,255,0.08)"}`,
    color: "#fff", outline: "none", fontFamily: "inherit",
    boxSizing: "border-box", transition: "border-color 0.18s",
  });

  return (
    <div style={{
      background: "#09090b", color: "#fff", minHeight: "100vh",
      fontFamily: "'DM Sans','Inter',sans-serif", overflow: "hidden",
      display: "grid", gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr",
    }} className="max-lg:grid-cols-1">

      <div className="noise-overlay" />

      {/* ══ COL A: formulário com layout de grade interna ════════════════════ */}
      <div style={{ display: "flex", flexDirection: "column", position: "relative", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

        {/* topo: logo + link */}
        <div style={{ padding: "36px 48px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <Link href="/">
              <span className="font-display" style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", cursor: "pointer" }}>
                FECHOU<span style={{ color: "#ff6600", fontStyle: "italic" }}>!</span>
              </span>
            </Link>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            style={{ fontSize: 12, color: "rgba(255,255,255,0.28)" }}>
            Já tem conta?{" "}
            <Link href="/login"><span style={{ color: "#ff6600", cursor: "pointer", fontWeight: 600 }}>Entrar</span></Link>
          </motion.p>
        </div>

        {/* meio: formulário */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: "100%", maxWidth: 360 }}>

            <div style={{ marginBottom: 32 }}>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "#ff6600", marginBottom: 12 }}>
                ◈ {step === 0 ? "Passo 1 de 2 · Identidade" : "Passo 2 de 2 · Segurança"}
              </motion.p>
              <AnimatePresence mode="wait">
                <motion.h2 key={step}
                  initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.3 }}
                  style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 0.95 }}>
                  {step === 0 ? <>"Quem é<br />você<span style={{ color: "#ff6600" }}>?</span>"</> : <>Proteja sua<br /><span style={{ color: "#ff6600" }}>conta.</span></>}
                </motion.h2>
              </AnimatePresence>
            </div>

            {/* barra de progresso */}
            <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
              {[0, 1].map(i => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, overflow: "hidden", background: "rgba(255,255,255,0.07)" }}>
                  <motion.div animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    style={{ height: "100%", background: "#ff6600", borderRadius: 2 }} />
                </div>
              ))}
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: 18, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#fca5a5" }}>
                {error}
              </motion.div>
            )}

            <form onSubmit={step === 0 ? (e) => { e.preventDefault(); if (canNext) setStep(1); } : submit}>
              <AnimatePresence mode="wait">

                {/* STEP 0 */}
                {step === 0 && (
                  <motion.div key="s0" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.3 }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", marginBottom: 7 }}>Nome completo</p>
                      <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" required
                        onFocus={() => setFocused("n")} onBlur={() => setFocused(null)} style={iStyle("n")} />
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", marginBottom: 7 }}>Email</p>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required
                        onFocus={() => setFocused("e")} onBlur={() => setFocused(null)} style={iStyle("e")} />
                    </div>
                    <motion.button type="submit"
                      whileHover={canNext ? { scale: 1.02, boxShadow: "0 0 32px rgba(255,102,0,0.28)" } : {}}
                      whileTap={canNext ? { scale: 0.97 } : {}}
                      style={{
                        padding: "14px", borderRadius: 12, background: canNext ? "#ff6600" : "rgba(255,102,0,0.2)",
                        border: "none", color: canNext ? "#fff" : "rgba(255,255,255,0.25)", fontSize: 13, fontWeight: 700,
                        cursor: canNext ? "pointer" : "not-allowed", fontFamily: "inherit",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "all 0.2s", marginTop: 4,
                      }}>
                      Continuar <ArrowRight size={14} />
                    </motion.button>
                  </motion.div>
                )}

                {/* STEP 1 */}
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.3 }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", marginBottom: 7 }}>Senha</p>
                      <div style={{ position: "relative" }}>
                        <input autoFocus type={showPwd ? "text" : "password"} value={pwd} onChange={e => setPwd(e.target.value)}
                          placeholder="Crie uma senha forte" required minLength={6}
                          onFocus={() => setFocused("p")} onBlur={() => setFocused(null)}
                          style={iStyle("p", 16)} />
                        <button type="button" onClick={() => setShowPwd(v => !v)}
                          style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.28)", cursor: "pointer", padding: 0, display: "flex" }}>
                          {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {pwd.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                            {[0,1,2,3].map(i => (
                              <motion.div key={i} animate={{ background: i < strength ? sColor : "rgba(255,255,255,0.07)" }}
                                transition={{ duration: 0.22 }} style={{ flex: 1, height: 2, borderRadius: 2 }} />
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            {[
                              { t: "8+ chars", ok: pwd.length >= 8 },
                              { t: "Maiúscula", ok: /[A-Z]/.test(pwd) },
                              { t: "Número", ok: /[0-9]/.test(pwd) },
                              { t: "Especial", ok: /[^A-Za-z0-9]/.test(pwd) },
                            ].map((r, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <Check size={9} style={{ color: r.ok ? "#22c55e" : "rgba(255,255,255,0.15)", transition: "color 0.2s" }} />
                                <span style={{ fontSize: 10, color: r.ok ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.18)", transition: "color 0.2s" }}>{r.t}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      <button type="button" onClick={() => setStep(0)}
                        style={{ flex: 1, padding: "13px", borderRadius: 12, background: "transparent", border: "1.5px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
                        ← Voltar
                      </button>
                      <motion.button type="submit" disabled={loading}
                        whileHover={!loading ? { scale: 1.02, boxShadow: "0 0 32px rgba(255,102,0,0.28)" } : {}}
                        whileTap={!loading ? { scale: 0.97 } : {}}
                        style={{
                          flex: 2, padding: "13px", borderRadius: 12, background: "#ff6600", border: "none",
                          color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                          opacity: loading ? 0.65 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          fontFamily: "inherit", transition: "opacity 0.2s",
                        }}>
                        {loading
                          ? <div style={{ width: 17, height: 17, border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
                          : <><span>Criar conta</span><ArrowRight size={14} /></>}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* social */}
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", textTransform: "uppercase", letterSpacing: "0.1em" }}>ou</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {["Google", "GitHub"].map(p => (
                    <motion.button key={p} type="button"
                      whileHover={{ borderColor: "rgba(255,102,0,0.3)", background: "rgba(255,102,0,0.04)" }}
                      whileTap={{ scale: 0.97 }}
                      style={{ padding: "11px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.38)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s" }}>
                      {p}
                    </motion.button>
                  ))}
                </div>
              </div>
            </form>
          </motion.div>
        </div>

        {/* base: termos */}
        <div style={{ padding: "20px 48px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.16)", textAlign: "center" }}>
            Ao criar conta você concorda com os{" "}
            <span style={{ color: "rgba(255,102,0,0.55)", cursor: "pointer" }}>Termos</span> e{" "}
            <span style={{ color: "rgba(255,102,0,0.55)", cursor: "pointer" }}>Privacidade</span>
          </p>
        </div>
      </div>

      {/* ══ COL B: painel visual com grade assimétrica ═══════════════════════ */}
      <div className="hidden lg:block" style={{ position: "relative", overflow: "hidden" }}>
        <DiagBg />

        {/* vignette */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(9,9,11,0.6) 100%)" }} />

        {/* grid interior assimétrico */}
        <div style={{ position: "relative", zIndex: 2, height: "100%", display: "grid", gridTemplateRows: "auto 1fr auto", padding: 0 }}>

          {/* topo: headline grande */}
          <div style={{ padding: "40px 48px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "#ff6600", marginBottom: 14 }}>
              ◈ Por que a Fechou?
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}>
              <div style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 0.93 }}>
                <span style={{ display: "block" }}>Contratos sérios.</span>
                <span style={{ display: "block", color: "#ff6600", fontStyle: "italic" }}>Freelancers sérios.</span>
              </div>
            </motion.div>
          </div>

          {/* centro: grade 2×2 de cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 0 }}>
            {[
              { n: "01", t: "Validade jurídica",  d: "Assinatura digital com força legal. MP 2.200-2/2001.", accent: false },
              { n: "02", t: "Sua marca",          d: "Logo, cor e fonte. Parece agência, não template.", accent: true },
              { n: "03", t: "PIX após assinar",   d: "Libere o pagamento direto. Sem intermediários.", accent: true },
              { n: "04", t: "Preview ao vivo",    d: "Veja o contrato enquanto edita. Zero surpresas.", accent: false },
            ].map((card, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  padding: "28px 28px",
                  borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  background: card.accent ? "rgba(255,102,0,0.05)" : "transparent",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  position: "relative", overflow: "hidden",
                }}>
                {card.accent && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "#ff6600" }} />}
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: card.accent ? "#ff6600" : "rgba(255,255,255,0.2)" }}>{card.n}</p>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: 6 }}>{card.t}</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", lineHeight: 1.6, fontWeight: 300 }}>{card.d}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* base: stat laranja */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
            style={{ padding: "28px 48px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#ff6600", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(0,0,0,0.45)", marginBottom: 4 }}>Plano gratuito</p>
              <p style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#000", lineHeight: 1 }}>R$ 0 <span style={{ fontSize: 14, fontWeight: 400, color: "rgba(0,0,0,0.45)" }}>para sempre</span></p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {["Contratos ilimitados", "Assinatura digital", "PDF profissional"].map(t => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="7" height="7" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(0,0,0,0.65)" }}>{t}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input::placeholder{color:rgba(255,255,255,0.18)} @media(max-width:1024px){.max-lg\\:grid-cols-1{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}
