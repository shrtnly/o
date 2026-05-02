import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // 'pkce' is the default in v2 but causes SIGNED_IN to fire on every tab return.
    // 'implicit' suppresses that behavior for existing sessions.
    flowType: 'pkce',
    // Custom storage key to avoid conflicts
    storageKey: 'beelesson-auth-token',
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    },
    // Timeout before WebSocket reconnects — prevents cascade of events on tab return
    timeout: 30000,
  },
  db: {
    schema: 'public'
  }
})
