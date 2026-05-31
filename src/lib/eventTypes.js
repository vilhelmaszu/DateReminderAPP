// Central registry of event types — emoji, label, and accent color. Add a type
// here and it shows up everywhere (form dropdown, cards, badges) automatically.

// Each type has its own accent color, used for the card stripe, badge, calendar
// dots, etc. Holiday is red (semantic match to the red "important" days), other
// is blue (user's "custom = blue"). The default emoji is overridden per-event
// for holidays — see lib/decorations.js for Christmas → 🎄, etc.
export const EVENT_TYPES = {
  birthday: { label: 'Birthday', emoji: '🎂', accent: '#a855f7' },     // purple
  holiday: { label: 'Holiday', emoji: '🎉', accent: '#ef4444' },        // red
  anniversary: { label: 'Anniversary', emoji: '💛', accent: '#ec4899' }, // pink/rose
  other: { label: 'Other', emoji: '📌', accent: '#3b82f6' },            // blue
}

export const TYPE_ORDER = ['birthday', 'holiday', 'anniversary', 'other']

export function typeMeta(type) {
  return EVENT_TYPES[type] || EVENT_TYPES.other
}
