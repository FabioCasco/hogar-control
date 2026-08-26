import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { errorMessage } from './lib/errors'
import { isSupabaseConfigured } from './lib/supabase'
import { DemoRepository } from './services/demoRepository'
import type { InventoryRepository } from './services/repository'
import { SupabaseRepository } from './services/supabaseRepository'
import type { Membership } from './types'
import { AuthScreen } from './components/AuthScreen'
import { BrandMark } from './components/BrandMark'
import { HouseholdApp } from './components/HouseholdApp'
import { LoadingScreen } from './components/LoadingScreen'
import { OnboardingScreen } from './components/OnboardingScreen'
import { PasswordRecoveryScreen } from './components/PasswordRecoveryScreen'

const cloudRepository = new SupabaseRepository()

export default function App() {
  if (!isSupabaseConfigured) return <DemoEntry />
  return (
    <AuthProvider>
      <CloudEntry />
    </AuthProvider>
  )
}

function CloudEntry() {
  const auth = useAuth()
  if (auth.loading) return <LoadingScreen message="Validando la sesión…" />
  if (auth.passwordRecovery) {
    return <PasswordRecoveryScreen onUpdate={auth.updatePassword} onCancel={() => { void auth.signOut() }} />
  }
  if (!auth.user) return <AuthScreen />
  return <Workspace repository={cloudRepository} user={auth.user} onSignOut={auth.signOut} />
}

function DemoEntry() {
  const [started, setStarted] = useState(() => sessionStorage.getItem('hogar-control-demo-started') === 'yes')
  const repository = useMemo(() => new DemoRepository(), [])

  if (!started) {
    return (
      <main className="demo-gate">
        <section className="demo-gate-card">
          <div className="auth-brand"><BrandMark /><div><strong>Hogar Control</strong><span>Base compartida v0.3</span></div></div>
          <span className="eyebrow">Supabase pendiente de conectar</span>
          <h1>La aplicación está lista para probarse en modo demostración.</h1>
          <p>Esta modalidad conserva la interfaz y la lógica completa de inventario, pero almacena los datos solamente en este navegador. Al agregar las variables de Supabase aparecerán el registro, los hogares compartidos, las invitaciones y la sincronización.</p>
          <div className="demo-feature-grid">
            <article><strong>React + TypeScript</strong><span>Interfaz modular preparada para crecer.</span></article>
            <article><strong>Esquema seguro</strong><span>Roles, RLS, fotografías privadas y funciones transaccionales.</span></article>
            <article><strong>Migración incluida</strong><span>Importación de copias JSON de la v0.1.</span></article>
          </div>
          <button className="primary-button" type="button" onClick={() => {
            sessionStorage.setItem('hogar-control-demo-started', 'yes')
            setStarted(true)
          }}>Abrir demostración</button>
          <small className="demo-gate-note">Para activar la nube, copia <code>.env.example</code> como <code>.env.local</code> y ejecuta las migraciones SQL incluidas.</small>
        </section>
      </main>
    )
  }

  return (
    <Workspace
      repository={repository}
      userId="demo-user"
      onSignOut={async () => {
        sessionStorage.removeItem('hogar-control-demo-started')
        setStarted(false)
      }}
    />
  )
}

interface WorkspaceProps {
  repository: InventoryRepository
  user?: User
  userId?: string
  onSignOut(): Promise<void>
}

function Workspace({ repository, user, userId: explicitUserId, onSignOut }: WorkspaceProps) {
  const userId = user?.id ?? explicitUserId ?? ''
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [activeHouseholdId, setActiveHouseholdId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const hasLoadedMemberships = useRef(false)

  const loadMemberships = useCallback(async (preferredHouseholdId?: string) => {
    if (!hasLoadedMemberships.current) setLoading(true)
    try {
      const rows = await repository.listMemberships(userId)
      setMemberships(rows)
      const storageKey = `hogar-control-active-${userId}`
      const stored = localStorage.getItem(storageKey) ?? ''
      const next = preferredHouseholdId && rows.some((item) => item.household_id === preferredHouseholdId)
        ? preferredHouseholdId
        : rows.some((item) => item.household_id === stored)
          ? stored
          : rows[0]?.household_id ?? ''
      setActiveHouseholdId(next)
      if (next) localStorage.setItem(storageKey, next)
      setError('')
    } catch (caught) {
      setError(errorMessage(caught, 'No fue posible consultar tus hogares.'))
    } finally {
      hasLoadedMemberships.current = true
      setLoading(false)
    }
  }, [repository, userId])

  useEffect(() => {
    void loadMemberships()
  }, [loadMemberships])

  function switchHousehold(householdId: string) {
    setActiveHouseholdId(householdId)
    localStorage.setItem(`hogar-control-active-${userId}`, householdId)
  }

  if (loading) return <LoadingScreen message="Consultando tus hogares…" />

  if (error) {
    return (
      <main className="center-screen">
        <section className="loading-card error-state-card">
          <BrandMark />
          <div><strong>No se pudo abrir la aplicación</strong><span>{error}</span></div>
          <button className="primary-button" type="button" onClick={() => void loadMemberships()}>Reintentar</button>
        </section>
      </main>
    )
  }

  if (!memberships.length) {
    if (!user) return <LoadingScreen message="Preparando la demostración…" />
    return (
      <OnboardingScreen
        user={user}
        repository={repository}
        onReady={async (householdId) => loadMemberships(householdId)}
        onSignOut={onSignOut}
      />
    )
  }

  const membership = memberships.find((item) => item.household_id === activeHouseholdId) ?? memberships[0]
  return (
    <HouseholdApp
      repository={repository}
      membership={membership}
      memberships={memberships}
      onSwitch={switchHousehold}
      onMembershipsChanged={loadMemberships}
      onSignOut={onSignOut}
    />
  )
}
