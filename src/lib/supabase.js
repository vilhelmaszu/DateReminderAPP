// The single Supabase client used for auth, events, and settings sync.
// Configured via two build-time env vars:
//   VITE_SUPABASE_URL          — your project URL (https://<ref>.supabase.co)
//   VITE_SUPABASE_ANON_KEY     — the anon public key (safe to embed; security
//                                comes from Row Level Security, not key secrecy)
// Without them, `supabase` is null and the UI hides cloud-sync surfaces.

import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseEnabled = Boolean(URL && KEY)

export const supabase = supabaseEnabled
  ? createClient(URL, KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Picks up the magic-link tokens dropped into the URL after redirect.
        detectSessionInUrl: true,
        // Keep the session in localStorage under our app's namespace.
        storageKey: 'date-reminder/sb-session',
      },
    })
  : null
