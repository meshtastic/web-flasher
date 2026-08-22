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
  })

  afterEach(() => {
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
})
