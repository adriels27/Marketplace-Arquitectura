const ALLOWED_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
]);

const LOCAL_PART_ALLOWED_REGEX = /^[a-z0-9._-]+$/;
const ASCII_PRINTABLE_REGEX = /^[\x21-\x7E]+$/;

export interface EmailValidationResult {
  valid: boolean;
  error?: string;
  normalizedEmail?: string;
}

/**
 * Normaliza un correo electrónico:
 * - Elimina espacios en blanco al inicio y al final.
 * - Convierte todo a minúsculas.
 * - Para dominios de Gmail (gmail.com, googlemail.com), elimina los puntos en la parte local
 *   para evitar la creación de cuentas duplicadas con el mismo buzón.
 */
export function normalizeAccountEmail(email: string): string {
  const cleaned = email.trim().toLowerCase();
  const [localPart, domain, ...extraParts] = cleaned.split("@");
  if (!localPart || !domain || extraParts.length > 0) return cleaned;

  if (domain === "gmail.com" || domain === "googlemail.com") {
    const cleanLocal = localPart.replace(/\./g, "");
    return `${cleanLocal}@gmail.com`;
  }

  return `${localPart}@${domain}`;
}

/**
 * Valida un correo electrónico con las siguientes comprobaciones:
 * 1. Validación de caracteres ASCII (Punto 6): Bloquea tildes, alfabetos no latinos, homógrafos y caracteres invisibles.
 * 2. Restricción de caracteres especiales (Punto 1): Solo permite letras, números, puntos (.), guiones (-) y guiones bajos (_).
 * 3. Validación de dominios permitidos (Gmail, Hotmail, Outlook, Yahoo).
 * 4. Validación de normalización (Punto 5): Asegura que tras la normalización la parte local siga siendo válida.
 */
export function validateAccountEmail(email: string): EmailValidationResult {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Ingresa un correo electrónico." };
  }

  const trimmed = email.trim();

  // Punto 6: Bloqueo estricto de caracteres no ASCII (tildes, homógrafos, caracteres invisibles, etc.)
  if (!ASCII_PRINTABLE_REGEX.test(trimmed) || /[^\x00-\x7F]/.test(trimmed)) {
    return {
      valid: false,
      error: "El correo no puede contener tildes ni caracteres especiales no ASCII.",
    };
  }

  const parts = trimmed.split("@");
  if (parts.length !== 2) {
    return {
      valid: false,
      error: "El formato del correo debe contener exactamente un '@'.",
    };
  }

  const [rawLocalPart, rawDomain] = parts;
  const localPart = rawLocalPart.toLowerCase();
  const domain = rawDomain.toLowerCase();

  if (!localPart || !domain) {
    return { valid: false, error: "Completa el correo electrónico." };
  }

  // Punto 1: Permitir únicamente letras, números, puntos (.), guiones (-) y guiones bajos (_)
  if (!LOCAL_PART_ALLOWED_REGEX.test(localPart)) {
    return {
      valid: false,
      error: "El correo solo puede contener letras, números, puntos (.), guiones (-) y guiones bajos (_).",
    };
  }

  // Requiere al menos un carácter alfanumérico en el usuario
  if (!/[a-z0-9]/.test(localPart)) {
    return {
      valid: false,
      error: "El correo debe incluir al menos una letra o número.",
    };
  }

  // Dominio permitido
  if (!ALLOWED_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      error: "Usa un correo de Gmail, Hotmail, Outlook o Yahoo.",
    };
  }

  // Normalización
  const normalized = normalizeAccountEmail(trimmed);
  const normalizedLocal = normalized.split("@")[0];
  if (!normalizedLocal) {
    return {
      valid: false,
      error: "El correo no es válido tras la normalización.",
    };
  }

  return { valid: true, normalizedEmail: normalized };
}

export function isAllowedAccountEmail(email: string): boolean {
  return validateAccountEmail(email).valid;
}
