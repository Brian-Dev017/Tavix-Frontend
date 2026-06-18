export function cleanText(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function onlyDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function required(value: unknown, label: string): string | null {
  return cleanText(value) ? null : `${label} es obligatorio`;
}

export function maxLength(
  value: unknown,
  label: string,
  max: number,
): string | null {
  return cleanText(value).length <= max
    ? null
    : `${label} no debe superar ${max} caracteres`;
}

export function minLength(
  value: unknown,
  label: string,
  min: number,
): string | null {
  return cleanText(value).length >= min
    ? null
    : `${label} debe tener al menos ${min} caracteres`;
}

export function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): string | null {
  return allowed.includes(value as T) ? null : `${label} no es válido`;
}

export function numberRange(
  value: unknown,
  label: string,
  min: number,
  max: number,
): string | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return `${label} debe ser un número válido`;
  if (n < min || n > max) return `${label} debe estar entre ${min} y ${max}`;
  return null;
}

export function money(value: unknown, label: string): string | null {
  const rangeError = numberRange(value, label, 0, 999999);
  if (rangeError) return rangeError;
  return hasAtMostTwoDecimals(value)
    ? null
    : `${label} debe tener como máximo dos decimales`;
}

export function hasAtMostTwoDecimals(value: unknown): boolean {
  const number = Number(value);
  if (!Number.isFinite(number)) return false;
  const scaled = number * 100;
  return Math.abs(scaled - Math.round(scaled)) < 1e-8;
}

export function nameText(value: unknown, label: string): string | null {
  const text = cleanText(value);
  if (!text) return `${label} es obligatorio`;
  if (text.length > 80) return `${label} no debe superar 80 caracteres`;
  return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .,'-]+$/.test(text)
    ? null
    : `${label} contiene caracteres no permitidos`;
}

export function personNameText(value: unknown, label: string): string | null {
  const text = cleanText(value);
  if (!text) return `${label} es obligatorio`;
  if (text.length > 80) return `${label} no debe superar 80 caracteres`;
  return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/.test(text)
    ? null
    : `${label} solo debe contener letras`;
}

export function username(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return "Usuario es obligatorio";
  if (!/^[A-Za-z0-9._-]{3,30}$/.test(text)) {
    return "Usuario debe tener 3 a 30 caracteres: letras, números, punto, guion o guion bajo";
  }
  return null;
}

export function password(value: unknown, label = "Contraseña"): string | null {
  const text = String(value ?? "");
  if (!text) return `${label} es obligatoria`;
  if (text.length < 6) return `${label} debe tener al menos 6 caracteres`;
  if (text.length > 72) return `${label} no debe superar 72 caracteres`;
  return null;
}

export function ruc(value: unknown, label = "RUC"): string | null {
  const digits = onlyDigits(value);
  return digits.length === 11 ? null : `${label} debe tener 11 dígitos`;
}

export function dni(value: unknown, label = "DNI"): string | null {
  const digits = onlyDigits(value);
  return digits.length === 8 ? null : `${label} debe tener 8 dígitos`;
}

export function email(value: unknown, label = "Correo"): string | null {
  const text = cleanText(value);
  if (!text) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text)
    ? null
    : `${label} no tiene un formato válido`;
}

export function phone(value: unknown, label = "Teléfono"): string | null {
  const text = cleanText(value);
  if (!text) return null;
  return /^\+?[0-9 ()-]{6,20}$/.test(text)
    ? null
    : `${label} no tiene un formato válido`;
}

export function httpUrl(value: unknown, label = "URL"): string | null {
  const text = cleanText(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:"
      ? null
      : `${label} debe iniciar con http:// o https://`;
  } catch {
    return `${label} no tiene un formato válido`;
  }
}

export function host(value: unknown, label = "Host"): string | null {
  const text = cleanText(value);
  if (!text) return null;
  const ipv4 =
    /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  const hostname =
    /^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return ipv4.test(text) || hostname.test(text)
    ? null
    : `${label} debe ser una IP o nombre de equipo válido`;
}

export function firstError(
  checks: Array<string | null | false | undefined>,
): string | null {
  return checks.find((check): check is string => typeof check === "string") ?? null;
}
