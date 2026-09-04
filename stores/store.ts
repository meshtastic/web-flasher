/**
 * Origin every `api/...` call resolves to in a built app.
 *
 * apiv2.meshtastic.org is the Cloudflare Worker rewrite of the API (meshtastic/api
 * `v2` branch). It serves the same documents as api.meshtastic.org — byte-identical
 * for /resource/deviceHardware — behind Workers Caching, and sends a static
 * `Access-Control-Allow-Origin: *` rather than the old per-origin allowlist.
 *
 * Overridable at BUILD time (`API_ORIGIN=https://api.meshtastic.org pnpm build`),
 * which is what makes a rollback a redeploy with one env var instead of a code
 * change. Vite inlines the value into the client bundle; see `vite.define` in
 * nuxt.config.ts, without which `process.env` is an empty shim in the browser.
 */
export const API_ORIGIN = process.env.API_ORIGIN || 'https://apiv2.meshtastic.org'

export function createUrl(relativeUrl: string) {
  // In development the `api/` prefix is kept and served same-origin, so Vite's
  // proxy (nuxt.config.ts) forwards it — no CORS round trip while developing,
  // and API_PROXY_TARGET can point the whole app at a local API.
  if (relativeUrl.startsWith('api') && process.env.NODE_ENV !== 'development') {
    // The API is https-only; window.location.protocol would downgrade it on a
    // plain-http preview, and every flasher host is https anyway (Web Serial
    // requires a secure context).
    return `${API_ORIGIN}/${relativeUrl.replace('api/', '')}`
  }
  const base = `${window.location.protocol}//${window.location.host}`
  return `${base}/${relativeUrl}`
}
