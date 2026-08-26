import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { errorMessage } from '../lib/errors'
import { generateAccessKey, normalizeSharedUsername, suggestUsername } from '../lib/sharedAccess'
import { listSharedAccessAccounts, manageSharedAccess } from '../services/cloudActions'
import type { Membership, SharedAccessAccount } from '../types'

interface Props {
  membership: Membership
  onChanged(): Promise<void>
}

interface Credentials {
  displayName: string
  username: string
  accessKey: string
}

export function SharedAccessManager({ membership, onChanged }: Props) {
  const [accounts, setAccounts] = useState<SharedAccessAccount[]>([])
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameEdited, setUsernameEdited] = useState(false)
  const [accessKey, setAccessKey] = useState(() => generateAccessKey())
  const [role, setRole] = useState<'family' | 'assistant'>('assistant')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [rotatingId, setRotatingId] = useState('')
  const [rotationKey, setRotationKey] = useState('')

  const activeCount = useMemo(() => accounts.filter((account) => account.active).length, [accounts])

  useEffect(() => {
    void loadAccounts()
  }, [membership.household_id])

  async function loadAccounts() {
    setLoading(true)
    setError('')
    try {
      setAccounts(await listSharedAccessAccounts(membership))
    } catch (caught) {
      setError(errorMessage(caught, 'No fue posible consultar los accesos compartidos.'))
    } finally {
      setLoading(false)
    }
  }

  function changeDisplayName(value: string) {
    setDisplayName(value)
    if (!usernameEdited) setUsername(suggestUsername(value))
  }

  async function createAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const cleanUsername = normalizeSharedUsername(username)
    if (displayName.trim().length < 2) return setError('Escribe el nombre de la persona.')
    if (cleanUsername.length < 3) return setError('El usuario corto debe tener al menos 3 caracteres.')
    if (accessKey.length < 8) return setError('La clave debe tener al menos 8 caracteres.')

    setBusy(true)
    try {
      const result = await manageSharedAccess(membership, {
        action: 'create',
        displayName: displayName.trim(),
        username: cleanUsername,
        accessKey,
        role,
      })
      setCredentials({
        displayName: result.account.display_name,
        username: result.account.username,
        accessKey: result.accessKey ?? accessKey,
      })
      setDisplayName('')
      setUsername('')
      setUsernameEdited(false)
      setAccessKey(generateAccessKey())
      setRole('assistant')
      await loadAccounts()
      await onChanged()
    } catch (caught) {
      setError(errorMessage(caught, 'No fue posible crear el acceso compartido.'))
    } finally {
      setBusy(false)
    }
  }

  async function toggleAccess(account: SharedAccessAccount) {
    setBusy(true)
    setError('')
    try {
      await manageSharedAccess(membership, {
        action: account.active ? 'deactivate' : 'activate',
        accountId: account.id,
      })
      await loadAccounts()
      await onChanged()
    } catch (caught) {
      setError(errorMessage(caught, 'No fue posible cambiar el estado del acceso.'))
    } finally {
      setBusy(false)
    }
  }

  function startRotation(account: SharedAccessAccount) {
    setRotatingId(account.id)
    setRotationKey(generateAccessKey())
    setCredentials(null)
    setError('')
  }

  async function rotateKey(account: SharedAccessAccount) {
    setBusy(true)
    setError('')
    try {
      const result = await manageSharedAccess(membership, {
        action: 'rotate_key',
        accountId: account.id,
        accessKey: rotationKey,
      })
      setCredentials({
        displayName: account.display_name,
        username: account.username,
        accessKey: result.accessKey ?? rotationKey,
      })
      setRotatingId('')
      setRotationKey('')
      await loadAccounts()
    } catch (caught) {
      setError(errorMessage(caught, 'No fue posible cambiar la clave.'))
    } finally {
      setBusy(false)
    }
  }

  async function copyCredentials() {
    if (!credentials) return
    const text = `Hogar Control\nUsuario: ${credentials.username}\nClave: ${credentials.accessKey}\nAcceso: ${window.location.origin}${import.meta.env.BASE_URL}`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const area = document.createElement('textarea')
      area.value = text
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
  }

  return (
    <section className="settings-section shared-access-section">
      <div className="settings-section-heading">
        <div>
          <span className="eyebrow">Acceso simplificado</span>
          <h2>Familia y asesora del hogar</h2>
          <p>Crea un usuario corto y una clave. La persona no necesita correo electrónico.</p>
        </div>
        <span className="settings-count-chip">{activeCount} activos</span>
      </div>

      <div className="shared-access-layout">
        <form className="settings-card shared-access-form" onSubmit={createAccess}>
          <div className="settings-card-header"><div><h3>Nuevo acceso</h3><p>Entrega estas credenciales directamente a la persona.</p></div></div>

          <label className="form-field"><span>Nombre visible</span><input value={displayName} onChange={(event) => changeDisplayName(event.target.value)} maxLength={60} placeholder="Ej. María" required /></label>
          <div className="form-grid two-columns">
            <label className="form-field"><span>Usuario corto</span><input value={username} onChange={(event) => { setUsernameEdited(true); setUsername(normalizeSharedUsername(event.target.value)) }} minLength={3} maxLength={20} autoCapitalize="none" autoCorrect="off" placeholder="maria-casa" required /></label>
            <label className="form-field"><span>Rol</span><select value={role} onChange={(event) => setRole(event.target.value as 'family' | 'assistant')}><option value="assistant">Asesora del hogar</option><option value="family">Familiar</option></select></label>
          </div>
          <label className="form-field"><span>Clave de acceso</span><div className="inline-input-action"><input value={accessKey} onChange={(event) => setAccessKey(event.target.value)} minLength={8} maxLength={32} autoComplete="new-password" required /><button className="secondary-button compact-button" type="button" onClick={() => setAccessKey(generateAccessKey())}>Generar</button></div></label>
          <p className="field-help">La clave debe incluir letras y números. Solo se mostrará al crearla o renovarla.</p>
          <button className="primary-button full" type="submit" disabled={busy}>{busy ? 'Creando…' : 'Crear acceso compartido'}</button>
        </form>

        <div className="settings-card shared-access-list-card">
          <div className="settings-card-header"><div><h3>Accesos creados</h3><p>Activa, pausa o renueva la clave de cada persona.</p></div><button className="icon-button small" type="button" onClick={() => void loadAccounts()} disabled={loading || busy} aria-label="Actualizar">↻</button></div>

          {loading ? <div className="catalog-loading">Consultando accesos…</div> : accounts.length ? (
            <div className="shared-account-list">
              {accounts.map((account) => (
                <article className={`shared-account-row ${account.active ? '' : 'inactive'}`} key={account.id}>
                  <div className="shared-account-avatar">{account.display_name.slice(0, 1).toUpperCase()}</div>
                  <div className="shared-account-copy"><strong>{account.display_name}</strong><span>@{account.username} · {account.role === 'assistant' ? 'Asesora' : 'Familiar'}</span></div>
                  <span className={`access-status ${account.active ? 'active' : ''}`}>{account.active ? 'Activo' : 'Pausado'}</span>
                  <div className="shared-account-actions">
                    <button className="text-button" type="button" onClick={() => startRotation(account)} disabled={busy}>Cambiar clave</button>
                    <button className={`text-button ${account.active ? 'danger-text' : ''}`} type="button" onClick={() => void toggleAccess(account)} disabled={busy}>{account.active ? 'Pausar' : 'Activar'}</button>
                  </div>
                  {rotatingId === account.id && (
                    <div className="shared-key-rotation">
                      <label className="form-field"><span>Nueva clave</span><input value={rotationKey} onChange={(event) => setRotationKey(event.target.value)} minLength={8} maxLength={32} autoFocus /></label>
                      <button className="secondary-button compact-button" type="button" onClick={() => setRotationKey(generateAccessKey())}>Generar</button>
                      <button className="primary-button compact-button" type="button" onClick={() => void rotateKey(account)} disabled={busy || rotationKey.length < 8}>Guardar clave</button>
                      <button className="text-button" type="button" onClick={() => setRotatingId('')} disabled={busy}>Cancelar</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : <div className="settings-empty-note">Todavía no has creado accesos simplificados.</div>}
        </div>
      </div>

      {credentials && (
        <div className="credentials-result" role="status">
          <div><span className="eyebrow light">Entrega una sola vez</span><strong>{credentials.displayName}</strong><p>Usuario: <b>{credentials.username}</b><br />Clave: <b>{credentials.accessKey}</b></p></div>
          <button className="secondary-button inverse" type="button" onClick={() => void copyCredentials()}>Copiar credenciales</button>
          <button className="text-button light" type="button" onClick={() => setCredentials(null)}>Ocultar</button>
        </div>
      )}

      {error && <div className="form-error visible" role="alert">{error}</div>}
    </section>
  )
}
