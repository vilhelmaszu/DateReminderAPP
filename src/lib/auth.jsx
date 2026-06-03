import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseEnabled } from './supabase.js'

// Auth context: exposes the current user, sign-in, and sign-out across the app.
// Magic-link only — no passwords. The flow is:
//   1. User types email → signInWithEmail() → Supabase sends a one-time link.
//   2. User taps link in their inbox → returns to the app's URL with tokens.
//   3. Supabase parses those tokens (detectSessionInUrl), session is created,
//      onAuthStateChange fires and the rest of the app reacts.

const AuthContext = createContext({
  user: null,
  loading: false,
  enabled: false,
  signInWithEmail: async () => ({ error: new Error('not configured') }),
  signOut: async () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // `loading` covers the initial session-rehydration so the UI can render a
  // brief spinner instead of flashing "Signed out" → "Signed in".
  const [loading, setLoading] = useState(supabaseEnabled)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setUser(data?.session?.user ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      cancelled = true
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  async function signInWithEmail(email) {
    if (!supabase) return { error: new Error('not configured') }
    return supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        // Magic-link bounces back to wherever the user clicked from. Using
        // origin (not href) so query strings don't pile up on each round-trip.
        emailRedirectTo: window.location.origin,
      },
    })
  }

  async function signInWithPassword(email, password) {
    if (!supabase) return { error: new Error('not configured') }
    return supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
  }

  async function signUpWithPassword(email, password) {
    if (!supabase) return { error: new Error('not configured') }
    return supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: window.location.origin },
    })
  }

  async function setPassword(password) {
    if (!supabase) return { error: new Error('not configured') }
    return supabase.auth.updateUser({ password })
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        enabled: supabaseEnabled,
        signInWithEmail,
        signInWithPassword,
        signUpWithPassword,
        setPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
