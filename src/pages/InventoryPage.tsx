import { useMemo, useState } from 'react'
import { BasicCatalogModal } from '../components/BasicCatalogModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { ProductVisual } from '../components/ProductVisual'
import { StatusPill } from '../components/StatusPill'
import { formatNumber, getProgress, getStatus, getUnitLabel } from '../lib/format'
import type { Category, Product } from '../types'

interface Props {
  products: Product[]
  categories: Category[]
  canManageProducts: boolean
  canDeleteProducts: boolean
  onAddProduct(): void
  onEditProduct(product: Product): void
  onDeleteProduct(product: Product): Promise<void>
  onDeleteAll(): Promise<void>
  onAddBasicCatalog(categories: string[]): Promise<void>
  onAdjustStock(productId: string, delta: number): Promise<void>
  onToggleShopping(product: Product): Promise<void>
}

export function InventoryPage({
  products,
  categories,
  canManageProducts,
  canDeleteProducts,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onDeleteAll,
  onAddBasicCatalog,
  onAdjustStock,
  onToggleShopping,
}: Props) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [grouped, setGrouped] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    return products.filter((product) => {
      const matchesTerm = !term || [product.name, product.brand, product.presentation, product.location?.name, product.category?.name]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('es').includes(term))
      const matchesCategory = category === 'all' || product.category_id === category
      const matchesStatus = status === 'all' || getStatus(product).key === status
      return matchesTerm && matchesCategory && matchesStatus
    })
  }, [category, products, search, status])

  const groupedProducts = useMemo(() => {
    const result = categories
      .map((item) => ({ category: item, products: filtered.filter((product) => product.category_id === item.id) }))
      .filter((group) => group.products.length)
    const uncategorized = filtered.filter((product) => !categories.some((item) => item.id === product.category_id))
    if (uncategorized.length) result.push({ category: { id: 'other', household_id: '', name: 'Otros', icon: '📦', sort_order: 999, active: true }, products: uncategorized })
    return result
  }, [categories, filtered])

  async function confirmDeleteProduct() {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await onDeleteProduct(deleteTarget)
      setDeleteTarget(null)
    } finally {
      setBusy(false)
    }
  }

  async function confirmDeleteAll() {
    setBusy(true)
    try {
      await onDeleteAll()
      setDeleteAllOpen(false)
    } finally {
      setBusy(false)
    }
  }

  async function addCatalog(selectedCategories: string[]) {
    setBusy(true)
    try {
      await onAddBasicCatalog(selectedCategories)
      setCatalogOpen(false)
    } finally {
      setBusy(false)
    }
  }

  function renderProduct(product: Product) {
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

        <div className="product-card-actions" aria-label={`Cambiar existencia de ${product.name}`}>
          <button className="stock-stepper-button" type="button" onClick={() => void onAdjustStock(product.id, -1)} disabled={product.current_stock <= 0} aria-label={`Consumir una unidad de ${product.name}`}>−1</button>
          <div className="stock-action-label"><strong>{formatNumber(product.current_stock)}</strong><span>existencia actual</span></div>
          <button className="stock-stepper-button" type="button" onClick={() => void onAdjustStock(product.id, 1)} aria-label={`Reponer una unidad de ${product.name}`}>+1</button>
        </div>

        <div className="card-footer-actions">
          {canManageProducts ? (
            <button className="text-button card-primary-action" type="button" onClick={() => void onToggleShopping(product)}>
              {product.on_shopping_list || product.current_stock <= product.minimum_stock ? 'Gestionar compra' : 'Agregar a compras'}
            </button>
          ) : <span className="permission-note compact">Actualiza con −1, +1 o Revisión rápida.</span>}
          <div className="card-footer-secondary">
            {canManageProducts && <button className="text-button muted-action" type="button" onClick={() => onEditProduct(product)}>Editar</button>}
            {canDeleteProducts && <button className="text-button danger-text" type="button" onClick={() => setDeleteTarget(product)}>Eliminar</button>}
          </div>
        </div>
      </article>
    )
  }

  return (
    <div className="content-stack">
      <section className="toolbar inventory-toolbar">
        <label className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto, marca, categoría o ubicación" /></label>
        <div className="inventory-filter-group">
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
        </div>
        <div className="inventory-toolbar-summary">
          <div className="segmented-control compact" role="group" aria-label="Organización del inventario">
            <button className={`segmented-button ${grouped ? 'active' : ''}`} type="button" onClick={() => setGrouped(true)}>Por grupos</button>
            <button className={`segmented-button ${!grouped ? 'active' : ''}`} type="button" onClick={() => setGrouped(false)}>Todos</button>
          </div>
          <span className="toolbar-count">{filtered.length} de {products.length}</span>
        </div>
      </section>

      {canManageProducts && (
        <section className="inventory-setup-banner">
          <div className="inventory-setup-icon">＋</div>
          <div><span className="eyebrow">Carga inicial</span><strong>¿No quieres registrar uno por uno?</strong><p>Agrega una lista organizada de productos básicos y luego conserva solo los que utiliza tu hogar.</p></div>
          <button className="secondary-button" type="button" onClick={() => setCatalogOpen(true)}>Agregar lista básica</button>
          {canDeleteProducts && products.length > 0 && <button className="secondary-button danger-outline-button" type="button" onClick={() => setDeleteAllOpen(true)}>Eliminar todos</button>}
        </section>
      )}

      {filtered.length ? (
        grouped ? (
          <div className="inventory-groups">
            {groupedProducts.map((group) => (
              <section className="inventory-group" key={group.category.id}>
                <div className="inventory-group-heading">
                  <div className="inventory-group-icon">{group.category.icon}</div>
                  <div><h2>{group.category.name}</h2><p>{group.products.length} {group.products.length === 1 ? 'producto' : 'productos'} en este grupo</p></div>
                  <span>{group.products.filter((product) => ['out', 'critical'].includes(getStatus(product).key)).length} urgentes</span>
                </div>
                <div className="inventory-grid">{group.products.map(renderProduct)}</div>
              </section>
            ))}
          </div>
        ) : <section className="inventory-grid">{filtered.map(renderProduct)}</section>
      ) : (
        <section className="panel"><EmptyState icon="⌕" title={products.length ? 'No encontramos productos' : 'Tu inventario está vacío'} copy={products.length ? 'Prueba otro término o cambia los filtros.' : 'Agrega un producto o utiliza la lista básica para comenzar.'} action={canManageProducts ? <div className="empty-actions"><button className="primary-button" type="button" onClick={onAddProduct}>Agregar producto</button><button className="secondary-button" type="button" onClick={() => setCatalogOpen(true)}>Agregar lista básica</button></div> : undefined} /></section>
      )}

      <BasicCatalogModal open={catalogOpen} busy={busy} onClose={() => setCatalogOpen(false)} onAdd={addCatalog} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        eyebrow="Eliminar producto"
        title={`¿Eliminar “${deleteTarget?.name ?? ''}”?`}
        description="Se retirará del inventario y de la lista de compras. Sus movimientos anteriores se conservarán para mantener la trazabilidad."
        confirmLabel="Eliminar producto"
        busy={busy}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteProduct}
      />
      <ConfirmDialog
        open={deleteAllOpen}
        eyebrow="Zona administrativa"
        title="Eliminar todos los productos"
        description="Se vaciará el inventario y la lista de compras. El historial se conservará por separado. Esta acción no se puede deshacer."
        confirmLabel="Eliminar todos"
        requiredText="VACIAR"
        requiredTextLabel="Escribe VACIAR para confirmar"
        busy={busy}
        onClose={() => setDeleteAllOpen(false)}
        onConfirm={confirmDeleteAll}
      />
    </div>
  )
}
