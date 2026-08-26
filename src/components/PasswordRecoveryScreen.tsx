import { useState, type FormEvent } from 'react'
import { errorMessage } from '../lib/errors'
import { BrandMark } from './BrandMark'

interface Props {
  onUpdate(password: string): Promise<void>
  onCancel(): void
}

export function PasswordRecoveryScreen({ onUpdate, onCancel }: Props) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password.length < 8) return setError('La contraseña debe contener al menos 8 caracteres.')
    if (password !== confirmation) return setError('Las contraseñas no coinciden.')
    setBusy(true)
    try {
      await onUpdate(password)
    } catch (caught) {
      setError(errorMessage(caught, 'No fue posible actualizar la contraseña.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="gateway-page onboarding-page">
      <section className="gateway-card onboarding-card">
        <div className="gateway-brand"><BrandMark /><div><strong>Hogar Control</strong><span>Recuperación de acceso</span></div></div>
        <span className="eyebrow">Nueva contraseña</span>
        <h1>Protege nuevamente tu cuenta.</h1>
        <p>Escribe una contraseña de al menos ocho caracteres y guárdala en un lugar seguro.</p>
        <form className="onboarding-form" onSubmit={submit}>
          <label className="form-field"><span>Nueva contraseña</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required /></label>
          <label className="form-field"><span>Confirmar contraseña</span><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} autoComplete="new-password" required /></label>
          {error && <div className="form-error visible" role="alert">{error}</div>}
          <button className="primary-button full" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
        </form>
        <button className="text-button centered" type="button" onClick={onCancel}>Cancelar</button>
      </section>
    </main>
  )
}
