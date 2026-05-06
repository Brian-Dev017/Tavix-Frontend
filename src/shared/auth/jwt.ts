export interface JwtPayload {
  exp?: number
  sub?: string
  rol?: string
  [key: string]: unknown
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return atob(padded)
}

export function decodeJwtPayload(token: string | null): JwtPayload | null {
  if (!token) return null

  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    return JSON.parse(decodeBase64Url(parts[1])) as JwtPayload
  } catch {
    return null
  }
}