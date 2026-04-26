import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Mail, RotateCw, ShieldCheck } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { AuthField, AuthSplitLayout } from "../components/auth/AuthSplitLayout";
import { HoneypotField, isHoneypotTripped } from "../components/security/HoneypotField";
import { setActiveResetToken } from "../lib/password-reset-memory";
import { isValidEmail, preventClickjacking, rateLimiter } from "../lib/security";
import {
  extractResetTokenFromUrl,
  getPasswordResetErrorMessage,
  requestPasswordReset,
  verifyPasswordResetCode,
} from "../service/api/password-reset";

type RecoveryStep = "request" | "verify";

const EMAIL_SENT_MESSAGE = "Se o email existir, enviaremos um código de verificação.";
const RESEND_COOLDOWN_SECONDS = 45;

function maskEmail(email: string) {
  const [localPart, domain = ""] = email.split("@");
  const safeLocal = localPart.length <= 2
    ? `${localPart.charAt(0) || "*"}*`
    : `${localPart.slice(0, 2)}${"*".repeat(Math.max(1, localPart.length - 2))}`;

  return domain ? `${safeLocal}@${domain}` : safeLocal;
}

function isValidVerificationCode(code: string) {
  return /^[a-zA-Z0-9]{4,12}$/.test(code);
}

function StatusNotice({
  tone,
  children,
}: {
  tone: "neutral" | "error" | "success";
  children: ReactNode;
}) {
  const tones = {
    neutral: {
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      color: "rgba(255,255,255,0.72)",
    },
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

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const honeypotRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<RecoveryStep>("request");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const normalizedSubmittedEmail = useMemo(
    () => submittedEmail.trim().toLowerCase(),
    [submittedEmail],
  );

  useEffect(() => {
    document.title = "Recuperar acesso | Fechou!";
    try {
      preventClickjacking();
    } catch {}
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timeoutId = window.setTimeout(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [cooldownSeconds]);

  const requestCode = async (normalizedEmail: string) => {
    await requestPasswordReset(normalizedEmail);
    setSubmittedEmail(normalizedEmail);
    setSuccessMessage(EMAIL_SENT_MESSAGE);
    setError(null);
    setVerificationCode("");
    setStep("verify");
    setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
  };

  const handleRequestSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (isHoneypotTripped(honeypotRef)) {
      setError("Não foi possível concluir a solicitação agora. Tente novamente.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setError("Digite um email válido.");
      return;
    }

    if (!rateLimiter.check("forgot-password-request", 4, 120_000)) {
      setError("Aguarde um instante antes de solicitar outro código.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await requestCode(normalizedEmail);
      setEmail("");
    } catch (err) {
      setError(getPasswordResetErrorMessage("request", err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (loading || cooldownSeconds > 0 || !normalizedSubmittedEmail) return;

    if (!rateLimiter.check("forgot-password-resend", 3, 120_000)) {
      setError("Aguarde um instante antes de solicitar outro código.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await requestCode(normalizedSubmittedEmail);
    } catch (err) {
      setError(getPasswordResetErrorMessage("request", err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (isHoneypotTripped(honeypotRef)) {
      setError("Não foi possível concluir a solicitação agora. Tente novamente.");
      return;
    }

    if (!normalizedSubmittedEmail) {
      setStep("request");
      setError("Sua sessão de recuperação expirou. Solicite um novo código.");
      return;
    }

    const normalizedCode = verificationCode.replace(/\s+/g, "").trim();
    if (!isValidVerificationCode(normalizedCode)) {
      setError("Digite um código válido.");
      return;
    }

    if (!rateLimiter.check("forgot-password-verify", 6, 120_000)) {
      setError("Muitas tentativas no momento. Aguarde um pouco e tente novamente.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await verifyPasswordResetCode(normalizedSubmittedEmail, normalizedCode);
      const resetToken = response.resetToken?.trim() || extractResetTokenFromUrl(response.resetUrl);

      if (!resetToken) {
        setError("Sua sessão de redefinição expirou. Solicite um novo código.");
        return;
      }

      setActiveResetToken(resetToken);
      navigate("/reset-password");
    } catch (err) {
      setError(getPasswordResetErrorMessage("verify", err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      sideEyebrow="◈ Recuperação de acesso"
      sideTitle={
        <>
          Segurança no
          <br />
          reset, sem <span style={{ color: "#ff6600", fontStyle: "italic" }}>atalhos.</span>
        </>
      }
      sideDescription="O fluxo agora confirma sua identidade por código antes da redefinição. Isso reduz risco de abuso e mantém o acesso sob controle."
      sideQuote="A confiança do cliente começa no contrato, mas a confiança do usuário começa no acesso. Segurança também faz parte da experiência."
      sideQuoteAuthor="Time Fechou!"
      sideMark="✦"
      eyebrow={step === "request" ? "◈ Esqueci minha senha" : "◈ Verificar código"}
      title={
        step === "request"
          ? <>Recupere sua conta com um fluxo seguro.</>
          : <>Confirme o código para continuar.</>
      }
      subtitle={
        step === "request"
          ? "Se o email existir, enviaremos um código de verificação."
          : "Digite o código enviado para o email informado. Se ele expirar, solicite um novo."
      }
    >
      {successMessage && <StatusNotice tone="success">{successMessage}</StatusNotice>}
      {error && <StatusNotice tone="error">{error}</StatusNotice>}

      {step === "request" ? (
        <form onSubmit={handleRequestSubmit} noValidate style={{ position: "relative" }}>
          <HoneypotField inputRef={honeypotRef} />
          <AuthField
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={setEmail}
            placeholder="seu@email.com"
            focused={focused === "email"}
            onFocus={() => setFocused("email")}
            onBlur={() => setFocused(null)}
            autoComplete="email"
            right={<Mail size={16} color="rgba(255,255,255,0.28)" />}
          />

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
            {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Enviar código</span><ArrowRight size={14} /></>}
          </motion.button>
        </form>
      ) : (
        <form onSubmit={handleVerifySubmit} noValidate style={{ position: "relative" }}>
          <HoneypotField inputRef={honeypotRef} />
          <StatusNotice tone="neutral">
            Código enviado para <strong style={{ color: "#fff" }}>{maskEmail(normalizedSubmittedEmail)}</strong>.
          </StatusNotice>

          <AuthField
            label="Código de verificação"
            type="text"
            name="verification-code"
            value={verificationCode}
            onChange={(value) => setVerificationCode(value.replace(/\s+/g, "").slice(0, 12))}
            placeholder="Digite o código"
            focused={focused === "code"}
            onFocus={() => setFocused("code")}
            onBlur={() => setFocused(null)}
            autoComplete="one-time-code"
            right={<ShieldCheck size={16} color="rgba(255,255,255,0.28)" />}
          />

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 10,
            }}
          >
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={loading ? undefined : { y: -1 }}
              whileTap={loading ? undefined : { scale: 0.99 }}
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
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Validar código</span><ArrowRight size={14} /></>}
            </motion.button>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  setStep("request");
                  setVerificationCode("");
                  setError(null);
                }}
                disabled={loading}
                style={{
                  flex: 1,
                  minWidth: 160,
                  height: 46,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  color: "rgba(255,255,255,0.78)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <ArrowLeft size={14} />
                Alterar email
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading || cooldownSeconds > 0}
                style={{
                  flex: 1,
                  minWidth: 160,
                  height: 46,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  color: loading || cooldownSeconds > 0 ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.78)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: loading || cooldownSeconds > 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <RotateCw size={14} />
                {cooldownSeconds > 0 ? `Reenviar em ${cooldownSeconds}s` : "Reenviar código"}
              </button>
            </div>
          </div>
        </form>
      )}

      <p style={{ marginTop: 18, fontSize: 12, color: "rgba(255,255,255,0.34)", lineHeight: 1.7 }}>
        Lembrou da senha? <Link href="/login"><span style={{ color: "#ff6600", cursor: "pointer" }}>Voltar para login</span></Link>
      </p>
    </AuthSplitLayout>
  );
}
