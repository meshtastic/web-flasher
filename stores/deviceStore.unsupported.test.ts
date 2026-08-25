import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { DeviceHardware, FirmwareResource } from '~/types/api'
import { useDeviceStore } from './deviceStore'
import { useFirmwareStore } from './firmwareStore'

// The store module reads window.location at import time (createUrl).
vi.hoisted(() => {
  (globalThis as any).window = { location: { host: 'localhost:3000', protocol: 'https:' } }
})

function makeTarget(overrides: Partial<DeviceHardware>): DeviceHardware {
  return {
    hwModel: 1,
    hwModelSlug: 'TEST',
    platformioTarget: 'test',
    architecture: 'esp32-s3',
    activelySupported: true,
    displayName: 'Test',
    ...overrides,
  }
}

const SUPPORTED = makeTarget({ hwModel: 43, platformioTarget: 'heltec-v3' })
const UNSUPPORTED = makeTarget({ hwModel: 139, platformioTarget: 'heltec-mesh-tower-v2', activelySupported: false })
const MESHTASTICD = makeTarget({ hwModel: 121, platformioTarget: 'native', architecture: 'portduino', activelySupported: false })

const NIGHTLY: FirmwareResource = { id: 'v2.8.2.bbb2222', title: 'Meshtastic Firmware 2.8.2 Nightly' }
const OLD_NIGHTLY: FirmwareResource = { id: 'v2.7.9.aaa1111', title: 'Meshtastic Firmware 2.7.9 Nightly' }
const STABLE: FirmwareResource = { id: 'v2.7.11.ccc3333', title: 'Meshtastic Firmware 2.7.11' }

describe('not-actively-supported devices behind the Konami code', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // setSelectedTarget dismisses the device modal through the DOM. The suite
    // runs on the 'node' environment; this is stubbed here rather than in
    // vi.hoisted() because a global `document` present at import time sends
    // @vue/runtime-dom down its browser path and it fails on createElement.
    ;(globalThis as any).document = { getElementById: () => null }
    // setSelectedTarget calls setSelectedFirmware without awaiting it, and that
    // fetches release notes and the release manifest. Stub both so the tests
    // stay offline and leave no request running past the assertion.
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => '',
      json: async () => ({ version: '', targets: [] }),
    })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as any).document
  })

  it('hides boards the registry does not mark actively supported', () => {
    const store = useDeviceStore()
    store.setTargetsList([SUPPORTED, UNSUPPORTED])
    expect(store.targets.map(t => t.platformioTarget)).toEqual(['heltec-v3'])
  })

  it('keeps them hidden when the code is entered but no eligible nightly exists', () => {
    const store = useDeviceStore()
    const firmware = useFirmwareStore()
    store.setTargetsList([SUPPORTED, UNSUPPORTED])
    firmware.konamiUnlocked = true
    expect(store.targets.map(t => t.platformioTarget)).toEqual(['heltec-v3'])

    firmware.nightly = [OLD_NIGHTLY]
    expect(store.targets.map(t => t.platformioTarget)).toEqual(['heltec-v3'])
  })

  it('reveals them once the code is entered and an eligible nightly is published', () => {
    const store = useDeviceStore()
    const firmware = useFirmwareStore()
    store.setTargetsList([SUPPORTED, UNSUPPORTED])
    firmware.konamiUnlocked = true
    firmware.nightly = [NIGHTLY]
    expect(store.targets.map(t => t.platformioTarget)).toEqual(['heltec-v3', 'heltec-mesh-tower-v2'])
  })

  it('never reveals meshtasticd targets, which are not flashable from here', () => {
    const store = useDeviceStore()
    const firmware = useFirmwareStore()
    store.setTargetsList([SUPPORTED, MESHTASTICD])
    firmware.konamiUnlocked = true
    firmware.nightly = [NIGHTLY]
    expect(store.targets.map(t => t.platformioTarget)).toEqual(['heltec-v3'])
  })

  it('pins a not-actively-supported board to the nightly, replacing an already selected release', async () => {
    const store = useDeviceStore()
    const firmware = useFirmwareStore()
    firmware.nightly = [NIGHTLY]
    firmware.stable = [STABLE]
    firmware.selectedFirmware = STABLE

    await store.setSelectedTarget(UNSUPPORTED)
    expect(firmware.selectedFirmware?.id).toBe(NIGHTLY.id)
  })

  it('leaves an actively supported board on the default stable selection', async () => {
    const store = useDeviceStore()
    const firmware = useFirmwareStore()
    firmware.nightly = [NIGHTLY]
    firmware.stable = [STABLE]
    firmware.selectedFirmware = undefined

    await store.setSelectedTarget(SUPPORTED)
    expect(firmware.selectedFirmware?.id).toBe(STABLE.id)
  })

  it('marks a not-actively-supported board as nightly-only, and no other board', async () => {
    const store = useDeviceStore()
    const firmware = useFirmwareStore()
    firmware.nightly = [NIGHTLY]
    firmware.stable = [STABLE]

    expect(store.nightlyOnlyTarget).toBe(false)

    await store.setSelectedTarget(UNSUPPORTED)
    expect(store.nightlyOnlyTarget).toBe(true)

    await store.setSelectedTarget(SUPPORTED)
    expect(store.nightlyOnlyTarget).toBe(false)
  })

  it('drops a locally uploaded file when a not-actively-supported board is selected', async () => {
    const store = useDeviceStore()
    const firmware = useFirmwareStore()
    firmware.nightly = [NIGHTLY]
    firmware.stable = [STABLE]
    await firmware.setFirmwareFile({ name: 'firmware-2.7.11.zip' } as File)
    expect(firmware.hasFirmwareFile).toBe(true)

    // Firmware.vue refuses the upload control for these boards, so the only way
    // a file can be present is from a board selected earlier. The nightly pin
    // has to clear it, or downloadUf2FileSystem would still prefer the file.
    await store.setSelectedTarget(UNSUPPORTED)
    expect(firmware.hasFirmwareFile).toBe(false)
    expect(firmware.selectedFirmware?.id).toBe(NIGHTLY.id)
  })
})
