// Builds the flat list of upcoming reminder fire-times to hand to the push
// server. The CLIENT does this (it has the correct timezone + recurrence logic
// from dates.js), so the Worker can stay a dumb timed dispatcher — no server
// timezone math, no payload encryption.

import { nextOccurrence, recurrenceOf, addDays, UNIT_MS } from './dates.js'
import { tierMs } from './reminderTiers.js'
import { tiersFor } from './notifications.js'
import { typeMeta } from './eventTypes.js'

const HORIZON_DAYS = 45 // how far ahead to expand recurrences

/** Expand an event into its occurrence Dates within the horizon. */
function occurrencesWithin(event, now, horizonEnd) {
  const rec = recurrenceOf(event)
  const out = []
  let cursor = new Date(now)
  let guard = 0
  while (guard++ < 400) {
    const occ = nextOccurrence({ ...event }, cursor)
    if (occ.getTime() > horizonEnd) break
    out.push(occ)
    if (rec === 'once') break
    // advance the cursor just past this occurrence to find the next one
    cursor = new Date(occ.getTime() + 60_000)
    if (rec === 'yearly') cursor = new Date(occ.getTime() + UNIT_MS.day) // year handled by nextOccurrence
  }
  return out
}

/**
 * Flat schedule: one entry per (occurrence × tier) whose fire time is in the
 * future and within the horizon. Each entry is self-contained so the server
 * just needs a clock.
 */
export function buildSchedule(events, settings, now = new Date()) {
  const nowMs = now.getTime()
  const horizonEnd = addDays(now, HORIZON_DAYS).getTime()
  const out = []

  for (const ev of events) {
    const tiers = tiersFor(ev, settings)
    if (!tiers.length) continue
    const meta = typeMeta(ev.type)
    for (const occ of occurrencesWithin(ev, now, horizonEnd)) {
      for (const key of tiers) {
        const at = occ.getTime() - tierMs(key)
        if (at < nowMs || at > horizonEnd) continue
        out.push({
          at,
          key: `${ev.id}|${occ.getTime()}|${key}`,
          title: `${meta.emoji} ${ev.name}`,
          body: ev.notes || ev.name,
        })
      }
    }
  }
  out.sort((a, b) => a.at - b.at)
  return out
}
