import { eventsOnDate, milestoneAt } from '../lib/dates.js'
import { typeMeta } from '../lib/eventTypes.js'
import { decorationFor } from '../lib/decorations.js'
import { useI18n } from '../lib/i18n.jsx'

/** Shows the events on a clicked calendar day, each deletable, plus an add button. */
export default function DayPanel({ day, events, today, onDelete, onEdit, onAddForDay, onClose }) {
  const { t, locale } = useI18n()
  const dayEvents = eventsOnDate(events, day)
  const heading = day.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal modal--day" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2 className="modal__title">{heading}</h2>
          <button className="iconbtn" onClick={onClose} aria-label={t('common.close')}>×</button>
        </div>

        {dayEvents.length === 0 ? (
          <p className="dayPanel__empty">{t('day.none')}</p>
        ) : (
          <ul className="dayPanel__list">
            {dayEvents.map((ev) => {
              const meta = typeMeta(ev.type)
              const milestone = milestoneAt(ev, today)
              const sub =
                milestone != null
                  ? ev.type === 'birthday'
                    ? t('milestone.turning', { n: milestone })
                    : t('milestone.years', { n: milestone })
                  : t(`type.${ev.type}`)
              return (
                <li key={ev.id} className="dayPanel__item" style={{ '--accent': meta.accent }}>
                  <span className="dayPanel__emoji" aria-hidden="true">{decorationFor(ev)}</span>
                  <span className="dayPanel__body">
                    <span className="dayPanel__name">{ev.name}</span>
                    <span className="dayPanel__sub">{sub}</span>
                  </span>
                  {onEdit && (
                    <button
                      className="dayPanel__act"
                      onClick={() => onEdit(ev)}
                      aria-label={`${t('common.edit')} ${ev.name}`}
                      title={t('common.edit')}
                    >
                      ✎
                    </button>
                  )}
                  <button
                    className="dayPanel__act dayPanel__delete"
                    onClick={() => onDelete(ev.id)}
                    aria-label={`${t('common.delete')} ${ev.name}`}
                    title={t('common.delete')}
                  >
                    🗑
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <button className="btn btn--primary dayPanel__add" onClick={() => onAddForDay(day)}>
          {t('day.add')}
        </button>
      </div>
    </div>
  )
}
