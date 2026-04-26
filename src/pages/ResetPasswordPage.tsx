import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { AuthField, AuthSplitLayout } from "../components/auth/AuthSplitLayout";
import { clearActiveResetToken, getActiveResetToken, setActiveResetToken } from "../lib/password-reset-memory";
import { isStrongPassword, preventClickjacking } from "../lib/security";
import { completePasswordReset, getPasswordResetErrorMessage } from "../service/api/password-reset";

type PasswordCheck = {
  label: string;
  valid: boolean;
};

const INVALID_SESSION_MESSAGE = "Sua sessão de redefinição expirou ou não é mais válida. Solicite um novo código.";

function isUsableResetToken(token: string | null | undefined) {
  if (!token) return false;
  const normalized = token.trim();
  return normalized.length >= 8 && normalized.length <= 2048;
}

function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { label: "Pelo menos 8 caracteres", valid: password.length >= 8 },
    { label: "Uma letra maiúscula", valid: /[A-Z]/.test(password) },
    { label: "Um número", valid: /\d/.test(password) },
    { label: "Um caractere especial", valid: /[^A-Za-z0-9]/.test(password) },
  ];
}

function PasswordCheckItem({ label, valid }: PasswordCheck) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 12,
        background: valid ? "rgba(34,197,94,0.09)" : "rgba(255,255,255,0.03)",
        border: valid
          ? "1px solid rgba(34,197,94,0.18)"
          : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: valid ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.05)",
          color: valid ? "#4ade80" : "rgba(255,255,255,0.3)",
          fontSize: 10,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {valid ? "✓" : "•"}
      </div>
      <span
        style={{
          fontSize: 12,
          color: valid ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
          lineHeight: 1.45,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function StatusNotice({
  tone,
  children,
}: {
  tone: "error" | "success" | "neutral";
  children: ReactNode;
}) {
  const tones = {
    error: {
      background: "rgba(239,68,68,0.08)",
      border: "1px solid rgba(239,68,68,0.18)",
      color: "#fecaca",
    },
    success: {
      background: "rgba(255,102,0,0.08)",
      border: "1px solid rgba(255,102,0,0.18)",
      color: "#fed7aa",
    },
    neutral: {
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      color: "rgba(255,255,255,0.72)",
    },
  } as const;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      style={{
        marginBottom: 18,
        padding: "13px 14px",
        borderRadius: 14,
        fontSize: 12,
        lineHeight: 1.6,
        ...tones[tone],
      }}
    >
      {children}
    </div>
  );
}

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const redirectTimeoutRef = useRef<number | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);

  useEffect(() => {
    document.title = "Redefinir senha | Fechou!";
    try {
      preventClickjacking();
    } catch {}

    const tokenFromMemory = getActiveResetToken();
    let tokenFromUrl: string | null = null;

    const params = new URLSearchParams(window.location.search);
    const rawToken = params.get("token");
    if (rawToken && isUsableResetToken(rawToken)) {
      tokenFromUrl = rawToken.trim();
      setActiveResetToken(tokenFromUrl);
    }

    if (params.has("token")) {
      params.delete("token");
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
      window.history.replaceState(window.history.state, "", nextUrl);
    }

    const safeToken = tokenFromUrl ?? tokenFromMemory;
    if (safeToken && isUsableResetToken(safeToken)) {
      setResetToken(safeToken);
    } else {
      clearActiveResetToken();
      setResetToken(null);
    }

    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;

    if (!resetToken || !isUsableResetToken(resetToken)) {
      setError(INVALID_SESSION_MESSAGE);
      return;
    }

    const passwordValidation = isStrongPassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message);
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await completePasswordReset(resetToken, password);
      clearActiveResetToken();
      setResetToken(null);
      setPassword("");
      setConfirmPassword("");
      setSuccessMessage("Senha redefinida com sucesso. Faça login novamente.");

      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate("/login");
      }, 1600);
    } catch (err) {
      setError(getPasswordResetErrorMessage("complete", err));
    } finally {
      setLoading(false);
    }
  };

  const isTokenMissing = !resetToken;

  return (
    <AuthSplitLayout
      sideEyebrow="◈ Redefinição protegida"
      sideTitle={
        <>
          Nova senha,
          <br />
          mesma <span style={{ color: "#ff6600", fontStyle: "italic" }}>segurança.</span>
        </>
      }
      sideDescription="O token de redefinição é mantido somente em memória e removido da URL assim que chega ao navegador."
      sideQuote="Segurança boa é a que protege sem criar confusão. O usuário entende a etapa, o atacante não aprende nada."
      sideQuoteAuthor="Time Fechou!"
      sideMark="✓"
      eyebrow="◈ Redefinir senha"
      title={successMessage ? <>Senha atualizada.</> : <>Defina uma nova senha para sua conta.</>}
      subtitle={
        successMessage
          ? "Sua senha foi alterada com sucesso. Você será redirecionado para o login."
          : "Escolha uma senha forte e confirme para concluir a recuperação com segurança."
      }
    >
      {successMessage && (
        <StatusNotice tone="success">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={15} />
            {successMessage}
          </span>
        </StatusNotice>
      )}

      {!successMessage && error && <StatusNotice tone="error">{error}</StatusNotice>}
      {!successMessage && isTokenMissing && !error && <StatusNotice tone="neutral">{INVALID_SESSION_MESSAGE}</StatusNotice>}

      {successMessage ? (
        <motion.button
          type="button"
          onClick={() => navigate("/login")}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.99 }}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            border: "1px solid rgba(255,102,0,0.45)",
            background: "linear-gradient(135deg, #ff6600 0%, #ff7a1a 100%)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <span>Ir para login</span>
          <ArrowRight size={14} />
        </motion.button>
      ) : isTokenMissing ? (
        <div style={{ display: "grid", gap: 10 }}>
          <Link href="/forgot-password">
            <span
              style={{
                display: "inline-flex",
                width: "100%",
                justifyContent: "center",
                alignItems: "center",
                height: 52,
                borderRadius: 14,
                border: "1px solid rgba(255,102,0,0.45)",
                background: "linear-gradient(135deg, #ff6600 0%, #ff7a1a 100%)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Solicitar novo código
            </span>
          </Link>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.34)", lineHeight: 1.7 }}>
            Se você abriu um link antigo, solicite uma nova recuperação para continuar.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <AuthField
            label="Nova senha"
            type={showPassword ? "text" : "password"}
            name="password"
            value={password}
            onChange={setPassword}
            placeholder="Digite sua nova senha"
            focused={focused === "password"}
            onFocus={() => setFocused("password")}
            onBlur={() => setFocused(null)}
            autoComplete="new-password"
            right={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
              >
                {showPassword ? <EyeOff size={16} color="rgba(255,255,255,0.4)" /> : <Eye size={16} color="rgba(255,255,255,0.4)" />}
              </button>
            }
          />

          <AuthField
            label="Confirmar senha"
            type={showConfirmPassword ? "text" : "password"}
            name="confirm-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Repita a nova senha"
            focused={focused === "confirmPassword"}
            onFocus={() => setFocused("confirmPassword")}
            onBlur={() => setFocused(null)}
            autoComplete="new-password"
            right={
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                aria-label={showConfirmPassword ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
                style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
              >
                {showConfirmPassword ? <EyeOff size={16} color="rgba(255,255,255,0.4)" /> : <Eye size={16} color="rgba(255,255,255,0.4)" />}
              </button>
            }
          />

          <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
            {passwordChecks.map((check) => (
              <PasswordCheckItem key={check.label} {...check} />
            ))}
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={loading ? undefined : { y: -1 }}
            whileTap={loading ? undefined : { scale: 0.99 }}
            style={{
              marginTop: 18,
              width: "100%",
              height: 52,
              borderRadius: 14,
              border: "1px solid rgba(255,102,0,0.45)",
              background: "linear-gradient(135deg, #ff6600 0%, #ff7a1a 100%)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: loading ? 0.75 : 1,
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Salvar nova senha</span><LockKeyhole size={14} /></>}
          </motion.button>
        </form>
      )}

      <p style={{ marginTop: 18, fontSize: 12, color: "rgba(255,255,255,0.34)", lineHeight: 1.7 }}>
        Lembrou da senha? <Link href="/login"><span style={{ color: "#ff6600", cursor: "pointer" }}>Voltar para login</span></Link>
      </p>
    </AuthSplitLayout>
  );
}
