// App preferences (separate from the event data). Persisted as one JSON blob.

const KEY = 'date-reminder/settings'

// Default reminder tiers PER EVENT TYPE. Birthdays/holidays warn days ahead;
// "other" (e.g. workouts) defaults to a few hours → minutes before. Each event
// can override these. Keys come from reminderTiers.js.
export const DEFAULT_TIERS = {
  birthday: ['3d', '1d'],
  anniversary: ['1w', '1d'],
  holiday: ['1w', '1d'],
  other: ['3h', '30m', '10m'],
}

export const DEFAULTS = {
  weekStart: 1, // 0 = Sunday, 1 = Monday
  reduceMotion: false,
  reminderTiers: DEFAULT_TIERS,
  sound: 'chime', // notification sound id (see sounds.js)
}

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}')
    return {
      ...DEFAULTS,
      ...saved,
      // Merge tiers so a newly-added type always has a default.
      reminderTiers: { ...DEFAULT_TIERS, ...(saved.reminderTiers || {}) },
    }
  } catch {
    return { ...DEFAULTS, reminderTiers: { ...DEFAULT_TIERS } }
  }
}

export function saveSettings(s) {
  localStorage.setItem(KEY, JSON.stringify(s))
}
