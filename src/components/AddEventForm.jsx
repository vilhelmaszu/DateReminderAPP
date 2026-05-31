import { useState } from 'react'
import { TYPE_ORDER, typeMeta } from '../lib/eventTypes.js'
import { toISODate, RECURRENCES } from '../lib/dates.js'
import { useI18n } from '../lib/i18n.jsx'
import TierChips from './TierChips.jsx'

const REC_EMOJI = { once: '📌', yearly: '♾️', weekly: '🔁', daily: '☀️' }

const emptyForm = (initialDate) => ({
  name: '',
  type: 'birthday',
  date: toISODate(initialDate || new Date()),
  time: '09:00',
  recurrence: 'yearly',
  notes: '',
  reminders: null, // null = use this type's default tiers
})

/** Edit mode pre-fills from an existing event; otherwise it's a fresh entry. */
const formFromEvent = (ev) => ({
  name: ev.name || '',
  type: ev.type || 'birthday',
  date: ev.date,
  time: ev.time || '09:00',
  recurrence: ev.recurrence || 'yearly',
  notes: ev.notes || '',
  reminders: Array.isArray(ev.reminders) ? ev.reminders : null,
})

export default function AddEventForm({ onSubmit, onClose, initialDate, editing, settings }) {
  const { t } = useI18n()
  const [form, setForm] = useState(() => (editing ? formFromEvent(editing) : emptyForm(initialDate)))
  const [error, setError] = useState('')

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }))
  const typeTiers = settings?.reminderTiers?.[form.type] || []
  const isEdit = !!editing

  function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError(t('form.errName')); return }
    onSubmit(form)
    onClose()
  }

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className="modal__title">{isEdit ? t('form.editTitle') : t('form.title')}</h2>

        <label className="field">
          <span className="field__label">{t('form.name')}</span>
          <input
            className="field__input"
            autoFocus
            value={form.name}
            onChange={(e) => { update('name', e.target.value); setError('') }}
            placeholder={t('form.namePlaceholder')}
          />
        </label>

        <label className="field">
          <span className="field__label">{t('form.type')}</span>
          <div className="typePicker">
            {TYPE_ORDER.map((ty) => {
              const meta = typeMeta(ty)
              return (
                <button
                  type="button"
                  key={ty}
                  className={`typePicker__btn ${form.type === ty ? 'is-active' : ''}`}
                  style={{ '--accent': meta.accent }}
                  onClick={() => update('type', ty)}
                >
                  <span aria-hidden="true">{meta.emoji}</span> {t(`type.${ty}`)}
                </button>
              )
            })}
          </div>
        </label>

        <div className="field field--split">
          <label className="field">
            <span className="field__label">{t('form.date')}</span>
            <input className="field__input" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">{t('form.time')}</span>
            <input className="field__input" type="time" value={form.time} onChange={(e) => update('time', e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span className="field__label">{t('form.repeat')}</span>
          <div className="recPicker">
            {RECURRENCES.map((r) => (
              <button
                type="button"
                key={r}
                className={`recPicker__btn ${form.recurrence === r ? 'is-active' : ''}`}
                onClick={() => update('recurrence', r)}
              >
                <span aria-hidden="true">{REC_EMOJI[r]}</span> {t(`rec.${r}`)}
              </button>
            ))}
          </div>
        </label>

        {/* Per-event reminder override */}
        <div className="field">
          <div className="reminders__head">
            <span className="field__label">🔔 {t('form.reminders')}</span>
            <label className="toggle toggle--bare">
              <input
                className="toggle__input"
                type="checkbox"
                checked={form.reminders !== null}
                onChange={(e) => update('reminders', e.target.checked ? [...typeTiers] : null)}
              />
              <span className="toggle__track" aria-hidden="true"><span className="toggle__knob" /></span>
            </label>
          </div>
          {form.reminders === null ? (
            <p className="reminders__hint">{t('form.remindersAuto')}</p>
          ) : (
            <TierChips value={form.reminders} onChange={(v) => update('reminders', v)} />
          )}
        </div>

        <label className="field">
          <span className="field__label">{t('form.notes')} <em>{t('form.optional')}</em></span>
          <input className="field__input" value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder={t('form.notesPlaceholder')} />
        </label>

        {error && <p className="modal__error">{error}</p>}

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>{t('form.cancel')}</button>
          <button type="submit" className="btn btn--primary">{isEdit ? t('form.save') : t('form.submit')}</button>
        </div>
      </form>
    </div>
  )
}
