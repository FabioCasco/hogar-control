import { useEffect, useState } from 'react'

interface Props {
  open: boolean
  eyebrow?: string
  title: string
  description: string
  confirmLabel: string
  busy?: boolean
  requiredText?: string
  requiredTextLabel?: string
  onClose(): void
  onConfirm(): Promise<void> | void
}

export function ConfirmDialog({
  open,
  eyebrow = 'Confirmación',
  title,
  description,
  confirmLabel,
  busy = false,
  requiredText,
  requiredTextLabel,
  onClose,
  onConfirm,
}: Props) {
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    if (open) setConfirmation('')
  }, [open, title])

  if (!open) return null

  const canConfirm = !requiredText || confirmation.trim().toUpperCase() === requiredText.toUpperCase()

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section className="modal-card confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description">
        <div className="confirm-dialog-symbol" aria-hidden="true">!</div>
        <div className="confirm-dialog-copy">
          <span className="eyebrow">{eyebrow}</span>
          <h2 id="confirm-dialog-title">{title}</h2>
          <p id="confirm-dialog-description">{description}</p>
        </div>

        {requiredText && (
          <label className="form-field confirm-text-field">
            <span>{requiredTextLabel ?? `Escribe ${requiredText} para continuar`}</span>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={requiredText}
              autoFocus
            />
          </label>
        )}

        <div className="confirm-dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="danger-button" type="button" onClick={() => void onConfirm()} disabled={busy || !canConfirm}>
            {busy ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
