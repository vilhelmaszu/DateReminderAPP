# Date Reminder

A personal app for the dates that matter — birthdays, holidays, anniversaries,
workouts. Built as a Progressive Web App (installable on Android), with an
optional Cloudflare Worker that fires push reminders even when the app is closed.

## Features

- **Calendar with month & year views.** Click any day to add or manage dates —
  works the same in the 12-month grid, so you can scan the whole year at once.
- **Per-category colors.** Purple birthdays, red holidays, pink anniversaries,
  blue other. Calendar cells, badges, and stripes all carry the type's color.
- **Smart holiday emoji.** Christmas → 🎄, New Year → 🎆, Easter → 🐣, Halloween →
  🎃, Joninės → 🔥, etc. Matched by name in English & Lithuanian.
- **Custom reminder tiers.** Per type, per individual date. Pick from presets
  (minutes → weeks before) or add any custom lead time (e.g. "90 minutes before").
- **Time + repeat rules** — once / yearly / weekly / daily, with a time of day.
  Daily/weekly events show minute-level countdowns.
- **Notification sounds** — Chime / Bell / Ping / Marimba / Silent, synthesised
  in-browser, previewable on tap.
- **Themes** — six palettes (4 dark, 2 light) with a 3-color preview each.
- **Languages** — English / Lithuanian, with localised dates and weekday names.
- **Undo on delete** — 5-second toast restores at the original position.
- **Edit any date** — pencil icon on every card and in the day panel.
- **Live clock** — countdowns advance and reminders fire as time passes while
  the app is open.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173 with hot reload
npm run build        # production build → dist/
npm run preview      # serve the production build locally
node scripts/test-dates.mjs   # unit tests for the date engine
```

## How it's organized

```
src/
  App.jsx                 # top-level state + layout
  components/
    Calendar.jsx          # month + year views (each cell takes its type colour)
    MiniMonth.jsx         # one tile in the year grid; cells are individually clickable
    EventCard.jsx         # one row in the upcoming list
    AddEventForm.jsx      # the modal — also handles edit mode
    DayPanel.jsx          # what's on a day; delete or edit any item
    SettingsPanel.jsx     # ⚙️ appearance + notifications + tiers + sound
    TierChips.jsx         # reminder-tier picker (presets + custom builder)
    Toast.jsx             # undo-delete toast
  lib/
    dates.js              # next occurrence, days/ms-until, milestone, sort
    storage.js            # load/save events (localStorage)
    settings.js           # app prefs (week start, motion, tiers, sound)
    notifications.js      # permission + tier-driven on-open reminders
    reminderTiers.js      # tier presets + "c:value:unit" custom keys
    sounds.js             # synthesised notification tones (Web Audio)
    push.js               # subscribe + sync schedule to the Worker
    schedule.js           # expand events → fire-times for the push server
    decorations.js        # holiday-name → emoji match
    eventTypes.js         # per-type colour + default emoji
    themes.js             # palette metadata (CSS lives in index.css)
    useNow.js             # 30 s clock tick so reminders fire as time passes
    i18n.jsx              # all UI strings (en + lt)
  index.css               # all styles, including [data-theme="…"] palette blocks
public/
  manifest.webmanifest    # PWA manifest
  sw.js                   # service worker (offline + push handler)
  icon-*.png              # app icons (generated via scripts/gen-icons.mjs)
worker/                   # the optional push backend (see worker/README.md)
```

## Data model

```js
{
  id: "evt-…",
  name: "Mom",
  type: "birthday",        // birthday | holiday | anniversary | other
  date: "1968-06-09",      // YYYY-MM-DD (year used to compute age)
  time: "09:00",
  recurrence: "yearly",    // once | yearly | weekly | daily
  reminders: null,         // null = use the type's default tiers, or an array
                           //         of tier keys like ["3d", "c:45:minute"]
  notes: "Loves tulips."
}
```

Events live in `localStorage` under `date-reminder/events`. Settings live under
`date-reminder/settings`. A few sample entries seed a fresh install — delete
any time.

## Phone install (PWA)

Open the deployed site on Android Chrome → menu (⋮) → **Install app**. The PWA
runs full-screen with its own icon. iOS Safari: Share → Add to Home Screen.

Install needs **HTTPS** (or `localhost`). Cloudflare Pages, Netlify, Vercel,
and GitHub Pages all serve HTTPS for free.

## Notifications

**While the app is open** — works out of the box. Open ⚙️ → grant permission →
the chosen tiers fire as their lead times open. The 🔔 *Send test notification*
button confirms the pipeline on your device.

**Closed-app push** — optional, free. Deploy the Cloudflare Worker in
[`worker/`](worker/README.md). It runs a 1-minute cron and dispatches Web Push.
Then set `VITE_PUSH_API` and `VITE_VAPID_PUBLIC_KEY` (see `.env.example`) and
the **Background reminders** toggle appears in Settings. The client computes
its own fire-time schedule and syncs it to the Worker, so there's no
server-side date or timezone logic to maintain.

## Configuration

| Env var | What it does | Where to set |
| --- | --- | --- |
| `VITE_PUSH_API` | URL of the deployed push Worker | `.env` (local), Pages settings (prod) |
| `VITE_VAPID_PUBLIC_KEY` | Public VAPID key matching the Worker | same |

Both are optional. Without them, the Background reminders toggle is hidden
and everything else still works.
