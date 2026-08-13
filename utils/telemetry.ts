// Provisioning-funnel telemetry (issue #403).
//
// The flasher is a single-route SPA, so every RUM view lands on `/`: we could
// count sessions during an event but not which boards people actually flashed.
// Three joints are instrumented, each carrying the board, the firmware and —
// when the flasher is locked to an event build — the event slug:
//
//   select_board  → a board was picked
//   flash_start   → the user kicked off a flash (before the port picker)
//   flash_success → the write finished (or the UF2 was handed to the browser)
//   flash_error   → the flash threw; carries an error class
//
// The same attributes are also pushed into the RUM/Logs global context, so
// views, errors and resources collected later in the session inherit them and
// per-board / per-event grouping works beyond just these actions.
//
// Everything here is best-effort: Datadog is routinely blocked by extensions,
// and telemetry must never break a flash.

import type { DeviceHardware, FirmwareResource } from '~/types/api'
import type { EventModeConfig } from '~/types/resources'

/** How the firmware reached the device. */
export type FlashMethod = 'esptool' | 'uf2'

export type FirmwareChannel
  = | 'stable'
    | 'alpha'
    | 'preview'
    | 'nightly'
    | 'pr'
    | 'event'
    | 'local'
    | 'unknown'

export type FlashErrorKind = 'user_cancelled' | 'flash_failed'

export interface FlashErrorAttributes {
  error_class: string
  error_message: string
  error_kind: FlashErrorKind
}

/** Bucket used for `event_slug` when the flasher is not running an event build. */
export const NO_EVENT_SLUG = 'none'

const MAX_ERROR_MESSAGE_LENGTH = 200

/** Lowercase, underscore-separated identifier safe to group by in Datadog. */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Attributes describing the selected board. `platformio_target` is the board
 * slug the funnel groups by (e.g. `rak4631`); `hw_model_slug` is the protobuf
 * hardware model for joining against app-side telemetry.
 */
export function boardAttributes(target?: DeviceHardware): Record<string, unknown> {
  if (!target) return {}
  return {
    hw_model: target.hwModel,
    hw_model_slug: target.hwModelSlug,
    platformio_target: target.platformioTarget,
    architecture: target.architecture,
    support_level: target.supportLevel ?? 3,
  }
}

/**
 * Attributes identifying the event edition the flasher is locked to. Always
 * emits `event_slug` (falling back to `none`) so a group-by never drops the
 * non-event traffic bucket.
 */
export function eventAttributes(config?: EventModeConfig): Record<string, unknown> {
  if (!config?.enabled) {
    return { event_mode: false, event_slug: NO_EVENT_SLUG }
  }
  return {
    event_mode: true,
    event_slug: config.slug || slugify(config.eventTag || config.eventName) || NO_EVENT_SLUG,
    event_name: config.eventName,
  }
}

/**
 * Which channel the selected firmware came from. Stable vs alpha vs preview is
 * not derivable from a version id, so the caller passes the ids it listed under
 * each section.
 */
export function resolveFirmwareChannel(input: {
  firmware?: FirmwareResource
  hasLocalFile?: boolean
  isEventMode?: boolean
  nightlyId?: string
  alphaIds?: string[]
  previewIds?: string[]
}): FirmwareChannel {
  if (input.hasLocalFile) return 'local'
  if (input.firmware?.prBuild) return 'pr'
  if (input.isEventMode) return 'event'

  const id = input.firmware?.id
  if (!id) return 'unknown'
  if (input.nightlyId && id === input.nightlyId) return 'nightly'
  if (input.previewIds?.includes(id)) return 'preview'
  if (input.alphaIds?.includes(id)) return 'alpha'
  return 'stable'
}

/**
 * Split a flash failure into a countable class. Dismissing the Web Serial port
 * picker rejects with NotFoundError — a user choice, not a failure — so it is
 * tagged separately and can be excluded from failure rates.
 */
export function classifyFlashError(error: unknown): FlashErrorAttributes {
  const err = error as { name?: string, message?: string } | undefined
  const errorClass = err?.name || 'Error'
  const message = err?.message || (error === undefined || error === null ? '' : String(error))
  const userCancelled = errorClass === 'NotFoundError' || errorClass === 'AbortError'
  return {
    error_class: errorClass,
    error_message: message.slice(0, MAX_ERROR_MESSAGE_LENGTH),
    error_kind: userCancelled ? 'user_cancelled' : 'flash_failed',
  }
}

/** Emit a RUM action. No-ops if the RUM bundle is unavailable. */
export function addRumAction(name: string, context: Record<string, unknown> = {}): void {
  if (!import.meta.client) return
  import('@datadog/browser-rum')
    .then(({ datadogRum }) => datadogRum.addAction(name, context))
    .catch(() => {})
}

/**
 * Attach properties to every RUM and Logs event collected from here on, so
 * views/errors/resources can be grouped by board, firmware and event too.
 */
export function setTelemetryContext(properties: Record<string, unknown>): void {
  if (!import.meta.client) return
  const entries = Object.entries(properties)
  import('@datadog/browser-rum')
    .then(({ datadogRum }) => {
      for (const [key, value] of entries) datadogRum.setGlobalContextProperty(key, value)
    })
    .catch(() => {})
  import('@datadog/browser-logs')
    .then(({ datadogLogs }) => {
      for (const [key, value] of entries) datadogLogs.setGlobalContextProperty(key, value)
    })
    .catch(() => {})
}

/** Structured log line (Logs is unsampled, so these are the counting source). */
export function logTelemetry(
  level: 'info' | 'warn',
  message: string,
  context: Record<string, unknown> = {},
): void {
  if (!import.meta.client) return
  import('@datadog/browser-logs')
    .then(({ datadogLogs }) => datadogLogs.logger[level](message, context))
    .catch(() => {})
}
