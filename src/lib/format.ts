import { UNIT_LABELS } from './catalogs'
import type { Movement, Product, StockStatusKey } from '../types'

export function clampNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.round(parsed * 100) / 100)
}

export function getStatus(product: Product): {
  key: StockStatusKey
  label: string
  rank: number
  color: string
} {
  const current = clampNumber(product.current_stock)
  const minimum = clampNumber(product.minimum_stock)
  const ideal = Math.max(1, clampNumber(product.ideal_stock, 1))

  if (current <= 0) return { key: 'out', label: 'Agotado', rank: 0, color: 'var(--red)' }
  if (current <= minimum) return { key: 'critical', label: 'Crítico', rank: 1, color: 'var(--orange)' }
  if (current < ideal) return { key: 'low', label: 'Stock bajo', rank: 2, color: 'var(--yellow)' }
  return { key: 'good', label: 'Suficiente', rank: 3, color: 'var(--green)' }
}

export function getProgress(product: Product): number {
  const ideal = Math.max(1, clampNumber(product.ideal_stock, 1))
  return Math.max(0, Math.min(100, Math.round((clampNumber(product.current_stock) / ideal) * 100)))
}

export function getUnitLabel(product: Product, quantity = product.current_stock): string {
  const labels = UNIT_LABELS[product.unit] ?? [product.unit || 'unidad', `${product.unit || 'unidad'}s`]
  return Math.abs(Number(quantity)) === 1 ? labels[0] : labels[1]
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-HN', { maximumFractionDigits: 2 }).format(Number(value) || 0)
}

export function formatDate(value: string | number | Date, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('es-HN', {
    day: '2-digit',
    month: 'short',
    ...options,
  }).format(new Date(value))
}

export function formatTime(value: string | number | Date): string {
  return new Intl.DateTimeFormat('es-HN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export function formatLongDate(date = new Date()): string {
  const raw = new Intl.DateTimeFormat('es-HN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export function suggestedPurchaseQuantity(product: Product): number {
  return Math.max(1, Math.round((product.ideal_stock - product.current_stock) * 100) / 100)
}

export function getCounts(products: Product[]) {
  const counts = { total: products.length, good: 0, low: 0, critical: 0, out: 0, urgent: 0 }
  products.forEach((product) => {
    const key = getStatus(product).key
    counts[key] += 1
    if (key === 'critical' || key === 'out') counts.urgent += 1
  })
  return counts
}

export function getShoppingProducts(products: Product[]): Product[] {
  return products
    .filter((product) => product.on_shopping_list || product.current_stock <= product.minimum_stock)
    .sort((a, b) => {
      const rank = getStatus(a).rank - getStatus(b).rank
      return rank === 0 ? a.name.localeCompare(b.name, 'es') : rank
    })
}

export function getSuggestions(products: Product[]): Product[] {
  return products
    .filter(
      (product) =>
        !product.on_shopping_list &&
        product.current_stock < product.ideal_stock &&
        product.current_stock > product.minimum_stock,
    )
    .sort((a, b) => getProgress(a) - getProgress(b))
}

export function movementLabel(movement: Movement): string {
  const labels: Record<Movement['type'], string> = {
    purchase: 'Compra registrada',
    consumption: 'Consumo registrado',
    adjustment: 'Ajuste de inventario',
    review: 'Revisión rápida',
    initial: 'Existencia inicial',
  }
  return labels[movement.type] ?? 'Movimiento'
}

export function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'HC'
}
