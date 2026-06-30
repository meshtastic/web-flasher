import type { EventFirmwareEdition, EventFirmwareResponse, EventFirmwareTheme } from '~/types/eventFirmware'
import type { EventModeConfig } from '~/types/resources'

// Same-origin bundled snapshot gates first paint, so it gets a short timeout;
// the cross-origin live API only refreshes in the background and can wait longer.
const BUNDLED_TIMEOUT_MS = 2000
const API_TIMEOUT_MS = 2500
// Offline snapshot shipped with the app (public/data/event_firmware.json, same
// origin and PWA-precached) so event mode still resolves when the cross-origin
// API is unreachable — venue Wi-Fi is unreliable. Kept in sync with meshtastic/api.
const BUNDLED_MANIFEST_URL = '/data/event_firmware.json'
const EMPTY_MANIFEST: EventFirmwareResponse = { version: 0, editions: [] }

async function fetchManifest(url: string, timeoutMs: number): Promise<EventFirmwareResponse | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (res.ok) {
      return await res.json() as EventFirmwareResponse
    }
  }
  catch {
    // offline, slow, timed out, or non-JSON body — caller decides the fallback
  }
  return null
}

/**
 * Bundled snapshot (same origin, PWA-precached). Used to resolve event mode
 * BEFORE mount so first paint never waits on the cross-origin API. Degrades to
 * an empty manifest (no active event) if even this is unreachable.
 */
export async function fetchBundledManifest(): Promise<EventFirmwareResponse> {
  return (await fetchManifest(BUNDLED_MANIFEST_URL, BUNDLED_TIMEOUT_MS)) ?? EMPTY_MANIFEST
}

/**
 * Live manifest from the API (source of truth, fresh dates/versions). The `/api`
 * prefix is proxied to api.meshtastic.org (see nuxt.config.ts). Returns null on
 * any failure; the caller keeps the bundled result. Fetched in the background so
 * a slow/unreachable API never blocks first paint.
 */
export async function fetchApiManifest(): Promise<EventFirmwareResponse | null> {
  return fetchManifest('/api/resource/eventFirmware', API_TIMEOUT_MS)
}

/**
 * Whether the current host belongs to an event edition's domain. Exact match or
 * a subdomain of it — NOT a substring, so a full host like `flash.meshtastic.org`
 * never matches a (mis-authored) bare suffix like `meshtastic.org`.
 */
export function hostMatches(hostname: string, domain?: string | null): boolean {
  return !!domain && (hostname === domain || hostname.endsWith(`.${domain}`))
}

/**
 * Pick the edition for the current host. An optional override (e.g. the
 * `?event=DEFCON` query param) matches by edition enum name or tag — handy for
 * local development where the hostname is `localhost`.
 */
export function resolveActiveEdition(
  manifest: EventFirmwareResponse,
  hostname: string,
  override?: string | null,
): EventFirmwareEdition | null {
  if (override) {
    const key = override.toUpperCase()
    const byKey = manifest.editions.find(
      e => e.edition.toUpperCase() === key || (e.tag ?? '').toUpperCase() === key,
    )
    if (byKey) return byKey
  }
  return manifest.editions.find(e => hostMatches(hostname, e.domain)) ?? null
}

/**
 * Map a manifest edition onto the EventModeConfig the rest of the flasher
 * already consumes. Editions whose firmware build has not shipped yet (version
 * null) yield an empty firmware id, which the UI treats as "coming soon".
 */
export function manifestEditionToEventMode(edition: EventFirmwareEdition): EventModeConfig {
  const fw = edition.firmware
  return {
    enabled: true,
    eventName: edition.displayName,
    eventTag: edition.tag ?? edition.displayName,
    pathPrefix: fw?.slug ?? '',
    domain: edition.domain ?? '',
    firmware: {
      id: fw?.id ?? '',
      title: fw?.title ?? edition.displayName,
      zip_url: fw?.zipUrl ?? undefined,
      release_notes: fw?.releaseNotes ?? undefined,
    },
    theme: edition.theme ?? undefined,
    tagline: edition.theme?.tagline ?? undefined,
    iconUrl: edition.iconUrl ?? undefined,
  }
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

/** Parse #RRGGBB into [r, g, b]; returns null for anything else. */
function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const int = Number.parseInt(m[1], 16)
  return [(int >> 16) & 0xff, (int >> 8) & 0xff, int & 0xff]
}

function hexToRgba(hex: string, alpha: number): string | null {
  const rgb = parseHex(hex)
  if (!rgb) return null
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
}

function darken(hex: string, amount: number): string | null {
  const rgb = parseHex(hex)
  if (!rgb) return null
  const [r, g, b] = rgb.map(c => clampByte(c * (1 - amount)))
  return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Re-tint the UI from the edition theme by overriding the accent CSS variables
 * defined in assets/css/main.css. The whole interface (logo glow, gradient
 * title, buttons) reads these, so this is all the wiring branding needs.
 */
export function applyEventTheme(theme?: EventFirmwareTheme | null): void {
  const primary = theme?.colors?.primary
  if (!primary || !parseHex(primary)) return
  const root = document.documentElement
  const secondary = theme?.colors?.secondary && parseHex(theme.colors.secondary)
    ? theme.colors.secondary
    : darken(primary, 0.25)

  root.style.setProperty('--accent', primary)
  if (secondary) root.style.setProperty('--accent-dark', secondary)
  const glow = hexToRgba(primary, 0.3)
  if (glow) root.style.setProperty('--accent-glow', glow)
  const subtle = hexToRgba(primary, 0.5)
  if (subtle) root.style.setProperty('--accent-subtle', subtle)
  // Also feed the manifest-theme.css variables some components reference.
  root.style.setProperty('--primary-color', primary)
}
