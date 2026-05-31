// Manual backup & restore — exports a JSON file with everything (events,
// settings, theme, style, language). Move to a new device by downloading the
// file, transferring it (Drive / email / USB), and uploading it on the new one.

const FORMAT = 'date-reminder-backup'
const VERSION = 1

// localStorage keys we own. Add new ones here to include them in backups.
const KEYS = {
  events: 'date-reminder/events',
  settings: 'date-reminder/settings',
  theme: 'date-reminder/theme',
  style: 'date-reminder/style',
  lang: 'date-reminder/lang',
}

const STRING_FIELDS = new Set(['theme', 'style', 'lang'])

/** Build the backup payload from current localStorage. */
export function exportBackup() {
  const payload = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
  }
  for (const [field, key] of Object.entries(KEYS)) {
    const raw = localStorage.getItem(key)
    if (raw == null) continue
    try {
      payload[field] = STRING_FIELDS.has(field) ? raw : JSON.parse(raw)
    } catch {
      // skip malformed entry
    }
  }
  return payload
}

/** Trigger a browser download of the backup. Returns the payload too. */
export function downloadBackup() {
  const payload = exportBackup()
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const date = new Date().toISOString().slice(0, 10)
  a.download = `date-reminder-backup-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return payload
}

/** Returns { ok, reason } so the UI can show a clear error. */
export function validateBackup(payload) {
  if (!payload || typeof payload !== 'object') return { ok: false, reason: 'invalid' }
  if (payload.format !== FORMAT) return { ok: false, reason: 'not-a-backup' }
  if (typeof payload.version !== 'number') return { ok: false, reason: 'no-version' }
  if (payload.version > VERSION) return { ok: false, reason: 'newer-version' }
  if (payload.events != null && !Array.isArray(payload.events)) return { ok: false, reason: 'bad-events' }
  return { ok: true }
}

/** Write the backup into localStorage. Caller should reload after. */
export function importBackup(payload) {
  const check = validateBackup(payload)
  if (!check.ok) return check
  // Wipe our existing keys so the restore is exact, then write what's in the file.
  for (const key of Object.values(KEYS)) localStorage.removeItem(key)
  if (Array.isArray(payload.events)) {
    localStorage.setItem(KEYS.events, JSON.stringify(payload.events))
  }
  if (payload.settings && typeof payload.settings === 'object') {
    localStorage.setItem(KEYS.settings, JSON.stringify(payload.settings))
  }
  for (const field of STRING_FIELDS) {
    if (typeof payload[field] === 'string') localStorage.setItem(KEYS[field], payload[field])
  }
  return { ok: true }
}

/** Read a File from a file input and JSON-parse it. Returns null on failure. */
export async function readBackupFile(file) {
  try {
    const text = await file.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}
