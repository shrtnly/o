import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // PKCE is required for OAuth (Google) flows
    flowType: 'pkce',
    // Custom storage key to avoid conflicts with other apps
    storageKey: 'beelesson-auth-token',
  },
  // Do NOT set global realtime params here — doing so causes the Supabase client
  // to attempt a WebSocket handshake immediately on creation, which triggers the
  // Cloudflare __cf_bm cookie rejection error and blocks the first REST API calls.
  // Realtime channels still work fine; they just connect lazily when subscribed.
  db: {
    schema: 'public'
  }
})
