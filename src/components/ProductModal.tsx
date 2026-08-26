import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { UNITS } from '../lib/catalogs'
import { categoryExplanation, suggestCategory } from '../lib/productClassifier'
import type { Category, Location, Product, ProductDraft } from '../types'

interface Props {
  open: boolean
  product: Product | null
  categories: Category[]
  locations: Location[]
  onClose(): void
  onSave(draft: ProductDraft): Promise<void>
}

const CONTINUOUS_UNIT_WORDS = ['litro', 'galon', 'galón', 'libra', 'kilogramo', 'gramo', 'onza', 'mililitro', 'kg', 'ml']

function allowsDecimals(unit: string): boolean {
  const normalized = unit.toLocaleLowerCase('es')
  return CONTINUOUS_UNIT_WORDS.some((word) => normalized.includes(word))
}

function stockText(value: number): string {
  if (!Number.isFinite(value)) return ''
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100)
}

function sanitizeStockText(value: string, decimal: boolean): string {
  let clean = value.replace(',', '.').replace(/[^0-9.]/g, '')
  const firstDot = clean.indexOf('.')
  if (!decimal) return clean.split('.')[0].slice(0, 8)
  if (firstDot >= 0) clean = `${clean.slice(0, firstDot + 1)}${clean.slice(firstDot + 1).replace(/\./g, '').slice(0, 2)}`
  return clean.slice(0, 11)
}

function parseStock(value: string, decimal: boolean, fallback = 0): number {
  if (!value.trim()) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return decimal ? Math.round(parsed * 100) / 100 : Math.trunc(parsed)
}

export function ProductModal({ open, product, categories, locations, onClose, onSave }: Props) {
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [brand, setBrand] = useState('')
  const [presentation, setPresentation] = useState('')
  const [unit, setUnit] = useState('unidad')
  const [emoji, setEmoji] = useState('📦')
  const [current, setCurrent] = useState('0')
  const [minimum, setMinimum] = useState('1')
  const [ideal, setIdeal] = useState('3')
  const [shopping, setShopping] = useState(false)
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(product?.name ?? '')
    setCategoryId(product?.category_id ?? categories[0]?.id ?? '')
    setLocationId(product?.location_id ?? locations[0]?.id ?? '')
    setBrand(product?.brand ?? '')
    setPresentation(product?.presentation ?? '')
    setUnit(product?.unit ?? 'unidad')
    setEmoji(product?.emoji ?? categories[0]?.icon ?? '📦')
    setCurrent(stockText(product?.current_stock ?? 0))
    setMinimum(stockText(product?.minimum_stock ?? 1))
    setIdeal(stockText(product?.ideal_stock ?? 3))
    setShopping(product?.on_shopping_list ?? false)
    setCategoryTouched(Boolean(product))
    setImageFile(null)
    setImageRemoved(false)
    setBusy(false)
    setError('')
  }, [categories, locations, open, product])

  const filePreview = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : '', [imageFile])
  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview) }, [filePreview])
  const imagePreview = filePreview || (!imageRemoved ? product?.image_url ?? '' : '')
  const selectedCategory = categories.find((category) => category.id === categoryId) ?? null
  const decimal = allowsDecimals(unit)
  const currentNumber = parseStock(current, decimal)
  const minimumNumber = parseStock(minimum, decimal)
  const idealNumber = parseStock(ideal, decimal, decimal ? 0.01 : 1)
  const suggestionCopy = !product && !categoryTouched ? categoryExplanation(name, selectedCategory) : ''

  if (!open) return null

  function changeName(value: string) {
    setName(value)
    if (product || categoryTouched) return
    const suggestion = suggestCategory(value, categories)
    if (suggestion) {
      setCategoryId(suggestion.id)
      setEmoji(suggestion.icon)
    }
  }

  function changeUnit(nextUnit: string) {
    const nextAllowsDecimals = allowsDecimals(nextUnit)
    setUnit(nextUnit)
    if (!nextAllowsDecimals) {
      setCurrent((value) => sanitizeStockText(value, false))
      setMinimum((value) => sanitizeStockText(value, false))
      setIdeal((value) => sanitizeStockText(value, false))
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!name.trim()) return setError('Escribe el nombre del producto.')
    if (!categoryId || !locationId) return setError('Selecciona categoría y ubicación.')
    if (!current.trim() || !minimum.trim() || !ideal.trim()) return setError('Completa las tres cantidades de inventario.')
    if (minimumNumber >= idealNumber) return setError('El stock mínimo debe ser menor que el stock ideal.')

    setBusy(true)
    try {
      await onSave({
        id: product?.id,
        name: name.trim(),
        category_id: categoryId,
        location_id: locationId,
        brand: brand.trim(),
        presentation: presentation.trim(),
        unit,
        emoji: emoji.trim() || selectedCategory?.icon || '📦',
        current_stock: currentNumber,
        minimum_stock: minimumNumber,
        ideal_stock: idealNumber,
        on_shopping_list: shopping,
        existing_image_path: imageRemoved ? null : product?.image_path ?? null,
        original_image_path: product?.image_path ?? null,
        image_file: imageFile,
      })
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible guardar el producto.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section className="modal-card modal-large" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
        <div className="modal-header">
          <div><span className="eyebrow">Ficha compartida</span><h2 id="product-modal-title">{product ? 'Editar producto' : 'Agregar producto'}</h2><p>Los cambios estarán disponibles para todos los miembros del hogar.</p></div>
          <button className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Cerrar">×</button>
        </div>

        <form className="product-form" onSubmit={submit}>
          <div className="product-photo-panel">
            <div className="photo-preview">{imagePreview ? <img src={imagePreview} alt="Vista previa del producto" /> : <span>{emoji || selectedCategory?.icon || '📦'}</span>}</div>
            <label className="secondary-button photo-upload-button"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => { setImageFile(event.target.files?.[0] ?? null); setImageRemoved(false) }} />Subir fotografía</label>
            {(imagePreview || product?.image_path) && <button className="text-button" type="button" onClick={() => { setImageFile(null); setImageRemoved(true) }}>Quitar fotografía</button>}
            <p>Se admite JPEG, PNG, WebP o GIF de hasta 8 MB.</p>
          </div>

          <div className="form-fields">
            <div className="form-grid two-columns">
              <label className="form-field span-2"><span>Nombre del producto *</span><input value={name} onChange={(event) => changeName(event.target.value)} maxLength={70} placeholder="Ej. Papel higiénico" required /></label>
              <label className="form-field"><span>Categoría *</span><select value={categoryId} onChange={(event) => { setCategoryTouched(true); setCategoryId(event.target.value); const category = categories.find((item) => item.id === event.target.value); if (category) setEmoji(category.icon) }} required>{categories.map((category) => <option value={category.id} key={category.id}>{category.icon} {category.name}</option>)}</select>{suggestionCopy && <small className="field-suggestion">{suggestionCopy}</small>}</label>
              <label className="form-field"><span>Ubicación *</span><select value={locationId} onChange={(event) => setLocationId(event.target.value)} required>{locations.map((location) => <option value={location.id} key={location.id}>{location.icon} {location.name}</option>)}</select></label>
              <label className="form-field"><span>Marca</span><input value={brand} onChange={(event) => setBrand(event.target.value)} maxLength={50} placeholder="Opcional" /></label>
              <label className="form-field"><span>Presentación</span><input value={presentation} onChange={(event) => setPresentation(event.target.value)} maxLength={80} placeholder="Ej. Paquete de 12 rollos" /></label>
              <label className="form-field"><span>Unidad de control *</span><select value={unit} onChange={(event) => changeUnit(event.target.value)}>{UNITS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label className="form-field"><span>Ícono rápido</span><input value={emoji} onChange={(event) => setEmoji(event.target.value)} maxLength={12} placeholder="📦" /></label>
            </div>

            <div className="stock-rule-box">
              <div className="stock-rule-heading"><div><strong>Regla de inventario</strong><span>Define la alerta crítica y el nivel que deseas mantener.</span></div><span className="info-chip">Semáforo automático</span></div>
              <div className="form-grid three-columns">
                <label className="form-field stock-number-field"><span>Cantidad actual *</span><input type="text" inputMode={decimal ? 'decimal' : 'numeric'} value={current} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setCurrent(sanitizeStockText(event.target.value, decimal))} placeholder="0" required /><small className="stock-number-help">{decimal ? 'Admite hasta 2 decimales.' : 'Solo unidades completas.'}</small></label>
                <label className="form-field stock-number-field"><span>Stock mínimo *</span><input type="text" inputMode={decimal ? 'decimal' : 'numeric'} value={minimum} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setMinimum(sanitizeStockText(event.target.value, decimal))} placeholder="1" required /><small className="stock-number-help">Activa la alerta crítica.</small></label>
                <label className="form-field stock-number-field"><span>Stock ideal *</span><input type="text" inputMode={decimal ? 'decimal' : 'numeric'} value={ideal} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setIdeal(sanitizeStockText(event.target.value, decimal))} placeholder="3" required /><small className="stock-number-help">Nivel que deseas mantener.</small></label>
              </div>
              <div className="rule-preview">
                <div className="rule-step out"><strong>0</strong><span>Agotado</span></div>
                <div className="rule-step critical"><strong>≤ {minimumNumber}</strong><span>Crítico</span></div>
                <div className="rule-step low"><strong>&lt; {idealNumber}</strong><span>Bajo</span></div>
                <div className="rule-step good"><strong>{idealNumber}+</strong><span>Suficiente</span></div>
              </div>
            </div>

            <label className="switch-field"><input type="checkbox" checked={shopping} onChange={(event) => setShopping(event.target.checked)} /><span className="switch-control" aria-hidden="true" /><span><strong>Agregar manualmente a la lista de compras</strong><small>Los niveles críticos se agregan automáticamente aunque esta opción esté desactivada.</small></span></label>
            {error && <div className="form-error visible" role="alert">{error}</div>}
            <div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Cancelar</button><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar producto'}</button></div>
          </div>
        </form>
      </section>
    </div>
  )
}
