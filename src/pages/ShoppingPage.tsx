import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { ProductVisual } from '../components/ProductVisual'
import { StatusPill } from '../components/StatusPill'
import { formatNumber, getShoppingProducts, getUnitLabel, suggestedPurchaseQuantity } from '../lib/format'
import type { Product } from '../types'

interface Props {
  products: Product[]
  canPurchase: boolean
  canManageShopping: boolean
  onPurchase(product: Product, quantity: number): Promise<void>
  onSetShopping(product: Product, enabled: boolean): Promise<void>
}

function allowsDecimals(unit: string): boolean {
  return /(litro|gal[oó]n|libra|kilogramo|gramo|onza|mililitro|\bkg\b|\bml\b)/i.test(unit)
}

function sanitize(value: string, decimal: boolean): string {
  let clean = value.replace(',', '.').replace(/[^0-9.]/g, '')
  if (!decimal) return clean.split('.')[0].slice(0, 8)
  const dot = clean.indexOf('.')
  if (dot >= 0) clean = `${clean.slice(0, dot + 1)}${clean.slice(dot + 1).replace(/\./g, '').slice(0, 2)}`
  return clean.slice(0, 11)
}

export function ShoppingPage({ products, canPurchase, canManageShopping, onPurchase, onSetShopping }: Props) {
  const shopping = useMemo(() => getShoppingProducts(products), [products])
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState('')

  useEffect(() => {
    setQuantities((current) => {
      const next = { ...current }
      shopping.forEach((product) => {
        if (!(product.id in next)) next[product.id] = formatNumber(suggestedPurchaseQuantity(product))
      })
      return next
    })
  }, [shopping])

  async function purchase(product: Product) {
    const quantity = Number(quantities[product.id])
    if (!Number.isFinite(quantity) || quantity <= 0) return
    setBusyId(product.id)
    try {
      await onPurchase(product, allowsDecimals(product.unit) ? Math.round(quantity * 100) / 100 : Math.trunc(quantity))
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="content-stack">
      <section className="shopping-overview">
        <div><span className="eyebrow">Compra sugerida</span><h2>{shopping.length ? `${shopping.length} productos por reponer` : 'No hay compras pendientes'}</h2><p>Las cantidades buscan recuperar el stock ideal definido para cada producto.</p></div>
        <div className="shopping-overview-count"><strong>{shopping.reduce((sum, product) => sum + suggestedPurchaseQuantity(product), 0).toLocaleString('es-HN', { maximumFractionDigits: 2 })}</strong><span>unidades sugeridas</span></div>
      </section>

      {shopping.length ? (
        <section className="shopping-list-panel panel">
          <div className="shopping-table-heading"><span>Producto</span><span>Existencia</span><span>Comprar</span><span>Acción</span></div>
          <div className="shopping-list">
            {shopping.map((product) => {
              const decimal = allowsDecimals(product.unit)
              const quantityText = quantities[product.id] ?? ''
              const quantityNumber = Number(quantityText)
              return (
                <article className="shopping-row" key={product.id}>
                  <div className="shopping-product-cell">
                    <ProductVisual product={product} />
                    <div><strong>{product.name}</strong><span>{product.category?.name ?? 'Otros'} · {product.location?.name ?? 'Sin ubicación'}</span></div>
                    <StatusPill product={product} />
                  </div>
                  <div className="shopping-stock-cell"><strong>{formatNumber(product.current_stock)}</strong><span>de {formatNumber(product.ideal_stock)} {getUnitLabel(product, product.ideal_stock)}</span></div>
                  <label className="shopping-quantity-field"><span className="sr-only">Cantidad de {product.name}</span><input type="text" inputMode={decimal ? 'decimal' : 'numeric'} value={quantityText} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setQuantities((current) => ({ ...current, [product.id]: sanitize(event.target.value, decimal) }))} aria-label={`Cantidad comprada de ${product.name}`} /><small>{getUnitLabel(product, quantityNumber || 1)}</small></label>
                  <div className="shopping-action-cell">
                    {canPurchase && <button className="primary-button compact-button" type="button" onClick={() => void purchase(product)} disabled={busyId === product.id || !Number.isFinite(quantityNumber) || quantityNumber <= 0}>{busyId === product.id ? 'Guardando…' : 'Registrar compra'}</button>}
                    {canManageShopping && product.current_stock > product.minimum_stock && <button className="text-button" type="button" onClick={() => void onSetShopping(product, false)}>Retirar de la lista</button>}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="panel"><EmptyState icon="🛒" title="Lista de compras vacía" copy="Los productos aparecerán aquí cuando lleguen a su nivel mínimo o cuando los agregues manualmente." /></section>
      )}
    </div>
  )
}
