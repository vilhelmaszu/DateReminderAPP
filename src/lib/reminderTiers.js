// The palette of reminder "tiers" (lead times) a user can switch on per event
// type or per individual event. Birthdays use day/week tiers; workouts use the
// minute/hour ones. Each tier is identified by a stable `key`.

import { UNIT_MS } from './dates.js'

export const TIERS = [
  { key: '0m', value: 0, unit: 'minute' },
  { key: '10m', value: 10, unit: 'minute' },
  { key: '30m', value: 30, unit: 'minute' },
  { key: '1h', value: 1, unit: 'hour' },
  { key: '3h', value: 3, unit: 'hour' },
  { key: '12h', value: 12, unit: 'hour' },
  { key: '1d', value: 1, unit: 'day' },
  { key: '2d', value: 2, unit: 'day' },
  { key: '3d', value: 3, unit: 'day' },
  { key: '1w', value: 1, unit: 'week' },
]

const BY_KEY = Object.fromEntries(TIERS.map((tier) => [tier.key, tier]))

// A custom tier is encoded as "c:<value>:<unit>", e.g. "c:90:minute".
export function makeCustomKey(value, unit) {
  return `c:${value}:${unit}`
}
function parseTier(key) {
  if (BY_KEY[key]) return BY_KEY[key]
  if (typeof key === 'string' && key.startsWith('c:')) {
    const [, v, unit] = key.split(':')
    const value = Number(v)
    if (Number.isFinite(value) && UNIT_MS[unit]) return { value, unit, custom: true }
  }
  return null
}

/** Lead time of a tier key in milliseconds (0 = "at the time"). */
export function tierMs(key) {
  const tier = parseTier(key)
  return tier ? tier.value * UNIT_MS[tier.unit] : 0
}

/** Localized label for a tier key, e.g. "30 min before", "3 d before". */
export function tierLabel(key, t) {
  const tier = parseTier(key)
  if (!tier) return key
  if (tier.value === 0) return t('tier.atTime')
  return t(`tier.${tier.unit}`, { n: tier.value })
}

export function isCustomKey(key) {
  return typeof key === 'string' && key.startsWith('c:')
}
