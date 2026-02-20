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

function normalizePixKeyPayload(payload: any): PixKeyResponse {
  const source = payload?.data && typeof payload.data === "object" ? payload.data : payload;

  const pixKey =
    source?.pixKey ??
    source?.pix_key ??
    source?.key ??
    source?.pix ??
    null;
  const pixKeyType =
    source?.pixKeyType ??
    source?.pix_key_type ??
    source?.type ??
    null;

  return {
    pixKey: typeof pixKey === "string" ? pixKey : null,
    pixKeyType: typeof pixKeyType === "string" ? pixKeyType : null,
  };
}

function normalizeStatusPayload(payload: any): MercadoPagoStatusResponse {
  const source = payload?.data && typeof payload.data === "object" ? payload.data : payload;

  const connectedRaw = source?.connected ?? source?.isConnected ?? source?.status;
  const connected = connectedRaw === true || connectedRaw === "connected";

  const authMethodRaw = source?.authMethod ?? source?.auth_method ?? null;
  const authMethod = authMethodRaw === "oauth" || authMethodRaw === "api_key" ? authMethodRaw : null;

  const mpUserIdRaw = source?.mpUserId ?? source?.mp_user_id ?? null;
  const expiresAtRaw = source?.expiresAt ?? source?.expires_at ?? null;

  const pix = normalizePixKeyPayload(source);

  return {
    connected,
    authMethod,
    mpUserId: typeof mpUserIdRaw === "string" ? mpUserIdRaw : null,
    expiresAt: typeof expiresAtRaw === "string" ? expiresAtRaw : null,
    pixKey: pix.pixKey,
    pixKeyType: pix.pixKeyType,
  };
}

export const mercadoPagoService = {
  /**
   * GET /api/mercadopago/status
   */
  getStatus: async (): Promise<MercadoPagoStatusResponse> => {
    const { data } = await api.get<MercadoPagoStatusResponse>("/api/mercadopago/status");
    return normalizeStatusPayload(data);
  },

  getPixKey: async (): Promise<PixKeyResponse> => {
    const { data } = await api.get<PixKeyResponse>("/api/user/pix-key");
    return normalizePixKeyPayload(data);
  },

  savePixKey: async (pixKey: string, pixKeyType: string): Promise<PixKeyResponse> => {
    const { data } = await api.post<PixKeyResponse>("/api/user/pix-key", { pixKey, pixKeyType });
    return normalizePixKeyPayload(data);
  },

  deletePixKey: async (): Promise<void> => {
    await api.delete("/api/user/pix-key");
  },

  /**
   * POST /api/mercadopago/api-key/verify
   */
  verifyApiKey: async (accessToken: string): Promise<VerifyApiKeyResponse> => {
    const { data } = await api.post<VerifyApiKeyResponse>("/api/mercadopago/api-key/verify", { accessToken });
    return data;
  },

  /**
   * POST /api/mercadopago/api-key/register
   */
  registerApiKey: async (accessToken: string): Promise<RegisterApiKeyResponse> => {
    const { data } = await api.post<RegisterApiKeyResponse>("/api/mercadopago/api-key/register", { accessToken });
    return data;
  },

  /**
   * GET /api/mercadopago/connect
   * (backend redireciona 302 para o OAuth do Mercado Pago)
   */
  connectOAuth: () => {
    // Se o axios já está configurado com baseURL, isso também funcionaria com window.location = "/api/mercadopago/connect"
    const base = String(import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");
    const origin = base || window.location.origin; // fallback bom pra dev
    window.location.href = `${origin}/api/mercadopago/connect`;
  },
};
