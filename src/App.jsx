import { useEffect, useMemo, useState } from 'react'
import { sortByUpcoming, eventsOnDate, daysUntil } from './lib/dates.js'
import { loadTheme, saveTheme } from './lib/themes.js'
import { loadStyle, saveStyle } from './lib/styles.js'
import { runReminders } from './lib/notifications.js'
import { syncSchedule, pushConfigured } from './lib/push.js'
import { useNow } from './lib/useNow.js'
import { useI18n } from './lib/i18n.jsx'
import { useAuth } from './lib/auth.jsx'
import { useSyncedStore } from './lib/useSyncedStore.js'
import StatBar from './components/StatBar.jsx'
import EventCard from './components/EventCard.jsx'
import AddEventForm from './components/AddEventForm.jsx'
import Calendar from './components/Calendar.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
import DayPanel from './components/DayPanel.jsx'
import Toast from './components/Toast.jsx'
import InstallButton from './components/InstallButton.jsx'
import SignInPanel from './components/SignInPanel.jsx'
import MigrationPrompt from './components/MigrationPrompt.jsx'

export default function App() {
  const { t, locale } = useI18n()
  const { user } = useAuth()

  // Synced store — events + settings, swap between cloud and local depending
  // on whether the user is signed in. Realtime updates land in here too.
  const {
    events, settings,
    addEvent, updateEvent, deleteEvent, setSettings,
    migrationInfo, resolveMigration,
  } = useSyncedStore(user)

  const [showForm, setShowForm] = useState(false)
  const [pickedDate, setPickedDate] = useState(null)
  const [editing, setEditing] = useState(null) // an event when editing
  const [toast, setToast] = useState(null)     // { message, undo() } or null
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [theme, setTheme] = useState(() => loadTheme())
  const [style, setStyle] = useState(() => loadStyle())
  const [showSettings, setShowSettings] = useState(false)
  const [dayPanel, setDayPanel] = useState(null) // a Date when the day panel is open

  // Live clock — ticks every 30s so countdowns advance and reminders fire as
  // time passes. Used everywhere `today` is referenced.
  const today = useNow(30_000)

  // Events + settings are persisted automatically by useSyncedStore (mirrors
  // to localStorage + writes to cloud when signed in). Only display-side
  // prefs are persisted here, since those stay per-device.
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
  }, [settings.reduceMotion])

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

  async function submitEvent(form) {
    if (editing) {
      await updateEvent(editing.id, form)
    } else {
      await addEvent(form)
    }
  }
  // Delete with a 5s undo toast. Snapshot the event before we let the store
  // remove it — Undo just re-adds via addEvent (the id is preserved through
  // makeEvent's `id` field, but we use upsert so it lands back in place).
  async function handleDelete(id) {
    const removed = events.find((e) => e.id === id)
    if (!removed) return
    await deleteEvent(id)
    setToast({
      message: t('toast.deleted', { name: removed.name }),
      undo: async () => {
        // Re-insert the deleted event by name/type/etc. Cloud will upsert.
        await addEvent({
          name: removed.name,
          type: removed.type,
          date: removed.date,
          time: removed.time,
          recurrence: removed.recurrence,
          notes: removed.notes,
          reminders: removed.reminders,
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
              <EventCard key={e.id} event={e} today={today} onDelete={handleDelete} onEdit={openEdit} />
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
          onDelete={handleDelete}
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
          onSignInClick={() => setShowSignIn(true)}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showSignIn && <SignInPanel onClose={() => setShowSignIn(false)} />}

      <MigrationPrompt info={migrationInfo} onResolve={resolveMigration} />

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
