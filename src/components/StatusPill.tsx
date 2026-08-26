import { getStatus } from '../lib/format'
import type { Product } from '../types'

export function StatusPill({ product }: { product: Product }) {
  const status = getStatus(product)
  return <span className={`status-pill ${status.key}`}>{status.label}</span>
}
