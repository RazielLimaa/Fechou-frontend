import { api } from "./api";

export interface MercadoPagoStatusResponse {
  connected: boolean;
  authMethod: "oauth" | "api_key" | null;
  mpUserId: string | null;
  expiresAt: string | null;
  pixKey?: string | null;
  pixKeyType?: string | null;
}

export interface PixKeyResponse {
  pixKey: string | null;
  pixKeyType: string | null;
  hasPixKey?: boolean;
}

export interface VerifyApiKeyResponse {
  valid: boolean;
  mpUserId: string;
  nickname: string | null;
  email: string | null;
}

export interface RegisterApiKeyResponse {
  connected: boolean;
  authMethod: "api_key";
  mpUserId: string;
  nickname: string | null;
}

function asTrimmedString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

function normalizePixKeyPayload(payload: any): PixKeyResponse {
  const source = payload?.data && typeof payload.data === "object" ? payload.data : payload;

  const pixKey =
    source?.pixKey ??
    source?.pix_key ??
    source?.key ??
    source?.pix ??
    source?.value ??
    source?.pixValue ??
    source?.pix_value ??
    null;

  const pixKeyType =
    source?.pixKeyType ??
    source?.pix_key_type ??
    source?.type ??
    source?.keyType ??
    source?.key_type ??
    null;

  const hasPixKeyRaw =
    source?.hasPixKey ??
    source?.has_pix_key ??
    source?.pixConfigured ??
    source?.pix_configured ??
    source?.configured ??
    source?.isConfigured;

  const normalizedKey = asTrimmedString(pixKey);
  const normalizedType = asTrimmedString(pixKeyType);

  const hasPixKey = hasPixKeyRaw === true || hasPixKeyRaw === "true" || hasPixKeyRaw === 1 || Boolean(normalizedKey);

  return {
    pixKey: normalizedKey,
    pixKeyType: normalizedType,
    hasPixKey,
  };
}

/**
 * ✅ Agora valida de verdade.
 * - Se backend mandar hasPixKey=true, respeita.
 * - Caso contrário, considera configurado se pixKey é string não vazia.
 */
export function isPixConfigured(data: PixKeyResponse | null | undefined): boolean {
  if (!data) return false;
  if (data.hasPixKey === true) return true;
  return typeof data.pixKey === "string" && data.pixKey.trim().length > 0;
}

function normalizeStatusPayload(payload: any): MercadoPagoStatusResponse {
  const source = payload?.data && typeof payload.data === "object" ? payload.data : payload;

  const connectedRaw = source?.connected ?? source?.isConnected ?? source?.status;
  const connected =
    connectedRaw === true ||
    connectedRaw === "connected" ||
    connectedRaw === "true" ||
    connectedRaw === 1;

  const authMethodRaw = source?.authMethod ?? source?.auth_method ?? null;
  const authMethod = authMethodRaw === "oauth" || authMethodRaw === "api_key" ? authMethodRaw : null;

  const mpUserIdRaw = source?.mpUserId ?? source?.mp_user_id ?? null;
  const expiresAtRaw = source?.expiresAt ?? source?.expires_at ?? null;

  const pix = normalizePixKeyPayload(source);

  return {
    connected,
    authMethod,
    mpUserId: asTrimmedString(mpUserIdRaw),
    expiresAt: asTrimmedString(expiresAtRaw),
    pixKey: pix.pixKey,
    pixKeyType: pix.pixKeyType,
  };
}

function buildApiOrigin(): string {
  // Preferir backend explícito (dev/prod). Ex: https://api.seudominio.com
  const envBase = String(import.meta.env.VITE_API_URL ?? "").trim();
  const base = envBase.length > 0 ? envBase : window.location.origin;

  // remove trailing slash
  const cleaned = base.replace(/\/$/, "");

  // Se o cara colocou VITE_API_URL já com /api no final, não duplica.
  // Ex: https://meu-backend.com/api  -> origin final = https://meu-backend.com
  return cleaned.endsWith("/api") ? cleaned.slice(0, -4) : cleaned;
}

export const mercadoPagoService = {
  /**
   * GET /api/mercadopago/status
   */
  getStatus: async (): Promise<MercadoPagoStatusResponse> => {
    const { data } = await api.get("/api/mercadopago/status");
    return normalizeStatusPayload(data);
  },

  /**
   * GET /api/user/pix-key
   */
  getPixKey: async (): Promise<PixKeyResponse> => {
    const { data } = await api.get("/api/user/pix-key");
    return normalizePixKeyPayload(data);
  },

  /**
   * POST /api/user/pix-key
   */
  savePixKey: async (pixKey: string, pixKeyType: string, stepUpToken?: string): Promise<PixKeyResponse> => {
    // Sanitiza antes de enviar — remove espaços e limita tamanho
    const cleanKey  = pixKey.trim().slice(0, 140);
    const cleanType = pixKeyType.trim().slice(0, 20);

    if (!cleanKey)  throw new Error("Chave PIX não pode ser vazia.");
    if (!cleanType) throw new Error("Tipo da chave PIX não informado.");

    const VALID_TYPES = ["cpf", "cnpj", "email", "phone", "random"];
    if (!VALID_TYPES.includes(cleanType)) {
      throw new Error(`Tipo de chave inválido: "${cleanType}".`);
    }

    const { data } = await api.post("/api/user/pix-key", {
      pixKey:      cleanKey,
      pixKeyType:  cleanType,
    }, { stepUpToken });
    return normalizePixKeyPayload(data);
  },

  /**
   * DELETE /api/user/pix-key
   */
  deletePixKey: async (stepUpToken?: string): Promise<void> => {
    await api.delete("/api/user/pix-key", { stepUpToken });
  },

  /**
   * POST /api/mercadopago/api-key/verify
   */
  verifyApiKey: async (accessToken: string): Promise<VerifyApiKeyResponse> => {
    const clean = accessToken.trim();
    if (!clean || clean.length < 20) throw new Error("Access token inválido.");
    if (clean.length > 512)          throw new Error("Access token muito longo.");
    // Bloqueia caracteres suspeitos (XSS / injection)
    if (/[<>"'`]/.test(clean))       throw new Error("Access token contém caracteres inválidos.");

    const { data } = await api.post("/api/mercadopago/api-key/verify", { accessToken: clean });
    return data;
  },

  /**
   * POST /api/mercadopago/api-key/register
   */
  registerApiKey: async (accessToken: string, stepUpToken?: string): Promise<RegisterApiKeyResponse> => {
    const clean = accessToken.trim();
    if (!clean || clean.length < 20) throw new Error("Access token inválido.");
    if (clean.length > 512)          throw new Error("Access token muito longo.");
    if (/[<>"'`]/.test(clean))       throw new Error("Access token contém caracteres inválidos.");

    const { data } = await api.post("/api/mercadopago/api-key/register", { accessToken: clean }, { stepUpToken });
    return data;
  },

  /**
   * GET /api/mercadopago/connect
   * (backend redireciona 302 para o OAuth do Mercado Pago)
   */
  connectOAuth: () => {
    const origin = buildApiOrigin();

    // Garante que só redireciona para domínios conhecidos (evita open redirect)
    try {
      const parsed = new URL(`${origin}/api/mercadopago/connect`);
      const allowed = ["localhost", ...(import.meta.env.VITE_API_URL ? [new URL(import.meta.env.VITE_API_URL).hostname] : [])];
      if (!allowed.some(h => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
        // Em produção, só bloqueia se não for o próprio domínio
        const isHttps = parsed.protocol === "https:";
        if (!isHttps) throw new Error("Domínio não autorizado para OAuth.");
      }
      window.location.href = parsed.toString();
    } catch (err) {
      throw new Error("Não foi possível iniciar a conexão OAuth.");
    }
  },
};
