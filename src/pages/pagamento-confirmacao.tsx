import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import Navbar from "../components/landing/Navbar";
import { confirmSubscription, getBillingMe, type PlanId } from "../service/payment";
import { toUiErrorMessage } from "../lib/api-error";

type Phase = "loading" | "success" | "processing" | "error";

type ConfirmationParams = {
  preapprovalId: string | null;
  externalReference: string | null;
};

function getUrlParams(): ConfirmationParams {
  try {
    const params = new URLSearchParams(window.location.search);
    const rawPreapprovalId = params.get("preapproval_id") ?? params.get("id");
    const rawExternalReference = params.get("external_reference");

    const preapprovalId = rawPreapprovalId
      ? rawPreapprovalId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120) || null
      : null;
    const externalReference = rawExternalReference
      ? rawExternalReference.replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, 200) || null
      : null;

    return { preapprovalId, externalReference };
  } catch {
    return { preapprovalId: null, externalReference: null };
  }
}

function isKnownPlan(planId: string | null | undefined): planId is "pro" | "premium" {
  return planId === "pro" || planId === "premium";
}

function isActiveSubscriptionStatus(status: string | null | undefined): boolean {
  const normalized = String(status ?? "").trim().toLowerCase();
  return normalized === "authorized" || normalized === "active";
}

function billingConfirmsPlan(planId: PlanId, status: string | null | undefined, isSubscribed: boolean): boolean {
  return isKnownPlan(planId) && isSubscribed && isActiveSubscriptionStatus(status);
}

function getCheckoutPath(planId: string | null): string {
  return isKnownPlan(planId) ? `/checkout/plano/${planId}` : "/system";
}

const CONTENT: Record<
  Phase,
  {
    icon: React.ReactNode;
    iconBg: string;
    color: string;
  }
> = {
  loading: {
    icon: <Loader2 size={40} style={{ color: "#ff6600", animation: "spin 1s linear infinite" }} />,
    iconBg: "rgba(255,102,0,0.1)",
    color: "#ff6600",
  },
  success: {
    icon: <CheckCircle2 size={40} style={{ color: "#22c55e" }} />,
    iconBg: "rgba(34,197,94,0.1)",
    color: "#22c55e",
  },
  processing: {
    icon: <Clock size={40} style={{ color: "#f59e0b" }} />,
    iconBg: "rgba(245,158,11,0.1)",
    color: "#f59e0b",
  },
  error: {
    icon: <XCircle size={40} style={{ color: "#f87171" }} />,
    iconBg: "rgba(248,113,113,0.1)",
    color: "#f87171",
  },
};

export default function PagamentoConfirmacao() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("loading");
  const [planId, setPlanId] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const params = useMemo(() => getUrlParams(), []);

  const runConfirmation = useCallback(async () => {
    if (!params.preapprovalId && !params.externalReference) {
      setErrorMessage(t("paymentConfirmation.errors.missingParams"));
      setPhase("error");
      return;
    }

    setPhase("loading");
    setErrorMessage(null);

    try {
      const response = await confirmSubscription({
        ...(params.preapprovalId ? { preapprovalId: params.preapprovalId } : {}),
        ...(params.externalReference ? { externalReference: params.externalReference } : {}),
      });

      setPlanId(response.planId ?? null);
      setStatusLabel(response.status ?? null);

      if (response.ok && isKnownPlan(response.planId) && isActiveSubscriptionStatus(response.status)) {
        const billing = await getBillingMe();
        setPlanId(billing.plan.planId);
        setStatusLabel(billing.plan.status ?? response.status);

        if (billingConfirmsPlan(billing.plan.planId, billing.plan.status ?? response.status, billing.plan.isSubscribed)) {
          setPhase("success");
          return;
        }

        setErrorMessage(t("paymentConfirmation.errors.billingLag"));
        setPhase("processing");
        return;
      }

      if (!isActiveSubscriptionStatus(response.status)) {
        setPhase("processing");
        return;
      }

      setErrorMessage(t("paymentConfirmation.errors.invalidPlan"));
      setPhase("error");
    } catch (error) {
      setErrorMessage(toUiErrorMessage(error));
      setPhase("error");
    }
  }, [params.externalReference, params.preapprovalId, t]);

  useEffect(() => {
    void runConfirmation();
  }, [runConfirmation]);

  const content = {
    ...CONTENT[phase],
    title: t(`paymentConfirmation.content.${phase}.title`),
    subtitle: t(`paymentConfirmation.content.${phase}.subtitle`),
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#09090b",
        color: "#fff",
        fontFamily: "'DM Sans','Inter',sans-serif",
      }}
    >
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 600,
            background: `radial-gradient(circle, ${content.color}10 0%, transparent 70%)`,
            borderRadius: "50%",
            transition: "background 0.5s",
          }}
        />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />

        <main
          style={{
            maxWidth: 520,
            margin: "0 auto",
            padding: "clamp(80px,15vw,140px) clamp(16px,4vw,32px) 80px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <motion.div
            key={phase}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                background: content.iconBg,
                border: `1px solid ${content.color}25`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {content.icon}
            </div>

            <div>
              <h1
                style={{
                  fontSize: "clamp(22px,4vw,32px)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  color: "#fff",
                  marginBottom: 10,
                }}
              >
                {content.title}
              </h1>
              <p
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.4)",
                  lineHeight: 1.7,
                  maxWidth: 420,
                  margin: "0 auto",
                }}
              >
                {content.subtitle}
              </p>
            </div>

            {phase === "success" && planId && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  padding: "12px 20px",
                  borderRadius: 12,
                  background: "rgba(34,197,94,0.06)",
                  border: "1px solid rgba(34,197,94,0.18)",
                  fontSize: 13,
                  color: "#22c55e",
                  fontWeight: 600,
                }}
              >
                {t("paymentConfirmation.activePlan", { plan: planId.charAt(0).toUpperCase() + planId.slice(1) })}
              </motion.div>
            )}

            {phase === "processing" && statusLabel && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  padding: "12px 20px",
                  borderRadius: 12,
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.18)",
                  fontSize: 13,
                  color: "#f59e0b",
                  fontWeight: 600,
                }}
              >
                {t("paymentConfirmation.currentStatus", { status: statusLabel })}
              </motion.div>
            )}

            {phase === "error" && errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                  padding: "12px 20px",
                  borderRadius: 12,
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.18)",
                  fontSize: 13,
                  color: "#fca5a5",
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
              >
                {errorMessage}
              </motion.div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 320 }}>
              {phase === "success" && (
                <motion.button
                  onClick={() => navigate("/propostas")}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "13px 0",
                    borderRadius: 14,
                    background: "#ff6600",
                    border: "none",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {t("paymentConfirmation.goToDashboard")} <ArrowRight size={14} />
                </motion.button>
              )}

              {phase === "processing" && (
                <>
                  <motion.button
                    onClick={() => void runConfirmation()}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "13px 0",
                      borderRadius: 14,
                      background: "#ff6600",
                      border: "none",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {t("paymentConfirmation.retry")} <RefreshCw size={14} />
                  </motion.button>
                  <motion.button
                    onClick={() => navigate("/propostas")}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "13px 0",
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {t("paymentConfirmation.goToDashboard")}
                  </motion.button>
                </>
              )}

              {phase === "error" && (
                <>
                  <motion.button
                    onClick={() => void runConfirmation()}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "13px 0",
                      borderRadius: 14,
                      background: "#ff6600",
                      border: "none",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {t("paymentConfirmation.retryConfirmation")}
                  </motion.button>
                  <motion.button
                    onClick={() => navigate(getCheckoutPath(planId))}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "13px 0",
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <CreditCard size={14} />
                    {t("paymentConfirmation.redoCheckout")}
                  </motion.button>
                  <button
                    onClick={() => navigate("/system")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.3)",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {t("paymentConfirmation.seeOtherPlans")}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </main>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
