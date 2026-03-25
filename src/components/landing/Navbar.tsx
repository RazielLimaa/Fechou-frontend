import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { me, type AuthUser } from "../../service/api/auth";
import { motion, AnimatePresence } from "framer-motion";
import { authStorage } from "../../lib/auth-storage";

type AuthState =
  | { status: "guest"; user: null }
  | { status: "loading"; user: AuthUser | null }
  | { status: "authed"; user: AuthUser };

function readStoredAuth(): { token: string | null; user: AuthUser | null } {
  const token = authStorage.getAccessToken();
  const rawUser = authStorage.getUserRaw();
  if (!token || !rawUser) return { token: null, user: null };
  try { return { token, user: JSON.parse(rawUser) as AuthUser }; }
  catch { return { token, user: null }; }
}

// altura da navbar — usada como CSS var para spacer e menu offset
const NAV_H = 58;

export default function Navbar() {
  const [location, navigate] = useLocation();
  const [scrolled, setScrolled]       = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);
  const menuRef = useRef<HTMLDivElement>(null);

  const [{ status, user }, setAuth] = useState<AuthState>(() => {
    const { token, user } = readStoredAuth();
    return token && user ? { status: "authed", user } : { status: "guest", user: null };
  });

  // scroll listener
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // mobile detector
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // fecha tudo ao trocar rota
  useEffect(() => { setMobileOpen(false); setUserMenuOpen(false); }, [location]);

  // bloqueia scroll do body quando menu mobile aberto
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // sync auth entre abas
  useEffect(() => {
    const sync = () => {
      const { token, user } = readStoredAuth();
      if (token && user) setAuth({ status: "authed", user });
      else setAuth({ status: "guest", user: null });
    };
    const handler = (e: StorageEvent) => {
      if (e.key === "access_token" || e.key === "user") sync();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // valida token com backend
  useEffect(() => {
    const { token, user } = readStoredAuth();
    if (!token) return;
    setAuth({ status: "loading", user: user ?? null });
    me(token)
      .then((u) => { authStorage.setUserRaw(JSON.stringify(u)); setAuth({ status: "authed", user: u }); })
      .catch(() => { authStorage.clearAll(); setAuth({ status: "guest", user: null }); });
  }, []);

  // click fora fecha user menu
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = useMemo(() => {
    if (!user?.name) return "U";
    const parts = user.name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }, [user]);

  const handleLogout = () => {
    authStorage.clearAll();
    setAuth({ status: "guest", user: null });
    navigate("/login");
  };

  const NAV_LINKS = [
    { href: "/vision", label: "Vision" },
    { href: "/system", label: "Fechado?!" },
  ];

  return (
    <>
      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, width: "100%", maxWidth: "100vw",
          zIndex: 100, fontFamily: "'DM Sans','Inter',sans-serif",
        }}
      >
        <div style={{
          transition: "background 0.4s, border-color 0.4s, backdrop-filter 0.4s",
          background: scrolled || mobileOpen ? "rgba(9,9,11,0.96)" : "transparent",
          backdropFilter: scrolled || mobileOpen ? "blur(20px) saturate(1.4)" : "none",
          WebkitBackdropFilter: scrolled || mobileOpen ? "blur(20px) saturate(1.4)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "1px solid transparent",
          width: "100%",
          boxSizing: "border-box",
        }}>
          <div style={{
            width: "100%",
            maxWidth: 1280,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobile ? "0 14px" : "0 clamp(20px, 4vw, 40px)",
            height: isMobile ? 52 : NAV_H,
            gap: 8,
            boxSizing: "border-box",
            position: "relative",
          }}>

            {/* ── LOGO ─────────────────────────────────────────────────────── */}
            <Link href="/">
              <motion.span
                className="font-display"
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                style={{
                  fontSize: isMobile ? 15 : "clamp(16px, 2.5vw, 20px)",
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  color: "#fff",
                  cursor: "pointer",
                  display: "block",
                  userSelect: "none",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                FECHOU<span style={{ color: "#ff6600", fontStyle: "italic" }}>!</span>
              </motion.span>
            </Link>

            {/* ── LINKS DESKTOP — pill central ─────────────────────────────── */}
            {isMobile === false && (
              <div
                style={{
                  position: "absolute", left: "50%", transform: "translateX(-50%)",
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 999,
                  padding: "4px 5px",
                  gap: 2,
                }}
              >
                {NAV_LINKS.map((link) => {
                  const active = location === link.href;
                  return (
                    <Link key={link.href} href={link.href}>
                      <motion.span
                        initial="rest" whileHover="hover" animate="rest"
                        style={{
                          display: "block",
                          padding: "6px 16px",
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.16em",
                          cursor: "pointer",
                          color: active ? "#fff" : "rgba(255,255,255,0.38)",
                          background: active ? "#ff6600" : "transparent",
                          position: "relative",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {!active && (
                          <motion.span
                            variants={{ rest: { scaleY: 0 }, hover: { scaleY: 1 } }}
                            style={{ position: "absolute", inset: 0, borderRadius: 999, background: "rgba(255,102,0,0.12)", zIndex: 0, transformOrigin: "bottom" }}
                            transition={{ duration: 0.22 }}
                          />
                        )}
                        {active && (
                          <motion.span
                            layoutId="nav-pill"
                            style={{ position: "absolute", inset: 0, borderRadius: 999, background: "#ff6600", zIndex: -1 }}
                            transition={{ type: "spring", stiffness: 380, damping: 28 }}
                          />
                        )}
                        <motion.span
                          variants={{ rest: { color: active ? "#fff" : "rgba(255,255,255,0.38)" }, hover: { color: active ? "#fff" : "#ff6600" } }}
                          style={{ position: "relative", zIndex: 1 }}
                        >
                          {link.label}
                        </motion.span>
                      </motion.span>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* ── DIREITA: auth + hamburger ─────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 8, flexShrink: 0 }}>

              {/* GUEST */}
              {status === "guest" && (
                <>
                  {/* "Entrar" só no desktop */}
                  {isMobile === false && (
                    <Link href="/login">
                      <motion.span
                        initial="rest" whileHover="hover" animate="rest"
                        style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", cursor: "pointer", padding: "6px 10px", position: "relative", display: "block", whiteSpace: "nowrap", color: "rgba(255,255,255,0.38)" }}
                      >
                        <motion.span variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }} transition={{ duration: 0.22 }}
                          style={{ position: "absolute", bottom: 2, left: 0, right: 0, height: 1, background: "#ff6600", transformOrigin: "left" }} />
                        <motion.span variants={{ rest: { color: "rgba(255,255,255,0.38)" }, hover: { color: "#fff" } }}>Entrar</motion.span>
                      </motion.span>
                    </Link>
                  )}
                  {/* Botão CTA — visível em todos os tamanhos, texto adapta */}
                  <Link href="/register">
                    <motion.button
                      whileHover={{ scale: 1.04, background: "#e55a00" }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        padding: isMobile ? "6px 11px" : "7px 14px",
                        borderRadius: 999,
                        background: "#ff6600",
                        border: "none",
                        color: "#fff",
                        fontSize: isMobile ? 10 : 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.14em",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        whiteSpace: "nowrap",
                        transition: "background 0.2s",
                      }}>
                      {isMobile ? "Grátis" : "Começar grátis"}
                    </motion.button>
                  </Link>
                </>
              )}

              {/* AUTHED — avatar pill: no mobile só mostra avatar simples, sem pill */}
              {(status === "authed" || status === "loading") && user && (
                <div ref={menuRef} style={{ position: "relative" }}>
                  <motion.button
                    onClick={() => setUserMenuOpen(v => !v)}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: isMobile ? "0" : "4px 10px 4px 4px",
                      borderRadius: 999,
                      background: isMobile ? "transparent" : (userMenuOpen ? "rgba(255,102,0,0.1)" : "rgba(255,255,255,0.05)"),
                      border: isMobile ? "none" : `1px solid ${userMenuOpen ? "rgba(255,102,0,0.3)" : "rgba(255,255,255,0.08)"}`,
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                    }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: "rgba(255,102,0,0.15)", border: "1px solid rgba(255,102,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#ff6600" }}>
                      {initials}
                    </div>
                    {isMobile === false && (
                      <>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {user.name?.split(" ")[0]}
                        </span>
                        <motion.svg animate={{ rotate: userMenuOpen ? 180 : 0 }} transition={{ duration: 0.2 }}
                          width="9" height="9" viewBox="0 0 10 10" fill="none">
                          <path d="M2 3.5L5 6.5L8 3.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round"/>
                        </motion.svg>
                      </>
                    )}
                  </motion.button>

                  {/* dropdown — só desktop */}
                  {isMobile === false && (
                    <AnimatePresence>
                      {userMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.96 }}
                          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                          style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 200, borderRadius: 16, background: "rgba(18,18,20,0.97)", border: "1px solid rgba(255,255,255,0.09)", backdropFilter: "blur(20px)", overflow: "hidden", zIndex: 9999, boxShadow: "0 16px 40px rgba(0,0,0,0.6)" }}>
                          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{user.name}</p>
                            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
                          </div>
                          {[{ label: "Dashboard", href: "/propostas" }, { label: "Meu perfil", href: "/profile" }].map(item => (
                            <Link key={item.href} href={item.href}>
                              <motion.div whileHover={{ background: "rgba(255,102,0,0.07)", paddingLeft: 20 }}
                                style={{ padding: "11px 16px", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.55)", cursor: "pointer", transition: "padding 0.15s" }}>
                                {item.label}
                              </motion.div>
                            </Link>
                          ))}
                          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                            <motion.button onClick={handleLogout} whileHover={{ background: "rgba(239,68,68,0.07)" }}
                              style={{ width: "100%", padding: "11px 16px", textAlign: "left", background: "none", border: "none", fontSize: 12, fontWeight: 500, color: "rgba(239,68,68,0.65)", cursor: "pointer", fontFamily: "inherit" }}>
                              Sair
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              )}

              {/* ── HAMBURGER — sempre visível no mobile ─────────────────────── */}
              <motion.button
                onClick={() => setMobileOpen(v => !v)}
                whileTap={{ scale: 0.92 }}
                aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
                style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: mobileOpen ? "rgba(255,102,0,0.12)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${mobileOpen ? "rgba(255,102,0,0.3)" : "rgba(255,255,255,0.08)"}`,
                  display: isMobile === true ? "flex" : "none",
                  flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 4,
                  cursor: "pointer", transition: "all 0.2s", padding: 0,
                }}
              >
                <motion.span animate={{ rotate: mobileOpen ? 45 : 0, y: mobileOpen ? 6 : 0 }}
                  style={{ display: "block", width: 13, height: 1.5, background: mobileOpen ? "#ff6600" : "rgba(255,255,255,0.65)", borderRadius: 1, transformOrigin: "center" }} />
                <motion.span animate={{ opacity: mobileOpen ? 0 : 1, scaleX: mobileOpen ? 0 : 1 }}
                  style={{ display: "block", width: 13, height: 1.5, background: "rgba(255,255,255,0.65)", borderRadius: 1 }} />
                <motion.span animate={{ rotate: mobileOpen ? -45 : 0, y: mobileOpen ? -6 : 0 }}
                  style={{ display: "block", width: 13, height: 1.5, background: mobileOpen ? "#ff6600" : "rgba(255,255,255,0.65)", borderRadius: 1, transformOrigin: "center" }} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* ── MENU MOBILE FULLSCREEN ───────────────────────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "fixed",
                top: isMobile ? 52 : NAV_H,
                left: 0, right: 0, bottom: 0,
                background: "#09090b",
                zIndex: 99,
                display: "flex", flexDirection: "column",
                fontFamily: "'DM Sans','Inter',sans-serif",
                overflowY: "auto",
                overscrollBehavior: "contain",
              }}>

              {/* linha laranja fina no topo */}
              <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #ff6600, transparent)", flexShrink: 0 }} />

              {/* ── links grandes ── */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px", minHeight: 0 }}>
                {NAV_LINKS.map((link, i) => {
                  const active = location === link.href;
                  return (
                    <motion.div key={link.href}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.06 + i * 0.06, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <Link href={link.href}>
                        <motion.div
                          whileHover="hover" initial="rest" animate="rest"
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "clamp(14px, 3.5vh, 22px) 0", cursor: "pointer" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {active && (
                              <motion.span layoutId="mob-dot"
                                style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff6600", flexShrink: 0 }} />
                            )}
                            <motion.span
                              variants={{ rest: { color: active ? "#fff" : "rgba(255,255,255,0.4)" }, hover: { color: "#fff" } }}
                              style={{ fontSize: "clamp(22px, 6vh, 40px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1 }}>
                              {link.label}
                            </motion.span>
                          </div>
                          <motion.div
                            variants={{ rest: { opacity: 0, x: -6, color: "#ff6600" }, hover: { opacity: 1, x: 0, color: "#ff6600" } }}
                            transition={{ duration: 0.15 }}
                            style={{ fontSize: 22, flexShrink: 0 }}>→</motion.div>
                        </motion.div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* ── rodapé do menu ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.22, duration: 0.3 }}
                style={{ padding: "20px 24px 32px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>

                {status === "guest" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                    <Link href="/login">
                      <motion.button whileTap={{ scale: 0.97 }}
                        style={{ width: "100%", padding: "13px", borderRadius: 12, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", cursor: "pointer", fontFamily: "inherit" }}>
                        Entrar
                      </motion.button>
                    </Link>
                    <Link href="/register">
                      <motion.button whileTap={{ scale: 0.97 }}
                        whileHover={{ boxShadow: "0 0 20px rgba(255,102,0,0.3)" }}
                        style={{ width: "100%", padding: "13px", borderRadius: 12, background: "#ff6600", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", cursor: "pointer", fontFamily: "inherit" }}>
                        Começar grátis
                      </motion.button>
                    </Link>
                  </div>
                ) : user ? (
                  <div style={{ marginBottom: 16 }}>
                    {/* user info row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 8 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,102,0,0.12)", border: "1px solid rgba(255,102,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#ff6600", flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>{user.name?.split(" ")[0]}</p>
                        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
                      <Link href="/propostas">
                        <motion.button whileTap={{ scale: 0.97 }}
                          style={{ width: "100%", padding: "11px 16px", borderRadius: 10, background: "#ff6600", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", cursor: "pointer", fontFamily: "inherit" }}>
                          Dashboard
                        </motion.button>
                      </Link>
                      <Link href="/profile">
                        <motion.button whileTap={{ scale: 0.97 }}
                          style={{ width: "100%", padding: "11px 16px", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,102,0,0.25)", color: "#ff6600", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", cursor: "pointer", fontFamily: "inherit" }}>
                          Perfil
                        </motion.button>
                      </Link>
                      <motion.button onClick={handleLogout} whileTap={{ scale: 0.97 }}
                        style={{ padding: "11px 14px", borderRadius: 10, background: "transparent", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.6)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                        Sair
                      </motion.button>
                    </div>
                  </div>
                ) : null}

                {/* status pill */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 5px rgba(34,197,94,0.5)" }} />
                  <p style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", textTransform: "uppercase", letterSpacing: "0.18em" }}>
                    Fechou! · Contratos para freelancers
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/*
        SEM SPACER — a navbar é transparent/fixed e flutua sobre o Hero.
        O Hero usa minHeight:100dvh e se posiciona abaixo da navbar
        naturalmente via position:relative.
        Em páginas internas sem Hero, adicione paddingTop: NAV_H no wrapper:
          <div style={{ paddingTop: 58 }}>conteúdo</div>
      */}
    </>
  );
}