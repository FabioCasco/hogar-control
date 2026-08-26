import type { Product } from '../types'

export function ProductVisual({ product, large = false }: { product: Product; large?: boolean }) {
  return (
    <div className={`product-thumb${large ? ' large' : ''}`} aria-hidden="true">
      {product.image_url ? <img src={product.image_url} alt="" /> : <span>{product.emoji || product.category?.icon || '📦'}</span>}
    </div>
  )
}
