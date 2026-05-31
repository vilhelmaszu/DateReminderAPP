import { msUntil, nextOccurrence, formatCountdown } from '../lib/dates.js'
import { useI18n } from '../lib/i18n.jsx'

export default function StatBar({ events, today }) {
  const { t } = useI18n()
  const total = events.length

  // The single soonest event (by actual moment), for the "next one" stat.
  const soonest = events.length
    ? events.reduce((a, b) => (msUntil(a, today) <= msUntil(b, today) ? a : b))
    : null

  const thisMonth = events.filter((e) => {
    const occ = nextOccurrence(e, today)
    return occ.getMonth() === today.getMonth() && occ.getFullYear() === today.getFullYear()
  }).length

  const stats = [
    { label: t('stat.tracked'), value: total },
    { label: t('stat.next'), value: soonest ? formatCountdown(soonest, today, t) : '—' },
    { label: t('stat.thisMonth'), value: thisMonth },
  ]

  return (
    <div className="statbar">
      {stats.map((s) => (
        <div className="stat" key={s.label}>
          <span className="stat__value stat__value--sm">{s.value}</span>
          <span className="stat__label">{s.label}</span>
        </div>
      ))}
    </div>
  )
}
