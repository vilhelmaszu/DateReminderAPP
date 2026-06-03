import { useEffect, useRef, useState } from 'react'
import { loadEvents, saveEvents, makeEvent } from './storage.js'
import { loadSettings, saveSettings } from './settings.js'
import {
  fetchCloudEvents,
  upsertCloudEvent,
  deleteCloudEvent,
  uploadAllEvents,
  fetchCloudSettings,
  upsertCloudSettings,
  subscribeEvents,
  subscribeSettings,
  unsubscribe,
  rowToEvent,
} from './cloudStorage.js'

/**
 * One hook that returns the events + settings as state, plus mutation
 * functions, while transparently swapping the backing store:
 *   - `user` is null → localStorage (today's behavior, fully offline).
 *   - `user` set    → Supabase cloud + a localStorage mirror for offline reads.
 *
 * It also subscribes to realtime so changes from other devices show up in
 * about a second, and migrates local data up on first sign-in.
 *
 * Returns:
 *   events, settings           — current state
 *   addEvent, updateEvent,
 *   deleteEvent, setSettings   — mutations (async, but UI is updated optimistically)
 *   syncStatus                 — 'idle' | 'loading' | 'ready' | 'error'
 *   migrationInfo              — { local, cloud } when the user has both, or null
 *   resolveMigration(choice)   — call with 'cloud' | 'local' | 'merge' to finish
 */
export function useSyncedStore(user) {
  const [events, setEventsState] = useState(() => loadEvents())
  const [settings, setSettingsState] = useState(() => loadSettings())
  const [syncStatus, setSyncStatus] = useState(user ? 'loading' : 'ready')
  const [migrationInfo, setMigrationInfo] = useState(null)

  // Refs the realtime handlers / mutations can read without re-subscribing.
  const userRef = useRef(user)
  userRef.current = user

  // ----------------------------- Effect: init / re-init on user change
  useEffect(() => {
    if (!user) {
      // Signed out: revert to localStorage source of truth.
      setEventsState(loadEvents())
      setSettingsState(loadSettings())
      setSyncStatus('ready')
      setMigrationInfo(null)
      return
    }

    setSyncStatus('loading')
    let cancelled = false
    let eventsChannel = null
    let settingsChannel = null

    // Once a user has synced from this device, we treat the cloud as truth and
    // skip the migration prompt on every subsequent sign-in. This flag is
    // per-user so logging in as a different person still triggers the dialog.
    const syncedKey = `date-reminder/synced-with-${user.id}`
    const alreadySynced = localStorage.getItem(syncedKey) === '1'

    async function init() {
      // Track whether the migration prompt was raised in this init pass; if so
      // we defer setting the synced-flag until the user resolves the prompt.
      let migrationPending = false
      try {
        const [cloudEvents, cloudSettings] = await Promise.all([
          fetchCloudEvents(),
          fetchCloudSettings(),
        ])
        if (cancelled) return

        const localEvents = loadEvents()
        const localSettings = loadSettings()

        // ---- Migration decisions ----
        if (alreadySynced) {
          // Returning user on this device: cloud is the truth, no prompt.
          setEventsState(cloudEvents)
          saveEvents(cloudEvents)
          if (cloudSettings) setSettingsState({ ...cloudSettings })
        } else if (cloudEvents.length === 0 && localEvents.length > 0) {
          // Local has data, cloud is empty → push local up. No prompt needed.
          await uploadAllEvents(localEvents, user.id)
          if (cloudSettings == null) {
            await upsertCloudSettings(localSettings, user.id)
          }
          const refetched = await fetchCloudEvents()
          if (cancelled) return
          setEventsState(refetched)
          saveEvents(refetched) // keep the mirror in sync
          setSettingsState(localSettings)
        } else if (cloudEvents.length > 0 && localEvents.length > 0) {
          // Both have data → ask the user via migrationInfo.
          // While the user decides, show what's currently in the CLOUD.
          setEventsState(cloudEvents)
          saveEvents(cloudEvents)
          if (cloudSettings) setSettingsState({ ...cloudSettings })
          setMigrationInfo({
            local: localEvents.length,
            cloud: cloudEvents.length,
            // Stash local copies so the resolver can act on them
            _local: localEvents,
            _localSettings: localSettings,
          })
          migrationPending = true
        } else {
          // Cloud has it (or both empty) → cloud is authoritative.
          setEventsState(cloudEvents)
          saveEvents(cloudEvents)
          if (cloudSettings) setSettingsState({ ...cloudSettings })
        }

        // ---- Subscribe to realtime ----
        eventsChannel = subscribeEvents(user.id, (payload) => {
          setEventsState((prev) => applyEventChange(prev, payload))
        })
        settingsChannel = subscribeSettings(user.id, (payload) => {
          if (payload.eventType === 'DELETE') return
          const data = payload.new?.data
          if (data && typeof data === 'object') {
            setSettingsState((prev) => ({ ...prev, ...data }))
          }
        })

        // Mark this device as "has synced this user" so future sign-ins skip
        // the migration prompt — UNLESS the user is still being asked to resolve
        // the prompt (the flag is set inside resolveMigration in that case).
        if (!cancelled && !migrationPending) {
          localStorage.setItem(syncedKey, '1')
        }
        if (!cancelled) setSyncStatus('ready')
      } catch (e) {
        console.error('cloud sync init failed', e)
        if (!cancelled) setSyncStatus('error')
      }
    }

    init()

    return () => {
      cancelled = true
      unsubscribe(eventsChannel)
      unsubscribe(settingsChannel)
    }
  }, [user?.id])

  // ----------------------------- Mirror events to localStorage on every change
  // (Acts as offline cache + as a safety net even when signed in.)
  useEffect(() => { saveEvents(events) }, [events])
  useEffect(() => { saveSettings(settings) }, [settings])

  // ----------------------------- Mutations
  async function addEvent(form) {
    const event = makeEvent(form)
    setEventsState((prev) => [...prev, event])
    if (userRef.current) {
      try { await upsertCloudEvent(event, userRef.current.id) }
      catch (e) {
        console.error('add to cloud failed', e)
        setEventsState((prev) => prev.filter((x) => x.id !== event.id))
        throw e
      }
    }
  }

  async function updateEvent(id, patch) {
    let updated = null
    setEventsState((prev) => prev.map((e) => {
      if (e.id !== id) return e
      updated = { ...e, ...patch }
      return updated
    }))
    if (userRef.current && updated) {
      try { await upsertCloudEvent(updated, userRef.current.id) }
      catch (e) { console.error('update in cloud failed', e); throw e }
    }
  }

  async function deleteEvent(id) {
    const snapshot = events
    setEventsState((prev) => prev.filter((e) => e.id !== id))
    if (userRef.current) {
      try { await deleteCloudEvent(id) }
      catch (e) {
        console.error('delete in cloud failed', e)
        setEventsState(snapshot) // rollback on failure
        throw e
      }
    }
  }

  async function setSettings(updater) {
    let next = settings
    setSettingsState((prev) => {
      next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      return next
    })
    if (userRef.current) {
      try { await upsertCloudSettings(next, userRef.current.id) }
      catch (e) { console.error('settings to cloud failed', e) }
    }
  }

  // ----------------------------- Migration resolver
  async function resolveMigration(choice) {
    if (!migrationInfo || !userRef.current) return
    const uid = userRef.current.id
    setSyncStatus('loading')
    try {
      if (choice === 'local') {
        // Wipe cloud, push local up
        const cloud = await fetchCloudEvents()
        await Promise.all(cloud.map((e) => deleteCloudEvent(e.id)))
        await uploadAllEvents(migrationInfo._local, uid)
        await upsertCloudSettings(migrationInfo._localSettings, uid)
        const refetched = await fetchCloudEvents()
        setEventsState(refetched); saveEvents(refetched)
        setSettingsState(migrationInfo._localSettings)
      } else if (choice === 'merge') {
        // Push local up; existing cloud rows with the same id win (upsert)
        // BUT we want LOCAL to lose conflicts here — so only push the locals
        // whose IDs aren't already in cloud.
        const cloud = await fetchCloudEvents()
        const cloudIds = new Set(cloud.map((e) => e.id))
        const toUpload = migrationInfo._local.filter((e) => !cloudIds.has(e.id))
        if (toUpload.length) await uploadAllEvents(toUpload, uid)
        const refetched = await fetchCloudEvents()
        setEventsState(refetched); saveEvents(refetched)
      }
      // 'cloud' → no-op; we already showed cloud during the prompt
      localStorage.setItem(`date-reminder/synced-with-${uid}`, '1')
      setMigrationInfo(null)
      setSyncStatus('ready')
    } catch (e) {
      console.error('migration failed', e)
      setSyncStatus('error')
    }
  }

  return {
    events, settings,
    addEvent, updateEvent, deleteEvent, setSettings,
    syncStatus, migrationInfo, resolveMigration,
  }
}

// Apply a realtime payload to the current events array.
function applyEventChange(prev, payload) {
  const type = payload.eventType
  if (type === 'INSERT' || type === 'UPDATE') {
    const e = rowToEvent(payload.new)
    const i = prev.findIndex((x) => x.id === e.id)
    if (i === -1) return [...prev, e]
    const next = prev.slice()
    next[i] = e
    return next
  }
  if (type === 'DELETE') {
    const id = payload.old?.id
    return id ? prev.filter((e) => e.id !== id) : prev
  }
  return prev
}
