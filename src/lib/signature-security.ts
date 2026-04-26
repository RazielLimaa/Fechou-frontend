import { normalizeCpfCnpjDigits } from "./cpf-cnpj";

const MAX_SIGNATURE_BYTES = 1_500_000;

export function validateSignerName(name: string): string {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 2 || clean.length > 200) throw new Error("Nome do assinante invalido.");
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s.'-]+$/.test(clean)) throw new Error("Nome do assinante invalido.");
  return clean;
}

export function normalizeSignerDocument(document: string): string {
  return normalizeCpfCnpjDigits(document, "Documento do assinante");
}

export function validateSignatureDataUrl(signatureDataUrl: string): string {
  const value = signatureDataUrl.trim();
  if (!value) throw new Error("Assinatura nao informada.");
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=\s]+$/i.test(value)) {
    throw new Error("Formato de assinatura invalido.");
  }

  const base64Payload = value.split(",", 2)[1] ?? "";
  const sanitized = base64Payload.replace(/\s+/g, "");
  const bytes = Math.floor((sanitized.length * 3) / 4);
  if (bytes <= 0 || bytes > MAX_SIGNATURE_BYTES) {
    throw new Error("Assinatura muito grande.");
  }

  const pngHeader = atob(sanitized.slice(0, 24));
  const isPng = pngHeader.charCodeAt(0) === 0x89 && pngHeader.charCodeAt(1) === 0x50 && pngHeader.charCodeAt(2) === 0x4e && pngHeader.charCodeAt(3) === 0x47;
  if (!isPng) throw new Error("Formato de assinatura invalido.");

  return `data:image/png;base64,${sanitized}`;
}
