import { useMemo, useState } from 'react'
import { formatDate, formatNumber, formatTime, movementLabel } from '../lib/format'
import type { Movement, MovementType } from '../types'
import { EmptyState } from '../components/EmptyState'

export function HistoryPage({ movements }: { movements: Movement[] }) {
  const [filter, setFilter] = useState<'all' | MovementType>('all')
  const filtered = useMemo(() => filter === 'all' ? movements : movements.filter((movement) => movement.type === filter), [filter, movements])

  return (
    <div className="content-stack">
      <section className="history-filters">
        <div className="segmented-control" role="group" aria-label="Filtrar movimientos">
          {([['all', 'Todos'], ['purchase', 'Compras'], ['consumption', 'Consumos'], ['adjustment', 'Ajustes'], ['review', 'Revisiones']] as const).map(([value, label]) => (
            <button className={`segmented-button ${filter === value ? 'active' : ''}`} type="button" key={value} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
        <span className="toolbar-count">{filtered.length} movimientos</span>
      </section>

      <section className="panel">
        <div className="panel-header"><div><h2>Historial del hogar</h2><p>Cada movimiento conserva el producto, la persona y la fecha.</p></div></div>
        <div className="timeline">
          {filtered.length ? filtered.map((movement) => (
            <div className="timeline-row" key={movement.id}>
              <div className="timeline-time"><strong>{formatDate(movement.created_at)}</strong><span>{formatTime(movement.created_at)}</span></div>
              <div className={`movement-icon ${movement.delta < 0 ? 'negative' : ''}`}>{movement.delta >= 0 ? '+' : '−'}</div>
              <div className="timeline-copy"><strong>{movement.product_name}</strong><span>{movementLabel(movement)} · {movement.note || 'Sin nota'} · por {movement.actor_name ?? 'Usuario'}</span></div>
              <strong className={`movement-delta ${movement.delta >= 0 ? 'positive' : 'negative'}`}>{movement.delta > 0 ? '+' : ''}{formatNumber(movement.delta)}</strong>
            </div>
          )) : <EmptyState icon="↺" title="No hay movimientos" copy="No se encontraron registros para este filtro." />}
        </div>
      </section>
    </div>
  )
}
