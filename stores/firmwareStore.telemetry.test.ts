import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { eventMode, setActiveEventMode } from '~/types/resources'
import { setGlobalI18n } from '~/utils/i18n'
import { setActiveEventSlug } from '~/utils/telemetry'
import type { DeviceHardware } from '~/types/api'
import { useFirmwareStore } from './firmwareStore'

// The store module reads window.location at import time (createUrl).
// vi.hoisted runs before the imports above are evaluated.
vi.hoisted(() => {
  (globalThis as any).window = { location: { host: 'localhost:3000', protocol: 'https:', href: 'https://localhost:3000/' } }
})

// The emitters no-op outside the browser; spy on them to assert what the funnel
// would report. The pure attribute builders stay real.
const { addRumAction, logTelemetry, setTelemetryContext } = vi.hoisted(() => ({
  addRumAction: vi.fn(),
  logTelemetry: vi.fn(),
  setTelemetryContext: vi.fn(),
}))
vi.mock('~/utils/telemetry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/telemetry')>()
  return { ...actual, addRumAction, logTelemetry, setTelemetryContext }
})

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))

const heltecV3: DeviceHardware = {
  hwModel: 43,
  hwModelSlug: 'HELTEC_V3',
  platformioTarget: 'heltec-v3',
  architecture: 'esp32-s3',
  activelySupported: true,
  displayName: 'Heltec V3',
  supportLevel: 1,
}

const STABLE = { id: 'v2.7.11.abc1234', title: 'Meshtastic Firmware 2.7.11' }

/** Snapshot of the module-level eventMode singleton, restored after each test. */
const defaultEventMode = { ...eventMode }

function actionNamed(name: string) {
  return addRumAction.mock.calls.find(([actionName]) => actionName === name)?.[1]
}

beforeEach(() => {
  setActivePinia(createPinia())
  setGlobalI18n({ t: (key: string) => key })
  addRumAction.mockReset()
  logTelemetry.mockReset()
})

afterEach(() => {
  setActiveEventMode(defaultEventMode as any)
  setActiveEventSlug('')
})

describe('flash funnel actions', () => {
  it('reports the board, firmware and method when a flash starts', () => {
    const store = useFirmwareStore()
    store.selectedFirmware = STABLE

    store.trackFlashStart(heltecV3, { method: 'esptool', cleanInstall: true })

    expect(actionNamed('flash_start')).toMatchObject({
      platformio_target: 'heltec-v3',
      hw_model_slug: 'HELTEC_V3',
      architecture: 'esp32-s3',
      firmware_version: 'v2.7.11.abc1234',
      firmware_channel: 'stable',
      method: 'esptool',
      clean_install: true,
      event_mode: false,
      event_slug: 'none',
    })
  })

  it('scopes a flash to the event the flasher is locked to', () => {
    // What plugins/eventMode.client.ts does once the edition resolves.
    setActiveEventSlug('DEFCON')
    setActiveEventMode({
      enabled: true,
      eventName: 'DEF CON 34',
      eventTag: 'DEFCON',
      pathPrefix: 'defcon34',
      domain: 'defcon.meshtastic.org',
      firmware: { id: 'v2.8.0.c800fc8', title: 'Meshtastic Firmware 2.8.0.c800fc8' },
    })
    const store = useFirmwareStore()
    store.selectedFirmware = { id: 'v2.8.0.c800fc8', title: 'Meshtastic Firmware 2.8.0.c800fc8' }

    store.trackDownload(heltecV3, true)

    expect(actionNamed('flash_success')).toMatchObject({
      platformio_target: 'heltec-v3',
      event_mode: true,
      event_slug: 'defcon',
      event_name: 'DEF CON 34',
      firmware_channel: 'event',
      outcome_source: 'device',
    })
    // The original action name is still emitted for existing dashboards.
    expect(actionNamed('firmware_flash')).toMatchObject({ event_slug: 'defcon' })
    expect(logTelemetry).toHaveBeenCalledWith(
      'info',
      'Firmware flash completed',
      expect.objectContaining({ event_type: 'firmware_flash', event_slug: 'defcon' }),
    )
  })

  it('marks a UF2 hand-off as an unverified outcome', () => {
    const store = useFirmwareStore()
    store.selectedFirmware = STABLE

    store.trackDownload({ ...heltecV3, hwModelSlug: 'RAK4631', platformioTarget: 'rak4631' }, false, 'uf2')

    expect(actionNamed('flash_success')).toMatchObject({
      platformio_target: 'rak4631',
      method: 'uf2',
      outcome_source: 'download',
    })
  })

  it('attributes a failure to the flash that was in progress', () => {
    const store = useFirmwareStore()
    store.selectedFirmware = STABLE
    store.trackFlashStart(heltecV3, { method: 'esptool', cleanInstall: false })
    store.flashPercentDone = 42

    store.trackFlashError(new Error('Timed out waiting for packet header'))

    expect(actionNamed('flash_error')).toMatchObject({
      platformio_target: 'heltec-v3',
      firmware_version: 'v2.7.11.abc1234',
      method: 'esptool',
      error_class: 'Error',
      error_kind: 'flash_failed',
      flash_percent_done: 42,
    })
  })

  it('does not blame the next flash for the previous attempt', () => {
    const store = useFirmwareStore()
    store.selectedFirmware = STABLE
    store.trackFlashStart(heltecV3, { method: 'esptool', cleanInstall: false })
    store.trackDownload(heltecV3, false)
    addRumAction.mockReset()

    // A dismissed port picker before any flash_start: no stale board attached.
    const cancelled = new Error('No port selected by the user.')
    cancelled.name = 'NotFoundError'
    store.trackFlashError(cancelled)

    const error = actionNamed('flash_error')
    expect(error).toMatchObject({ error_kind: 'user_cancelled', event_slug: 'none' })
    expect(error).not.toHaveProperty('platformio_target')
  })
})
