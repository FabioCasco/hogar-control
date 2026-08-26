import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { formatDate, formatNumber, formatTime, movementLabel } from '../lib/format'
import type { Movement, MovementType } from '../types'

interface Props {
  movements: Movement[]
  canClearHistory: boolean
  onClearHistory(): Promise<void>
}

export function HistoryPage({ movements, canClearHistory, onClearHistory }: Props) {
  const [filter, setFilter] = useState<'all' | MovementType>('all')
  const [clearOpen, setClearOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const filtered = useMemo(() => filter === 'all' ? movements : movements.filter((movement) => movement.type === filter), [filter, movements])

  async function clearHistory() {
    setBusy(true)
    try {
      await onClearHistory()
      setClearOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="content-stack">
      <section className="history-filters">
        <div className="segmented-control" role="group" aria-label="Filtrar movimientos">
          {([['all', 'Todos'], ['purchase', 'Compras'], ['consumption', 'Consumos'], ['adjustment', 'Ajustes'], ['review', 'Revisiones']] as const).map(([value, label]) => (
            <button className={`segmented-button ${filter === value ? 'active' : ''}`} type="button" key={value} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
        <div className="history-toolbar-actions">
          <span className="toolbar-count">{filtered.length} movimientos</span>
          {canClearHistory && movements.length > 0 && <button className="secondary-button compact-button danger-outline-button" type="button" onClick={() => setClearOpen(true)}>Borrar historial</button>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header"><div><h2>Historial del hogar</h2><p>Cada movimiento conserva el producto, la persona y la fecha.</p></div></div>
        <div className="timeline">
          {filtered.length ? filtered.map((movement) => (
            <div className="timeline-row" key={movement.id}>
              <time className="timeline-time" dateTime={movement.created_at}><strong>{formatDate(movement.created_at)}</strong><span>{formatTime(movement.created_at)}</span></time>
              <div className={`movement-icon ${movement.delta < 0 ? 'negative' : ''}`}>{movement.delta >= 0 ? '+' : '−'}</div>
              <div className="timeline-copy"><strong>{movement.product_name}</strong><span>{movementLabel(movement)} · {movement.note || 'Sin nota'} · por {movement.actor_name ?? 'Usuario'}</span></div>
              <strong className={`movement-delta ${movement.delta >= 0 ? 'positive' : 'negative'}`}>{movement.delta > 0 ? '+' : ''}{formatNumber(movement.delta)}</strong>
            </div>
          )) : <EmptyState icon="↺" title="No hay movimientos" copy="No se encontraron registros para este filtro." />}
        </div>
      </section>

      <ConfirmDialog
        open={clearOpen}
        eyebrow="Trazabilidad"
        title="Borrar todo el historial"
        description="Se eliminarán todos los movimientos del hogar. Los productos y sus cantidades actuales no cambiarán, pero ya no podrás consultar quién hizo los cambios anteriores."
        confirmLabel="Borrar historial"
        requiredText="BORRAR"
        requiredTextLabel="Escribe BORRAR para confirmar"
        busy={busy}
        onClose={() => setClearOpen(false)}
        onConfirm={clearHistory}
      />
    </div>
  )
}
