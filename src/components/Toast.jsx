import { useEffect } from 'react'
import { useI18n } from '../lib/i18n.jsx'

/** A bottom-anchored toast with an Undo action. Auto-dismisses after `ms`. */
export default function Toast({ message, actionLabel, onAction, onDismiss, ms = 5000 }) {
  const { t } = useI18n()
  useEffect(() => {
    const id = setTimeout(onDismiss, ms)
    return () => clearTimeout(id)
  }, [ms, onDismiss])

  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast__msg">{message}</span>
      {onAction && (
        <button className="toast__btn" onClick={onAction}>
          {actionLabel || t('common.undo')}
        </button>
      )}
      <button className="toast__close" onClick={onDismiss} aria-label={t('common.close')}>×</button>
    </div>
  )
}
