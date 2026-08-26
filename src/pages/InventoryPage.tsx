import { useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { ProductVisual } from '../components/ProductVisual'
import { StatusPill } from '../components/StatusPill'
import { formatNumber, getProgress, getStatus, getUnitLabel } from '../lib/format'
import type { Category, Product } from '../types'

interface Props {
  products: Product[]
  categories: Category[]
  canManageProducts: boolean
  canArchiveProducts: boolean
  onAddProduct(): void
  onEditProduct(product: Product): void
  onArchiveProduct(product: Product): Promise<void>
  onAdjustStock(productId: string, delta: number): Promise<void>
  onToggleShopping(product: Product): Promise<void>
}

export function InventoryPage({
  products,
  categories,
  canManageProducts,
  canArchiveProducts,
  onAddProduct,
  onEditProduct,
  onArchiveProduct,
  onAdjustStock,
  onToggleShopping,
}: Props) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    return products.filter((product) => {
      const matchesTerm = !term || [product.name, product.brand, product.presentation, product.location?.name]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('es').includes(term))
      const matchesCategory = category === 'all' || product.category_id === category
      const matchesStatus = status === 'all' || getStatus(product).key === status
      return matchesTerm && matchesCategory && matchesStatus
    })
  }, [category, products, search, status])

  return (
    <div className="content-stack">
      <section className="toolbar">
        <label className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto, marca o ubicación" /></label>
        <select className="filter-select" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filtrar por categoría">
          <option value="all">Todas las categorías</option>
          {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="filter-select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por nivel">
          <option value="all">Todos los niveles</option>
          <option value="out">Agotados</option>
          <option value="critical">Críticos</option>
          <option value="low">Nivel bajo</option>
          <option value="good">Suficientes</option>
        </select>
        <span className="toolbar-count">{filtered.length} de {products.length}</span>
      </section>

      {filtered.length ? (
        <section className="inventory-grid">
          {filtered.map((product) => {
            const statusInfo = getStatus(product)
            return (
              <article className="product-card" key={product.id}>
                <div className="product-card-top">
                  <ProductVisual product={product} large />
                  <div className="product-card-copy">
                    <div className="product-card-title-row"><h3>{product.name}</h3><StatusPill product={product} /></div>
                    <p>{[product.brand, product.presentation].filter(Boolean).join(' · ') || 'Sin detalle de presentación'}</p>
                  </div>
                  {canManageProducts && <button className="icon-button small" type="button" aria-label={`Editar ${product.name}`} onClick={() => onEditProduct(product)}>✎</button>}
                </div>

                <div className="product-meta-row">
                  <span className="category-chip">{product.category?.icon ?? '📦'} {product.category?.name ?? 'Otros'}</span>
                  <span className="location-chip">⌂ {product.location?.name ?? 'Sin ubicación'}</span>
                </div>

                <div className="product-stock-block">
                  <div className="stock-number-row">
                    <div className="stock-number"><strong>{formatNumber(product.current_stock)}</strong><span>{getUnitLabel(product)}</span></div>
                    <span className="stock-target">mín. {formatNumber(product.minimum_stock)} · ideal {formatNumber(product.ideal_stock)}</span>
                  </div>
                  <div className="stock-progress"><span style={{ width: `${getProgress(product)}%`, background: statusInfo.color }} /></div>
                  <div className="stock-legend-row"><span>{statusInfo.label}</span><span>{Math.round(getProgress(product))}% del ideal</span></div>
                </div>

                <div className="product-card-actions">
                  <button className="stock-action-button" type="button" onClick={() => void onAdjustStock(product.id, -1)} disabled={product.current_stock <= 0}><strong>−</strong><span>Consumir</span></button>
                  <div className="stock-action-label"><strong>{formatNumber(product.current_stock)}</strong><span>existencia actual</span></div>
                  <button className="stock-action-button" type="button" onClick={() => void onAdjustStock(product.id, 1)}><strong>+</strong><span>Agregar</span></button>
                </div>

                <div className="card-footer-actions">
                  {canManageProducts && (
                    <button className="text-button" type="button" onClick={() => void onToggleShopping(product)}>
                      {product.on_shopping_list || product.current_stock <= product.minimum_stock ? 'Gestionar compra' : 'Agregar a compras'}
                    </button>
                  )}
                  {canArchiveProducts && <button className="text-button danger-text" type="button" onClick={() => void onArchiveProduct(product)}>Archivar</button>}
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <section className="panel"><EmptyState icon="⌕" title="No encontramos productos" copy="Prueba otro término o cambia los filtros." action={canManageProducts ? <button className="primary-button" type="button" onClick={onAddProduct}>Agregar producto</button> : undefined} /></section>
      )}
    </div>
  )
}
