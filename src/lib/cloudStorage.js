// Cloud read/write layer — wraps Supabase calls for events + settings, plus
// the realtime subscription so updates from other devices land within ~1s.
//
// Used only when the user is signed in. When signed out, we go through
// storage.js (localStorage) exactly like before.

import { supabase } from './supabase.js'

// ---------- Row ↔ event mapping ----------

function rowToEvent(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    date: row.date,                       // DATE comes back as 'YYYY-MM-DD'
    time: row.time || '09:00',
    recurrence: row.recurrence || 'yearly',
    reminders: row.reminders ?? null,     // null = use type defaults
    notes: row.notes || '',
  }
}

function eventToRow(event, userId) {
  return {
    id: event.id,
    user_id: userId,
    name: event.name,
    type: event.type,
    date: event.date,
    time: event.time || '09:00',
    recurrence: event.recurrence || 'yearly',
    reminders: Array.isArray(event.reminders) ? event.reminders : null,
    notes: event.notes || '',
  }
}

// ---------- Events ----------

export async function fetchCloudEvents() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data.map(rowToEvent)
}

export async function upsertCloudEvent(event, userId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('events')
    .upsert(eventToRow(event, userId), { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return rowToEvent(data)
}

export async function deleteCloudEvent(id) {
  if (!supabase) return
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}

/** Push every local event up. Used during first-sign-in migration. */
export async function uploadAllEvents(events, userId) {
  if (!supabase || !events.length) return
  const rows = events.map((e) => eventToRow(e, userId))
  const { error } = await supabase.from('events').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

// ---------- Settings (a single JSON blob per user) ----------

export async function fetchCloudSettings() {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('settings')
    .select('data')
    .maybeSingle()
  if (error) throw error
  return data?.data ?? null
}

export async function upsertCloudSettings(settings, userId) {
  if (!supabase) return
  const { error } = await supabase
    .from('settings')
    .upsert(
      { user_id: userId, data: settings },
      { onConflict: 'user_id' },
    )
  if (error) throw error
}

// ---------- Realtime ----------

/**
 * Subscribe to changes on this user's events. `onChange(payload)` is called
 * for every INSERT/UPDATE/DELETE. Returns the channel — pass to `unsubscribe()`.
 * Server-side RLS already restricts what's visible; the filter is just an
 * efficiency hint so we don't process other users' rows.
 */
export function subscribeEvents(userId, onChange) {
  if (!supabase) return null
  return supabase
    .channel(`events:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'events', filter: `user_id=eq.${userId}` },
      (payload) => onChange(payload),
    )
    .subscribe()
}

export function subscribeSettings(userId, onChange) {
  if (!supabase) return null
  return supabase
    .channel(`settings:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'settings', filter: `user_id=eq.${userId}` },
      (payload) => onChange(payload),
    )
    .subscribe()
}

export function unsubscribe(channel) {
  if (channel && supabase) supabase.removeChannel(channel)
}

export { rowToEvent }
