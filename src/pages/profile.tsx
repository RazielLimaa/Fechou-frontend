/**
 * profile.tsx â€” Identidade Fechou! com morphing gradient blobs
 *
 * Background: SVG filter goo + blobs CSS animados com keyframes
 * distintos para cada bolha â€” efeito de lava lamp premium.
 * Blobs em laranja/Ã¢mbar sobre preto profundo.
 *
 * Grid: 3 colunas assimÃ©tricas com toda lÃ³gica original preservada.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Camera, Check, ExternalLink, Globe, Github,
  Instagram, Linkedin, Save, Star,
  User, Eye, EyeOff, Copy, RefreshCw, X, ArrowUpRight,
} from "lucide-react";
import Navbar from "../components/landing/Navbar";
import { SafeProfileAvatar } from "../components/profile/SafeProfileAvatar";
import {
  sanitizeProfileAvatarSrc,
  sanitizeProfileExternalUrl,
} from "../lib/profile-security";
import {
  getMyProfile, updateMyProfile, fileToDataUrl,
  sanitizeProfileSlug,
  type UserProfile, type UpdateProfilePayload, type RatingItem,
} from "../service/profile.service";
import { ApiError } from "../service/api";

// â”€â”€â”€ Constantes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ORANGE = "#FF6600";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
const LEVEL_META: Record<string, { color: string; emoji: string }> = {
  Bronze: { color: "#cd7f32", emoji: "\u{1F949}" },
  Prata: { color: "#94a3b8", emoji: "\u{1F948}" },
  Ouro: { color: "#f59e0b", emoji: "\u{1F947}" },
  Diamante: { color: "#38bdf8", emoji: "\u{1F48E}" },
  Lendario: { color: "#a78bfa", emoji: "\u{1F451}" },
};

// â”€â”€â”€ Micro helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const safe = (v: unknown, max = 200) =>
  String(v ?? "").replace(/<[^>]*>/g, "").replace(/javascript:/gi, "").trim().slice(0, max);

function getProfileErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      if (/imagem|image|avatar|2mb|2 mb|tamanho|large/i.test(error.message)) {
        return "A imagem deve ter no mÃ¡ximo 2MB.";
      }
      return error.message;
    }
    if (error.status === 409) return "Este endereÃ§o de perfil jÃ¡ estÃ¡ em uso.";
    if (error.status >= 500) return "NÃ£o foi possÃ­vel carregar o perfil agora. Tente novamente em instantes.";
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function toProfileForm(profile: UserProfile): UpdateProfilePayload {
  return {
    displayName: profile.name ?? "",
    bio: profile.bio ?? "",
    profession: profile.profession ?? "",
    location: profile.location ?? "",
    slug: profile.slug ?? sanitizeProfileSlug(profile.name),
    isPublic: profile.isPublic,
    avatarUrl: sanitizeProfileAvatarSrc(profile.avatarUrl),
    linkWebsite: profile.links?.website ?? "",
    linkLinkedin: profile.links?.linkedin ?? "",
    linkInstagram: profile.links?.instagram ?? "",
    linkGithub: profile.links?.github ?? "",
    linkBehance: profile.links?.behance ?? "",
  };
}

function toSavePayload(form: UpdateProfilePayload): UpdateProfilePayload {
  return {
    displayName: safe(form.displayName, 120),
    bio: safe(form.bio, 500),
    profession: safe(form.profession, 120),
    location: safe(form.location, 120),
    slug: sanitizeProfileSlug(form.slug),
    avatarUrl: form.avatarUrl === undefined ? undefined : sanitizeProfileAvatarSrc(form.avatarUrl),
    isPublic: Boolean(form.isPublic),
    linkWebsite: sanitizeProfileExternalUrl(form.linkWebsite) ?? null,
    linkLinkedin: sanitizeProfileExternalUrl(form.linkLinkedin) ?? null,
    linkInstagram: sanitizeProfileExternalUrl(form.linkInstagram) ?? null,
    linkGithub: sanitizeProfileExternalUrl(form.linkGithub) ?? null,
    linkBehance: sanitizeProfileExternalUrl(form.linkBehance) ?? null,
  };
}

function Stars({ n, size = 12 }: { n: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={size}
          fill={s <= n ? "#f59e0b" : "none"}
          stroke={s <= n ? "#f59e0b" : "rgba(255,255,255,0.1)"} />
      ))}
    </span>
  );
}

function Rule() {
  return <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.07)" }} />;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.26em", color: "rgba(255,255,255,0.22)", margin: "0 0 5px", fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </p>
  );
}

function SectionMark({ color = ORANGE }: { color?: string }) {
  return <div style={{ width: 3, height: 18, background: color, borderRadius: 2, flexShrink: 0 }} />;
}

// Input estilizado com focus laranja
function Input({
  value, placeholder, onChange, maxLength, multiline, prefix,
}: {
  value: string; placeholder?: string; maxLength?: number;
  onChange: (v: string) => void; multiline?: boolean; prefix?: string;
}) {
  const [focused, setFocused] = useState(false);
  const base: React.CSSProperties = {
    flex: 1, background: "transparent", border: "none",
    padding: prefix ? "9px 11px" : "9px 13px",
    color: "#fff", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    outline: "none", width: "100%", boxSizing: "border-box" as const,
    resize: "vertical" as const,
  };
  return (
    <div style={{
      display: "flex", alignItems: prefix ? "center" : undefined,
      borderRadius: 8,
      border: `1px solid ${focused ? `${ORANGE}50` : "rgba(255,255,255,0.09)"}`,
      background: focused ? "rgba(255,102,0,0.04)" : "rgba(255,255,255,0.03)",
      overflow: "hidden", transition: "border-color 0.18s, background 0.18s",
    }}>
      {prefix && (
        <span style={{ padding: "9px 9px", fontSize: 11, color: "rgba(255,255,255,0.2)", borderRight: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" as const, flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>
          {prefix}
        </span>
      )}
      {multiline
        ? <textarea value={value} placeholder={placeholder} maxLength={maxLength} rows={3}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ ...base, display: "block" }} />
        : <input value={value} placeholder={placeholder} maxLength={maxLength}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ ...base, display: "block" }} />
      }
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ background: "#080808", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}>
        <RefreshCw size={16} color={ORANGE} />
      </motion.div>
    </div>
  );
}


// â”€â”€â”€ Componente principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Perfil() {
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [copied,   setCopied]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<UpdateProfilePayload>({});

  const set = useCallback(<K extends keyof UpdateProfilePayload>(k: K, v: UpdateProfilePayload[K]) =>
    setForm(f => ({ ...f, [k]: v })), []);

  useEffect(() => {
    (async () => {
      try {
        const p = await getMyProfile();
        setProfile(p);
        setForm(toProfileForm(p));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setError("Sessão expirada. Faça login novamente.");
          navigate("/login");
          return;
        }
        setError(getProfileErrorMessage(err, "Não foi possível carregar o perfil agora. Tente novamente em instantes."));
      }
      finally { setLoading(false); }
    })();
  }, [navigate]);

  const handleAvatar = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      setError("Formato de imagem inválido. Use PNG, JPG, JPEG, WEBP ou GIF.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("A imagem deve ter no máximo 2MB.");
      e.target.value = "";
      return;
    }
    set("avatarUrl", sanitizeProfileAvatarSrc(await fileToDataUrl(file)));
  }, [set]);

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const updated = await updateMyProfile(toSavePayload(form));
      setProfile(updated);
      setForm(toProfileForm(updated));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Sessão expirada. Faça login novamente.");
        navigate("/login");
        return;
      }
      setError(getProfileErrorMessage(err, "Erro ao salvar."));
    } finally { setSaving(false); }
  };

  const publicUrl = profile?.slug
    ? `${window.location.origin}/u/${profile.slug}`
    : profile?.userId ? `${window.location.origin}/u/${profile.userId}` : null;

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    });
  };

  if (loading) return <Spinner />;

  const score    = profile?.score;
  const ratings  = profile?.ratings;
  const levelFallback = LEVEL_META[score?.level?.label ?? ""] ?? { color: "#cd7f32", emoji: "\u{1F949}" };
  const levelMeta = {
    color: score?.level?.color || levelFallback.color,
    emoji: score?.level?.emoji || levelFallback.emoji,
  };
  const scorePct  = Math.min(100, ((score?.value ?? 0) / 500) * 100);

  return (
    <div style={{ background: "#080808", minHeight: "100vh", color: "#fff", fontFamily: "'DM Sans', sans-serif", position: "relative" }}>


      {/* â”€â”€ SVG goo filter (invisÃ­vel â€” sÃ³ define o filtro) â”€â”€ */}
      <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix in="blur" mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -8"
              result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>



      {/* Linha vertical laranja â€” marca Fechou! */}
      <div style={{
        position: "fixed", top: 0, bottom: 0,
        left: "clamp(14px,3.5vw,44px)", width: 1,
        background: `linear-gradient(to bottom, transparent, ${ORANGE}35 25%, ${ORANGE}20 75%, transparent)`,
        pointerEvents: "none", zIndex: 3,
      }} aria-hidden="true" />

  
      {/* â”€â”€ ConteÃºdo â”€â”€ */}
      <div style={{ position: "relative", zIndex: 4 }}>
        <Navbar />

        <main style={{ padding: "clamp(20px,4vw,48px) clamp(20px,5vw,60px) 100px" }}>

          {/* HERO HEADER */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "clamp(12px,2.5vw,28px)", marginBottom: 4, overflow: "hidden", flexWrap: "wrap" }}>
              {/* NÃºmero grande */}
              <motion.p
                initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.16,1,0.3,1] }}
                style={{ fontSize: "clamp(60px,10vw,116px)", fontWeight: 900, letterSpacing: "-0.06em", color: "rgba(255,255,255,0.05)", lineHeight: 0.85, margin: 0, userSelect: "none", fontFamily: "'DM Sans', sans-serif" }}>
                01
              </motion.p>

              <motion.div initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.08, duration: 0.7, ease: [0.16,1,0.3,1] }}
                style={{ paddingBottom: "clamp(3px,0.8vw,10px)", flex: 1, minWidth: 200 }}>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.36em", color: ORANGE, margin: "0 0 6px" }}>
                  â— Perfil Premium
                </p>
                <h1 style={{ fontSize: "clamp(28px,5vw,58px)", fontWeight: 900, letterSpacing: "-0.044em", lineHeight: 0.95, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                  Sua identidade<br />
                  <span style={{ color: ORANGE }}>no mercado.</span>
                </h1>
              </motion.div>

              {/* Link pÃºblico */}
              {publicUrl && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 }}
                  style={{ paddingBottom: "clamp(3px,0.8vw,10px)", flexShrink: 0 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "7px 11px", borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.09)",
                    background: "rgba(255,255,255,0.03)",
                    backdropFilter: "blur(12px)",
                  }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                      {publicUrl.replace("https://", "")}
                    </span>
                    <button onClick={handleCopy} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 3px", color: copied ? "#22c55e" : "rgba(255,255,255,0.3)", display: "flex" }}>
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                      style={{ color: "rgba(255,255,255,0.25)", display: "flex", padding: "2px 1px" }}>
                      <ArrowUpRight size={11} />
                    </a>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Linha separadora animada */}
            <motion.div
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.9, ease: [0.16,1,0.3,1] }}
              style={{ height: 1, background: `linear-gradient(to right, ${ORANGE}70, rgba(255,255,255,0.06) 55%, transparent)`, transformOrigin: "left", marginBottom: "clamp(20px,3.5vw,40px)" }} />
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", fontSize: 12, gap: 12, backdropFilter: "blur(8px)" }}>
                  {error}
                  <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", padding: 0, display: "flex" }}>
                    <X size={13} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* â”€â”€ GRID 3 COLUNAS â”€â”€ */}
          <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "178px 1fr 308px", gap: 0, alignItems: "start" }}>

            {/* COL 1 â€” Ficha vertical */}
            <motion.div className="col-left"
              initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.18, duration: 0.6, ease: [0.16,1,0.3,1] }}
              style={{ borderRight: "1px solid rgba(255,255,255,0.07)", paddingRight: 22, paddingTop: 2, display: "flex", flexDirection: "column", gap: 28 }}>

              {/* Avatar */}
              <div>
                <FieldLabel>Foto</FieldLabel>
                <div style={{ position: "relative", width: 70, height: 70, marginBottom: 10 }}>
                  <div style={{ width: 70, height: 70, borderRadius: 14, background: "rgba(255,102,0,0.07)", border: `1.5px solid ${levelMeta.color}28`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <SafeProfileAvatar
                      src={typeof form.avatarUrl === "string" ? form.avatarUrl : null}
                      name={form.displayName ?? profile?.name ?? null}
                      accentColor={ORANGE}
                      containerStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                      imageStyle={{ width: "100%", height: "100%", objectFit: "cover" as const }}
                      fallback={<User size={24} color={ORANGE} style={{ opacity: 0.4 }} />}
                    />
                  </div>
                  <button onClick={() => fileRef.current?.click()}
                    style={{ position: "absolute", bottom: -4, right: -4, width: 22, height: 22, borderRadius: "50%", background: ORANGE, border: "2px solid #080808", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Camera size={9} color="#fff" />
                  </button>
                  <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif" style={{ display: "none" }} onChange={handleAvatar} />
                </div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", margin: "0 0 2px", lineHeight: 1.3 }}>
                  {safe(form.displayName || profile?.name, 28)}
                </p>
                <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", margin: 0, letterSpacing: "0.02em" }}>{profile?.email}</p>
              </div>

              <Rule />

              {/* Counters grandes */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {[
                  { label: "Vendidos",   value: score?.totalSold      ?? 0, color: "#22c55e" },
                  { label: "Pendentes",  value: score?.totalPending   ?? 0, color: "#f59e0b" },
                  { label: "Cancelados", value: score?.totalCancelled ?? 0, color: "#ef4444" },
                ].map((s, i) => (
                  <motion.div key={s.label}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}>
                    <FieldLabel>{s.label}</FieldLabel>
                    <p style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.05em", color: s.color, lineHeight: 1, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                      {s.value}
                    </p>
                  </motion.div>
                ))}
              </div>

              <Rule />

              {/* Toggle visibilidade */}
              <div>
                <FieldLabel>Visibilidade</FieldLabel>
                <button onClick={() => set("isPublic", !form.isPublic)}
                  style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: `1px solid ${form.isPublic ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"}`, background: form.isPublic ? "rgba(34,197,94,0.07)" : "rgba(255,255,255,0.02)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "all 0.2s", backdropFilter: "blur(8px)" }}>
                  {form.isPublic ? <Eye size={13} color="#22c55e" /> : <EyeOff size={13} color="rgba(255,255,255,0.25)" />}
                  <span style={{ fontSize: 11, fontWeight: 700, color: form.isPublic ? "#22c55e" : "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>
                    {form.isPublic ? "PÃºblico" : "Privado"}
                  </span>
                </button>
              </div>
            </motion.div>

            {/* COL 2 â€” FormulÃ¡rio */}
            <motion.div className="col-center"
              initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.6, ease: [0.16,1,0.3,1] }}
              style={{ padding: "0 clamp(18px,2.5vw,36px)", borderRight: "1px solid rgba(255,255,255,0.07)" }}>

              {/* Identidade */}
              <div style={{ marginBottom: 30 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}>
                  <SectionMark />
                  <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.28em", color: "rgba(255,255,255,0.28)", margin: 0 }}>Identidade</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 18px" }}>
                  <div style={{ marginBottom: 13 }}>
                    <FieldLabel>Nome de exibiÃ§Ã£o</FieldLabel>
                    <Input value={form.displayName ?? ""} placeholder="Seu nome pÃºblico" maxLength={120}
                      onChange={v => set("displayName", v)} />
                  </div>
                  <div style={{ marginBottom: 13 }}>
                    <FieldLabel>ProfissÃ£o</FieldLabel>
                    <Input value={form.profession ?? ""} placeholder="Ex: Designer UI/UX" maxLength={80}
                      onChange={v => set("profession", v)} />
                  </div>
                </div>
                <div style={{ marginBottom: 13 }}>
                  <FieldLabel>Bio</FieldLabel>
                  <Input value={form.bio ?? ""} placeholder="Conte um pouco sobre vocÃª e como trabalhaâ€¦" multiline maxLength={500}
                    onChange={v => set("bio", v)} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 18px" }}>
                  <div style={{ marginBottom: 13 }}>
                    <FieldLabel>LocalizaÃ§Ã£o</FieldLabel>
                    <Input value={form.location ?? ""} placeholder="SÃ£o Paulo, SP" maxLength={80}
                      onChange={v => set("location", v)} />
                  </div>
                  <div style={{ marginBottom: 13 }}>
                    <FieldLabel>URL do Perfil</FieldLabel>
                    <Input value={form.slug ?? ""} placeholder="seu-slug" maxLength={60}
                      prefix="fechou.com/u/"
                      onChange={v => set("slug", sanitizeProfileSlug(v))} />
                  </div>
                </div>
              </div>

              {/* Divisor com label */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                <p style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.3em", color: "rgba(255,255,255,0.15)", margin: 0, whiteSpace: "nowrap" as const }}>Links externos</p>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              </div>

              {/* Links 2 colunas */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 18px" }}>
                {[
                  { key: "linkWebsite",   Icon: Globe,        label: "Website",   ph: "https://seusite.com" },
                  { key: "linkLinkedin",  Icon: Linkedin,     label: "LinkedIn",  ph: "https://linkedin.com/in/â€¦" },
                  { key: "linkInstagram", Icon: Instagram,    label: "Instagram", ph: "https://instagram.com/â€¦" },
                  { key: "linkGithub",    Icon: Github,       label: "GitHub",    ph: "https://github.com/â€¦" },
                  { key: "linkBehance",   Icon: ExternalLink, label: "Behance",   ph: "https://behance.net/â€¦" },
                ].map(({ key, Icon, label, ph }) => (
                  <div key={key}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                      <Icon size={10} color="rgba(255,255,255,0.2)" />
                      <FieldLabel>{label}</FieldLabel>
                    </div>
                    <Input value={(form as any)[key] ?? ""} placeholder={ph}
                      onChange={v => setForm(f => ({ ...f, [key]: v || null }))} />
                  </div>
                ))}
              </div>

              {/* CitaÃ§Ã£o editorial */}
              <div style={{ marginTop: 36, padding: "18px 22px", borderLeft: `3px solid ${ORANGE}`, background: `linear-gradient(to right, rgba(255,102,0,0.05), transparent)`, borderRadius: "0 10px 10px 0", backdropFilter: "blur(8px)" }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.24)", lineHeight: 1.75, margin: 0, fontStyle: "italic", fontFamily: "'DM Sans', sans-serif" }}>
                  Seu perfil pÃºblico Ã© o que seus clientes veem antes de assinar um contrato.
                  Quanto mais completo, maior a confianÃ§a â€” e a conversÃ£o.
                </p>
              </div>
            </motion.div>

            {/* COL 3 â€” Score + AvaliaÃ§Ãµes */}
            <motion.div className="col-right"
              initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.22, duration: 0.6, ease: [0.16,1,0.3,1] }}
              style={{ paddingLeft: 22, display: "flex", flexDirection: "column", gap: 0 }}>

              {/* Score */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
                  <SectionMark color={levelMeta.color} />
                  <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.28em", color: "rgba(255,255,255,0.28)", margin: 0 }}>Score de Qualidade</p>
                </div>

                <div style={{
                  position: "relative", overflow: "hidden", borderRadius: 16,
                  border: `1px solid ${levelMeta.color}22`,
                  background: `linear-gradient(140deg, ${levelMeta.color}0d 0%, rgba(255,255,255,0.01) 100%)`,
                  padding: "20px 20px", marginBottom: 12,
                  backdropFilter: "blur(12px)",
                }}>
                  {/* NÃºmero fantasma */}
                  <p style={{ position: "absolute", right: -10, bottom: -16, fontSize: 90, fontWeight: 900, letterSpacing: "-0.06em", color: `${levelMeta.color}0a`, lineHeight: 1, margin: 0, userSelect: "none", fontFamily: "'DM Sans', sans-serif" }}>
                    {score?.value ?? 0}
                  </p>
                  <div style={{ position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                      <span style={{ fontSize: 18 }}>{levelMeta.emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: levelMeta.color, letterSpacing: "-0.01em", fontFamily: "'DM Sans', sans-serif" }}>
                        {score?.level?.label ?? "â€”"}
                      </span>
                    </div>
                    <p style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-0.06em", color: "#fff", lineHeight: 1, margin: "0 0 12px", fontFamily: "'DM Sans', sans-serif" }}>
                      {score?.value ?? 0}
                      <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.22)", marginLeft: 4 }}>pts</span>
                    </p>
                    <div style={{ height: 2, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 5 }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${scorePct}%` }}
                        transition={{ duration: 1.5, delay: 0.6, ease: [0.16,1,0.3,1] }}
                        style={{ height: "100%", borderRadius: 999, background: levelMeta.color }} />
                    </div>
                    <p style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", margin: 0, letterSpacing: "0.04em" }}>
                      {score?.value ?? 0} / 500 pts para LendÃ¡rio
                    </p>
                  </div>
                </div>

                {/* Regras */}
                <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", backdropFilter: "blur(8px)" }}>
                  {[
                    { action: "Contrato vendido", pts: "+50", color: "#22c55e" },
                    { action: "Cancelamento",     pts: "âˆ’30", color: "#ef4444" },
                    { action: "15 dias pendente", pts: "âˆ’10", color: "#f59e0b" },
                  ].map((r, i) => (
                    <div key={r.action} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 13px", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none", background: "rgba(255,255,255,0.02)" }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>{r.action}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: r.color, letterSpacing: "-0.01em", fontFamily: "'DM Sans', sans-serif" }}>{r.pts}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Rule />

              {/* AvaliaÃ§Ãµes */}
              <div style={{ marginTop: 18 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <SectionMark color="#f59e0b" />
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.28em", color: "rgba(255,255,255,0.28)", margin: 0 }}>AvaliaÃ§Ãµes</p>
                  </div>
                  {ratings && ratings.totalRatings > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Stars n={Math.round(ratings.avgStars)} size={11} />
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>{ratings.avgStars.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {!ratings || ratings.totalRatings === 0 ? (
                  <div style={{ padding: "26px 0", textAlign: "center", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.01)", backdropFilter: "blur(8px)" }}>
                    <Star size={22} color="rgba(255,255,255,0.07)" style={{ margin: "0 auto 10px", display: "block" }} />
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)", margin: "0 0 3px", fontWeight: 600 }}>Nenhuma avaliaÃ§Ã£o</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.1)", margin: 0, lineHeight: 1.6 }}>Aparecem apÃ³s clientes<br />finalizarem contratos.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {ratings.recent.map((r: RatingItem, i: number) => (
                      <motion.div key={r.id}
                        initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.38 + i * 0.07 }}
                        style={{ padding: "12px 13px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", backdropFilter: "blur(8px)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 8, background: `${ORANGE}10`, border: `1px solid ${ORANGE}1e`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: ORANGE, fontFamily: "'DM Sans', sans-serif" }}>
                              {r.raterName[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                              {safe(r.raterName, 30)}
                            </p>
                            <p style={{ fontSize: 8, color: "rgba(255,255,255,0.18)", margin: 0, letterSpacing: "0.03em" }}>
                              {new Date(r.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <Stars n={r.stars} size={10} />
                        </div>
                        {r.comment && (
                          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.27)", lineHeight: 1.6, margin: "9px 0 0", paddingLeft: 34, fontStyle: "italic", fontWeight: 300 }}>
                            "{safe(r.comment, 180)}"
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* â”€â”€ SAVE BAR sticky â”€â”€ */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.5 }}
            style={{ position: "sticky", bottom: 24, marginTop: 40, display: "flex", justifyContent: "flex-end" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "11px 12px 11px 20px",
              borderRadius: 14,
              background: "rgba(8,8,8,0.88)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: `0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,102,0,0.08), 0 0 40px ${ORANGE}18`,
            }}>
              <AnimatePresence>
                {saved && (
                  <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    style={{ display: "flex", alignItems: "center", gap: 6, color: "#22c55e", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", fontFamily: "'DM Sans', sans-serif" }}>
                    <Check size={13} /> Salvo com sucesso!
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button onClick={handleSave} disabled={saving}
                whileHover={saving ? {} : { scale: 1.03 }}
                whileTap={saving ? {} : { scale: 0.97 }}
                style={{
                  padding: "11px 26px", borderRadius: 10,
                  background: saving ? "rgba(255,102,0,0.35)" : ORANGE,
                  border: "none", color: "#fff",
                  fontSize: 11, fontWeight: 800,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "0.1em", textTransform: "uppercase" as const,
                  display: "flex", alignItems: "center", gap: 8,
                  transition: "background 0.2s",
                  boxShadow: saving ? "none" : `0 0 28px ${ORANGE}50, 0 4px 16px rgba(255,102,0,0.3)`,
                }}>
                {saving
                  ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><RefreshCw size={12} /></motion.div> Salvando</>
                  : <><Save size={12} /> Salvar perfil</>
                }
              </motion.button>
            </div>
          </motion.div>

        </main>
      </div>
    </div>
  );
}
