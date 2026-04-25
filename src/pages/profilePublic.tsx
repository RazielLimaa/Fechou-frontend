/**
 * profilePublic.tsx — Perfil público do freelancer
 * Rota: /u/:slugOrId
 *
 * ─── ROOT CAUSE DO 404 ──────────────────────────────────────────────────────
 * O wouter retorna parâmetros nomeados apenas quando a rota está registrada
 * com o mesmo nome exato. Se o App.tsx define a rota como "/u/:id" mas o
 * componente lê params.slugOrId → undefined → setNotFound(true) imediatamente.
 *
 * SOLUÇÃO: usar useRoute() que retorna o match e os params de forma segura,
 * com fallback para useParams() e para params[0] (índice posicional do wouter).
 *
 * ─── OUTROS FIXES ───────────────────────────────────────────────────────────
 * · Distingue 403 (privado) de 404 (não existe)
 * · Cancela fetch se o componente desmontar (cleanup)
 * · profile.service.ts já chama /api/profile/public/:slugOrId ✓
 */

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useParams, useRoute } from "wouter";
import {
  ExternalLink, Github, Globe, Instagram, Linkedin,
  MapPin, RefreshCw, Star, UserCheck, ArrowUpRight,
  Lock,
} from "lucide-react";
import { getPublicProfile, type UserProfile } from "../service/profile.service";
import { SafeProfileAvatar } from "../components/profile/SafeProfileAvatar";
import {
  sanitizeProfileExternalUrl,
  sanitizeProfileText,
} from "../lib/profile-security";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Stars({ n, size = 13 }: { n: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size}
          fill={s <= n ? "#FF6600" : "none"}
          stroke={s <= n ? "#FF6600" : "rgba(255,255,255,0.12)"}
        />
      ))}
    </span>
  );
}

// Cor de acento muda conforme o nível do score
const LEVEL_COLOR: Record<string, string> = {
  Bronze:   "#cd7f32",
  Prata:    "#94a3b8",
  Ouro:     "#f59e0b",
  Diamante: "#38bdf8",
  Lendário: "#a78bfa",
};

// ─── Hook: extrai slugOrId de forma segura com wouter ─────────────────────────
// O wouter pode retornar params como objeto nomeado OU como array posicional
// dependendo de como a rota foi registrada no App.tsx.
// Esta função cobre todos os casos.

function useSlugOrId(): string {
  const params = useParams<{ slugOrId?: string; id?: string; slug?: string }>();

  // 1) Chave nomeada mais comum
  const named =
    (params as any)?.slugOrId ??
    (params as any)?.id ??
    (params as any)?.slug;

  if (named && typeof named === "string" && named.trim()) return named.trim();

  // 2) Índice posicional — wouter retorna params[0] quando não há nome definido
  const positional = (params as any)?.[0];
  if (positional && typeof positional === "string" && positional.trim())
    return positional.trim();

  // 3) Extrai direto da URL como último recurso
  if (typeof window !== "undefined") {
    const parts = window.location.pathname.split("/").filter(Boolean);
    // Espera /u/<slug> ou /perfil/<slug>
    const idx = parts.findIndex((p) => p === "u" || p === "perfil" || p === "profile");
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1].trim();
    // Último segmento como fallback
    if (parts.length > 0) return parts[parts.length - 1].trim();
  }

  return "";
}

// ─── Telas auxiliares ─────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={st.root}>
      <div style={st.grain} />
      <div style={st.grid} />
      {children}
      <style>{CSS}</style>
    </div>
  );
}

function LoadingScreen() {
  return (
    <Shell>
      <div style={st.centered}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}>
          <RefreshCw size={18} color="#FF6600" />
        </motion.div>
      </div>
    </Shell>
  );
}

function ErrorScreen({ isPrivate }: { isPrivate?: boolean }) {
  return (
    <Shell>
      <div style={st.centered}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: "center" }}>
          {isPrivate
            ? <Lock size={32} color="rgba(255,255,255,0.1)" style={{ margin: "0 auto 20px", display: "block" }} />
            : <p style={{ fontSize: "clamp(72px,16vw,140px)", fontWeight: 900, letterSpacing: "-0.06em", color: "rgba(255,255,255,0.04)", lineHeight: 1, margin: "0 0 0" }}>404</p>
          }
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.22)", marginTop: isPrivate ? 0 : -8, letterSpacing: "0.03em" }}>
            {isPrivate ? "Este perfil é privado." : "Perfil não encontrado."}
          </p>
          <div style={{ marginTop: 28, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.1)", letterSpacing: "0.08em" }}>verificado por</span>
            <span style={{ fontWeight: 900, fontSize: 12, color: "#FF6600", letterSpacing: "0.06em" }}>FECHOU!</span>
          </div>
        </motion.div>
      </div>
    </Shell>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PerfilPublico() {
  const slugOrId = useSlugOrId();

  const [profile,   setProfile]   = useState<UserProfile | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (!slugOrId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const p = await getPublicProfile(slugOrId);
        if (cancelled) return;
        setProfile(p);
      } catch (err: any) {
        if (cancelled) return;
        const status = err?.response?.status ?? 0;
        if (status === 403) setIsPrivate(true);
        else setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [slugOrId]);

  if (loading)              return <LoadingScreen />;
  if (isPrivate)            return <ErrorScreen isPrivate />;
  if (notFound || !profile) return <ErrorScreen />;

  // ── Dados seguros ─────────────────────────────────────────────────────────
  const { score, ratings, links } = profile;
  const accentColor  = LEVEL_COLOR[score?.level?.label ?? ""] ?? "#FF6600";
  const scorePct     = Math.min(100, ((score?.value ?? 0) / 500) * 100);
  const totalRatings = ratings?.totalRatings ?? 0;
  const avgStars     = ratings?.avgStars ?? 0;

  const socialLinks = [
    { url: links?.website,   Icon: Globe,        label: "Website"   },
    { url: links?.linkedin,  Icon: Linkedin,     label: "LinkedIn"  },
    { url: links?.instagram, Icon: Instagram,    label: "Instagram" },
    { url: links?.github,    Icon: Github,       label: "GitHub"    },
    { url: links?.behance,   Icon: ExternalLink, label: "Behance"   },
  ]
    .map((l) => ({ ...l, url: sanitizeProfileExternalUrl(l.url) }))
    .filter((l) => l.url);

  return (
    <Shell>
      {/* Glow ambiente — muda cor conforme nível */}
      <div style={{ ...st.glow, background: `radial-gradient(ellipse 55% 35% at 10% 0%, ${accentColor}0d 0%, transparent 70%)` }} />

      <div style={st.container}>

        {/* ── Top bar ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
          style={st.topBar}>
          <span style={st.brand}>FECHOU<span style={{ color: "#FF6600" }}>!</span></span>
          <div style={st.verifiedChip}>
            <UserCheck size={9} color="#22c55e" />
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "#22c55e" }}>
              Perfil Verificado
            </span>
          </div>
        </motion.div>

        {/* ── Hero ── */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}>

          <div style={st.heroRow}>
            {/* Avatar */}
            <SafeProfileAvatar
              src={profile.avatarUrl}
              name={profile.name}
              accentColor={accentColor}
              containerStyle={{ ...st.avatar, borderColor: `${accentColor}35` }}
              imageStyle={st.avatarImg}
              fallbackStyle={st.avatarInitial}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={st.name}>{sanitizeProfileText(profile.name, 60)}</h1>
              {profile.profession && (
                <p style={st.profession}>{sanitizeProfileText(profile.profession, 80)}</p>
              )}
              <div style={st.metaRow}>
                {profile.location && (
                  <span style={st.metaItem}>
                    <MapPin size={10} color="rgba(255,255,255,0.2)" />
                    {sanitizeProfileText(profile.location, 40)}
                  </span>
                )}
                <span style={st.metaItem}>
                  Membro desde {new Date(profile.memberSince).getFullYear()}
                </span>
              </div>
            </div>
          </div>

          {profile.bio && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
              style={st.bio}>
              {sanitizeProfileText(profile.bio, 400)}
            </motion.p>
          )}

          {socialLinks.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}
              style={st.linksRow}>
              {socialLinks.map(({ url, Icon, label }) => (
                <a key={label} href={url!} target="_blank" rel="noopener noreferrer"
                  style={st.linkChip}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${accentColor}45`;
                    (e.currentTarget as HTMLElement).style.color = "#fff";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                    (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.38)";
                  }}>
                  <Icon size={11} />
                  {label}
                  <ArrowUpRight size={9} style={{ opacity: 0.35 }} />
                </a>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* ── Divisor ── */}
        <div style={st.divider} />

        {/* ── Stats ── */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.6 }}
          style={st.statsRow} className="stats-row">

          <div style={st.statBlock}>
            <p style={{ ...st.statLabel, color: accentColor }}>Score</p>
            <p style={{ ...st.statVal, color: accentColor }}>{score?.value ?? 0}</p>
            <p style={st.statSub}>{sanitizeProfileText(score?.level?.label ?? "—", 20)} {score?.level?.emoji ?? ""}</p>
          </div>

          <div style={st.statSep} className="stat-sep" />

          <div style={st.statBlock}>
            <p style={st.statLabel}>Contratos</p>
            <p style={{ ...st.statVal, color: "#22c55e" }}>{score?.totalSold ?? 0}</p>
            <p style={st.statSub}>vendidos</p>
          </div>

          <div style={st.statSep} className="stat-sep" />

          <div style={st.statBlock}>
            <p style={st.statLabel}>Em andamento</p>
            <p style={{ ...st.statVal, color: "#f59e0b" }}>{score?.totalPending ?? 0}</p>
            <p style={st.statSub}>ativos</p>
          </div>

          <div style={st.statSep} className="stat-sep" />

          <div style={st.statBlock}>
            <p style={st.statLabel}>Avaliação</p>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <p style={{ ...st.statVal, color: "#f59e0b", margin: 0 }}>
                {totalRatings > 0 ? avgStars.toFixed(1) : "—"}
              </p>
              {totalRatings > 0 && <Stars n={Math.round(avgStars)} />}
            </div>
            <p style={st.statSub}>
              {totalRatings > 0 ? `${totalRatings} avaliação${totalRatings !== 1 ? "ões" : ""}` : "Sem avaliações"}
            </p>
          </div>
        </motion.div>

        {/* ── Barra de progresso do score ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 }}
          style={{ marginTop: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.22em", color: "rgba(255,255,255,0.18)" }}>
              Progresso para Lendário
            </span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontWeight: 600 }}>
              {score?.value ?? 0} / 500 pts
            </span>
          </div>
          <div style={st.barTrack}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${scorePct}%` }}
              transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ ...st.barFill, background: accentColor }} />
          </div>
        </motion.div>

        {/* ── Avaliações ── */}
        {totalRatings > 0 && (
          <>
            <div style={st.divider} />

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.6 }}>

              <div style={st.sectionRow}>
                <p style={st.sectionTitle}>O que dizem os clientes</p>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Stars n={Math.round(avgStars)} size={12} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontWeight: 600 }}>
                    {avgStars.toFixed(1)} / 5
                  </span>
                </div>
              </div>

              <div style={st.reviewGrid} className="review-grid">
                {(ratings?.recent ?? []).slice(0, 6).map((r, i) => (
                  <motion.div key={r.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.42 + i * 0.07, duration: 0.45 }}
                    style={st.reviewCard}>
                    <div style={st.reviewHeader}>
                      <div style={st.reviewAvatar}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: accentColor }}>
                          {sanitizeProfileText(r.raterName, 1).toUpperCase()}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={st.reviewName}>{sanitizeProfileText(r.raterName, 40)}</p>
                        <p style={st.reviewDate}>
                          {new Date(r.createdAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                        </p>
                      </div>
                      <Stars n={r.stars} size={11} />
                    </div>
                    {r.comment && (
                      <p style={st.reviewComment}>"{sanitizeProfileText(r.comment, 280)}"</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}

        {/* ── Footer ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          style={st.footer}>
          <div style={st.footerLine} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" as const }}>
            <span style={st.footerText}>Perfil verificado pelo</span>
            <span style={st.footerBrand}>FECHOU<span style={{ color: "#FF6600" }}>!</span></span>
            <span style={st.footerText}>· Contratos com validade jurídica</span>
          </div>
        </motion.div>

      </div>
    </Shell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  root: {
    background: "#080808",
    minHeight: "100vh",
    color: "#fff",
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    position: "relative",
    overflowX: "hidden",
  },
  grain: {
    position: "fixed",
    inset: "-200%",
    width: "400%",
    height: "400%",
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
    opacity: 0.022,
    pointerEvents: "none",
    zIndex: 0,
    animation: "grain 8s steps(10) infinite",
  },
  grid: {
    position: "fixed",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px)," +
      "linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)",
    backgroundSize: "72px 72px",
    pointerEvents: "none",
    zIndex: 0,
  },
  glow: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: 760,
    margin: "0 auto",
    padding: "clamp(28px,6vw,64px) clamp(20px,5vw,48px) 64px",
  },
  centered: {
    position: "relative",
    zIndex: 1,
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  // Top bar
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "clamp(36px,7vw,64px)",
  },
  brand: {
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "#fff",
  },
  verifiedChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 10px",
    borderRadius: 999,
    border: "1px solid rgba(34,197,94,0.2)",
    background: "rgba(34,197,94,0.06)",
  },

  // Hero
  heroRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "clamp(14px,3vw,26px)",
    marginBottom: 22,
    flexWrap: "wrap" as const,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: "50%",
    border: "1.5px solid",
    background: "rgba(255,102,0,0.06)",
    overflow: "hidden",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" as const },
  avatarInitial: { fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em" },
  name: {
    fontSize: "clamp(26px,5vw,50px)",
    fontWeight: 900,
    letterSpacing: "-0.04em",
    lineHeight: 1,
    margin: "0 0 5px",
  },
  profession: {
    fontSize: "clamp(12px,1.6vw,14px)",
    color: "rgba(255,255,255,0.32)",
    margin: "0 0 9px",
    fontWeight: 400,
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap" as const,
  },
  metaItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    color: "rgba(255,255,255,0.2)",
    letterSpacing: "0.01em",
  },
  bio: {
    fontSize: "clamp(13px,1.5vw,14px)",
    color: "rgba(255,255,255,0.35)",
    lineHeight: 1.8,
    maxWidth: 560,
    margin: "0 0 22px",
    fontWeight: 300,
  },
  linksRow: {
    display: "flex",
    gap: 7,
    flexWrap: "wrap" as const,
  },
  linkChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "rgba(255,255,255,0.02)",
    color: "rgba(255,255,255,0.38)",
    fontSize: 11,
    fontWeight: 600,
    textDecoration: "none",
    letterSpacing: "0.01em",
    transition: "border-color 0.18s, color 0.18s",
    cursor: "pointer",
  },

  // Divider
  divider: {
    width: "100%",
    height: 1,
    background: "rgba(255,255,255,0.05)",
    margin: "clamp(24px,4.5vw,44px) 0",
  },

  // Stats
  statsRow: {
    display: "flex",
    gap: "clamp(18px,3.5vw,36px)",
    flexWrap: "wrap" as const,
    alignItems: "flex-start",
  },
  statBlock: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    minWidth: 72,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.22em",
    color: "rgba(255,255,255,0.22)",
    margin: 0,
  },
  statVal: {
    fontSize: "clamp(26px,4vw,38px)",
    fontWeight: 900,
    letterSpacing: "-0.04em",
    lineHeight: 1,
    margin: 0,
  },
  statSub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.18)",
    margin: 0,
    letterSpacing: "0.02em",
  },
  statSep: {
    width: 1,
    alignSelf: "stretch",
    background: "rgba(255,255,255,0.06)",
    flexShrink: 0,
    minHeight: 44,
  },

  // Score bar
  barTrack: {
    height: 3,
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 999 },

  // Section header
  sectionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.28em",
    color: "rgba(255,255,255,0.22)",
    margin: 0,
  },

  // Reviews
  reviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
    gap: 10,
  },
  reviewCard: {
    padding: "16px 18px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.015)",
  },
  reviewHeader: {
    display: "flex",
    alignItems: "center",
    gap: 9,
  },
  reviewAvatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "rgba(255,102,0,0.07)",
    border: "1px solid rgba(255,102,0,0.16)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reviewName: {
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(255,255,255,0.7)",
    margin: 0,
    lineHeight: 1.2,
  },
  reviewDate: {
    fontSize: 9,
    color: "rgba(255,255,255,0.16)",
    margin: 0,
    letterSpacing: "0.03em",
    textTransform: "capitalize" as const,
  },
  reviewComment: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    lineHeight: 1.65,
    fontStyle: "italic",
    margin: "11px 0 0",
    paddingLeft: 37,
    fontWeight: 300,
  },

  // Footer
  footer: { marginTop: "clamp(40px,6vw,64px)" },
  footerLine: {
    width: 36,
    height: 1,
    background: "rgba(255,255,255,0.05)",
    margin: "0 auto 18px",
  },
  footerText: { fontSize: 10, color: "rgba(255,255,255,0.12)", letterSpacing: "0.04em" },
  footerBrand: { fontSize: 11, fontWeight: 900, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" },
};

// ─── CSS global (grain animation + responsive) ────────────────────────────────

const CSS = `
  @keyframes grain {
    0%,100% { transform: translate(0,0) }
    10%  { transform: translate(-2%,-3%) }
    20%  { transform: translate(3%,2%) }
    30%  { transform: translate(-1%,4%) }
    40%  { transform: translate(4%,-1%) }
    50%  { transform: translate(-3%,1%) }
    60%  { transform: translate(2%,-4%) }
    70%  { transform: translate(-4%,2%) }
    80%  { transform: translate(1%,3%) }
    90%  { transform: translate(3%,-2%) }
  }
  @media (max-width: 580px) {
    .stats-row  { gap: 18px !important; }
    .stat-sep   { width: 100% !important; height: 1px !important; min-height: 0 !important; }
    .review-grid { grid-template-columns: 1fr !important; }
  }
`;
