import { useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { errorMessage } from '../lib/errors'
import type { InventoryRepository } from '../services/repository'
import { BrandMark } from './BrandMark'

interface Props {
  user: User
  repository: InventoryRepository
  onReady(householdId: string): Promise<void>
  onSignOut(): Promise<void>
}

export function OnboardingScreen({ user, repository, onReady, onSignOut }: Props) {
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [householdName, setHouseholdName] = useState('Mi hogar')
  const [inviteCode, setInviteCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const displayName = String(user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Usuario').trim()
  const isSharedAccess = user.app_metadata?.account_type === 'shared_access'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const householdId = mode === 'create'
        ? await repository.createHousehold(user.id, householdName, displayName)
        : await repository.joinHousehold(user.id, inviteCode, displayName)
      await onReady(householdId)
    } catch (caught) {
      setError(errorMessage(caught, 'No fue posible completar la configuración.'))
    } finally {
      setBusy(false)
    }
  }

  if (isSharedAccess) {
    return (
      <main className="gateway-page onboarding-page">
        <section className="gateway-card onboarding-card shared-access-unavailable">
          <div className="gateway-brand"><BrandMark /><div><strong>Hogar Control</strong><span>Acceso compartido</span></div></div>
          <div className="shared-unavailable-icon" aria-hidden="true">⌂</div>
          <span className="eyebrow">Acceso sin asignación</span>
          <h1>Este usuario no tiene un hogar activo.</h1>
          <p>El acceso pudo haber sido pausado o retirado. Pide al administrador que lo active nuevamente; no necesitas crear otra cuenta.</p>
          <button className="primary-button full" type="button" onClick={() => void onSignOut()}>Volver al inicio</button>
        </section>
      </main>
    )
  }

  return (
    <main className="gateway-page onboarding-page">
      <section className="gateway-card onboarding-card">
        <div className="gateway-brand">
          <BrandMark />
          <div><strong>Hogar Control</strong><span>{user.email}</span></div>
        </div>
        <span className="eyebrow">Primer acceso</span>
        <h1>¿Cómo deseas comenzar?</h1>
        <p>Crea el espacio principal de tu casa o entra a uno existente con un código generado por su administrador.</p>

        <div className="onboarding-options">
          <button className={`choice-card ${mode === 'create' ? 'active' : ''}`} type="button" onClick={() => setMode('create')}>
            <span className="choice-icon">⌂</span><strong>Crear un hogar</strong><small>Serás el administrador inicial.</small>
          </button>
          <button className={`choice-card ${mode === 'join' ? 'active' : ''}`} type="button" onClick={() => setMode('join')}>
            <span className="choice-icon">＋</span><strong>Unirme con código</strong><small>Disponible para cuentas administradoras heredadas.</small>
          </button>
        </div>

        <form className="onboarding-form" onSubmit={submit}>
          {mode === 'create' ? (
            <label className="form-field"><span>Nombre del hogar</span><input value={householdName} onChange={(event) => setHouseholdName(event.target.value)} maxLength={60} autoFocus required /></label>
          ) : (
            <label className="form-field"><span>Código de invitación</span><input className="invite-code-input" value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} minLength={8} maxLength={12} placeholder="EJ. H7K9P2QX" autoFocus required /></label>
          )}
          {error && <div className="form-error visible" role="alert">{error}</div>}
          <button className="primary-button full" type="submit" disabled={busy}>{busy ? 'Configurando…' : mode === 'create' ? 'Crear hogar' : 'Entrar al hogar'}</button>
        </form>

        <button className="text-button centered" type="button" onClick={() => void onSignOut()}>Cerrar sesión</button>
      </section>
    </main>
  )
}
