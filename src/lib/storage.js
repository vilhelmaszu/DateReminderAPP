// Persistence layer. Today it's localStorage; isolating it here means swapping
// in a real backend later only touches this file, not the components.

import { toISODate, recurrenceOf } from './dates.js'

const STORAGE_KEY = 'date-reminder/events'

/** A few sample events so a fresh install isn't an empty void. */
function seedEvents() {
  const thisYear = new Date().getFullYear()
  return [
    mk({ id: 'seed-1', name: 'Mom', type: 'birthday', date: `${thisYear - 58}-06-09`, recurrence: 'yearly', notes: 'Loves tulips.' }),
    mk({ id: 'seed-2', name: "New Year's Day", type: 'holiday', date: `${thisYear}-01-01`, recurrence: 'yearly' }),
    mk({ id: 'seed-3', name: 'Wedding anniversary', type: 'anniversary', date: `${thisYear - 4}-09-21`, recurrence: 'yearly' }),
    mk({ id: 'seed-4', name: 'Morning workout', type: 'other', date: toISODate(new Date()), recurrence: 'daily', time: '07:30' }),
  ]
}

/** Normalize one record to the current shape (fills new fields, drops legacy). */
function mk(e) {
  return {
    id: e.id,
    name: e.name,
    type: e.type,
    date: e.date,
    time: e.time || '09:00',
    recurrence: recurrenceOf(e),
    notes: e.notes || '',
    reminders: Array.isArray(e.reminders) ? e.reminders : null, // null = use type defaults
  }
}

export function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      const seeded = seedEvents()
      saveEvents(seeded)
      return seeded
    }
    // Migrate every record on load (legacy events had `recurring`, no time).
    return JSON.parse(raw).map(mk)
  } catch {
    return []
  }
}

export function saveEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
}

/** Build a new event from form fields, normalizing the date. */
export function makeEvent({ name, type, date, time, recurrence, notes, reminders }) {
  return mk({
    id: `evt-${crypto.randomUUID()}`,
    name: name.trim(),
    type,
    date: toISODate(date),
    time,
    recurrence,
    notes: (notes || '').trim(),
    reminders,
  })
}
