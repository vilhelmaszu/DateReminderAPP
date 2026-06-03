import { useI18n } from '../lib/i18n.jsx'

/**
 * Shown on first sign-in when BOTH local and cloud have events. The user
 * picks which set to keep — or merge cloud + any local items not yet in cloud.
 */
export default function MigrationPrompt({ info, onResolve }) {
  const { t } = useI18n()
  if (!info) return null

  return (
    <div className="modal__backdrop">
      <div className="modal modal--migration" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">☁️ {t('migration.title')}</h2>
        <p className="migration__lead">
          {t('migration.lead', { local: info.local, cloud: info.cloud })}
        </p>

        <div className="migration__options">
          <button className="migration__opt" onClick={() => onResolve('cloud')}>
            <strong>☁️ {t('migration.cloud')}</strong>
            <span>{t('migration.cloudHint', { n: info.cloud })}</span>
          </button>
          <button className="migration__opt" onClick={() => onResolve('local')}>
            <strong>📱 {t('migration.local')}</strong>
            <span>{t('migration.localHint', { n: info.local })}</span>
          </button>
          <button className="migration__opt migration__opt--recommended" onClick={() => onResolve('merge')}>
            <strong>🤝 {t('migration.merge')}</strong>
            <span>{t('migration.mergeHint')}</span>
          </button>
        </div>

        <p className="migration__note">{t('migration.note')}</p>
      </div>
    </div>
  )
}
