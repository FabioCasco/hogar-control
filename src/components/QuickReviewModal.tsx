import { useEffect, useMemo, useState } from 'react'
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
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('all')

  useEffect(() => {
    if (!open) return
    setBusyId('')
    setReviewedIds(new Set())
    setSearch('')
    setLocation('all')
  }, [open])

  const locations = useMemo(() => {
    const map = new Map<string, string>()
    products.forEach((product) => {
      if (product.location_id) map.set(product.location_id, product.location?.name ?? 'Sin ubicación')
    })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [products])

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    return [...products]
      .filter((product) => location === 'all' || product.location_id === location)
      .filter((product) => !term || [product.name, product.brand, product.location?.name].filter(Boolean).some((value) => String(value).toLocaleLowerCase('es').includes(term)))
      .sort((a, b) => {
        const reviewedDifference = Number(reviewedIds.has(a.id)) - Number(reviewedIds.has(b.id))
        if (reviewedDifference) return reviewedDifference
        return getStatus(a).rank - getStatus(b).rank || a.name.localeCompare(b.name, 'es')
      })
  }, [location, products, reviewedIds, search])

  const reviewableCount = products.filter((product) => location === 'all' || product.location_id === location).length
  const reviewedCount = products.filter((product) => reviewedIds.has(product.id) && (location === 'all' || product.location_id === location)).length
  const progress = reviewableCount ? Math.round((reviewedCount / reviewableCount) * 100) : 0

  if (!open) return null

  async function setLevel(product: Product, level: 'available' | 'low' | 'out') {
    setBusyId(product.id)
    try {
      await onSetLevel(product, level)
      setReviewedIds((current) => new Set(current).add(product.id))
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyId) onClose() }}>
      <section className="modal-card review-modal" role="dialog" aria-modal="true" aria-labelledby="quick-review-title">
        <div className="modal-header">
          <div><span className="eyebrow">Control simplificado</span><h2 id="quick-review-title">Revisión rápida</h2><p>Recorre la casa y marca el nivel observado sin escribir cantidades.</p></div>
          <button className="icon-button" type="button" onClick={onClose} disabled={Boolean(busyId)} aria-label="Cerrar">×</button>
        </div>

        <div className="review-progress-card">
          <div><strong>{reviewedCount} de {reviewableCount} revisados</strong><span>{location === 'all' ? 'Todos los espacios del hogar' : locations.find(([id]) => id === location)?.[1]}</span></div>
          <span>{progress}%</span>
          <div className="stock-progress"><span style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="review-toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto" /></label>
          <select className="filter-select" value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Filtrar por ubicación">
            <option value="all">Todas las ubicaciones</option>
            {locations.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
          </select>
        </div>

        <div className="quick-review-list">
          {visibleProducts.length ? visibleProducts.map((product) => {
            const status = getStatus(product)
            const reviewed = reviewedIds.has(product.id)
            return (
              <div className={`quick-review-item ${reviewed ? 'reviewed' : ''}`} key={product.id}>
                <ProductVisual product={product} />
                <div className="quick-review-copy"><strong>{product.name}</strong><span>{formatNumber(product.current_stock)} {getUnitLabel(product)} · {product.location?.name ?? 'Sin ubicación'} · {status.label}</span></div>
                {reviewed && <span className="reviewed-badge">✓ Revisado</span>}
                <div className="quick-review-controls">
                  <button className={`quick-stock-button good ${reviewed && status.key === 'good' ? 'active' : ''}`} type="button" disabled={busyId === product.id} onClick={() => void setLevel(product, 'available')}>Hay</button>
                  <button className={`quick-stock-button low ${reviewed && ['low', 'critical'].includes(status.key) ? 'active' : ''}`} type="button" disabled={busyId === product.id} onClick={() => void setLevel(product, 'low')}>Poco</button>
                  <button className={`quick-stock-button out ${reviewed && status.key === 'out' ? 'active' : ''}`} type="button" disabled={busyId === product.id} onClick={() => void setLevel(product, 'out')}>No hay</button>
                </div>
              </div>
            )
          }) : <div className="settings-empty-note">No hay productos para esta búsqueda o ubicación.</div>}
        </div>

        <div className="modal-actions review-modal-actions"><span>{reviewedCount < reviewableCount ? `${reviewableCount - reviewedCount} pendientes` : 'Revisión completada'}</span><button className="primary-button" type="button" onClick={onClose} disabled={Boolean(busyId)}>Finalizar revisión</button></div>
      </section>
    </div>
  )
}
