// Color palettes. Each id maps to a `[data-theme="…"]` block in index.css that
// overrides the CSS custom properties. This file is just the metadata the
// picker needs (label per language + a swatch color for the dot).

// `preview` is [background, surface, accent] — the three colors that define
// the palette. The picker shows them as stacked stripes so you can tell at a
// glance whether a theme is dark or light and what its accent is.
export const THEMES = [
  { id: 'midnight', name: { en: 'Midnight', lt: 'Vidurnaktis' }, dark: true,  preview: ['#0f1117', '#1d212c', '#6366f1'] },
  { id: 'graphite', name: { en: 'Graphite', lt: 'Grafitas' },    dark: true,  preview: ['#0d0f12', '#191d23', '#3b82f6'] },
  { id: 'emerald',  name: { en: 'Emerald',  lt: 'Smaragdas' },   dark: true,  preview: ['#0b1210', '#14211c', '#10b981'] },
  { id: 'royal',    name: { en: 'Royal',    lt: 'Karališka' },   dark: true,  preview: ['#110d18', '#1f1729', '#a855f7'] },
  { id: 'daylight', name: { en: 'Daylight', lt: 'Šviesi' },      dark: false, preview: ['#f4f6fb', '#ffffff', '#2563eb'] },
  { id: 'sand',     name: { en: 'Sand',     lt: 'Smėlis' },      dark: false, preview: ['#f7f3ec', '#fffdf9', '#c2410c'] },
]

export const DEFAULT_THEME = 'midnight'
const THEME_KEY = 'date-reminder/theme'

export function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  return THEMES.some((t) => t.id === saved) ? saved : DEFAULT_THEME
}

export function saveTheme(id) {
  localStorage.setItem(THEME_KEY, id)
}
