import { useState } from 'react'
import { TIERS, tierLabel, makeCustomKey, isCustomKey } from '../lib/reminderTiers.js'
import { useI18n } from '../lib/i18n.jsx'

const UNITS = ['minute', 'hour', 'day', 'week']

/** A row of toggleable reminder-tier chips + a custom lead-time builder.
 *  `value` is an array of tier keys (preset keys and/or "c:value:unit"). */
export default function TierChips({ value, onChange }) {
  const { t } = useI18n()
  const [adding, setAdding] = useState(false)
  const [num, setNum] = useState('15')
  const [unit, setUnit] = useState('minute')

  const toggle = (key) =>
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key])

  const customKeys = value.filter(isCustomKey)

  function addCustom(e) {
    e.preventDefault()
    const n = Math.max(1, Math.round(Number(num) || 0))
    const key = makeCustomKey(n, unit)
    if (!value.includes(key)) onChange([...value, key])
    setAdding(false)
    setNum('15')
  }

  return (
    <div className="tierChips">
      {TIERS.map((tier) => {
        const on = value.includes(tier.key)
        return (
          <button type="button" key={tier.key} className={`chip ${on ? 'is-active' : ''}`} onClick={() => toggle(tier.key)} aria-pressed={on}>
            {tierLabel(tier.key, t)}
          </button>
        )
      })}

      {/* Custom tiers the user has added show as removable, active chips. */}
      {customKeys.map((key) => (
        <button type="button" key={key} className="chip chip--custom is-active" onClick={() => toggle(key)} title={t('common.delete')}>
          {tierLabel(key, t)} ×
        </button>
      ))}

      {adding ? (
        <span className="tierAdd">
          <input
            className="tierAdd__num"
            type="number"
            min="1"
            value={num}
            onChange={(e) => setNum(e.target.value)}
            autoFocus
            aria-label={t('tier.customValue')}
          />
          <select className="tierAdd__unit" value={unit} onChange={(e) => setUnit(e.target.value)} aria-label={t('tier.customUnit')}>
            {UNITS.map((u) => <option key={u} value={u}>{t(`tier.unit.${u}`)}</option>)}
          </select>
          <button type="button" className="chip is-active" onClick={addCustom}>✓</button>
          <button type="button" className="chip" onClick={() => setAdding(false)}>×</button>
        </span>
      ) : (
        <button type="button" className="chip chip--add" onClick={() => setAdding(true)}>＋ {t('tier.custom')}</button>
      )}
    </div>
  )
}
