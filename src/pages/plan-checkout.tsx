import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Crown,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Lock,
  Zap,
  CreditCard,
  Wifi,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import Navbar from "../components/landing/Navbar";
import { useSession } from "../context/session-context";
import {
  getApiErrorDetailNumber,
  getApiErrorDetailString,
  isLikelyNetworkError,
  toUiErrorMessage,
} from "../lib/api-error";
import {
  createMercadoPagoCardForm,
  resetMercadoPagoPublicKeyCache,
  type MercadoPagoCardFormInstance,
  type MercadoPagoPublicKeyDebugInfo,
} from "../lib/mercado-pago";
import { setPostAuthRedirect } from "../lib/navigation-intent";
import { getSafeRedirectUrl } from "../lib/security";
import { getCpfCnpjValidationMessage } from "../lib/cpf-cnpj";
import { ApiError } from "../service/api";
import {
  createSubscriptionCheckout,
  DEFAULT_SUBSCRIPTION_BACK_URL,
} from "../service/payment";

/* ─── Plan map ─────────────────────────────────────────────────────────── */
const PLAN_MAP = {
  pro: {
    name: "Pro",
    price: 29,
    icon: Briefcase,
    color: "#ff6600",
  },
  premium: {
    name: "Premium",
    price: 59,
    icon: Crown,
    color: "#ff6600",
  },
} as const;

type PlanKey = keyof typeof PLAN_MAP;
type Phase = "idle" | "loading" | "success" | "error";
type FormPhase = "loading" | "ready" | "error";
type CheckoutErrorNotice = {
  title: string;
  message: string;
  hint?: string;
  detail?: string;
};
type ActiveCardForm = {
  id: number;
  instance: MercadoPagoCardFormInstance;
  mounted: boolean;
  destroyed: boolean;
  publicKeyInfo: MercadoPagoPublicKeyDebugInfo;
};
type PendingMountedResult = {
  formId: number;
  error?: unknown;
};
type CardData = {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
  flipped: boolean;
};
type CheckoutFormValues = {
  cardholderName: string;
  issuer: string;
  identificationType: string;
  identificationNumber: string;
  cardholderEmail: string;
};
type CheckoutFormField = keyof CheckoutFormValues | "cardNumber" | "expirationDate" | "securityCode";
type CheckoutFieldErrors = Partial<Record<CheckoutFormField, string>>;
type Translate = (key: string, options?: Record<string, unknown>) => string;

function buildCheckoutFormSchema(t: Translate) {
  return z.object({
    cardholderName: z
      .string()
      .trim()
      .min(3, t("planCheckout.validation.cardholderNameRequired"))
      .max(80, t("planCheckout.validation.cardholderNameMax"))
      .regex(/^[A-Za-zÀ-ÿ' .-]+$/, t("planCheckout.validation.cardholderNameChars")),
    issuer: z.string().trim().min(1, t("planCheckout.validation.issuerRequired")),
    identificationType: z.string().trim().min(1, t("planCheckout.validation.identificationTypeRequired")),
    identificationNumber: z
      .string()
      .trim()
      .refine((value) => !getCpfCnpjValidationMessage(value), () => ({
        message: t("planCheckout.validation.invalidDocument"),
      })),
    cardholderEmail: z
      .string()
      .trim()
      .min(1, t("planCheckout.validation.emailRequired"))
      .max(120, t("planCheckout.validation.emailMax"))
      .email(t("planCheckout.validation.emailInvalid")),
  });
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */
function buildIds(seed: number) {
  const base = `mp-plan-${seed}`;
  return {
    form: `${base}-form`,
    cardNumber: `${base}-card-number`,
    expirationDate: `${base}-expiration-date`,
    securityCode: `${base}-security-code`,
    cardholderName: `${base}-cardholder-name`,
    issuer: `${base}-issuer`,
    installments: `${base}-installments`,
    identificationType: `${base}-identification-type`,
    identificationNumber: `${base}-identification-number`,
    cardholderEmail: `${base}-cardholder-email`,
  };
}

function isCardFormNotMountedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /cardform is not mounted|not mounted/i.test(error.message);
}

function extractProviderCode(providerMessage: string): string | null {
  const match = String(providerMessage ?? "")
    .trim()
    .match(/^([A-Z0-9]+(?:_[A-Z0-9]+)+)\b/);
  return match?.[1] ?? null;
}

function buildTechnicalDetail(parts: Array<string | undefined>): string | undefined {
  const normalized = parts.map((p) => p?.trim()).filter(Boolean) as string[];
  return normalized.length > 0 ? normalized.join(" | ") : undefined;
}

function looksLikeCredentialConfigurationError(message: string): boolean {
  const n = message.toLowerCase();
  return (
    n.includes("public key") ||
    n.includes("mp_access_token") ||
    n.includes("credencial") ||
    n.includes("mesmo ambiente") ||
    n.includes("mesma aplicacao") ||
    n.includes("app_usr-") ||
    n.includes("test-")
  );
}

function looksLikeFakeOrInvalidCardDataError(message: string): boolean {
  const n = message.toLowerCase();
  return (
    n.includes("validation has failed") ||
    n.includes("cc_val_433") ||
    n.includes("revise numero") ||
    n.includes("dados do cartao") ||
    n.includes("cartao informado") ||
    n.includes("nome do titular") ||
    n.includes("documento e email")
  );
}

function looksLikeDebitCardError(message: string): boolean {
  const n = message.toLowerCase();
  return (
    n.includes("debito") ||
    n.includes("debit") ||
    n.includes("cartao de debito") ||
    n.includes("credito") ||
    n.includes("credit card")
  );
}

function getFieldErrorStyle(hasError: boolean, base: React.CSSProperties): React.CSSProperties {
  if (!hasError) return base;
  return {
    ...base,
    border: "1px solid rgba(248,113,113,0.65)",
    boxShadow: "0 0 0 2px rgba(248,113,113,0.12)",
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 5, marginTop: 6, color: "#fca5a5", fontSize: 11, lineHeight: 1.45 }}>
      <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{message}</span>
    </div>
  );
}

function validateCheckoutValues(values: CheckoutFormValues, t: Translate): CheckoutFieldErrors {
  const result = buildCheckoutFormSchema(t).safeParse(values);
  if (result.success) return {};

  const errors: CheckoutFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof CheckoutFormValues | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

function normalizeCheckoutValues(values: CheckoutFormValues): CheckoutFormValues {
  return {
    ...values,
    cardholderName: values.cardholderName.trim(),
    issuer: values.issuer.trim(),
    identificationType: values.identificationType.trim(),
    identificationNumber: values.identificationNumber.replace(/\D/g, ""),
    cardholderEmail: values.cardholderEmail.trim(),
  };
}

function formatPlanCheckoutError(error: unknown, t: Translate): CheckoutErrorNotice {
  if (error instanceof ApiError) {
    const code = getApiErrorDetailString(error, "code") ?? error.code?.trim();
    const backendMessage =
      getApiErrorDetailString(error, "message") ?? toUiErrorMessage(error);
    const providerMessage =
      getApiErrorDetailString(error, "providerMessage") ??
      getApiErrorDetailString(error, "provider_message") ??
      "";
    const providerHint = getApiErrorDetailString(error, "providerHint") ?? "";
    const providerCode =
      getApiErrorDetailString(error, "providerCode") ??
      extractProviderCode(providerMessage);
    const providerStatus = getApiErrorDetailNumber(error, "providerStatus");
    const providerPath = getApiErrorDetailString(error, "providerPath");
    const technicalDetail = buildTechnicalDetail([
      code ? `${t("planCheckout.errors.code")}: ${code}` : undefined,
      providerCode ? `${t("planCheckout.errors.providerCode")}: ${providerCode}` : undefined,
      providerStatus !== undefined ? `${t("planCheckout.errors.providerHttp")}: ${providerStatus}` : undefined,
      providerPath ? `${t("planCheckout.errors.providerPath")}: ${providerPath}` : undefined,
      providerMessage ? `${t("planCheckout.errors.providerDetail")}: ${providerMessage}` : undefined,
    ]);

    if (looksLikeDebitCardError(`${backendMessage} ${providerMessage} ${providerHint}`)) {
      return {
        title: t("planCheckout.errors.useCreditTitle"),
        message: t("planCheckout.errors.useCreditMessage"),
        hint: t("planCheckout.errors.useCreditHint"),
        detail: technicalDetail,
      };
    }
    if (code === "mp_subscription_card_validation_failed" || providerCode === "CC_VAL_433") {
      return {
        title: t("planCheckout.errors.cardDataTitle"),
        message: backendMessage,
        hint: providerHint || t("planCheckout.errors.productionCardHint"),
        detail: technicalDetail,
      };
    }
    if (code === "mp_subscription_card_token_service_not_found") {
      return {
        title: t("planCheckout.errors.tokenRejectedTitle"),
        message: backendMessage,
        hint: providerHint || t("planCheckout.errors.tokenRejectedHint"),
        detail: technicalDetail,
      };
    }
    if (
      code === "mp_subscription_invalid_external_reference" ||
      code === "mp_subscription_owner_mismatch" ||
      code === "mp_subscription_plan_id_mismatch" ||
      code === "mp_subscription_commercial_terms_mismatch" ||
      code === "mp_subscription_collector_mismatch" ||
      code === "mp_subscription_session_not_found" ||
      code === "mp_subscription_session_plan_mismatch" ||
      code === "mp_subscription_session_amount_mismatch" ||
      code === "mp_subscription_session_currency_mismatch"
    ) {
      return {
        title: t("planCheckout.errors.securityTitle"),
        message: backendMessage,
        hint: providerHint || t("planCheckout.errors.securityHint"),
        detail: technicalDetail,
      };
    }
    if (code === "mp_subscription_not_authorized") {
      return {
        title: t("planCheckout.errors.notAuthorizedTitle"),
        message: backendMessage,
        hint: providerHint || t("planCheckout.errors.notAuthorizedHint"),
        detail: technicalDetail,
      };
    }
    if (code === "mp_subscription_same_payer_as_collector") {
      return {
        title: t("planCheckout.errors.samePayerTitle"),
        message: t("planCheckout.errors.samePayerMessage"),
        hint: t("planCheckout.errors.samePayerHint"),
        detail: technicalDetail,
      };
    }
    if (code === "mp_subscription_collector_address_pending") {
      return {
        title: t("planCheckout.errors.addressPendingTitle"),
        message: t("planCheckout.errors.addressPendingMessage"),
        hint: t("planCheckout.errors.addressPendingHint"),
        detail: technicalDetail,
      };
    }
    if (code === "mp_subscription_collector_billing_blocked") {
      return {
        title: t("planCheckout.errors.billingBlockedTitle"),
        message: t("planCheckout.errors.billingBlockedMessage"),
        hint: t("planCheckout.errors.billingBlockedHint"),
        detail: technicalDetail,
      };
    }
    if (code === "database_temporarily_unavailable") {
      return { title: t("planCheckout.errors.databaseTitle"), message: backendMessage, hint: t("planCheckout.errors.retryLater"), detail: technicalDetail };
    }
    if (code === "mp_subscription_provider_temporarily_unavailable") {
      return { title: t("planCheckout.errors.mpUnavailableTitle"), message: backendMessage, hint: t("planCheckout.errors.retryLater"), detail: technicalDetail };
    }
    return {
      title: error.status === 401 ? t("planCheckout.errors.sessionExpired") : t("planCheckout.errors.genericTitle"),
      message: backendMessage,
      hint: providerHint || undefined,
      detail: technicalDetail,
    };
  }

  if (isLikelyNetworkError(error)) {
    return {
      title: t("planCheckout.errors.backendOfflineTitle"),
      message: t("planCheckout.errors.backendOfflineMessage"),
      hint: t("planCheckout.errors.backendOfflineHint"),
    };
  }

  if (error instanceof Error && error.message.trim()) {
    const rawMessage = error.message.trim();
    if (looksLikeCredentialConfigurationError(rawMessage)) {
      return {
        title: t("planCheckout.errors.invalidConfigTitle"),
        message: t("planCheckout.errors.invalidConfigMessage"),
        hint: t("planCheckout.errors.invalidConfigHint"),
        detail: rawMessage,
      };
    }
    if (looksLikeFakeOrInvalidCardDataError(rawMessage)) {
      return {
        title: t("planCheckout.errors.invalidCardTitle"),
        message: t("planCheckout.errors.invalidCardMessage"),
        hint: t("planCheckout.errors.invalidCardHint"),
        detail: rawMessage,
      };
    }
    if (looksLikeDebitCardError(rawMessage)) {
      return {
        title: t("planCheckout.errors.useCreditTitle"),
        message: t("planCheckout.errors.useCreditMessage"),
        hint: t("planCheckout.errors.useCreditHint"),
        detail: rawMessage,
      };
    }
    return { title: t("planCheckout.errors.genericTitle"), message: rawMessage };
  }

  return { title: t("planCheckout.errors.genericTitle"), message: t("planCheckout.errors.unexpected") };
}

/* ─── Card number formatter ────────────────────────────────────────────── */
function formatCardDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  const groups: string[] = [];
  for (let i = 0; i < 4; i++) {
    const chunk = digits.slice(i * 4, i * 4 + 4);
    groups.push(chunk.padEnd(4, "•"));
  }
  return groups.join("  ");
}

/* ─── 3D Interactive Card ──────────────────────────────────────────────── */
function InteractiveCard({ data, planName, price }: { data: CardData; planName: string; price: number }) {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), { stiffness: 180, damping: 28 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-16, 16]), { stiffness: 180, damping: 28 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
      mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [mouseX, mouseY]
  );

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const displayNumber = formatCardDisplay(data.number);
  const holderPlaceholder = t("planCheckout.card.holderPlaceholder");
  const displayName = data.name.trim().toUpperCase() || holderPlaceholder;
  const displayExpiry = data.expiry || t("planCheckout.placeholders.expiry");

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 1000, width: "100%", maxWidth: 360, margin: "0 auto 22px", cursor: "default", userSelect: "none" }}
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d", width: "100%", position: "relative" }}
        initial={{ rotateY: -18, rotateX: 6, opacity: 0, y: 16 }}
        animate={{ rotateY: 0, rotateX: 0, opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* ── FRONT ── */}
        <motion.div
          animate={{ rotateY: data.flipped ? 180 : 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderRadius: 18,
            background: "linear-gradient(135deg,#1c1c1c 0%,#0f0f0f 45%,#200a00 100%)",
            border: "1px solid rgba(255,102,0,0.18)",
            padding: "22px 22px 18px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 0 0 1px rgba(255,102,0,0.06),0 16px 48px rgba(255,102,0,0.15),0 32px 64px rgba(0,0,0,0.6)",
          }}
        >
          {/* Glow top-right */}
          <div style={{ position: "absolute", top: -50, right: -50, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,102,0,0.16) 0%,transparent 70%)", pointerEvents: "none" }} />
          {/* Shine overlay */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(255,255,255,0.04) 0%,transparent 50%)", pointerEvents: "none", borderRadius: 18 }} />

          {/* Chip + NFC */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 32, height: 24, borderRadius: 5, background: "linear-gradient(135deg,#ff6600,#b34400)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr 1fr", gap: 1, padding: 3 }}>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} style={{ background: i === 4 ? "transparent" : "rgba(0,0,0,0.28)", borderRadius: 1 }} />
                  ))}
                </div>
              </div>
              <Wifi size={14} style={{ color: "rgba(255,255,255,0.25)", transform: "rotate(90deg)" }} />
            </div>
            <span style={{ fontSize: 8, color: "rgba(255,102,0,0.55)", letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700 }}>{planName}</span>
          </div>

          {/* Number */}
          <div style={{ marginBottom: 18, fontFamily: "monospace" }}>
            <motion.div
              key={displayNumber}
              initial={{ opacity: 0.5, y: 1 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.12 }}
              style={{ fontSize: 15, letterSpacing: "0.2em", color: "rgba(255,255,255,0.82)", fontWeight: 500 }}
            >
              {displayNumber}
            </motion.div>
          </div>

          {/* Bottom row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{t("planCheckout.card.holder")}</div>
              <motion.div
                key={displayName}
                initial={{ opacity: 0.4, y: 1 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12 }}
                style={{ fontSize: 10, color: displayName === holderPlaceholder ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.72)", fontWeight: 700, letterSpacing: "0.06em", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {displayName}
              </motion.div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{t("planCheckout.card.expiry")}</div>
              <motion.div
                key={displayExpiry}
                initial={{ opacity: 0.4, y: 1 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12 }}
                style={{ fontSize: 10, color: displayExpiry === t("planCheckout.placeholders.expiry") ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.72)", fontWeight: 700, letterSpacing: "0.08em" }}
              >
                {displayExpiry}
              </motion.div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{t("planCheckout.card.monthly")}</div>
              <div style={{ fontSize: 17, fontWeight: 900, color: "#ff6600", letterSpacing: "-0.02em" }}>R${price}</div>
            </div>
          </div>
        </motion.div>

        {/* ── BACK ── */}
        <motion.div
          animate={{ rotateY: data.flipped ? 0 : -180 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderRadius: 18,
            background: "linear-gradient(135deg,#1c1c1c 0%,#0f0f0f 45%,#200a00 100%)",
            border: "1px solid rgba(255,102,0,0.18)",
            padding: "22px 0 18px",
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            boxShadow: "0 16px 48px rgba(255,102,0,0.15),0 32px 64px rgba(0,0,0,0.6)",
          }}
        >
          {/* Magnetic stripe */}
          <div style={{ width: "100%", height: 34, background: "linear-gradient(90deg,#111,#222,#111)", marginBottom: 16 }} />
          {/* Signature strip + CVV */}
          <div style={{ padding: "0 20px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 30, borderRadius: 4, background: "repeating-linear-gradient(90deg,#fff1 0px,#fff1 4px,transparent 4px,transparent 8px)", display: "flex", alignItems: "center", paddingLeft: 8 }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontStyle: "italic" }}>{t("planCheckout.card.signature")}</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 10px", minWidth: 46, textAlign: "center" }}>
              <div style={{ fontSize: 7, color: "rgba(255,255,255,0.25)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.1em" }}>CVV</div>
              <motion.div
                key={data.cvv || "•••"}
                initial={{ opacity: 0.4, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ fontSize: 13, fontWeight: 800, color: "#ff6600", fontFamily: "monospace", letterSpacing: "0.12em" }}
              >
                {data.cvv || "•••"}
              </motion.div>
            </div>
          </div>
          <div style={{ padding: "12px 20px 0", textAlign: "center" }}>
            <span style={{ fontSize: 7, color: "rgba(255,255,255,0.12)", letterSpacing: "0.1em" }}>{t("planCheckout.card.tokenized")}</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ─── Pulse loader ─────────────────────────────────────────────────────── */
function PulseLoader() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
          style={{ width: 5, height: 5, borderRadius: "50%", background: "#ff6600" }}
        />
      ))}
    </div>
  );
}

/* ─── Input / field styles ─────────────────────────────────────────────── */
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#ffffff",
  marginBottom: 8,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 700,
};

// Card number, expiration date and CVV live inside Mercado Pago secure iframes.
// We style only the host containers and native fields we own to avoid brittle hacks.
const fieldBase: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "#ffffff",
  fontSize: 14,
  boxSizing: "border-box",
};

const inputStyle: React.CSSProperties = {
  ...fieldBase,
  padding: "0 14px",
  outline: "none",
  caretColor: "#ff6600",
};

const secureStyle: React.CSSProperties = {
  ...fieldBase,
  padding: "12px 14px",
  display: "flex",
  alignItems: "center",
};

const selectStyle: React.CSSProperties = {
  ...fieldBase,
  padding: "0 14px",
  appearance: "none" as const,
  outline: "none",
  cursor: "pointer",
};

/* ─── Main component ───────────────────────────────────────────────────── */
export default function PlanCheckout() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/checkout/plano/:planId");
  const { status, user } = useSession();

  const [phase, setPhase] = useState<Phase>("idle");
  const [formPhase, setFormPhase] = useState<FormPhase>("loading");
  const [errorNotice, setErrorNotice] = useState<CheckoutErrorNotice | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [checkoutValues, setCheckoutValues] = useState<CheckoutFormValues>({
    cardholderName: user?.name ?? "",
    issuer: "",
    identificationType: "",
    identificationNumber: "",
    cardholderEmail: user?.email ?? "",
  });
  const [formBusy, setFormBusy] = useState(false);
  const [formSeed, setFormSeed] = useState(0);
  const [cardData, setCardData] = useState<CardData>({ number: "", name: "", expiry: "", cvv: "", flipped: false });

  const activeFormRef = useRef<ActiveCardForm | null>(null);
  const nextFormIdRef = useRef(1);
  const lastRemountKeyRef = useRef<string | null>(null);
  const submitInFlightRef = useRef(false);
  const pendingMountedResultRef = useRef<PendingMountedResult | null>(null);

  const planIdRaw = (params?.planId ?? "").toLowerCase().trim();
  const planId = planIdRaw === "pro" || planIdRaw === "premium" ? (planIdRaw as PlanKey) : null;
  const planBase = planId ? PLAN_MAP[planId] : null;
  const plan = useMemo(() => {
    if (!planId || !planBase) return null;
    return {
      ...planBase,
      features: t(`planCheckout.plans.${planId}.features`, { returnObjects: true }) as string[],
    };
  }, [planBase, planId, t]);
  const ids = useMemo(() => buildIds(formSeed), [formSeed]);
  const insecureCheckoutContext = typeof window !== "undefined" && !window.isSecureContext;

  useEffect(() => {
    setCheckoutValues((current) => ({
      ...current,
      cardholderName: current.cardholderName || user?.name || "",
      cardholderEmail: current.cardholderEmail || user?.email || "",
    }));
    setCardData((current) => ({
      ...current,
      name: current.name || user?.name || "",
    }));
  }, [user?.email, user?.name]);

  useEffect(() => {
    if (status === "guest") {
      setPostAuthRedirect(`${window.location.pathname}${window.location.search}${window.location.hash}`);
      navigate("/login");
    }
  }, [navigate, status]);

  const destroyCardForm = (cardForm: ActiveCardForm | null, reason: string) => {
    if (!cardForm || cardForm.destroyed) return;
    cardForm.destroyed = true;
    cardForm.mounted = false;
    try { cardForm.instance.unmount?.(); } catch (e) { if (!isCardFormNotMountedError(e)) console.warn("[PlanCheckout] unmount fail", { reason, e }); }
    try { cardForm.instance.destroy?.(); } catch (e) { if (!isCardFormNotMountedError(e)) console.warn("[PlanCheckout] destroy fail", { reason, e }); }
    if (activeFormRef.current?.id === cardForm.id) activeFormRef.current = null;
  };

  const getActiveCardForm = (expectedId?: number): ActiveCardForm | null => {
    const a = activeFormRef.current;
    if (!a || a.destroyed || !a.mounted) return null;
    if (expectedId !== undefined && a.id !== expectedId) return null;
    return a;
  };

  const requestFormRemount = ({
    clearPublicKeyCache = false,
    reason,
    remountKey,
  }: {
    clearPublicKeyCache?: boolean;
    reason: string;
    remountKey: string;
  }) => {
    if (lastRemountKeyRef.current === remountKey) return;
    lastRemountKeyRef.current = remountKey;
    if (clearPublicKeyCache) resetMercadoPagoPublicKeyCache();
    destroyCardForm(activeFormRef.current, reason);
    submitInFlightRef.current = false;
    setFormBusy(false);
    setFormPhase("loading");
    setFormSeed((v) => v + 1);
  };

  const updateCheckoutValue = (field: keyof CheckoutFormValues, value: string) => {
    const nextValues = { ...checkoutValues, [field]: value };
    setCheckoutValues(nextValues);
    if (field === "cardholderName") setCardData((p) => ({ ...p, name: value }));
    if (!fieldErrors[field]) return;

    const nextFieldErrors = validateCheckoutValues(nextValues, t);
    setFieldErrors((current) => {
      if (nextFieldErrors[field]) return { ...current, [field]: nextFieldErrors[field] };
      const { [field]: _resolved, ...rest } = current;
      return rest;
    });
  };

  const showValidationErrors = (errors: CheckoutFieldErrors) => {
    setFieldErrors(errors);
    setErrorNotice({
      title: t("planCheckout.errors.reviewTitle"),
      message: t("planCheckout.errors.reviewMessage"),
      hint: t("planCheckout.errors.reviewHint"),
    });
    setPhase("error");
  };

  const handleRetry = () => {
    setPhase("idle");
    if (formPhase !== "error") return;
    requestFormRemount({ clearPublicKeyCache: true, reason: "manual-retry", remountKey: `manual-retry:${activeFormRef.current?.id ?? formSeed}` });
  };

  const applyMountedResult = (formId: number, error?: unknown) => {
    const currentForm = activeFormRef.current;
    if (!currentForm || currentForm.id !== formId || currentForm.destroyed) {
      pendingMountedResultRef.current = { formId, error };
      return;
    }
    pendingMountedResultRef.current = null;
    if (error) {
      console.error("[MercadoPago.CardForm:onFormMounted]", error);
      currentForm.mounted = false;
      setFormPhase("error");
      setErrorNotice(formatPlanCheckoutError(error, t));
      return;
    }
    currentForm.mounted = true;
    lastRemountKeyRef.current = null;
    setFormPhase("ready");
  };

  const submitCheckout = async (expectedFormId: number) => {
    const activeForm = getActiveCardForm(expectedFormId);
    if (!planId || !activeForm) {
      setErrorNotice({ title: t("planCheckout.errors.formNotReadyTitle"), message: t("planCheckout.errors.formNotReadyMessage"), hint: t("planCheckout.errors.waitAndRetry") });
      setPhase("error");
      return;
    }
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setPhase("loading");
    let cardTokenId: string | null = null;
    let redirected = false;
    try {
      const cardFormData = activeForm.instance.getCardFormData();
      const readInput = (id: string) => {
        const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
        return el?.value ?? "";
      };
      const normalizedValues = normalizeCheckoutValues({
        cardholderName: readInput(ids.cardholderName),
        issuer: String(cardFormData.issuerId ?? readInput(ids.issuer)),
        identificationType: String(cardFormData.identificationType ?? readInput(ids.identificationType)),
        identificationNumber: String(cardFormData.identificationNumber ?? readInput(ids.identificationNumber)),
        cardholderEmail: String(cardFormData.cardholderEmail ?? readInput(ids.cardholderEmail)),
      });
      const validationErrors = validateCheckoutValues(normalizedValues, t);
      if (Object.keys(validationErrors).length > 0) {
        showValidationErrors(validationErrors);
        return;
      }

      cardTokenId = String(cardFormData.token ?? "").trim();
      if (!cardTokenId) {
        setFieldErrors((current) => ({
          ...current,
          cardNumber: current.cardNumber ?? t("planCheckout.errors.cardNumber"),
          expirationDate: current.expirationDate ?? t("planCheckout.errors.expiry"),
          securityCode: current.securityCode ?? t("planCheckout.errors.cvv"),
        }));
        throw new Error(t("planCheckout.errors.reviewCard"));
      }
      setFieldErrors({});
      const { checkoutUrl } = await createSubscriptionCheckout(planId, { cardTokenId, backUrl: DEFAULT_SUBSCRIPTION_BACK_URL });
      const safeCheckoutUrl = getSafeRedirectUrl(checkoutUrl);
      if (!safeCheckoutUrl) {
        throw new Error(t("planCheckout.errors.unsafeUrl"));
      }
      redirected = true;
      window.location.href = safeCheckoutUrl;
    } catch (error) {
      if (isCardFormNotMountedError(error)) {
        requestFormRemount({ reason: "cardform-not-mounted", remountKey: `not-mounted:${activeForm.id}` });
        setErrorNotice({ title: t("planCheckout.errors.restartedTitle"), message: t("planCheckout.errors.restartedMessage"), hint: t("planCheckout.errors.restartedHint") });
        setPhase("error");
        return;
      }
      if (cardTokenId) requestFormRemount({ reason: "token-consumido", remountKey: `token-consumido:${activeForm.id}` });
      setErrorNotice(formatPlanCheckoutError(error, t));
      setPhase("error");
    } finally {
      if (!redirected) submitInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (status !== "authenticated" || !plan) return;
    let disposed = false;
    const formId = nextFormIdRef.current++;
    setFormPhase("loading");
    submitInFlightRef.current = false;
    pendingMountedResultRef.current = null;
    destroyCardForm(activeFormRef.current, "effect-replace");

    createMercadoPagoCardForm({
      amount: String(plan.price),
      iframe: true,
      form: {
        id: ids.form,
        cardNumber: { id: ids.cardNumber, placeholder: t("planCheckout.placeholders.cardNumber") },
        expirationDate: { id: ids.expirationDate, placeholder: t("planCheckout.placeholders.expiry") },
        securityCode: { id: ids.securityCode, placeholder: t("planCheckout.placeholders.cvv") },
        cardholderName: { id: ids.cardholderName, placeholder: t("planCheckout.placeholders.cardholderName") },
        issuer: { id: ids.issuer, placeholder: t("planCheckout.placeholders.issuer") },
        installments: { id: ids.installments, placeholder: t("planCheckout.placeholders.installments") },
        identificationType: { id: ids.identificationType, placeholder: t("planCheckout.placeholders.document") },
        identificationNumber: { id: ids.identificationNumber, placeholder: t("planCheckout.placeholders.documentNumber") },
        cardholderEmail: { id: ids.cardholderEmail, placeholder: t("planCheckout.placeholders.cardholderEmail") },
      },
      callbacks: {
        onFormMounted: (error) => { if (disposed) return; applyMountedResult(formId, error); },
        onSubmit: (event) => { event.preventDefault(); if (disposed) return; void submitCheckout(formId); },
        onFetching: () => {
          if (disposed || activeFormRef.current?.id !== formId) return;
          setFormBusy(true);
          return () => { if (!disposed && activeFormRef.current?.id === formId) setFormBusy(false); };
        },
      },
    })
      .then(({ instance, publicKeyInfo }) => {
        if (disposed) {
          destroyCardForm({ id: formId, instance, mounted: false, destroyed: false, publicKeyInfo }, "late-resolution");
          return;
        }
        activeFormRef.current = { id: formId, instance, mounted: false, destroyed: false, publicKeyInfo };
        const p = pendingMountedResultRef.current;
        if (p?.formId === formId) applyMountedResult(formId, p.error);
      })
      .catch((error) => { if (disposed) return; setFormPhase("error"); setErrorNotice(formatPlanCheckoutError(error, t)); });

    return () => {
      disposed = true;
      submitInFlightRef.current = false;
      if (pendingMountedResultRef.current?.formId === formId) pendingMountedResultRef.current = null;
      setFormBusy(false);
      destroyCardForm(activeFormRef.current?.id === formId ? activeFormRef.current : null, "effect-cleanup");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formSeed, ids, plan, planId, status, t]);

  /* ─── Guards ─────────────────────────────────────────────────────────── */
  if (status === "loading") return <LoadingScreen message={t("planCheckout.loadingSession")} />;
  if (status === "guest") return null;
  if (phase === "success") return <MessageScreen color="#ff6600" title={t("planCheckout.successTitle")} subtitle={t("planCheckout.successSubtitle")} actionLabel={t("planCheckout.panelAction")} onAction={() => navigate("/propostas")} />;
  if (!match || !planId || !plan) return <MessageScreen color="#ff6600" title={t("planCheckout.notFoundTitle")} subtitle={t("planCheckout.notFoundSubtitle")} actionLabel={t("planCheckout.seePlans")} onAction={() => navigate("/system")} />;

  const PlanIcon = plan.icon;
  const disabled = phase === "loading" || formPhase !== "ready";
  const buttonLabel =
    phase === "loading"
      ? formBusy ? t("planCheckout.buttonValidating") : t("planCheckout.buttonRedirecting")
      : t("planCheckout.buttonActivate", { plan: plan.name, price: plan.price });

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#fff", fontFamily: "'DM Sans','Inter',sans-serif", position: "relative", overflow: "hidden" }}>
      {/* BG */}
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 70% 50% at 50% -5%,rgba(255,102,0,0.07) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.016) 1px,transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />
        <main style={{ maxWidth: 880, margin: "0 auto", padding: "28px 18px 72px" }}>

          {/* Back */}
          <motion.button
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
            onClick={() => window.history.back()}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "rgba(255,255,255,0.28)", cursor: "pointer", marginBottom: 30, fontSize: 12, padding: 0 }}
          >
            <ArrowLeft size={12} /> {t("planCheckout.back")}
          </motion.button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: 30 }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: "rgba(255,102,0,0.08)", border: "1px solid rgba(255,102,0,0.14)", marginBottom: 12 }}>
              <Zap size={9} style={{ color: "#ff6600" }} />
              <span style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.2em", color: "#ff6600", fontWeight: 700 }}>{t("planCheckout.secureCheckout")}</span>
            </div>
            <h1 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 900, margin: 0, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              {t("planCheckout.planTitle")} <span style={{ color: "#ff6600" }}>{plan.name}</span>
            </h1>
            <p style={{ margin: "10px 0 0", maxWidth: 560, color: "rgba(255,255,255,0.68)", fontSize: 15, lineHeight: 1.65 }}>
              {t("planCheckout.intro")}
            </p>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18, alignItems: "start" }}>

            {/* LEFT */}
            <motion.section
              initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
            >
              <InteractiveCard data={cardData} planName={plan.name} price={plan.price} />

              <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,102,0,0.1)", border: "1px solid rgba(255,102,0,0.18)" }}>
                    <PlanIcon size={16} style={{ color: "#ff6600" }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#ffffff" }}>{t("planCheckout.planTitle")} {plan.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{t("planCheckout.automaticRenewal")}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                  {plan.features.map((feature, i) => (
                    <motion.div
                      key={feature}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.07 }}
                      style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, color: "rgba(255,255,255,0.78)" }}
                    >
                      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,102,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <CheckCircle2 size={10} style={{ color: "#ff6600" }} />
                      </div>
                      {feature}
                    </motion.div>
                  ))}
                </div>

                <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.52)" }}>{t("planCheckout.totalToday")}</span>
                  <div>
                    <span style={{ fontSize: 24, fontWeight: 900, color: "#ff6600", letterSpacing: "-0.03em" }}>R$ {plan.price}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", fontWeight: 400, marginLeft: 4 }}>{t("planCheckout.perMonth")}</span>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* RIGHT — form */}
            <motion.section
              initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.16 }}
              style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", overflow: "hidden" }}
            >
              <div style={{ height: 2, background: "linear-gradient(90deg,#ff6600,rgba(255,102,0,0.15))" }} />
              <div style={{ padding: "16px 16px 20px" }}>

                {/* Badges */}
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 14 }}>
                  {[
                    { icon: Lock, label: (t("planCheckout.badges", { returnObjects: true }) as string[])[0] },
                    { icon: ShieldCheck, label: (t("planCheckout.badges", { returnObjects: true }) as string[])[1] },
                    { icon: CreditCard, label: (t("planCheckout.badges", { returnObjects: true }) as string[])[2] },
                  ].map(({ icon: Icon, label }) => (
                    <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 999, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", color: "#ffffff", fontSize: 10, fontWeight: 600, letterSpacing: "0.02em" }}>
                      <Icon size={10} />{label}
                    </span>
                  ))}
                </div>

                {/* Alerts */}
                <AnimatePresence>
                  {insecureCheckoutContext && (
                    <motion.div key="insecure" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      style={{ display: "flex", gap: 8, padding: "12px 14px", borderRadius: 12, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.14)", marginBottom: 14, overflow: "hidden" }}>
                      <AlertCircle size={14} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
                      <span style={{ color: "#fbbf24", fontSize: 12, lineHeight: 1.6 }}>{t("planCheckout.insecureWarning")}</span>
                    </motion.div>
                  )}
                  {errorNotice && (
                    <motion.div key="error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      style={{ display: "flex", gap: 8, padding: "12px 14px", borderRadius: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.14)", marginBottom: 14, overflow: "hidden" }}>
                      <AlertCircle size={14} style={{ color: "#f87171", flexShrink: 0, marginTop: 2 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: "#fecaca", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{errorNotice.title}</div>
                        <div style={{ color: "#fca5a5", fontSize: 12, lineHeight: 1.6 }}>{errorNotice.message}</div>
                        {errorNotice.hint && <div style={{ color: "rgba(254,202,202,0.78)", fontSize: 11, lineHeight: 1.6, marginTop: 6 }}><strong style={{ color: "#fecaca" }}>{t("planCheckout.hint")}</strong> {errorNotice.hint}</div>}
                        {errorNotice.detail && <div style={{ color: "rgba(254,202,202,0.5)", fontSize: 10, lineHeight: 1.6, marginTop: 6 }}><strong style={{ color: "rgba(254,202,202,0.7)" }}>{t("planCheckout.technicalDetail")}</strong> {errorNotice.detail}</div>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div key={ids.form} style={{ display: "grid", gap: 10, padding: 12, borderRadius: 14, background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.05)", marginBottom: 12 }}>
                  <form id={ids.form} key={`${ids.form}-form`} autoComplete={insecureCheckoutContext ? "off" : "on"} style={{ display: "grid", gap: 14 }}>

                    <div>
                      <label style={labelStyle}>{t("planCheckout.labels.cardNumber")}</label>
                      <div id={ids.cardNumber} style={getFieldErrorStyle(Boolean(fieldErrors.cardNumber), secureStyle)} />
                      <FieldError message={fieldErrors.cardNumber} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={labelStyle}>{t("planCheckout.labels.expiry")}</label>
                        <div id={ids.expirationDate} style={getFieldErrorStyle(Boolean(fieldErrors.expirationDate), secureStyle)} />
                        <FieldError message={fieldErrors.expirationDate} />
                      </div>
                      <div>
                        <label style={labelStyle}>{t("planCheckout.labels.cvv")}</label>
                        <div
                          id={ids.securityCode}
                          style={getFieldErrorStyle(Boolean(fieldErrors.securityCode), secureStyle)}
                          onFocus={() => setCardData((p) => ({ ...p, flipped: true }))}
                          onBlur={() => setCardData((p) => ({ ...p, flipped: false }))}
                        />
                        <FieldError message={fieldErrors.securityCode} />
                      </div>
                    </div>

                    <div>
                      <label htmlFor={ids.cardholderName} style={labelStyle}>{t("planCheckout.labels.cardholderName")}</label>
                      <input
                        id={ids.cardholderName}
                        value={checkoutValues.cardholderName}
                        placeholder={t("planCheckout.placeholders.cardholderName")}
                        autoComplete={insecureCheckoutContext ? "off" : "cc-name"}
                        maxLength={80}
                        style={getFieldErrorStyle(Boolean(fieldErrors.cardholderName), inputStyle)}
                        onChange={(e) => updateCheckoutValue("cardholderName", e.target.value)}
                        onFocus={() => setCardData((p) => ({ ...p, flipped: false }))}
                      />
                      <FieldError message={fieldErrors.cardholderName} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label htmlFor={ids.issuer} style={labelStyle}>{t("planCheckout.labels.issuer")}</label>
                        <select
                          id={ids.issuer}
                          defaultValue=""
                          style={getFieldErrorStyle(Boolean(fieldErrors.issuer), selectStyle)}
                          onChange={(e) => updateCheckoutValue("issuer", e.target.value)}
                        >
                          <option value="" disabled>{t("planCheckout.placeholders.select")}</option>
                        </select>
                        <FieldError message={fieldErrors.issuer} />
                      </div>
                      <div>
                        <label htmlFor={ids.identificationType} style={labelStyle}>{t("planCheckout.labels.document")}</label>
                        <select
                          id={ids.identificationType}
                          defaultValue=""
                          style={getFieldErrorStyle(Boolean(fieldErrors.identificationType), selectStyle)}
                          onChange={(e) => updateCheckoutValue("identificationType", e.target.value)}
                        >
                          <option value="" disabled>{t("planCheckout.placeholders.type")}</option>
                        </select>
                        <FieldError message={fieldErrors.identificationType} />
                      </div>
                    </div>

                    <div style={{ display: "none" }} aria-hidden="true">
                      <label htmlFor={ids.installments} style={labelStyle}>{t("planCheckout.labels.installments")}</label>
                      <select id={ids.installments} defaultValue="" style={selectStyle}>
                        <option value="" disabled>{t("planCheckout.placeholders.installments")}</option>
                      </select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label htmlFor={ids.identificationNumber} style={labelStyle}>{t("planCheckout.labels.cpfCnpj")}</label>
                        <input
                          id={ids.identificationNumber}
                          placeholder={t("planCheckout.placeholders.yourDocument")}
                          inputMode="numeric"
                          autoComplete={insecureCheckoutContext ? "off" : "on"}
                          value={checkoutValues.identificationNumber}
                          maxLength={18}
                          style={getFieldErrorStyle(Boolean(fieldErrors.identificationNumber), inputStyle)}
                          onChange={(e) => updateCheckoutValue("identificationNumber", e.target.value.replace(/[^\d./-]/g, ""))}
                          onFocus={() => setCardData((p) => ({ ...p, flipped: false }))}
                        />
                        <FieldError message={fieldErrors.identificationNumber} />
                      </div>
                      <div>
                        <label htmlFor={ids.cardholderEmail} style={labelStyle}>{t("planCheckout.labels.cardholderEmail")}</label>
                        <input
                          id={ids.cardholderEmail}
                          type="email"
                          value={checkoutValues.cardholderEmail}
                          autoComplete={insecureCheckoutContext ? "off" : "email"}
                          maxLength={120}
                          style={getFieldErrorStyle(Boolean(fieldErrors.cardholderEmail), inputStyle)}
                          onChange={(e) => updateCheckoutValue("cardholderEmail", e.target.value)}
                          onFocus={() => setCardData((p) => ({ ...p, flipped: false }))}
                        />
                        <FieldError message={fieldErrors.cardholderEmail} />
                      </div>
                    </div>
                  </form>
                </div>

                {/* Status */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", marginBottom: 12 }}>
                  {formPhase === "ready"
                    ? <CheckCircle2 size={14} style={{ color: "#22c55e", flexShrink: 0 }} />
                    : <PulseLoader />}
                  <span style={{ fontSize: 11, color: formPhase === "ready" ? "#ffffff" : "rgba(255,255,255,0.78)" }}>
                    {formPhase === "ready" ? t("planCheckout.secureReady") : t("planCheckout.secureLoading")}
                  </span>
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  form={ids.form}
                  disabled={disabled}
                  whileTap={!disabled ? { scale: 0.98 } : undefined}
                  whileHover={!disabled ? { boxShadow: "0 6px 28px rgba(255,102,0,0.45)" } : undefined}
                  style={{
                    width: "100%",
                    padding: "13px 0",
                    borderRadius: 12,
                    border: "none",
                    background: disabled ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg,#ff6600 0%,#cc4400 100%)",
                    color: disabled ? "rgba(255,255,255,0.16)" : "#fff",
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: disabled ? "not-allowed" : "pointer",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 7,
                    letterSpacing: "-0.01em",
                    boxShadow: disabled ? "none" : "0 4px 18px rgba(255,102,0,0.28)",
                    transition: "box-shadow 0.2s",
                  }}
                >
                  {phase === "loading" ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={13} />}
                  {buttonLabel}
                </motion.button>

                <p style={{ marginTop: 10, textAlign: "center" as const, fontSize: 10, color: "rgba(255,255,255,0.32)", lineHeight: 1.6 }}>
                  {t("planCheckout.renewalNote")}
                  <br />{t("planCheckout.backUrlLabel")}: {DEFAULT_SUBSCRIPTION_BACK_URL}
                </p>
              </div>
            </motion.section>
          </div>

          {/* Retry */}
          <AnimatePresence>
            {errorNotice && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ textAlign: "center", marginTop: 14 }}>
                <button onClick={handleRetry} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.26)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                  <RefreshCw size={10} /> {t("planCheckout.retry")}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/* ─── Utility screens ──────────────────────────────────────────────────── */
function LoadingScreen({ message }: { message: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "rgba(255,255,255,0.4)", display: "grid", placeItems: "center", fontFamily: "'DM Sans','Inter',sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {[0, 1, 2].map((i) => (
            <motion.div key={i} animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff6600" }} />
          ))}
        </div>
        <span style={{ fontSize: 12 }}>{message}</span>
      </div>
    </div>
  );
}

function MessageScreen(props: {
  color: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#fff", display: "grid", placeItems: "center", padding: 24, fontFamily: "'DM Sans','Inter',sans-serif" }}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", maxWidth: 360 }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,102,0,0.1)", border: "1px solid rgba(255,102,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <CheckCircle2 size={24} style={{ color: props.color }} />
        </motion.div>
        <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em" }}>{props.title}</h1>
        <p style={{ margin: "0 0 24px", color: "rgba(255,255,255,0.36)", lineHeight: 1.6, fontSize: 13 }}>{props.subtitle}</p>
        <motion.button whileTap={{ scale: 0.97 }} onClick={props.onAction}
          style={{ padding: "12px 26px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#ff6600,#cc4400)", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 13, boxShadow: "0 4px 18px rgba(255,102,0,0.3)" }}>
          {props.actionLabel}
        </motion.button>
      </motion.div>
    </div>
  );
}
