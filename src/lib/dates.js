// Date engine. Turns a stored event into "when is it next, how soon, how old".
// Events now carry a recurrence rule and a time-of-day, so the same engine
// serves yearly birthdays (day-granular) and daily workouts (minute-granular).
// Pure functions, no React — unit-tested in scripts/test-dates.mjs.

export const UNIT_MS = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
}

export const RECURRENCES = ['once', 'yearly', 'weekly', 'daily']

/** Recurrence-rule of an event, tolerating the legacy `recurring` boolean. */
export function recurrenceOf(event) {
  if (event.recurrence) return event.recurrence
  return event.recurring === false ? 'once' : 'yearly'
}

/** Daily/weekly events are "timed" — their countdown is minute-granular. */
export function isTimed(event) {
  const r = recurrenceOf(event)
  return r === 'daily' || r === 'weekly'
}

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISODate(date) {
  const d = startOfDay(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** A Date for `date` at the event's time-of-day (defaults to 09:00). */
function atTime(date, time) {
  const d = startOfDay(date)
  const [h, m] = (time || '09:00').split(':').map(Number)
  d.setHours(h, m, 0, 0)
  return d
}

/**
 * The next time this event occurs, as a full Date (with time).
 * - yearly/once roll only after the calendar DAY passes (the date is relevant
 *   all day — a birthday at 09:00 still reads as "today" at 3pm).
 * - daily/weekly roll after the timed MOMENT passes (the next workout).
 */
export function nextOccurrence(event, now = new Date()) {
  const base = parseISODate(event.date)
  const rec = recurrenceOf(event)
  const time = event.time

  if (rec === 'once') return atTime(base, time)

  if (rec === 'yearly') {
    let occ = atTime(new Date(now.getFullYear(), base.getMonth(), base.getDate()), time)
    if (startOfDay(occ) < startOfDay(now)) occ = atTime(new Date(now.getFullYear() + 1, base.getMonth(), base.getDate()), time)
    return occ
  }

  if (rec === 'daily') {
    let occ = atTime(now, time)
    if (occ.getTime() < now.getTime()) occ = atTime(addDays(now, 1), time)
    return occ
  }

  if (rec === 'weekly') {
    const wd = base.getDay()
    const offset = (wd - now.getDay() + 7) % 7
    let occ = atTime(addDays(now, offset), time)
    if (occ.getTime() < now.getTime()) occ = atTime(addDays(now, offset + 7), time)
    return occ
  }

  return atTime(base, time)
}

/** Milliseconds until the next occurrence (can be slightly negative on the day). */
export function msUntil(event, now = new Date()) {
  return nextOccurrence(event, now).getTime() - now.getTime()
}

/** Whole calendar days until the next occurrence (0 = today). */
export function daysUntil(event, now = new Date()) {
  const occ = startOfDay(nextOccurrence(event, now))
  return Math.round((occ - startOfDay(now)) / UNIT_MS.day)
}

/** Age turned / years reached at the next occurrence (yearly birthday/anniversary). */
export function milestoneAt(event, now = new Date()) {
  if (recurrenceOf(event) !== 'yearly') return null
  if (event.type !== 'birthday' && event.type !== 'anniversary') return null
  const base = parseISODate(event.date)
  const occ = nextOccurrence(event, now)
  const years = occ.getFullYear() - base.getFullYear()
  return years > 0 ? years : null
}

/** Localized countdown — minute-granular for timed events, day-granular otherwise. */
export function formatCountdown(event, now, t) {
  if (isTimed(event)) {
    const ms = Math.max(0, msUntil(event, now))
    const min = Math.round(ms / UNIT_MS.minute)
    if (min < 1) return t('count.now')
    if (min < 60) return t('count.inMin', { n: min })
    const hr = Math.round(min / 60)
    if (hr < 24) return t('count.inHours', { n: hr })
    return t('count.inDays', { n: Math.round(hr / 24) })
  }
  const days = daysUntil(event, now)
  if (days <= 0) return t('count.today')
  if (days === 1) return t('count.tomorrow')
  if (days < 7) return t('count.inDays', { n: days })
  if (days < 14) return t('count.nextWeek')
  if (days < 31) return t('count.inWeeks', { n: Math.round(days / 7) })
  if (days < 365) return t('count.inMonths', { n: Math.round(days / 30) })
  return t('count.inYear', { n: Math.round(days / 365) })
}

/** e.g. "Mon, Jun 9" — plus the time for timed events. */
export function formatOccurrence(event, now, locale) {
  const occ = nextOccurrence(event, now)
  const date = occ.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })
  if (!isTimed(event) && !event.time) return date
  if (!isTimed(event)) return date
  const time = occ.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

/** Sort by soonest actual moment. Returns a new array. */
export function sortByUpcoming(events, now = new Date()) {
  return [...events].sort((a, b) => msUntil(a, now) - msUntil(b, now))
}

/**
 * Which date-specific events land on a calendar `day` (for the month grid).
 * Only yearly + once are date-pinned; daily/weekly are schedules and would
 * flood every cell, so they're shown in the Upcoming list instead.
 */
export function eventsOnDate(events, day) {
  return events.filter((e) => {
    const rec = recurrenceOf(e)
    if (rec === 'daily' || rec === 'weekly') return false
    const base = parseISODate(e.date)
    if (rec === 'yearly') {
      return base.getMonth() === day.getMonth() && base.getDate() === day.getDate()
    }
    return isSameDay(base, day)
  })
}
