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

// Enough of the flashing stack to drive the ESP paths in node: the terminal
// needs a DOM, and the esptool transport needs a serial port.
vi.mock('~/utils/terminal', () => ({
  openTerminal: vi.fn(async () => ({ writeln: vi.fn(), write: vi.fn(), clear: vi.fn() })),
}))
vi.mock('esptool-js', () => ({
  ESPLoader: vi.fn(),
  Transport: vi.fn(function (this: any) {
    this.setRTS = vi.fn()
    this.disconnect = vi.fn()
    this.waitForUnlock = vi.fn()
  }),
}))
vi.stubGlobal('navigator', {
  userAgent: 'vitest',
  serial: { requestPort: vi.fn(async () => ({ ondisconnect: null, open: vi.fn(), close: vi.fn() })) },
})

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

function actionsNamed(name: string) {
  return addRumAction.mock.calls.filter(([actionName]) => actionName === name)
}

// A two-file update flash (app + OTA), manifest-driven.
const MANIFEST = {
  version: '2.7.11',
  files: [
    { name: 'firmware-heltec-v3-2.7.11.bin', part_name: 'app0' },
    { name: 'mt-esp32s3-ota.bin', part_name: 'app1' },
  ],
  part: [
    { name: 'app0', offset: '0x10000', subtype: 'ota_0' },
    { name: 'app1', offset: '0x260000', subtype: 'ota_1' },
  ],
}

/**
 * Stand in for the flashing stack around the real startWrite(), with `write`
 * deciding what esptool does: it is handed the real FlashOptions, so it can
 * replay progress callbacks before resolving or rejecting.
 */
function stubFlashStack(store: ReturnType<typeof useFirmwareStore>, write: (options: any) => Promise<void>) {
  store.connectEsp32 = vi.fn(async () => ({ writeFlash: (options: any) => write(options) }) as any)
  store.fetchBinaryContent = vi.fn(async () => 'binary')
  // Boot-log streaming: in the browser this only returns when the port closes.
  store.readSerial = vi.fn(async () => {})
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

describe('esp32 flash outcome', () => {
  function espStore() {
    const store = useFirmwareStore()
    store.selectedFirmware = STABLE
    store.manifest = MANIFEST as any
    return store
  }

  it('reports one success per flash, not one per file', async () => {
    const store = espStore()
    stubFlashStack(store, async (options) => {
      // esptool reports written === total at the end of EVERY file.
      options.reportProgress(0, 100, 100)
      options.reportProgress(1, 100, 100)
    })

    await store.updateEspFlash(heltecV3)

    expect(actionsNamed('flash_success')).toHaveLength(1)
    expect(actionsNamed('firmware_flash')).toHaveLength(1)
    expect(actionNamed('flash_success')).toMatchObject({
      platformio_target: 'heltec-v3',
      method: 'esptool',
      clean_install: false,
      outcome_source: 'device',
    })
  })

  it('does not report success when the write fails after the last progress callback', async () => {
    const store = espStore()
    stubFlashStack(store, async (options) => {
      options.reportProgress(0, 100, 100)
      options.reportProgress(1, 100, 100)
      throw new Error('Timed out waiting for packet header')
    })

    await store.updateEspFlash(heltecV3)

    expect(actionsNamed('flash_success')).toHaveLength(0)
    expect(actionNamed('flash_error')).toMatchObject({
      platformio_target: 'heltec-v3',
      method: 'esptool',
      error_class: 'Error',
      error_kind: 'flash_failed',
    })
  })

  it('reports success when the write lands, not when the boot log ends', async () => {
    const store = espStore()
    stubFlashStack(store, async (options) => {
      options.reportProgress(0, 100, 100)
      options.reportProgress(1, 100, 100)
    })
    // readSerial streams until the user unplugs the device, so the flash action
    // itself never settles — success must not be waiting on it.
    store.readSerial = vi.fn(() => new Promise<void>(() => {}))

    void store.updateEspFlash(heltecV3)

    await vi.waitFor(() => expect(actionsNamed('flash_success')).toHaveLength(1))
  })

  it('reports a clean install that flashes fewer files than expected', async () => {
    const store = espStore()
    // Only app + OTA make it into the flash list — no filesystem image, so the
    // progress callback's `fileIndex > 1` guard never fires.
    stubFlashStack(store, async (options) => {
      options.reportProgress(0, 100, 100)
      options.reportProgress(1, 100, 100)
    })

    await store.cleanInstallEspFlash(heltecV3)

    expect(actionNamed('flash_success')).toMatchObject({ clean_install: true })
  })
})

describe('uf2 filesystem extraction', () => {
  it('fails loudly when there is nothing to extract from', async () => {
    // Silently returning would let the caller report a flash that never happened.
    const store = useFirmwareStore()
    store.selectedFirmware = STABLE

    await expect(store.downloadUf2FileSystem(/firmware-rak4631-.+\.uf2/)).rejects.toThrow(/No firmware zip/)
  })
})
