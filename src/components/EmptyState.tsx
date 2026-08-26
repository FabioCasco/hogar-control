import type { ReactNode } from 'react'

export function EmptyState({ icon, title, copy, action }: { icon: string; title: string; copy: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      <p>{copy}</p>
      {action}
    </div>
  )
}
