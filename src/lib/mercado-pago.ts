import { loadMercadoPago } from "@mercadopago/sdk-js";
import { getApiErrorDetailString } from "./api-error";
import { ApiError } from "../service/api";
import { getSubscriptionClientConfig } from "../service/payment";

type MercadoPagoFieldConfig = {
  id: string;
  placeholder?: string;
};

type MercadoPagoCardFormData = {
  token?: string | null;
  paymentMethodId?: string | null;
  issuerId?: string | null;
  cardholderEmail?: string | null;
  amount?: string | null;
  identificationNumber?: string | null;
  identificationType?: string | null;
};

type MercadoPagoCardFormCallbacks = {
  onFormMounted?: (error?: unknown) => void;
  onSubmit?: (event: Event) => void;
  onFetching?: (resource: string) => void | (() => void);
};

export type MercadoPagoCardFormInstance = {
  getCardFormData: () => MercadoPagoCardFormData;
  unmount?: () => void;
  destroy?: () => void;
};

export type MercadoPagoPublicKeyDebugInfo = {
  source: "backend" | "env";
  environment: MercadoPagoEnvironment;
  backendMode?: MercadoPagoEnvironment;
  publicKeyMode?: MercadoPagoEnvironment;
  hasAssociatedPlansConfigured?: boolean;
  publicKeyPreview: string;
  resolvedAt: string;
};

export type MercadoPagoCardFormHandle = {
  instance: MercadoPagoCardFormInstance;
  publicKeyInfo: MercadoPagoPublicKeyDebugInfo;
};

type MercadoPagoCardFormConfig = {
  amount: string;
  iframe: boolean;
  form: {
    id: string;
    cardNumber: MercadoPagoFieldConfig;
    expirationDate: MercadoPagoFieldConfig;
    securityCode: MercadoPagoFieldConfig;
    cardholderName: MercadoPagoFieldConfig;
    issuer: MercadoPagoFieldConfig;
    installments: MercadoPagoFieldConfig;
    identificationType: MercadoPagoFieldConfig;
    identificationNumber: MercadoPagoFieldConfig;
    cardholderEmail: MercadoPagoFieldConfig;
  };
  callbacks?: MercadoPagoCardFormCallbacks;
};

type MercadoPagoInstance = {
  cardForm: (config: MercadoPagoCardFormConfig) => MercadoPagoCardFormInstance;
};

declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options?: {
        locale?: string;
        advancedFraudPrevention?: boolean;
        trackingDisabled?: boolean;
      },
    ) => MercadoPagoInstance;
  }
}

type MercadoPagoEnvironment = "production" | "test";
type ResolvedMercadoPagoPublicKey = {
  publicKey: string;
  debugInfo: MercadoPagoPublicKeyDebugInfo;
};

let subscriptionPublicKeyPromise: Promise<ResolvedMercadoPagoPublicKey> | null = null;
let resolvedMercadoPagoPublicKeyDebugInfo: MercadoPagoPublicKeyDebugInfo | null = null;

function getEnvMercadoPagoPublicKey(): string {
  return String(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY ?? "").trim();
}

function maskMercadoPagoPublicKey(publicKey: string): string {
  const normalized = publicKey.trim();
  if (normalized.length <= 16) return normalized;
  return `${normalized.slice(0, 12)}...${normalized.slice(-6)}`;
}

function getBackendConfigErrorMessage(error: unknown): string | null {
  if (error instanceof ApiError) {
    return getApiErrorDetailString(error, "message") ?? (error.message.trim() || null);
  }

  if (!error || typeof error !== "object") return null;

  const response = "response" in error ? (error as { response?: unknown }).response : undefined;
  if (!response || typeof response !== "object") return null;

  const data = "data" in response ? (response as { data?: unknown }).data : undefined;
  if (!data || typeof data !== "object") return null;

  const message = "message" in data ? (data as { message?: unknown }).message : undefined;
  return typeof message === "string" && message.trim() ? message.trim() : null;
}

function inferMercadoPagoEnvironment(publicKey: string): MercadoPagoEnvironment | null {
  const normalized = publicKey.trim().toUpperCase();

  if (normalized.startsWith("APP_USR-")) return "production";
  if (normalized.startsWith("TEST-")) return "test";
  return null;
}

function getEnvironmentLabel(environment: MercadoPagoEnvironment): string {
  return environment === "production" ? "producao" : "teste";
}

function buildPublicKeyDebugInfo(
  publicKey: string,
  source: "backend" | "env",
  backendMode?: MercadoPagoEnvironment,
  publicKeyMode?: MercadoPagoEnvironment,
  hasAssociatedPlansConfigured?: boolean,
): MercadoPagoPublicKeyDebugInfo {
  const environment = inferMercadoPagoEnvironment(publicKey) ?? "test";
  return {
    source,
    environment,
    backendMode,
    publicKeyMode,
    hasAssociatedPlansConfigured,
    publicKeyPreview: maskMercadoPagoPublicKey(publicKey),
    resolvedAt: new Date().toISOString(),
  };
}

function assertValidSubscriptionsPublicKey(
  publicKey: string,
  expectedEnvironment?: MercadoPagoEnvironment,
): string {
  const normalized = publicKey.trim();

  if (!normalized) {
    throw new Error(
      "Chave publica do Mercado Pago nao configurada para assinatura.",
    );
  }

  const environment = inferMercadoPagoEnvironment(normalized);

  if (!environment) {
    throw new Error(
      "Public Key de assinatura invalida. Use uma credencial APP_USR- ou TEST- valida do Mercado Pago.",
    );
  }

  if (expectedEnvironment && environment !== expectedEnvironment) {
    throw new Error(
      `A Public Key do Mercado Pago precisa estar no ambiente de ${getEnvironmentLabel(expectedEnvironment)} para acompanhar o MP_ACCESS_TOKEN configurado no backend.`,
    );
  }

  return normalized;
}

async function resolveMercadoPagoPublicKey(): Promise<ResolvedMercadoPagoPublicKey> {
  const envPublicKey = getEnvMercadoPagoPublicKey();

  try {
    const backendConfig = await getSubscriptionClientConfig();
    const backendPublicKey = assertValidSubscriptionsPublicKey(
      backendConfig.publicKey,
      backendConfig.mode,
    );

    if (envPublicKey && envPublicKey !== backendPublicKey) {
      const envEnvironment = inferMercadoPagoEnvironment(envPublicKey);
      const warning =
        envEnvironment && envEnvironment !== backendConfig.mode
          ? "[MercadoPago] VITE_MERCADOPAGO_PUBLIC_KEY esta em um ambiente diferente da configuracao atual do backend. Usando a credencial do backend para assinatura."
          : "[MercadoPago] VITE_MERCADOPAGO_PUBLIC_KEY difere da Public Key configurada no backend. Usando a credencial do backend para assinatura.";
      console.warn(
        warning,
      );
    }

    const resolved = {
      publicKey: backendPublicKey,
      debugInfo: buildPublicKeyDebugInfo(
        backendPublicKey,
        "backend",
        backendConfig.mode,
        backendConfig.publicKeyMode ?? backendConfig.mode,
        backendConfig.hasAssociatedPlansConfigured,
      ),
    };
    resolvedMercadoPagoPublicKeyDebugInfo = resolved.debugInfo;
    return resolved;
  } catch (error) {
    const backendConfigError = getBackendConfigErrorMessage(error);
    if (backendConfigError) {
      throw new Error(backendConfigError);
    }

    if (envPublicKey) {
      const resolvedEnvPublicKey = assertValidSubscriptionsPublicKey(envPublicKey);
      const resolved = {
        publicKey: resolvedEnvPublicKey,
        debugInfo: buildPublicKeyDebugInfo(resolvedEnvPublicKey, "env"),
      };
      resolvedMercadoPagoPublicKeyDebugInfo = resolved.debugInfo;
      return resolved;
    }

    if (error instanceof Error && error.message.trim()) {
      throw error;
    }

    throw new Error(
      "Nao foi possivel resolver a Public Key de assinatura. Configure no backend uma Public Key no mesmo ambiente do MP_ACCESS_TOKEN ou informe VITE_MERCADOPAGO_PUBLIC_KEY como fallback local.",
    );
  }
}

async function getMercadoPagoPublicKey(): Promise<ResolvedMercadoPagoPublicKey> {
  if (!subscriptionPublicKeyPromise) {
    subscriptionPublicKeyPromise = resolveMercadoPagoPublicKey().catch((error) => {
      subscriptionPublicKeyPromise = null;
      throw error;
    });
  }

  return subscriptionPublicKeyPromise;
}

export function resetMercadoPagoPublicKeyCache(): void {
  subscriptionPublicKeyPromise = null;
  resolvedMercadoPagoPublicKeyDebugInfo = null;
}

export function getResolvedMercadoPagoPublicKeyDebugInfo(): MercadoPagoPublicKeyDebugInfo | null {
  return resolvedMercadoPagoPublicKeyDebugInfo;
}

export async function createMercadoPagoCardForm(
  config: MercadoPagoCardFormConfig,
): Promise<MercadoPagoCardFormHandle> {
  await loadMercadoPago();
  const resolvedPublicKey = await getMercadoPagoPublicKey();

  if (typeof window === "undefined" || typeof window.MercadoPago !== "function") {
    throw new Error("Nao foi possivel carregar o SDK do Mercado Pago.");
  }

  const mercadoPago = new window.MercadoPago(resolvedPublicKey.publicKey, {
    locale: "pt-BR",
  });

  return {
    instance: mercadoPago.cardForm(config),
    publicKeyInfo: resolvedPublicKey.debugInfo,
  };
}
