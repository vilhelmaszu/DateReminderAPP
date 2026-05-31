import { useMemo, useState } from 'react'
import { eventsOnDate, isSameDay } from '../lib/dates.js'
import { typeMeta } from '../lib/eventTypes.js'
import { useI18n } from '../lib/i18n.jsx'
import MiniMonth from './MiniMonth.jsx'

/** Build the 6-week grid (42 cells) covering the given month. */
function monthGrid(year, month, weekStart) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() - weekStart + 7) % 7
  const start = new Date(year, month, 1 - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export default function Calendar({ events, today, onSelectDate, weekStart = 0 }) {
  const { t, locale } = useI18n()
  const [mode, setMode] = useState('month') // 'month' | 'year'
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const year = view.getFullYear()
  const month = view.getMonth()
  const cells = monthGrid(year, month, weekStart)

  const weekdays = useMemo(() => (
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2023, 0, 1 + ((i + weekStart) % 7))
      return d.toLocaleDateString(locale, { weekday: 'short' })
    })
  ), [locale, weekStart])

  function shiftMonth(delta) {
    setView(new Date(year, month + delta, 1))
  }
  function shiftYear(delta) {
    setView(new Date(year + delta, month, 1))
  }

  const headLabel =
    mode === 'month'
      ? view.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
      : String(year)

  return (
    <section className="cal">
      <div className="cal__head">
        <h2 className="cal__title">{headLabel}</h2>
        <div className="cal__headRight">
          <div className="cal__viewToggle">
            <button
              className={`seg__btn ${mode === 'month' ? 'is-active' : ''}`}
              onClick={() => setMode('month')}
            >
              {t('cal.month')}
            </button>
            <button
              className={`seg__btn ${mode === 'year' ? 'is-active' : ''}`}
              onClick={() => setMode('year')}
            >
              {t('cal.year')}
            </button>
          </div>
          <div className="cal__nav">
            <button
              className="cal__navBtn"
              onClick={() => (mode === 'month' ? shiftMonth(-1) : shiftYear(-1))}
              aria-label={t('cal.prevMonth')}
            >
              ‹
            </button>
            <button
              className="cal__today"
              onClick={() => setView(new Date(today.getFullYear(), today.getMonth(), 1))}
            >
              {t('cal.today')}
            </button>
            <button
              className="cal__navBtn"
              onClick={() => (mode === 'month' ? shiftMonth(1) : shiftYear(1))}
              aria-label={t('cal.nextMonth')}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {mode === 'month' ? (
        <>
          <div className="cal__weekdays">
            {weekdays.map((w, i) => <span key={i} className="cal__weekday">{w}</span>)}
          </div>
          <div className="cal__grid">
            {cells.map((day) => {
              const inMonth = day.getMonth() === month
              const isToday = isSameDay(day, today)
              const dayEvents = eventsOnDate(events, day)
              const important = dayEvents.length > 0
              // Color the cell with the FIRST event's category accent — so the
              // calendar reads as a category heatmap (purple birthdays, red
              // holidays, pink anniversaries, blue other). Dots still show the
              // mix when multiple types fall on the same day.
              const accent = important ? typeMeta(dayEvents[0].type).accent : null
              return (
                <button
                  key={day.toISOString()}
                  className={[
                    'cal__cell',
                    inMonth ? '' : 'cal__cell--muted',
                    isToday ? 'cal__cell--today' : '',
                    important ? 'cal__cell--important' : '',
                  ].join(' ')}
                  style={accent ? { '--accent': accent } : undefined}
                  onClick={() => onSelectDate(day, dayEvents)}
                  title={important ? dayEvents.map((e) => e.name).join(', ') : t('cal.addTitle')}
                >
                  <span className="cal__num">{day.getDate()}</span>
                  {important && (
                    <span className="cal__dots">
                      {dayEvents.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className="cal__dot"
                          style={{ background: typeMeta(e.type).accent }}
                        />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="cal__hint">{t('cal.hint')}</p>
        </>
      ) : (
        <div className="cal__yearGrid">
          {Array.from({ length: 12 }, (_, m) => (
            <MiniMonth
              key={m}
              year={year}
              month={m}
              events={events}
              today={today}
              weekStart={weekStart}
              onPickMonth={(y, mo) => {
                setView(new Date(y, mo, 1))
                setMode('month')
              }}
              onPickDay={(day, dayEvents) => onSelectDate(day, dayEvents)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
