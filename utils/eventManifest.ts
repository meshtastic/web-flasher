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

/**
 * Whether applying `next` would DOWNGRADE the currently-active event: it's the
 * same event (matched by non-empty domain) but its build hasn't shipped yet
 * (empty firmware id) while we already resolved a flashable build for it. The
 * background API refresh uses this to avoid reverting a shipped bundled build
 * back to "coming soon" when the live manifest still lags behind.
 */
export function isFirmwareDowngrade(current: EventModeConfig, next: EventModeConfig): boolean {
  return current.enabled
    && !!current.firmware.id
    && !next.firmware.id
    && !!current.domain
    && current.domain === next.domain
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

/** WCAG relative luminance of an [r, g, b] triple (0–255 channels). */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/**
 * Black or white text — whichever has more contrast against `hex`. Used for
 * content sitting ON a solid accent fill (buttons, step badges) so a dark event
 * accent (e.g. DEF CON) doesn't leave black text on a dark button.
 */
function onAccentText(hex: string): string {
  const rgb = parseHex(hex)
  if (!rgb) return '#000000'
  const lum = relativeLuminance(rgb)
  const contrastWhite = 1.05 / (lum + 0.05)
  const contrastBlack = (lum + 0.05) / 0.05
  return contrastWhite >= contrastBlack ? '#ffffff' : '#000000'
}

/**
 * Resolve the accent CSS variables an event theme drives. Pure (no DOM) so the
 * accent-selection and on-accent contrast logic is unit-testable. Returns null
 * when the theme has no usable primary colour.
 */
export function resolveEventAccentVars(theme?: EventFirmwareTheme | null): Record<string, string> | null {
  const primary = theme?.colors?.primary
  if (!primary || !parseHex(primary)) return null
  // The interactive accent drives buttons, badges, borders, glows and the
  // gradient title. Prefer the theme's dedicated accent colour when set — a
  // theme's `primary` can be a dark brand/background colour (e.g. DEF CON's
  // navy) that is illegible as an accent on a dark UI. Fall back to primary for
  // themes that only specify one colour (Hamvention, Open Sauce, …).
  const accent = theme?.colors?.accent && parseHex(theme.colors.accent)
    ? theme.colors.accent
    : primary

  const vars: Record<string, string> = {
    '--accent': accent,
    // Legible text for content sitting on the solid accent (buttons, badges).
    '--on-accent': onAccentText(accent),
    // The brand-colour utilities (.text-meshtastic / .bg-meshtastic /
    // .border-meshtastic, link + plug icons, etc.) read --primary-color. In the
    // default theme it equals --accent, so keep them unified here too — using
    // the raw (possibly dark) primary would leave those icons illegible on a
    // dark UI (e.g. DEF CON's navy link icon).
    '--primary-color': accent,
  }
  // Keep the gradient title cohesive: darken the SAME accent hue rather than
  // jumping to the (possibly unrelated) secondary colour.
  const accentDark = darken(accent, 0.25)
  if (accentDark) vars['--accent-dark'] = accentDark
  const glow = hexToRgba(accent, 0.3)
  if (glow) vars['--accent-glow'] = glow
  const subtle = hexToRgba(accent, 0.5)
  if (subtle) vars['--accent-subtle'] = subtle
  return vars
}

/**
 * Re-tint the UI from the edition theme by overriding the accent CSS variables
 * defined in assets/css/main.css. The whole interface (logo glow, gradient
 * title, buttons) reads these, so this is all the wiring branding needs.
 */
export function applyEventTheme(theme?: EventFirmwareTheme | null): void {
  const vars = resolveEventAccentVars(theme)
  if (!vars) return
  const root = document.documentElement
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}
