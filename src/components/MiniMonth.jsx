import { eventsOnDate, isSameDay } from '../lib/dates.js'
import { typeMeta } from '../lib/eventTypes.js'
import { useI18n } from '../lib/i18n.jsx'

/** Build a 6-row × 7-col grid of Dates covering this month, weekStart-aligned. */
function grid(year, month, weekStart) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() - weekStart + 7) % 7
  const start = new Date(year, month, 1 - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

/**
 * A tiny month tile for the year-view grid. The month LABEL drills into the
 * full month view; individual DAY cells select that specific day directly —
 * so the whole year is browsable without zooming in first.
 */
export default function MiniMonth({ year, month, events, today, weekStart, onPickMonth, onPickDay }) {
  const { locale } = useI18n()
  const cells = grid(year, month, weekStart)
  const label = new Date(year, month, 1).toLocaleDateString(locale, { month: 'short' })

  return (
    <div className="mini">
      <button type="button" className="mini__label" onClick={() => onPickMonth(year, month)} title={label}>
        {label}
      </button>
      <div className="mini__grid">
        {cells.map((day) => {
          const inMonth = day.getMonth() === month
          const isToday = isSameDay(day, today)
          const dayEvents = inMonth ? eventsOnDate(events, day) : []
          const important = dayEvents.length > 0
          const accent = important ? typeMeta(dayEvents[0].type).accent : null
          return (
            <button
              key={day.toISOString()}
              type="button"
              className={[
                'mini__cell',
                inMonth ? '' : 'mini__cell--muted',
                isToday ? 'mini__cell--today' : '',
                important ? 'mini__cell--important' : '',
              ].join(' ')}
              style={accent ? { '--accent': accent } : undefined}
              onClick={() => inMonth && onPickDay(day, dayEvents)}
              disabled={!inMonth}
              title={important ? dayEvents.map((e) => e.name).join(', ') : ''}
              aria-hidden={!inMonth}
              tabIndex={inMonth ? 0 : -1}
            >
              {inMonth ? day.getDate() : ''}
            </button>
          )
        })}
      </div>
    </div>
  )
}
