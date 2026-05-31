import { useEffect, useMemo, useState } from 'react'
import { loadEvents, saveEvents, makeEvent } from './lib/storage.js'
import { sortByUpcoming, eventsOnDate, daysUntil } from './lib/dates.js'
import { loadTheme, saveTheme } from './lib/themes.js'
import { loadStyle, saveStyle } from './lib/styles.js'
import { loadSettings, saveSettings } from './lib/settings.js'
import { runReminders } from './lib/notifications.js'
import { syncSchedule, pushConfigured } from './lib/push.js'
import { useNow } from './lib/useNow.js'
import { useI18n } from './lib/i18n.jsx'
import StatBar from './components/StatBar.jsx'
import EventCard from './components/EventCard.jsx'
import AddEventForm from './components/AddEventForm.jsx'
import Calendar from './components/Calendar.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
import DayPanel from './components/DayPanel.jsx'
import Toast from './components/Toast.jsx'
import InstallButton from './components/InstallButton.jsx'

export default function App() {
  const { t, locale } = useI18n()

  const [events, setEvents] = useState(() => loadEvents())
  const [showForm, setShowForm] = useState(false)
  const [pickedDate, setPickedDate] = useState(null)
  const [editing, setEditing] = useState(null) // an event when editing
  const [toast, setToast] = useState(null)     // { message, undo() } or null
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const [theme, setTheme] = useState(() => loadTheme())
  const [style, setStyle] = useState(() => loadStyle())
  const [settings, setSettings] = useState(() => loadSettings())
  const [showSettings, setShowSettings] = useState(false)
  const [dayPanel, setDayPanel] = useState(null) // a Date when the day panel is open

  // Live clock — ticks every 30s so countdowns advance and reminders fire as
  // time passes. Used everywhere `today` is referenced.
  const today = useNow(30_000)

  useEffect(() => { saveEvents(events) }, [events])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    saveTheme(theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.style = style
    saveStyle(style)
  }, [style])

  useEffect(() => {
    document.documentElement.dataset.motion = settings.reduceMotion ? 'reduced' : 'full'
    saveSettings(settings)
  }, [settings])

  // Evaluate reminders on every clock tick and whenever events/tiers change.
  const [notifTick, setNotifTick] = useState(0)
  useEffect(() => {
    runReminders(events, settings, t, today)
  }, [events, settings, t, today, notifTick])

  // If background push is enabled, keep the server's schedule in sync with the
  // current events/tiers. (No-op unless a push backend is configured + subscribed.)
  useEffect(() => {
    if (pushConfigured()) syncSchedule(events, settings)
  }, [events, settings, notifTick])

  const upcoming = useMemo(() => sortByUpcoming(events, today), [events, today])
  // Default: only show what's coming up in the next month — keeps the dashboard
  // calm. "Show all" expands to the full list. (Today counts as day 0.)
  const upcomingMonth = useMemo(
    () => upcoming.filter((e) => daysUntil(e, today) <= 31),
    [upcoming, today],
  )
  const visibleUpcoming = showAllUpcoming ? upcoming : upcomingMonth
  const hiddenCount = upcoming.length - upcomingMonth.length

  function submitEvent(form) {
    if (editing) {
      // Apply edits to the existing record, preserving id.
      setEvents((prev) => prev.map((e) => (e.id === editing.id ? { ...e, ...form } : e)))
    } else {
      setEvents((prev) => [...prev, makeEvent(form)])
    }
  }
  // Delete with a 5s undo toast — the event vanishes immediately but is held
  // here in closure so Undo can splice it back at its original index.
  function deleteEvent(id) {
    let removed = null
    let index = -1
    setEvents((prev) => {
      index = prev.findIndex((e) => e.id === id)
      if (index === -1) return prev
      removed = prev[index]
      return prev.filter((_, i) => i !== index)
    })
    if (!removed) return
    setToast({
      message: t('toast.deleted', { name: removed.name }),
      undo: () => {
        setEvents((prev) => {
          const next = [...prev]
          next.splice(Math.min(index, next.length), 0, removed)
          return next
        })
        setToast(null)
      },
    })
  }
  function openForm(date = null) {
    setEditing(null)
    setPickedDate(date)
    setShowForm(true)
  }
  function openEdit(ev) {
    setEditing(ev)
    setPickedDate(null)
    setDayPanel(null)
    setShowForm(true)
  }
  function closeForm() {
    setShowForm(false)
    setPickedDate(null)
    setEditing(null)
  }
  // Clicking a calendar day: manage existing dates if any, else jump to add.
  function selectDate(day) {
    if (eventsOnDate(events, day).length > 0) setDayPanel(day)
    else openForm(day)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <span className="header__logo" aria-hidden="true">📅</span>
          <div>
            <h1 className="header__title">{t('app.title')}</h1>
            <p className="header__subtitle">
              {today.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="header__actions">
          <InstallButton />
          <button className="iconbtn" onClick={() => setShowSettings(true)} aria-label={t('settings.open')} title={t('settings.open')}>
            ⚙️
          </button>
          <button className="btn btn--primary" onClick={() => openForm()}>
            {t('btn.add')}
          </button>
        </div>
      </header>

      <StatBar events={events} today={today} />

      <Calendar events={events} today={today} weekStart={settings.weekStart} onSelectDate={selectDate} />

      <main className="main">
        <div className="section__head">
          <h2 className="section__title">
            {showAllUpcoming ? t('section.allDates') : t('section.thisMonth')}
          </h2>
          {upcoming.length > 0 && hiddenCount > 0 && (
            <button
              className="section__toggle"
              onClick={() => setShowAllUpcoming((v) => !v)}
            >
              {showAllUpcoming ? t('section.showLess') : t('section.showAll', { n: hiddenCount })}
            </button>
          )}
        </div>

        {upcoming.length === 0 ? (
          <div className="empty">
            <span className="empty__emoji" aria-hidden="true">🗓️</span>
            <p className="empty__title">{t('empty.title')}</p>
            <p className="empty__text">{t('empty.text')}</p>
            <button className="btn btn--primary" onClick={() => openForm()}>{t('empty.cta')}</button>
          </div>
        ) : visibleUpcoming.length === 0 ? (
          <div className="empty empty--mini">
            <p className="empty__text">{t('section.noneThisMonth')}</p>
            <button className="btn btn--ghost" onClick={() => setShowAllUpcoming(true)}>
              {t('section.showAll', { n: upcoming.length })}
            </button>
          </div>
        ) : (
          <ul className="cardList">
            {visibleUpcoming.map((e) => (
              <EventCard key={e.id} event={e} today={today} onDelete={deleteEvent} onEdit={openEdit} />
            ))}
          </ul>
        )}
      </main>

      {showForm && (
        <AddEventForm
          onSubmit={submitEvent}
          onClose={closeForm}
          initialDate={pickedDate}
          editing={editing}
          settings={settings}
        />
      )}

      {dayPanel && (
        <DayPanel
          day={dayPanel}
          events={events}
          today={today}
          onDelete={deleteEvent}
          onEdit={openEdit}
          onAddForDay={(day) => { setDayPanel(null); openForm(day) }}
          onClose={() => setDayPanel(null)}
        />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          setSettings={setSettings}
          theme={theme}
          setTheme={setTheme}
          style={style}
          setStyle={setStyle}
          events={events}
          onNotifChange={() => setNotifTick((n) => n + 1)}
          onClose={() => setShowSettings(false)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          actionLabel={t('common.undo')}
          onAction={toast.undo}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
