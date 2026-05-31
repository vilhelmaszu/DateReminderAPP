import { useEffect, useState } from 'react'
import { useI18n, LANGUAGES } from '../lib/i18n.jsx'
import { THEMES } from '../lib/themes.js'
import { permission, sendTest } from '../lib/notifications.js'
import { TYPE_ORDER, typeMeta } from '../lib/eventTypes.js'
import { SOUNDS, playSound } from '../lib/sounds.js'
import { pushConfigured, currentSubscription, enablePush, disablePush } from '../lib/push.js'
import TierChips from './TierChips.jsx'

export default function SettingsPanel({ settings, setSettings, theme, setTheme, events, onNotifChange, onClose }) {
  const { t, lang, setLang } = useI18n()
  const [perm, setPerm] = useState(() => permission())
  const [testMsg, setTestMsg] = useState(null)
  const [pushOn, setPushOn] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }))

  useEffect(() => {
    if (pushConfigured()) currentSubscription().then((s) => setPushOn(!!s))
  }, [])

  function setTypeTiers(type, keys) {
    update({ reminderTiers: { ...settings.reminderTiers, [type]: keys } })
  }

  function chooseSound(id) {
    update({ sound: id })
    playSound(id)
  }

  async function togglePush(e) {
    const want = e.target.checked
    setPushBusy(true)
    try {
      if (want) { await enablePush(events, settings); setPushOn(true) }
      else { await disablePush(); setPushOn(false) }
    } catch {
      setPushOn(false)
    } finally {
      setPushBusy(false)
      setPerm(permission())
      onNotifChange?.()
    }
  }

  async function handleTest() {
    setTestMsg(null)
    const res = await sendTest(t, settings.sound)
    setPerm(permission())
    onNotifChange?.()
    setTestMsg(res.ok ? { ok: true, text: t('settings.testSent') } : { ok: false, text: t('settings.testFail') })
  }

  const blocked = perm === 'denied'
  const granted = perm === 'granted'
  const statusText = granted ? t('settings.notifOn') : blocked ? t('settings.notifBlocked') : t('settings.notifOff')

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal modal--settings" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2 className="modal__title">{t('settings.title')}</h2>
          <button className="iconbtn" onClick={onClose} aria-label={t('common.close')}>×</button>
        </div>

        {/* ---------- Appearance ---------- */}
        <section className="settings__section">
          <h3 className="settings__heading">{t('settings.appearance')}</h3>

          <div className="settings__row settings__row--col">
            <span className="settings__label">{t('settings.theme')}</span>
            <div className="swatchGrid">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  className={`swatch ${theme === th.id ? 'is-active' : ''}`}
                  onClick={() => setTheme(th.id)}
                  title={th.name[lang] || th.name.en}
                  aria-pressed={theme === th.id}
                >
                  <span className="swatch__preview" aria-hidden="true">
                    {th.preview.map((c, i) => (
                      <span key={i} className="swatch__band" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="swatch__name">{th.name[lang] || th.name.en}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="settings__row">
            <span className="settings__label">{t('settings.language')}</span>
            <div className="seg">
              {LANGUAGES.map((l) => (
                <button key={l.id} className={`seg__btn ${lang === l.id ? 'is-active' : ''}`} onClick={() => setLang(l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings__row">
            <span className="settings__label">{t('settings.weekStart')}</span>
            <div className="seg">
              <button className={`seg__btn ${settings.weekStart === 1 ? 'is-active' : ''}`} onClick={() => update({ weekStart: 1 })}>
                {t('settings.monday')}
              </button>
              <button className={`seg__btn ${settings.weekStart === 0 ? 'is-active' : ''}`} onClick={() => update({ weekStart: 0 })}>
                {t('settings.sunday')}
              </button>
            </div>
          </div>

          <div className="settings__row">
            <span className="settings__label">{t('settings.reduceMotion')}</span>
            <label className="toggle toggle--bare">
              <input className="toggle__input" type="checkbox" checked={settings.reduceMotion} onChange={(e) => update({ reduceMotion: e.target.checked })} />
              <span className="toggle__track" aria-hidden="true"><span className="toggle__knob" /></span>
            </label>
          </div>
        </section>

        {/* ---------- Notifications ---------- */}
        <section className="settings__section">
          <h3 className="settings__heading">{t('settings.notifications')}</h3>

          <div className="settings__row">
            <span className={`statusDot ${granted ? 'is-on' : blocked ? 'is-blocked' : ''}`} aria-hidden="true" />
            <span className="settings__status">{statusText}</span>
          </div>

          <div className="settings__row settings__row--col">
            <span className="settings__label">{t('settings.tiers')}</span>
            <p className="settings__hint">{t('settings.tiersHint')}</p>
            {TYPE_ORDER.map((type) => {
              const meta = typeMeta(type)
              return (
                <div className="tierType" key={type}>
                  <span className="tierType__name"><span aria-hidden="true">{meta.emoji}</span> {t(`type.${type}`)}</span>
                  <TierChips
                    value={settings.reminderTiers[type] || []}
                    onChange={(keys) => setTypeTiers(type, keys)}
                  />
                </div>
              )
            })}
          </div>

          <div className="settings__row settings__row--col">
            <span className="settings__label">{t('settings.sound')}</span>
            <p className="settings__hint">{t('settings.soundHint')}</p>
            <div className="soundGrid">
              {SOUNDS.map((s) => (
                <button
                  key={s.id}
                  className={`chip ${settings.sound === s.id ? 'is-active' : ''}`}
                  onClick={() => chooseSound(s.id)}
                  aria-pressed={settings.sound === s.id}
                >
                  {s.id === 'none' ? '🔇' : '🔊'} {s.name[lang] || s.name.en}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn--primary settings__test" onClick={handleTest} disabled={blocked}>
            🔔 {t('settings.test')}
          </button>
          {testMsg && (
            <p className={`settings__testMsg ${testMsg.ok ? 'is-ok' : 'is-fail'}`}>{testMsg.text}</p>
          )}

          {pushConfigured() && (
            <div className="settings__row settings__push">
              <span className="settings__label">
                {t('settings.background')}
                <em className="settings__sub">{t('settings.backgroundHint')}</em>
              </span>
              <label className="toggle toggle--bare">
                <input className="toggle__input" type="checkbox" checked={pushOn} disabled={pushBusy || blocked} onChange={togglePush} />
                <span className="toggle__track" aria-hidden="true"><span className="toggle__knob" /></span>
              </label>
            </div>
          )}
        </section>

        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onClose}>{t('common.done')}</button>
        </div>
      </div>
    </div>
  )
}
