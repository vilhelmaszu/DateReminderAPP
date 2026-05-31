import { useEffect, useState } from 'react'

/**
 * A ticking "current time" so countdowns advance and reminders fire as time
 * passes while the app is open. Re-renders consumers every `intervalMs`.
 * Default 30s — fine for minute-level reminders without churning the UI.
 */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
