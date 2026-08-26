import type { ToastMessage } from '../types'

export function ToastRegion({ messages }: { messages: ToastMessage[] }) {
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {messages.map((toast) => (
        <div className={`toast ${toast.tone}`} key={toast.id}>
          <div className="toast-icon" aria-hidden="true">{toast.tone === 'error' ? '!' : toast.tone === 'info' ? 'i' : '✓'}</div>
          <div><strong>{toast.title}</strong><span>{toast.message}</span></div>
        </div>
      ))}
    </div>
  )
}
