import { useEffect, useMemo, useState } from 'react'
import { getBasicCatalogSummary } from '../services/cloudActions'
import type { BasicCatalogSummary } from '../types'

interface Props {
  open: boolean
  busy: boolean
  onClose(): void
  onAdd(categories: string[]): Promise<void>
}

const EMPTY_SUMMARY: BasicCatalogSummary = { total: 0, groups: [] }

export function BasicCatalogModal({ open, busy, onClose, onAdd }: Props) {
  const [summary, setSummary] = useState<BasicCatalogSummary>(EMPTY_SUMMARY)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError('')
    void getBasicCatalogSummary()
      .then((value) => {
        if (cancelled) return
        setSummary(value)
        setSelected(new Set(value.groups.map((group) => group.category)))
      })
      .catch((caught) => {
        if (cancelled) return
        setError(caught instanceof Error ? caught.message : 'No fue posible consultar el catálogo básico.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [open])

  const selectedCount = useMemo(
    () => summary.groups.filter((group) => selected.has(group.category)).reduce((sum, group) => sum + group.count, 0),
    [selected, summary.groups],
  )

  if (!open) return null

  function toggle(category: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section className="modal-card catalog-modal" role="dialog" aria-modal="true" aria-labelledby="catalog-modal-title">
        <div className="modal-header">
          <div>
            <span className="eyebrow">Inicio acelerado</span>
            <h2 id="catalog-modal-title">Agregar lista de productos básicos</h2>
            <p>Incorpora un catálogo inicial organizado. Los productos que ya existan se omitirán automáticamente.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Cerrar">×</button>
        </div>

        {loading ? (
          <div className="catalog-loading">Preparando el catálogo…</div>
        ) : error ? (
          <div className="form-error visible" role="alert">{error}</div>
        ) : (
          <>
            <div className="catalog-summary-card">
              <div><strong>{selectedCount}</strong><span>productos seleccionados</span></div>
              <div><strong>{summary.total}</strong><span>disponibles en el catálogo</span></div>
            </div>

            <div className="catalog-selection-actions">
              <button className="text-button" type="button" onClick={() => setSelected(new Set(summary.groups.map((group) => group.category)))}>Seleccionar todos</button>
              <button className="text-button" type="button" onClick={() => setSelected(new Set())}>Limpiar selección</button>
            </div>

            <div className="catalog-group-grid">
              {summary.groups.map((group) => (
                <label className={`catalog-group-card ${selected.has(group.category) ? 'selected' : ''}`} key={group.category}>
                  <input type="checkbox" checked={selected.has(group.category)} onChange={() => toggle(group.category)} />
                  <span className="catalog-check" aria-hidden="true">✓</span>
                  <span><strong>{group.category}</strong><small>{group.count} productos</small></span>
                </label>
              ))}
            </div>

            <div className="catalog-note">
              <strong>¿Qué ocurrirá?</strong>
              <span>Los artículos se crearán con existencia 0, categoría y ubicación sugeridas. Después podrás editar, conservar o eliminar cada uno.</span>
            </div>
          </>
        )}

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="primary-button" type="button" onClick={() => void onAdd([...selected])} disabled={busy || loading || Boolean(error) || !selected.size}>
            {busy ? 'Agregando…' : `Agregar ${selectedCount} productos`}
          </button>
        </div>
      </section>
    </div>
  )
}
