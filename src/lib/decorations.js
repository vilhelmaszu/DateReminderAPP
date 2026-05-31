// Smart "decoration" — the emoji shown on a card / calendar cell. Holidays use a
// name-aware match (Christmas → 🎄, Easter → 🐣, …) so each one feels distinct;
// other types fall back to their default emoji from EVENT_TYPES.

import { typeMeta } from './eventTypes.js'

// Order matters — first match wins. Patterns are checked against a lowercased
// name with diacritics stripped, so "Kalėdos" matches "kaledos".
const HOLIDAY_PATTERNS = [
  [/(christmas|kaled|kucios|kūčios)/, '🎄'],
  [/(new year|naujieji|naujuju|naujųjų|silvest|sylvest)/, '🎆'],
  [/(easter|velyk)/, '🐣'],
  [/(valentine|valentino|sv.\s*valentino|šv.\s*valentino)/, '💝'],
  [/(halloween|velines|vėlinės|all saints)/, '🎃'],
  [/(thanksgiving|padek|padėk)/, '🦃'],
  [/(mother|motin|mama)/, '🌷'],
  [/(father|tev|tėv|teti)/, '👔'],
  [/(independence|nepriklausom|vasario 16|kovo 11)/, '🇱🇹'],
  [/(midsummer|jonin|joninės|rasos)/, '🔥'],
  [/(labor day|darbo)/, '🛠️'],
  [/(diwali)/, '🪔'],
  [/(hanukkah|chanuk)/, '🕎'],
  [/(eid|ramadan)/, '🌙'],
  [/(birthday)/, '🎂'], // someone naming a holiday "Birthday party"? fine
]

// Match the Unicode "Combining Diacritical Marks" block using explicit escapes
// (U+0300 – U+036F) — robust to source-file encoding.
const COMBINING = new RegExp('[\\u0300-\\u036f]', 'g')

function normalize(s) {
  // NFD splits "ė" → "e" + U+0307. Stripping the combining marks lets
  // "Kalėdos" match the "kaled" pattern in HOLIDAY_PATTERNS.
  return (s || '').toLowerCase().normalize('NFD').replace(COMBINING, '')
}

/** The emoji to show for this event. */
export function decorationFor(event) {
  if (event?.type === 'holiday') {
    const name = normalize(event.name)
    for (const [pattern, emoji] of HOLIDAY_PATTERNS) {
      if (pattern.test(name)) return emoji
    }
  }
  return typeMeta(event?.type).emoji
}
