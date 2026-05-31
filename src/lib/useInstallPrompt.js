import { useEffect, useState } from 'react'

/**
 * PWA install state and trigger. Chrome fires `beforeinstallprompt` once the
 * install criteria are met (manifest + service worker + HTTPS). We stash the
 * event and call `.prompt()` on demand so the user can install with one tap.
 *
 * Returns:
 *   canInstall — Chrome offered a native install prompt; we can fire it.
 *   installed  — best-effort detection of "already installed" (display-mode).
 *   install()  — show the prompt. Returns 'accepted' | 'dismissed' | null.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(() => isStandalone())

  useEffect(() => {
    function onBeforeInstall(e) {
      e.preventDefault()
      setDeferred(e)
    }
    function onInstalled() {
      setDeferred(null)
      setInstalled(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!deferred) return null
    try {
      deferred.prompt()
      const choice = await deferred.userChoice
      setDeferred(null)
      return choice?.outcome ?? null
    } catch {
      return null
    }
  }

  return { canInstall: !!deferred, installed, install }
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  // iOS Safari uses navigator.standalone instead of the media query.
  return window.navigator.standalone === true
}
