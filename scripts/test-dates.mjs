// Quick sanity tests for the date engine. Run: node scripts/test-dates.mjs
import { nextOccurrence, daysUntil, msUntil, milestoneAt, isTimed, recurrenceOf, UNIT_MS } from '../src/lib/dates.js'

let pass = 0, fail = 0
const eq = (name, got, want) => {
  const ok = String(got) === String(want)
  console.log(`${ok ? '✓' : '✗'} ${name}  got=${got} want=${want}`)
  ok ? pass++ : fail++
}

const NOW = new Date(2026, 4, 30, 14, 0, 0) // Sat 2026-05-30 14:00 local

// Yearly birthday June 9 — still upcoming this year
const mom = { type: 'birthday', date: '1968-06-09', time: '09:00', recurrence: 'yearly' }
eq('yearly next month', nextOccurrence(mom, NOW).getMonth(), 5)        // June
eq('yearly daysUntil', daysUntil(mom, NOW), 10)
eq('yearly milestone (turns 58)', milestoneAt(mom, NOW), 58)

// Yearly that already passed this year (Jan 1) -> next year
const ny = { type: 'holiday', date: '2026-01-01', time: '09:00', recurrence: 'yearly' }
eq('passed yearly rolls to next year', nextOccurrence(ny, NOW).getFullYear(), 2027)

// All-day birthday TODAY should read as today (not roll forward) even past 09:00
const todayBday = { type: 'birthday', date: '1990-05-30', time: '09:00', recurrence: 'yearly' }
eq('yearly today stays today', daysUntil(todayBday, NOW), 0)

// Daily workout at 07:30 — already passed today (now 14:00) -> tomorrow 07:30
const workout = { type: 'other', date: '2026-05-30', time: '07:30', recurrence: 'daily' }
eq('daily rolls to tomorrow when past', nextOccurrence(workout, NOW).getDate(), 31)
eq('daily is timed', isTimed(workout), true)

// Daily workout later today (18:00) -> today 18:00, ~4h away
const eveningWorkout = { type: 'other', date: '2026-05-30', time: '18:00', recurrence: 'daily' }
eq('daily later today stays today', nextOccurrence(eveningWorkout, NOW).getDate(), 30)
eq('daily ~4h away (minutes)', Math.round(msUntil(eveningWorkout, NOW) / UNIT_MS.minute), 240)

// Weekly on a Tuesday (base 2026-06-02 is a Tue) from Sat -> next Tue
const weekly = { type: 'other', date: '2026-06-02', time: '08:00', recurrence: 'weekly' }
eq('weekly lands on Tuesday', nextOccurrence(weekly, NOW).getDay(), 2)

// Legacy migration: recurring:true -> yearly, recurring:false -> once
eq('legacy recurring true', recurrenceOf({ recurring: true }), 'yearly')
eq('legacy recurring false', recurrenceOf({ recurring: false }), 'once')

// Once event keeps its date
const once = { type: 'other', date: '2026-12-25', time: '09:00', recurrence: 'once' }
eq('once keeps year', nextOccurrence(once, NOW).getFullYear(), 2026)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
