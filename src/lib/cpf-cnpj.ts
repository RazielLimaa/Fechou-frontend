const DOCUMENT_ALLOWED_CHARS = /^[\d.\-/\s]+$/;

export type BrazilianDocumentKind = "cpf" | "cnpj";

export function onlyDocumentDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function hasOnlyDocumentChars(value: string): boolean {
  return DOCUMENT_ALLOWED_CHARS.test(value.trim());
}

function isRepeatedDigits(digits: string): boolean {
  return /^(\d)\1+$/.test(digits);
}

function validateCpfDigits(digits: string): boolean {
  if (digits.length !== 11 || isRepeatedDigits(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(digits[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (check !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(digits[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;

  return check === Number(digits[10]);
}

function validateCnpjDigits(digits: string): boolean {
  if (digits.length !== 14 || isRepeatedDigits(digits)) return false;

  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondWeights = [6, ...firstWeights];

  const calc = (weights: number[]) => {
    const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calc(firstWeights) === Number(digits[12]) && calc(secondWeights) === Number(digits[13]);
}

export function isValidCpf(value: string): boolean {
  const trimmed = value.trim();
  return Boolean(trimmed) && hasOnlyDocumentChars(trimmed) && validateCpfDigits(onlyDocumentDigits(trimmed));
}

export function isValidCnpj(value: string): boolean {
  const trimmed = value.trim();
  return Boolean(trimmed) && hasOnlyDocumentChars(trimmed) && validateCnpjDigits(onlyDocumentDigits(trimmed));
}

export function isValidCpfOrCnpj(value: string): boolean {
  return isValidCpf(value) || isValidCnpj(value);
}

export function getCpfCnpjValidationMessage(value: string, label = "CPF/CNPJ"): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} e obrigatorio.`;
  if (!hasOnlyDocumentChars(trimmed)) return `${label} deve conter apenas numeros, pontos, barra, hifen e espacos.`;

  const digits = onlyDocumentDigits(trimmed);
  if (digits.length !== 11 && digits.length !== 14) return `${label} deve ter 11 digitos para CPF ou 14 para CNPJ.`;
  if (isRepeatedDigits(digits)) return `${label} invalido. Sequencias repetidas nao sao aceitas.`;
  if (digits.length === 11 && !validateCpfDigits(digits)) return "CPF invalido. Confira os digitos verificadores.";
  if (digits.length === 14 && !validateCnpjDigits(digits)) return "CNPJ invalido. Confira os digitos verificadores.";

  return null;
}

export function normalizeCpfCnpjDigits(value: string, label = "CPF/CNPJ"): string {
  const error = getCpfCnpjValidationMessage(value, label);
  if (error) throw new Error(error);
  return onlyDocumentDigits(value);
}

export function normalizeCpfCnpjForSubmit(value: string, label = "CPF/CNPJ", digitsOnly = false): string {
  const error = getCpfCnpjValidationMessage(value, label);
  if (error) throw new Error(error);
  return digitsOnly ? onlyDocumentDigits(value) : value.trim();
}
