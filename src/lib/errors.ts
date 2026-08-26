export function errorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (error instanceof Error && error.message.trim()) return humanizeError(error.message)
  if (typeof error === 'string' && error.trim()) return humanizeError(error)
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '').trim()
    if (message) return humanizeError(message)
  }
  return fallback
}

function humanizeError(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login credentials')) return 'El correo o la contraseña no son correctos.'
  if (normalized.includes('email not confirmed')) return 'Debes confirmar el correo antes de iniciar sesión.'
  if (normalized.includes('user already registered')) return 'Ese correo ya tiene una cuenta.'
  if (normalized.includes('password should be at least')) return 'La contraseña debe tener al menos 8 caracteres.'
  if (normalized.includes('failed to fetch') || normalized.includes('network')) return 'No fue posible conectar con el servicio. Revisa la conexión a internet.'
  if (normalized.includes('row-level security')) return 'Tu usuario no tiene permiso para realizar esta acción.'
  return message
}
