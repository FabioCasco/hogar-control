import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const key = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  ''
).trim()

const looksConfigured =
  /^https:\/\/.+\.supabase\.co$/i.test(url) &&
  key.length > 20 &&
  !url.includes('TU-PROYECTO') &&
  !key.includes('REEMPLAZAR')

export const isSupabaseConfigured = looksConfigured

export const supabase = looksConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase todavía no está configurado. Revisa el archivo .env.local.')
  }
  return supabase
}
