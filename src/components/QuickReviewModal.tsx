import { useState } from 'react'
import { formatNumber, getStatus, getUnitLabel } from '../lib/format'
import type { Product } from '../types'
import { ProductVisual } from './ProductVisual'

interface Props {
  open: boolean
  products: Product[]
  onSetLevel(product: Product, level: 'available' | 'low' | 'out'): Promise<void>
  onClose(): void
}

export function QuickReviewModal({ open, products, onSetLevel, onClose }: Props) {
  const [busyId, setBusyId] = useState('')
  if (!open) return null

  const prioritized = [...products]
    .sort((a, b) => getStatus(a).rank - getStatus(b).rank || a.name.localeCompare(b.name, 'es'))
    .slice(0, 20)

  async function setLevel(product: Product, level: 'available' | 'low' | 'out') {
    setBusyId(product.id)
    try {
      await onSetLevel(product, level)
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyId) onClose() }}>
      <section className="modal-card review-modal" role="dialog" aria-modal="true" aria-labelledby="quick-review-title">
        <div className="modal-header"><div><span className="eyebrow">Control simplificado</span><h2 id="quick-review-title">Revisión rápida</h2><p>Marca el nivel observado sin escribir cantidades.</p></div><button className="icon-button" type="button" onClick={onClose} disabled={Boolean(busyId)} aria-label="Cerrar">×</button></div>
        <div className="quick-review-list">
          {prioritized.map((product) => {
            const status = getStatus(product)
            return (
              <div className="quick-review-item" key={product.id}>
                <ProductVisual product={product} />
                <div className="quick-review-copy"><strong>{product.name}</strong><span>{formatNumber(product.current_stock)} {getUnitLabel(product)} · {status.label}</span></div>
                <div className="quick-review-controls">
                  <button className={`quick-stock-button ${status.key === 'good' ? 'active' : ''}`} type="button" disabled={busyId === product.id} onClick={() => void setLevel(product, 'available')}>Hay</button>
                  <button className={`quick-stock-button ${['low', 'critical'].includes(status.key) ? 'active' : ''}`} type="button" disabled={busyId === product.id} onClick={() => void setLevel(product, 'low')}>Poco</button>
                  <button className={`quick-stock-button ${status.key === 'out' ? 'active' : ''}`} type="button" disabled={busyId === product.id} onClick={() => void setLevel(product, 'out')}>No hay</button>
                </div>
              </div>
            )
          })}
        </div>
        <div className="modal-actions"><button className="primary-button" type="button" onClick={onClose} disabled={Boolean(busyId)}>Finalizar revisión</button></div>
      </section>
    </div>
  )
}
