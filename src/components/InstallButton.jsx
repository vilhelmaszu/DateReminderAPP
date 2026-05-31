import { useState } from 'react'
import { useI18n } from '../lib/i18n.jsx'
import { useInstallPrompt } from '../lib/useInstallPrompt.js'

/**
 * Install button + fallback instructions sheet. Stays hidden once the app is
 * already installed. If Chrome offered a native prompt, we trigger it directly;
 * otherwise we show OS-specific add-to-home-screen instructions.
 */
export default function InstallButton() {
  const { t } = useI18n()
  const { canInstall, installed, install } = useInstallPrompt()
  const [showHow, setShowHow] = useState(false)

  if (installed) return null

  async function handle() {
    if (canInstall) {
      const outcome = await install()
      if (outcome !== 'accepted') setShowHow(true) // dismissed → show how-to
    } else {
      setShowHow(true)
    }
  }

  return (
    <>
      <button className="installBtn" onClick={handle} title={t('install.title')}>
        📲 <span className="installBtn__label">{t('install.short')}</span>
      </button>

      {showHow && <InstallHowTo onClose={() => setShowHow(false)} />}
    </>
  )
}

function InstallHowTo({ onClose }) {
  const { t } = useI18n()
  const platform = detectPlatform()

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal modal--howto" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2 className="modal__title">📲 {t('install.title')}</h2>
          <button className="iconbtn" onClick={onClose} aria-label={t('common.close')}>×</button>
        </div>

        <p className="howto__lead">{t(`install.${platform}.lead`)}</p>
        <ol className="howto__steps">
          {[1, 2, 3].map((n) => {
            const key = `install.${platform}.step${n}`
            const text = t(key)
            return text !== key ? <li key={n}>{text}</li> : null
          })}
        </ol>

        <p className="howto__note">{t('install.note')}</p>

        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onClose}>{t('common.done')}</button>
        </div>
      </div>
    </div>
  )
}

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'android'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}
