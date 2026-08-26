import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { ProductVisual } from '../components/ProductVisual'
import { formatNumber, getShoppingProducts, getStatus, getSuggestions, getUnitLabel, suggestedPurchaseQuantity } from '../lib/format'
import type { Product } from '../types'

interface Props {
  products: Product[]
  canEditShopping: boolean
  onPurchase(product: Product, quantity: number): Promise<void>
  onSetShopping(product: Product, value: boolean): Promise<void>
}

export function ShoppingPage({ products, canEditShopping, onPurchase, onSetShopping }: Props) {
  const shopping = useMemo(() => getShoppingProducts(products), [products])
  const suggestions = useMemo(() => getSuggestions(products), [products])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [busyId, setBusyId] = useState('')

  useEffect(() => {
    setQuantities((current) => {
      const next = { ...current }
      shopping.forEach((product) => {
        if (!(product.id in next)) next[product.id] = suggestedPurchaseQuantity(product)
      })
      return next
    })
  }, [shopping])

  async function registerPurchase(product: Product, quantity: number) {
    setBusyId(product.id)
    try {
      await onPurchase(product, quantity)
    } finally {
      setBusyId('')
    }
  }

  const totalUnits = shopping.reduce((sum, product) => sum + (quantities[product.id] ?? suggestedPurchaseQuantity(product)), 0)

  return (
    <div className="content-stack">
      <section className="shopping-summary">
        <div><span className="eyebrow">Compra sugerida</span><h2>{shopping.length} productos por reponer</h2><p>La cantidad propuesta recupera el stock ideal. Puedes modificarla antes de registrar la compra.</p></div>
        <div className="shopping-summary-value"><strong>{formatNumber(totalUnits)}</strong><span>unidades de control</span></div>
      </section>

      <section className="shopping-layout">
        <article className="panel shopping-list-panel">
          <div className="panel-header"><div><h2>Lista activa</h2><p>Ordenada por nivel de urgencia.</p></div></div>
          <div className="shopping-list">
            {shopping.length ? shopping.map((product) => {
              const status = getStatus(product)
              const quantity = quantities[product.id] ?? suggestedPurchaseQuantity(product)
              return (
                <div className="shopping-item" key={product.id}>
                  <ProductVisual product={product} />
                  <div className="shopping-item-copy">
                    <h3>{product.name}</h3>
                    <p>{formatNumber(product.current_stock)} {getUnitLabel(product)} disponibles · ideal {formatNumber(product.ideal_stock)}</p>
                    <div className="shopping-item-meta"><span className={`priority-pill ${status.rank <= 1 ? 'high' : 'medium'}`}>{status.rank <= 1 ? 'Alta prioridad' : 'Prioridad media'}</span><span>{product.location?.name ?? 'Sin ubicación'}</span></div>
                  </div>
                  <div className="purchase-controls">
                    <label className="qty-field"><span>Comprar</span><input type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantities((current) => ({ ...current, [product.id]: Math.max(0, Number(event.target.value)) }))} /></label>
                    <button className="primary-button" type="button" onClick={() => void registerPurchase(product, quantity)} disabled={quantity <= 0 || busyId === product.id}>{busyId === product.id ? 'Guardando…' : 'Comprado'}</button>
                    {canEditShopping && product.on_shopping_list && product.current_stock > product.minimum_stock && <button className="text-button" type="button" onClick={() => void onSetShopping(product, false)}>Quitar</button>}
                  </div>
                </div>
              )
            }) : <EmptyState icon="✓" title="No hay compras pendientes" copy="Los productos críticos o agregados manualmente aparecerán aquí." />}
          </div>
        </article>

        <aside className="panel suggestion-panel">
          <div className="panel-header"><div><h2>Próximos a agotarse</h2><p>Aún no son urgentes, pero están debajo de su nivel ideal.</p></div></div>
          <div className="suggestion-list">
            {suggestions.length ? suggestions.slice(0, 10).map((product) => (
              <div className="suggestion-item" key={product.id}>
                <div><strong>{product.name}</strong><span>{formatNumber(product.current_stock)} de {formatNumber(product.ideal_stock)} {getUnitLabel(product, product.ideal_stock)}</span></div>
                {canEditShopping && <button className="icon-button small" type="button" aria-label={`Agregar ${product.name} a compras`} onClick={() => void onSetShopping(product, true)}>＋</button>}
              </div>
            )) : <EmptyState icon="◔" title="Sin sugerencias" copy="Los demás productos están en su nivel ideal." />}
          </div>
        </aside>
      </section>
    </div>
  )
}
