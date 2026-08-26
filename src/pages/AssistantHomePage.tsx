import { EmptyState } from '../components/EmptyState'
import { ProductVisual } from '../components/ProductVisual'
import { StatusPill } from '../components/StatusPill'
import { formatNumber, getCounts, getStatus, getUnitLabel } from '../lib/format'
import type { Product } from '../types'

interface Props {
  products: Product[]
  onStartReview(): void
  onOpenInventory(): void
  onOpenShopping(): void
}

export function AssistantHomePage({ products, onStartReview, onOpenInventory, onOpenShopping }: Props) {
  const counts = getCounts(products)
  const pending = products.filter((product) => !product.stock_verified_at)
  const urgent = [...products]
    .filter((product) => ['out', 'critical'].includes(getStatus(product).key))
    .sort((a, b) => getStatus(a).rank - getStatus(b).rank || a.name.localeCompare(b.name, 'es'))
    .slice(0, 8)

  return (
    <div className="content-stack assistant-home">
      <section className="assistant-hero">
        <div className="assistant-hero-copy">
          <span className="eyebrow light">Tarea principal</span>
          <h2>Revisa lo que hay en casa.</h2>
          <p>Marca cada producto como Hay, Poco o No hay. La lista de compras se actualizará automáticamente.</p>
          <div className="hero-actions">
            <button className="primary-button inverse" type="button" onClick={onStartReview}>Iniciar revisión</button>
            <button className="secondary-button inverse" type="button" onClick={onOpenInventory}>Ver existencias</button>
          </div>
        </div>
        <div className="assistant-task-score">
          <strong>{pending.length}</strong>
          <span>productos sin revisión reciente</span>
          <div className="assistant-task-mini"><span>Urgentes</span><b>{counts.urgent}</b></div>
          <div className="assistant-task-mini"><span>Total</span><b>{counts.total}</b></div>
        </div>
      </section>

      <section className="assistant-shortcuts">
        <button className="assistant-shortcut-card" type="button" onClick={onStartReview}><span>✓</span><strong>Revisión rápida</strong><small>Recorre la casa por ubicación.</small></button>
        <button className="assistant-shortcut-card" type="button" onClick={onOpenInventory}><span>▦</span><strong>Existencias</strong><small>Corrige cantidades puntuales.</small></button>
        <button className="assistant-shortcut-card" type="button" onClick={onOpenShopping}><span>🛒</span><strong>Compras</strong><small>Registra lo que se repuso.</small></button>
      </section>

      <section className="panel">
        <div className="panel-header"><div><h2>Prioridad de hoy</h2><p>Productos agotados o en nivel crítico.</p></div><button className="text-button" type="button" onClick={onOpenShopping}>Ver compras</button></div>
        <div className="assistant-urgent-list">
          {urgent.length ? urgent.map((product) => (
            <div className="assistant-urgent-row" key={product.id}>
              <ProductVisual product={product} />
              <div><strong>{product.name}</strong><span>{formatNumber(product.current_stock)} {getUnitLabel(product)} · {product.location?.name ?? 'Sin ubicación'}</span></div>
              <StatusPill product={product} />
            </div>
          )) : <EmptyState icon="✓" title="Sin urgencias" copy="No hay productos agotados ni en nivel crítico." />}
        </div>
      </section>
    </div>
  )
}
