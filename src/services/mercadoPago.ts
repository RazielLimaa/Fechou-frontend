import { api } from "./api";

export interface MercadoPagoStatusResponse {
  connected: boolean;
  authMethod: "oauth" | "api_key" | null;
  mpUserId: string | null;
  expiresAt: string | null;
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

export const mercadoPagoService = {
  /**
   * GET /api/mercadopago/status
   */
  getStatus: async (): Promise<MercadoPagoStatusResponse> => {
    const { data } = await api.get<MercadoPagoStatusResponse>("/api/mercadopago/status");
    return data;
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
