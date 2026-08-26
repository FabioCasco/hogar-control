import { useState, type FormEvent } from 'react'
import { errorMessage } from '../lib/errors'
import { appBaseUrl } from '../lib/appUrl'
import { requireSupabase } from '../lib/supabase'
import { BrandMark } from './BrandMark'

type AuthMode = 'login' | 'register' | 'reset'

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)

    try {
      const client = requireSupabase()
      const normalizedEmail = email.trim().toLowerCase()

      if (mode === 'login') {
        const { error: authError } = await client.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })
        if (authError) throw authError
        return
      }

      if (mode === 'register') {
        if (displayName.trim().length < 2) throw new Error('Escribe un nombre para identificarte dentro del hogar.')
        if (password.length < 8) throw new Error('La contraseña debe contener al menos 8 caracteres.')

        const { data, error: authError } = await client.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { full_name: displayName.trim() },
            emailRedirectTo: appBaseUrl(),
          },
        })
        if (authError) throw authError

        if (!data.session) {
          setNotice('Cuenta creada. Revisa tu correo y confirma el acceso antes de iniciar sesión.')
          setMode('login')
          setPassword('')
        }
        return
      }

      const { error: resetError } = await client.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: appBaseUrl(),
      })
      if (resetError) throw resetError
      setNotice('Solicitud enviada. Revisa tu correo para establecer una nueva contraseña.')
      setMode('login')
    } catch (caught) {
      setError(errorMessage(caught, 'No fue posible completar el acceso.'))
    } finally {
      setBusy(false)
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError('')
    setNotice('')
    setPassword('')
  }

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="auth-brand">
          <BrandMark />
          <div><strong>Hogar Control</strong><span>Inventario doméstico compartido</span></div>
        </div>
        <div className="auth-story-copy">
          <span className="eyebrow light">Un inventario para todos</span>
          <h1>Tu hogar deja de depender de listas improvisadas.</h1>
          <p>Revisa existencias, identifica faltantes y registra compras desde cualquier teléfono, con permisos claros para cada persona.</p>
        </div>
        <div className="auth-benefits">
          <article><strong>01</strong><span>Datos sincronizados entre dispositivos.</span></article>
          <article><strong>02</strong><span>Semáforo automático y compras sugeridas.</span></article>
          <article><strong>03</strong><span>Historial de cambios del inventario.</span></article>
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <div>
            <span className="eyebrow">Acceso seguro</span>
            <h2>{mode === 'login' ? 'Entrar a mi hogar' : mode === 'register' ? 'Crear mi cuenta' : 'Recuperar acceso'}</h2>
            <p>{mode === 'login' ? 'Usa el correo registrado para consultar el inventario compartido.' : mode === 'register' ? 'Después podrás crear un hogar o ingresar mediante un código.' : 'Recibirás un enlace para establecer una nueva contraseña.'}</p>
          </div>

          {mode === 'register' && (
            <label className="form-field">
              <span>Nombre visible</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} autoComplete="name" required />
            </label>
          )}
          <label className="form-field">
            <span>Correo electrónico</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          {mode !== 'reset' && (
            <label className="form-field">
              <span>Contraseña</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required />
            </label>
          )}

          {notice && <div className="settings-feedback success" role="status">{notice}</div>}
          {error && <div className="form-error visible" role="alert">{error}</div>}

          <button className="primary-button full" type="submit" disabled={busy}>
            {busy ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : mode === 'register' ? 'Crear cuenta' : 'Enviar enlace'}
          </button>

          <div className="auth-links">
            {mode === 'login' ? (
              <>
                <button className="text-button" type="button" onClick={() => changeMode('register')}>Crear una cuenta</button>
                <button className="text-button" type="button" onClick={() => changeMode('reset')}>Olvidé mi contraseña</button>
              </>
            ) : (
              <button className="text-button" type="button" onClick={() => changeMode('login')}>Volver a iniciar sesión</button>
            )}
          </div>
        </form>
      </section>
    </main>
  )
}
