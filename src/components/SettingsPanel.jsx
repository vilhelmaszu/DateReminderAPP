import { useEffect, useRef, useState } from 'react'
import { useI18n, LANGUAGES } from '../lib/i18n.jsx'
import { THEMES } from '../lib/themes.js'
import { permission, sendTest } from '../lib/notifications.js'
import { TYPE_ORDER, typeMeta } from '../lib/eventTypes.js'
import { STYLES } from '../lib/styles.js'
import { SOUNDS, playSound } from '../lib/sounds.js'
import { pushConfigured, currentSubscription, enablePush, disablePush } from '../lib/push.js'
import { downloadBackup, importBackup, readBackupFile } from '../lib/backup.js'
import { useAuth } from '../lib/auth.jsx'
import TierChips from './TierChips.jsx'

export default function SettingsPanel({ settings, setSettings, theme, setTheme, style, setStyle, events, onNotifChange, onSignInClick, onClose }) {
  const { t, lang, setLang } = useI18n()
  const auth = useAuth()
  const [perm, setPerm] = useState(() => permission())
  const [testMsg, setTestMsg] = useState(null)
  const [pushOn, setPushOn] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [backupMsg, setBackupMsg] = useState(null)
  const fileRef = useRef(null)
  const [pwForm, setPwForm] = useState({ open: false, value: '', busy: false, msg: null })

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

  async function submitPassword(e) {
    e.preventDefault()
    if (pwForm.value.length < 8) {
      setPwForm((f) => ({ ...f, msg: { ok: false, text: t('signin.shortPassword') } })); return
    }
    setPwForm((f) => ({ ...f, busy: true, msg: null }))
    const { error } = await auth.setPassword(pwForm.value)
    setPwForm((f) => ({
      ...f,
      busy: false,
      value: error ? f.value : '',
      open: !!error,
      msg: { ok: !error, text: error ? (error.message || t('signin.fail')) : t('settings.passwordSaved') },
    }))
  }

  function handleBackup() {
    setBackupMsg(null)
    try {
      const payload = downloadBackup()
      const count = Array.isArray(payload.events) ? payload.events.length : 0
      setBackupMsg({ ok: true, text: t('settings.backupDone', { n: count }) })
    } catch {
      setBackupMsg({ ok: false, text: t('settings.backupFail') })
    }
  }

  async function handleRestoreFile(e) {
    setBackupMsg(null)
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    const payload = await readBackupFile(file)
    if (!payload) { setBackupMsg({ ok: false, text: t('settings.restoreBad') }); return }
    if (!confirm(t('settings.restoreConfirm'))) return
    const result = importBackup(payload)
    if (!result.ok) { setBackupMsg({ ok: false, text: t('settings.restoreBad') }); return }
    // Easiest way to re-sync all in-memory state with the new localStorage:
    // a hard reload. Tiny price for total simplicity + correctness.
    location.reload()
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

          <div className="settings__row settings__row--col">
            <span className="settings__label">{t('settings.style')}</span>
            <div className="styleGrid">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  className={`styleSwatch ${style === s.id ? 'is-active' : ''}`}
                  onClick={() => setStyle(s.id)}
                  aria-pressed={style === s.id}
                >
                  <span className="styleSwatch__preview" data-style-preview={s.id} aria-hidden="true">
                    <span className="styleSwatch__line styleSwatch__line--lg" />
                    <span className="styleSwatch__line styleSwatch__line--sm" />
                  </span>
                  <span className="styleSwatch__name">{s.name[lang] || s.name.en}</span>
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

        {/* ---------- Cloud sync (sign in) ---------- */}
        {auth.enabled && (
          <section className="settings__section">
            <h3 className="settings__heading">{t('settings.sync')}</h3>
            {auth.user ? (
              <>
                <div className="settings__row">
                  <span className="statusDot is-on" aria-hidden="true" />
                  <span className="settings__status">
                    {t('settings.signedInAs', { email: auth.user.email })}
                  </span>
                </div>
                <p className="settings__hint">{t('settings.syncOnHint')}</p>

                {pwForm.open ? (
                  <form className="pwForm" onSubmit={submitPassword}>
                    <input
                      className="field__input"
                      type="password"
                      autoFocus
                      autoComplete="new-password"
                      value={pwForm.value}
                      onChange={(e) => setPwForm((f) => ({ ...f, value: e.target.value, msg: null }))}
                      placeholder={t('settings.passwordNewPlaceholder')}
                      disabled={pwForm.busy}
                    />
                    <div className="pwForm__actions">
                      <button type="button" className="btn btn--ghost" onClick={() => setPwForm({ open: false, value: '', busy: false, msg: null })} disabled={pwForm.busy}>
                        {t('form.cancel')}
                      </button>
                      <button type="submit" className="btn btn--primary" disabled={pwForm.busy || pwForm.value.length < 8}>
                        {pwForm.busy ? '…' : t('settings.passwordSave')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    className="btn btn--ghost settings__test"
                    onClick={() => setPwForm({ open: true, value: '', busy: false, msg: null })}
                  >
                    🔑 {t('settings.setPassword')}
                  </button>
                )}
                {pwForm.msg && (
                  <p className={`settings__testMsg ${pwForm.msg.ok ? 'is-ok' : 'is-fail'}`}>{pwForm.msg.text}</p>
                )}

                <button className="btn btn--ghost settings__test" onClick={() => auth.signOut()}>
                  {t('settings.signOut')}
                </button>
              </>
            ) : (
              <>
                <p className="settings__hint">{t('settings.syncHint')}</p>
                <button className="btn btn--primary settings__test" onClick={() => { onClose?.(); onSignInClick?.() }}>
                  🔐 {t('settings.signIn')}
                </button>
              </>
            )}
          </section>
        )}

        {/* ---------- Backup & restore ---------- */}
        <section className="settings__section">
          <h3 className="settings__heading">{t('settings.backup')}</h3>
          <p className="settings__hint">{t('settings.backupHint')}</p>
          <div className="backupRow">
            <button className="btn btn--ghost backupRow__btn" onClick={handleBackup}>
              ⬇️ {t('settings.backupNow')}
            </button>
            <button className="btn btn--ghost backupRow__btn" onClick={() => fileRef.current?.click()}>
              ⬆️ {t('settings.restore')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={handleRestoreFile}
            />
          </div>
          {backupMsg && (
            <p className={`settings__testMsg ${backupMsg.ok ? 'is-ok' : 'is-fail'}`}>{backupMsg.text}</p>
          )}
        </section>

        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onClose}>{t('common.done')}</button>
        </div>
      </div>
    </div>
  )
}
