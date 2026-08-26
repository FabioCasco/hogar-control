import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { requireSupabase } from '../lib/supabase'

interface AuthContextValue {
  user: User | null
  loading: boolean
  passwordRecovery: boolean
  signOut(): Promise<void>
  updatePassword(password: string): Promise<void>
  clearPasswordRecovery(): void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    const client = requireSupabase()
    let active = true

    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) console.warn('No fue posible restaurar la sesión.', error)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    passwordRecovery,
    async signOut() {
      const { error } = await requireSupabase().auth.signOut()
      if (error) throw error
      setPasswordRecovery(false)
    },
    async updatePassword(password: string) {
      const { error } = await requireSupabase().auth.updateUser({ password })
      if (error) throw error
      setPasswordRecovery(false)
    },
    clearPasswordRecovery() {
      setPasswordRecovery(false)
    },
  }), [loading, passwordRecovery, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider.')
  return context
}
