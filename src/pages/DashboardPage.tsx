import { EmptyState } from '../components/EmptyState'
import { ProductVisual } from '../components/ProductVisual'
import { StatCard } from '../components/StatCard'
import { StatusPill } from '../components/StatusPill'
import {
  formatDate,
  formatLongDate,
  formatNumber,
  formatTime,
  getCounts,
  getProgress,
  getShoppingProducts,
  getStatus,
  getUnitLabel,
  movementLabel,
  suggestedPurchaseQuantity,
} from '../lib/format'
import type { Category, Household, Movement, Product } from '../types'

interface Props {
  household: Household
  products: Product[]
  categories: Category[]
  movements: Movement[]
  onOpenShopping(): void
  onOpenInventory(): void
  onQuickReview(): void
  onAdjustStock(productId: string, delta: number): Promise<void>
}

export function DashboardPage({
  household,
  products,
  categories,
  movements,
  onOpenShopping,
  onOpenInventory,
  onQuickReview,
  onAdjustStock,
}: Props) {
  const counts = getCounts(products)
  const shopping = getShoppingProducts(products)
  const urgent = [...products]
    .filter((product) => ['out', 'critical'].includes(getStatus(product).key))
    .sort((a, b) => getStatus(a).rank - getStatus(b).rank || a.name.localeCompare(b.name, 'es'))
    .slice(0, 6)
  const idealPercentage = counts.total ? Math.round((counts.good / counts.total) * 100) : 100

  return (
    <div className="content-stack">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="hero-kicker">{formatLongDate()} · {household.name}</span>
          <h2>{counts.urgent ? `${counts.urgent} productos necesitan atención.` : 'El inventario está bajo control.'}</h2>
          <p>{counts.urgent ? 'Los faltantes ya están organizados para convertirlos en una compra concreta.' : 'No hay productos agotados ni en nivel crítico. Mantén las existencias al día con cambios rápidos.'}</p>
          <div className="hero-actions">
            <button className="primary-button inverse" type="button" onClick={onOpenShopping}>Ver lista de compras</button>
            <button className="secondary-button inverse" type="button" onClick={onQuickReview}>Revisión rápida</button>
          </div>
        </div>
        <div className="hero-status">
          <div className="hero-score-row">
            <div className="hero-score"><strong>{idealPercentage}%</strong><span>del inventario en nivel ideal</span></div>
            <span className={`status-pill ${counts.urgent ? 'critical' : 'good'}`}>{counts.urgent ? 'Requiere atención' : 'Todo estable'}</span>
          </div>
          <div className="stock-progress"><span style={{ width: `${idealPercentage}%` }} /></div>
          <div className="hero-mini-status">
            <div className="hero-mini-status-row"><span>Productos registrados</span><strong>{counts.total}</strong></div>
            <div className="hero-mini-status-row"><span>En lista de compras</span><strong>{shopping.length}</strong></div>
            <div className="hero-mini-status-row"><span>Última actualización</span><strong>{movements[0] ? formatDate(movements[0].created_at) : 'Sin datos'}</strong></div>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard tone="total" icon="▦" label="Productos" value={counts.total} detail="Inventario activo" />
        <StatCard tone="good" icon="✓" label="Suficientes" value={counts.good} detail="En nivel ideal" />
        <StatCard tone="low" icon="◔" label="Nivel bajo" value={counts.low} detail="Conviene vigilar" />
        <StatCard tone="urgent" icon="!" label="Urgentes" value={counts.urgent} detail="Críticos o agotados" />
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-header">
            <div><h2 className="section-title"><span className="section-title-dot" />Atención prioritaria</h2><p>Productos agotados o iguales a su stock mínimo.</p></div>
            <button className="text-button" type="button" onClick={onOpenInventory}>Ver inventario</button>
          </div>
          <div className="urgent-list">
            {urgent.length ? urgent.map((product) => (
              <div className="urgent-row shared" key={product.id}>
                <ProductVisual product={product} />
                <div className="urgent-info">
                  <strong>{product.name}</strong>
                  <span>{formatNumber(product.current_stock)} {getUnitLabel(product)} · mínimo {formatNumber(product.minimum_stock)}</span>
                  <div className="stock-progress"><span style={{ width: `${getProgress(product)}%`, background: getStatus(product).color }} /></div>
                </div>
                <StatusPill product={product} />
                <div className="inline-stock-actions" aria-label={`Actualizar ${product.name}`}>
                  <button type="button" onClick={() => void onAdjustStock(product.id, -1)} disabled={product.current_stock <= 0}>−</button>
                  <button type="button" onClick={() => void onAdjustStock(product.id, 1)}>＋</button>
                </div>
              </div>
            )) : <EmptyState icon="✓" title="Sin urgencias" copy="Ningún producto está agotado o en nivel crítico." />}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div><h2>Lista de compras</h2><p>Cantidades sugeridas para recuperar el stock ideal.</p></div>
            <button className="text-button" type="button" onClick={onOpenShopping}>Abrir</button>
          </div>
          <div className="shopping-mini-list">
            {shopping.length ? shopping.slice(0, 6).map((product) => (
              <div className="shopping-mini-row" key={product.id}>
                <ProductVisual product={product} />
                <div className="shopping-mini-copy"><strong>{product.name}</strong><span>{product.location?.name ?? 'Sin ubicación'}</span></div>
                <span className="shopping-mini-qty">+{formatNumber(suggestedPurchaseQuantity(product))} {getUnitLabel(product, suggestedPurchaseQuantity(product))}</span>
              </div>
            )) : <EmptyState icon="🛒" title="Lista vacía" copy="No hay productos que requieran reposición." />}
          </div>
        </article>
      </section>

      <section className="dashboard-grid equal">
        <article className="panel">
          <div className="panel-header"><div><h2>Inventario por categoría</h2><p>Distribución y alertas dentro del hogar.</p></div></div>
          <div className="category-list">
            {categories.map((category) => {
              const items = products.filter((product) => product.category_id === category.id)
              if (!items.length) return null
              const urgentCount = items.filter((product) => ['out', 'critical'].includes(getStatus(product).key)).length
              return (
                <div className="category-row" key={category.id}>
                  <div className="category-icon">{category.icon}</div>
                  <div className="category-copy"><strong>{category.name}</strong><span>{urgentCount ? `${urgentCount} en nivel urgente` : 'Sin alertas críticas'}</span></div>
                  <span className="category-count">{items.length}</span>
                </div>
              )
            })}
            {!products.length && <EmptyState icon="▦" title="Inventario vacío" copy="Agrega el primer producto para comenzar." />}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header"><div><h2>Movimientos recientes</h2><p>Últimos cambios realizados por los miembros.</p></div></div>
          <div className="movement-list">
            {movements.length ? movements.slice(0, 7).map((movement) => (
              <div className="movement-row" key={movement.id}>
                <div className={`movement-icon ${movement.delta < 0 ? 'negative' : ''}`}>{movement.delta >= 0 ? '+' : '−'}</div>
                <div className="movement-copy"><strong>{movement.product_name}</strong><span>{movementLabel(movement)} · {movement.actor_name ?? 'Usuario'}</span></div>
                <div className="movement-time">
                  <strong className={movement.delta >= 0 ? 'positive' : 'negative'}>{movement.delta > 0 ? '+' : ''}{formatNumber(movement.delta)}</strong>
                  <time dateTime={movement.created_at}>{formatDate(movement.created_at)} · {formatTime(movement.created_at)}</time>
                </div>
              </div>
            )) : <EmptyState icon="↺" title="Sin movimientos" copy="Los cambios de inventario aparecerán aquí." />}
          </div>
        </article>
      </section>
    </div>
  )
}
