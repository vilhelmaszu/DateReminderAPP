// Notification sounds, synthesized with the Web Audio API (no audio files).
// Plays when a reminder fires while the app is open, or via the preview button.
// Note: closed-app push notifications use the OS sound — the web can't override it.

export const SOUNDS = [
  { id: 'chime',   name: { en: 'Chime',   lt: 'Varpelis' } },
  { id: 'bell',    name: { en: 'Bell',    lt: 'Skambutis' } },
  { id: 'ping',    name: { en: 'Ping',    lt: 'Pyptelėjimas' } },
  { id: 'marimba', name: { en: 'Marimba', lt: 'Marimba' } },
  { id: 'digital', name: { en: 'Digital', lt: 'Skaitmeninis' } },
  { id: 'droplet', name: { en: 'Droplet', lt: 'Lašas' } },
  { id: 'chord',   name: { en: 'Chord',   lt: 'Akordas' } },
  { id: 'whistle', name: { en: 'Whistle', lt: 'Švilpukas' } },
  { id: 'buzz',    name: { en: 'Buzz',    lt: 'Zirzimas' } },
  { id: 'none',    name: { en: 'Silent',  lt: 'Tylu' } },
]

let ctx = null
function audio() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = ctx || new AC()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(c, freq, start, dur, type = 'sine', gain = 0.2) {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.connect(g)
  g.connect(c.destination)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

/** Like `tone`, but the pitch sweeps from `fromHz` to `toHz` over `dur`. */
function sweep(c, fromHz, toHz, start, dur, type = 'sine', gain = 0.2) {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(fromHz, start)
  osc.frequency.exponentialRampToValueAtTime(toHz, start + dur)
  osc.connect(g)
  g.connect(c.destination)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

/** Play a sound by id. Safe to call anywhere; silently no-ops if unsupported. */
export function playSound(id) {
  if (!id || id === 'none') return
  const c = audio()
  if (!c) return
  const t = c.currentTime
  try {
    switch (id) {
      case 'chime':
        tone(c, 880.0, t, 0.35); tone(c, 1318.5, t + 0.12, 0.45)
        break
      case 'bell':
        tone(c, 1046.5, t, 0.9, 'sine', 0.25); tone(c, 2093.0, t, 0.9, 'sine', 0.07)
        break
      case 'ping':
        tone(c, 1568.0, t, 0.2, 'triangle', 0.25)
        break
      case 'marimba':
        tone(c, 523.25, t, 0.25, 'triangle'); tone(c, 659.25, t + 0.1, 0.25, 'triangle'); tone(c, 784.0, t + 0.2, 0.32, 'triangle')
        break
      case 'digital':
        tone(c, 1200, t, 0.08, 'sine', 0.25); tone(c, 1200, t + 0.14, 0.08, 'sine', 0.25)
        break
      case 'droplet':
        sweep(c, 1400, 500, t, 0.28, 'sine', 0.22)
        break
      case 'chord':
        // C major triad (C5, E5, G5) — pleasant resolved chord.
        tone(c, 523.25, t, 0.7, 'sine', 0.13); tone(c, 659.25, t, 0.7, 'sine', 0.13); tone(c, 783.99, t, 0.7, 'sine', 0.13)
        break
      case 'whistle':
        sweep(c, 1000, 1800, t, 0.32, 'triangle', 0.18)
        break
      case 'buzz':
        tone(c, 220, t, 0.16, 'square', 0.13); tone(c, 220, t + 0.2, 0.16, 'square', 0.13)
        break
      default:
        tone(c, 880, t, 0.3)
    }
  } catch {
    /* ignore audio errors */
  }
}
