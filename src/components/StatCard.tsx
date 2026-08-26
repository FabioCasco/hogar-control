export function StatCard({
  tone,
  icon,
  label,
  value,
  detail,
}: {
  tone: 'total' | 'good' | 'low' | 'urgent'
  icon: string
  label: string
  value: string | number
  detail: string
}) {
  return (
    <article className={`stat-card ${tone}`}>
      <span className="stat-icon" aria-hidden="true">{icon}</span>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  )
}
