import { onBeforeUnmount, ref, type Ref } from 'vue'

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id?: string) => void
  remove: (id?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<void> | null = null

/** Inject the Turnstile script once per page load. */
function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.turnstile) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Turnstile'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

/**
 * Cloudflare Turnstile widget lifecycle.
 *
 * When no site key is configured the widget is skipped entirely and `token`
 * stays an empty string — that is the local-dev path. The Apps Script backend
 * decides whether an empty token is acceptable, so skipping here can never
 * weaken production, which always has a key set.
 */
export function useTurnstile(siteKey: string, container: Ref<HTMLElement | null>) {
  const token = ref('')
  const error = ref('')
  const ready = ref(false)
  let widgetId: string | null = null

  const enabled = Boolean(siteKey)

  async function mount() {
    if (!enabled) {
      ready.value = true
      return
    }

    try {
      await loadScript()
    }
    catch {
      error.value = 'We could not load the spam check. Disable your ad blocker for this page and reload.'
      return
    }

    if (!container.value || !window.turnstile) return

    widgetId = window.turnstile.render(container.value, {
      'sitekey': siteKey,
      'theme': 'auto',
      'callback': (value: string) => {
        token.value = value
        error.value = ''
        ready.value = true
      },
      'error-callback': () => {
        error.value = 'The spam check failed to run. Please reload the page.'
        token.value = ''
      },
      'expired-callback': () => {
        token.value = ''
        ready.value = false
      },
    })
  }

  /** Turnstile tokens are single-use — reset after every submit attempt. */
  function reset() {
    token.value = ''
    if (!enabled) return
    ready.value = false
    window.turnstile?.reset(widgetId ?? undefined)
  }

  onBeforeUnmount(() => {
    if (enabled && widgetId) window.turnstile?.remove(widgetId)
  })

  return { token, error, ready, enabled, mount, reset }
}
