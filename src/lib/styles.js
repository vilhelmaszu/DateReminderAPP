// Visual styles — orthogonal to color palettes. The palette decides COLORS,
// the style decides SHAPE/FEEL (corners, shadows, surfaces, density).
// Switched via `[data-style="…"]` on <html>; CSS rules live in index.css.

export const STYLES = [
  { id: 'rounded', name: { en: 'Rounded',   lt: 'Apvalintas' } },
  { id: 'crisp',   name: { en: 'Editorial', lt: 'Redakcinis' } },
  { id: 'glass',   name: { en: 'Neon',      lt: 'Neonas' } },
]

export const DEFAULT_STYLE = 'rounded'
const STYLE_KEY = 'date-reminder/style'

export function loadStyle() {
  const saved = localStorage.getItem(STYLE_KEY)
  return STYLES.some((s) => s.id === saved) ? saved : DEFAULT_STYLE
}

export function saveStyle(id) {
  localStorage.setItem(STYLE_KEY, id)
}
