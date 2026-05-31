import {
  daysUntil,
  msUntil,
  milestoneAt,
  formatCountdown,
  formatOccurrence,
  recurrenceOf,
  isTimed,
  UNIT_MS,
} from '../lib/dates.js'
import { typeMeta } from '../lib/eventTypes.js'
import { decorationFor } from '../lib/decorations.js'
import { useI18n } from '../lib/i18n.jsx'

const REC_EMOJI = { once: '📌', yearly: '♾️', weekly: '🔁', daily: '☀️' }

export default function EventCard({ event, today, onDelete, onEdit }) {
  const { t, locale } = useI18n()
  const days = daysUntil(event, today)
  const milestone = milestoneAt(event, today)
  const meta = typeMeta(event.type)
  const emoji = decorationFor(event)
  const rec = recurrenceOf(event)
  const timed = isTimed(event)
  const soon = timed ? msUntil(event, today) < UNIT_MS.day : days <= 7

  const milestoneText =
    milestone == null
      ? null
      : event.type === 'birthday'
        ? t('milestone.turning', { n: milestone })
        : t('milestone.years', { n: milestone })

  // Whole card is the edit target — tap anywhere on it to open edit mode.
  // The explicit ✎ / 🗑 buttons inside stop propagation so they keep working.
  const cardClickable = !!onEdit
  return (
    <li
      className={`card ${soon ? 'card--soon' : ''} ${cardClickable ? 'card--clickable' : ''}`}
      style={{ '--accent': meta.accent }}
      role={cardClickable ? 'button' : undefined}
      tabIndex={cardClickable ? 0 : undefined}
      aria-label={cardClickable ? `${t('common.edit')} ${event.name}` : undefined}
      onClick={cardClickable ? () => onEdit(event) : undefined}
      onKeyDown={cardClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(event) }
      } : undefined}
    >
      <div className="card__emoji" aria-hidden="true">{emoji}</div>

      <div className="card__body">
        <div className="card__top">
          <h3 className="card__name">{event.name}</h3>
          <span className="card__badge">{t(`type.${event.type}`)}</span>
          {rec !== 'once' && (
            <span className="card__recur" title={t(`rec.${rec}`)}>
              {REC_EMOJI[rec]} {t(`rec.${rec}`)}
            </span>
          )}
        </div>
        <div className="card__meta">
          <span className="card__date">{formatOccurrence(event, today, locale)}</span>
          {milestoneText && <span className="card__milestone">· {milestoneText}</span>}
          {event.notes && <span className="card__notes">· {event.notes}</span>}
        </div>
      </div>

      <div className="card__countdown">
        <span className={`card__days ${soon ? 'card__days--soon' : ''}`}>
          {formatCountdown(event, today, t)}
        </span>
        {!timed && days > 1 && <span className="card__daysSub">{t('card.days', { n: days })}</span>}
      </div>

      <div className="card__actions">
        {onEdit && (
          <button
            className="card__act card__act--edit"
            onClick={(e) => { e.stopPropagation(); onEdit(event) }}
            aria-label={`${t('common.edit')} ${event.name}`}
            title={t('common.edit')}
          >
            ✎
          </button>
        )}
        <button
          className="card__act card__act--delete"
          onClick={(e) => { e.stopPropagation(); onDelete(event.id) }}
          aria-label={`${t('common.delete')} ${event.name}`}
          title={t('common.delete')}
        >
          🗑
        </button>
      </div>
    </li>
  )
}
