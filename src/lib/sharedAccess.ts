export function normalizeSharedUsername(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 20)
}

export function sharedAccessEmail(username: string): string {
  return `hc-${normalizeSharedUsername(username)}@access.hogar-control.invalid`
}

export function generateAccessKey(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = new Uint32Array(10)
  crypto.getRandomValues(bytes)
  const random = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('')
  return `Casa${random}7`
}

export function suggestUsername(displayName: string): string {
  const normalized = normalizeSharedUsername(displayName)
  if (normalized.length >= 3) return normalized
  return `miembro-${Math.floor(100 + Math.random() * 900)}`
}
