import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { DeviceHardware } from '~/types/api'
import { useDeviceStore } from './deviceStore'
import { useFirmwareStore } from './firmwareStore'

// The store module reads window.location at import time (createUrl).
// vi.hoisted runs before the imports above are evaluated.
vi.hoisted(() => {
  (globalThis as any).window = { location: { host: 'localhost:3000', protocol: 'https:' } }
})

const VERSION = '2.8.1.8e6a88d'

// A slice of the real v2.8.1 board list.
const RELEASE_MANIFEST = {
  version: VERSION,
  targets: [
    { board: 't-deck', platform: 'esp32s3' },
    { board: 't-deck-tft', platform: 'esp32s3' },
    { board: 'seeed_wio_tracker_L2-tft', platform: 'esp32s3' },
    { board: 'unphone', platform: 'esp32s3' },
    { board: 'elecrow-adv-35-tft', platform: 'esp32s3' },
    { board: 'tbeam', platform: 'esp32' },
  ],
}

const board = (overrides: Partial<DeviceHardware>): DeviceHardware => ({
  hwModel: 9,
  hwModelSlug: 'TBEAM',
  platformioTarget: 'tbeam',
  architecture: 'esp32',
  activelySupported: true,
  displayName: 'LILYGO T-Beam',
  ...overrides,
} as DeviceHardware)

/** Select a board with the manifest loaded and the MUI toggle in a given state. */
function select(target: DeviceHardware, shouldInstallMui: boolean) {
  const deviceStore = useDeviceStore()
  const firmwareStore = useFirmwareStore()
  firmwareStore.$state.releaseManifest = RELEASE_MANIFEST
  firmwareStore.$state.shouldInstallMui = shouldInstallMui
  deviceStore.$state.selectedTarget = target
  return deviceStore
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('deviceStore selectedTargetBoard', () => {
  it('follows the toggle when the release built both variants', () => {
    const muiBoard = board({ platformioTarget: 't-deck', hasMui: true })
    expect(select(muiBoard, true).selectedTargetBoard).toBe('t-deck-tft')
    setActivePinia(createPinia())
    expect(select(muiBoard, false).selectedTargetBoard).toBe('t-deck')
  })

  it('uses the -tft build for a board that has no plain one', () => {
    // Wio Tracker L2 ships -tft alone; the toggle being off must not ask for a
    // board the release never published.
    const store = select(board({ platformioTarget: 'seeed_wio_tracker_L2', architecture: 'esp32-s3', hasMui: true }), false)
    expect(store.selectedVariant).toBe('mui')
    expect(store.selectedTargetBoard).toBe('seeed_wio_tracker_L2-tft')
  })

  it('uses the plain build for a board that has no -tft one', () => {
    const store = select(board({ platformioTarget: 'unphone', hasMui: true }), true)
    expect(store.selectedVariant).toBe('stock')
    expect(store.selectedTargetBoard).toBe('unphone')
  })

  it('leaves an env that already names its variant alone', () => {
    // Crowpanel: never elecrow-adv-35-tft-tft.
    const store = select(board({ platformioTarget: 'elecrow-adv-35-tft', hasMui: true }), true)
    expect(store.selectedTargetBoard).toBe('elecrow-adv-35-tft')
  })

  it('ignores a MUI flag left over from a previously selected board', () => {
    // setSelectedTarget turns the flag on for a board that has MUI but never
    // turns it off, so auto-detecting a plain board after picking a T-Deck used
    // to ask for firmware-tbeam-tft-*.
    const store = select(board({ platformioTarget: 'tbeam' }), true)
    expect(store.selectedVariant).toBe('stock')
    expect(store.selectedTargetBoard).toBe('tbeam')
  })

  it('falls back to the toggle when there is no board list', () => {
    const deviceStore = useDeviceStore()
    const firmwareStore = useFirmwareStore()
    firmwareStore.$state.releaseManifest = undefined
    firmwareStore.$state.shouldInstallMui = true
    deviceStore.$state.selectedTarget = board({ platformioTarget: 't-deck', hasMui: true })

    expect(deviceStore.selectedTargetBoard).toBe('t-deck-tft')
  })

  it('follows the toggle for a local upload, not the previous release', async () => {
    // The Wio Tracker L2's release build is -tft only; a local zip is not that
    // release, so the upload must not be searched for an entry by that name.
    const store = select(board({ platformioTarget: 'seeed_wio_tracker_L2', hasMui: true }), false)
    expect(store.selectedTargetBoard).toBe('seeed_wio_tracker_L2-tft')

    await useFirmwareStore().setFirmwareFile(new File(['x'], 'firmware.zip'))
    expect(store.selectedVariant).toBe('stock')
    expect(store.selectedTargetBoard).toBe('seeed_wio_tracker_L2')
  })

  it('is empty with no board selected', () => {
    expect(useDeviceStore().selectedTargetBoard).toBe('')
  })
})
