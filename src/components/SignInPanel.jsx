import { useState } from 'react'
import { useI18n } from '../lib/i18n.jsx'
import { useAuth } from '../lib/auth.jsx'

/**
 * Sign-in modal. Two paths:
 *  - email + password  → instant password sign-in (no email round-trip).
 *  - email only        → magic link (one-tap, no password needed).
 *  - "wrong password"  → offer to create an account, or fall back to magic link.
 */
export default function SignInPanel({ onClose }) {
  const { t } = useI18n()
  const { signInWithEmail, signInWithPassword, signUpWithPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null) // 'sent' | 'signedUp' | {error}

  function validEmail(e) {
    return e && e.includes('@') && e.includes('.')
  }

  async function submitPassword(e) {
    e?.preventDefault()
    const em = email.trim().toLowerCase()
    if (!validEmail(em)) return setStatus({ error: t('signin.invalidEmail') })
    if (password.length < 8) return setStatus({ error: t('signin.shortPassword') })

    setBusy(true); setStatus(null)
    const { error } = await signInWithPassword(em, password)
    setBusy(false)
    if (!error) return // signed in — provider will close UI via state change
    // Wrong creds OR user doesn't exist — Supabase returns the same message.
    setStatus({ error: t('signin.wrongCreds'), canSignUp: true, canMagic: true })
  }

  async function sendMagic() {
    const em = email.trim().toLowerCase()
    if (!validEmail(em)) return setStatus({ error: t('signin.invalidEmail') })
    setBusy(true); setStatus(null)
    const { error } = await signInWithEmail(em)
    setBusy(false)
    if (error) setStatus({ error: error.message || t('signin.fail') })
    else setStatus('sent')
  }

  async function createAccount() {
    const em = email.trim().toLowerCase()
    if (!validEmail(em) || password.length < 8) return
    setBusy(true); setStatus(null)
    const { data, error } = await signUpWithPassword(em, password)
    setBusy(false)
    if (error) { setStatus({ error: error.message || t('signin.fail') }); return }
    // If email confirmation is on, user must confirm via email link first.
    if (data?.user && !data.session) setStatus('signedUp')
    // If confirmation is off (or autoconfirm), session is already established.
  }

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <form className="modal modal--signin" onClick={(e) => e.stopPropagation()} onSubmit={submitPassword}>
        <div className="modal__head">
          <h2 className="modal__title">🔐 {t('signin.title')}</h2>
          <button type="button" className="iconbtn" onClick={onClose} aria-label={t('common.close')}>×</button>
        </div>

        {status === 'sent' ? (
          <div className="signin__sent">
            <p className="signin__sentTitle">✉️ {t('signin.sentTitle')}</p>
            <p className="signin__sentBody">{t('signin.sentBody', { email })}</p>
            <p className="signin__sentNote">{t('signin.sentNote')}</p>
          </div>
        ) : status === 'signedUp' ? (
          <div className="signin__sent">
            <p className="signin__sentTitle">✉️ {t('signin.confirmTitle')}</p>
            <p className="signin__sentBody">{t('signin.confirmBody', { email })}</p>
          </div>
        ) : (
          <>
            <p className="signin__lead">{t('signin.lead')}</p>

            <label className="field">
              <span className="field__label">{t('signin.email')}</span>
              <input
                className="field__input"
                type="email"
                autoComplete="email"
                inputMode="email"
                autoFocus
                value={email}
                onChange={(e) => { setEmail(e.target.value); setStatus(null) }}
                placeholder="you@example.com"
                disabled={busy}
              />
            </label>

            <label className="field">
              <span className="field__label">{t('signin.password')} <em>{t('form.optional')}</em></span>
              <input
                className="field__input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setStatus(null) }}
                placeholder={t('signin.passwordPlaceholder')}
                disabled={busy}
              />
            </label>

            {status?.error && (
              <div className="signin__errorBox">
                <p className="modal__error">{status.error}</p>
                {status.canSignUp && (
                  <button type="button" className="signin__inlineBtn" onClick={createAccount} disabled={busy}>
                    {t('signin.createAccount')}
                  </button>
                )}
                {status.canMagic && (
                  <button type="button" className="signin__inlineBtn" onClick={sendMagic} disabled={busy}>
                    {t('signin.useMagic')}
                  </button>
                )}
              </div>
            )}

            <p className="signin__why">{t('signin.why')}</p>

            <div className="modal__actions modal__actions--stacked">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={busy || !email.trim() || !password}
              >
                {busy ? '…' : t('signin.signInBtn')}
              </button>
              <button type="button" className="btn btn--ghost" onClick={sendMagic} disabled={busy || !email.trim()}>
                ✉️ {t('signin.send')}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
