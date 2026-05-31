import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { I18nProvider } from './lib/i18n.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)

// Register the service worker (PWA install + offline + notifications).
// Only in production builds — in dev it would aggressively cache and fight HMR.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js')
      // Tell the SW where the push server lives, so it can fetch what's due.
      const api = import.meta.env.VITE_PUSH_API
      const reg = await navigator.serviceWorker.ready
      if (api && reg.active) reg.active.postMessage({ type: 'config', api })
    } catch (err) {
      console.warn('Service worker registration failed:', err)
    }
  })
}
