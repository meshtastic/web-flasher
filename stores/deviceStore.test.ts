import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { DeviceHardware } from '~/types/api'
import { useDeviceStore } from './deviceStore'

// The store module reads window.location at import time (createUrl).
// vi.hoisted runs before the imports above are evaluated.
vi.hoisted(() => {
  (globalThis as any).window = { location: { host: 'localhost:3000', protocol: 'https:' } }
})

function makeTarget(overrides: Partial<DeviceHardware>): DeviceHardware {
  return {
    hwModel: 1,
    hwModelSlug: 'TEST',
    platformioTarget: 'test',
    architecture: 'nrf52840',
    activelySupported: true,
    displayName: 'Test',
    ...overrides,
  }
}

const SD73_ERASE = '/uf2/nrf_erase_sd7_3.uf2'
const SD611_ERASE = '/uf2/nrf_erase2.uf2'
const PICO_ERASE = '/uf2/pico_erase.uf2'
const FACTORY_ERASE = '/uf2/meshtastic_factory_erase.uf2'

describe('deviceStore factory-erase UF2 selection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('serves the SoftDevice 7.3 erase file to the Seeed MeshTracker X1', () => {
    const store = useDeviceStore()
    store.selectedTarget = makeTarget({
      hwModel: 128,
      hwModelSlug: 'MESH_TRACKER_X1',
      platformioTarget: 'seeed_mesh_tracker_X1',
      tags: ['Seeed'],
    })
    expect(store.isSoftDevice7point3).toBe(true)
    expect(store.eraseUf2File).toBe(SD73_ERASE)
  })

  it.each([
    'WIO_WM1110',
    'TRACKER_T1000_E',
    'XIAO_NRF52_KIT',
    'SEEED_SOLAR_NODE',
    'SEEED_WIO_TRACKER_L1',
    'SEEED_WIO_TRACKER_L1_EINK',
  ])('serves the SoftDevice 7.3 erase file to %s', (slug) => {
    const store = useDeviceStore()
    store.selectedTarget = makeTarget({ hwModelSlug: slug, tags: ['Seeed'] })
    expect(store.eraseUf2File).toBe(SD73_ERASE)
  })

  it('treats any Seeed nRF52840 board as SoftDevice 7.3, even when not listed by slug', () => {
    const store = useDeviceStore()
    store.selectedTarget = makeTarget({ hwModelSlug: 'SEEED_SOME_FUTURE_BOARD', tags: ['Seeed'] })
    expect(store.isSoftDevice7point3).toBe(true)
    expect(store.eraseUf2File).toBe(SD73_ERASE)
  })

  it('does not apply the Seeed default to non-nRF architectures', () => {
    const store = useDeviceStore()
    store.selectedTarget = makeTarget({ hwModelSlug: 'SEEED_XIAO_S3', architecture: 'esp32-s3', tags: ['Seeed'] })
    expect(store.isSoftDevice7point3).toBe(false)
  })

  it.each([
    ['RAK4631', ['RAK']],
    ['T_ECHO', ['LilyGo']],
    ['HELTEC_MESH_NODE_T114', ['Heltec']],
  ])('serves the SoftDevice 6.1.1 erase file to %s', (slug, tags) => {
    const store = useDeviceStore()
    store.selectedTarget = makeTarget({ hwModelSlug: slug, tags })
    expect(store.isSoftDevice7point3).toBe(false)
    expect(store.eraseUf2File).toBe(SD611_ERASE)
  })

  it('serves the RP2040 erase file to rp2040 targets', () => {
    const store = useDeviceStore()
    store.selectedTarget = makeTarget({ hwModelSlug: 'RPI_PICO', architecture: 'rp2040', tags: ['Raspberry Pi'] })
    expect(store.eraseUf2File).toBe(PICO_ERASE)
  })

  it('is not SoftDevice 7.3 when nothing is selected', () => {
    const store = useDeviceStore()
    expect(store.isSoftDevice7point3).toBe(false)
  })

  it('defaults to no bootloader attestation', () => {
    const store = useDeviceStore()
    expect(store.bootloaderFactoryErase).toBe(false)
  })

  it.each([
    ['MESH_TRACKER_X1', ['Seeed']],
    ['RAK4631', ['RAK']],
  ])('serves the bootloader factory-erase file to %s once attested, whatever its SoftDevice', (slug, tags) => {
    const store = useDeviceStore()
    store.selectedTarget = makeTarget({ hwModelSlug: slug, tags })
    store.bootloaderFactoryErase = true
    expect(store.eraseUf2File).toBe(FACTORY_ERASE)
  })

  it('ignores the attestation for rp2040 targets', () => {
    const store = useDeviceStore()
    store.selectedTarget = makeTarget({ hwModelSlug: 'RPI_PICO', architecture: 'rp2040', tags: ['Raspberry Pi'] })
    store.bootloaderFactoryErase = true
    expect(store.eraseUf2File).toBe(PICO_ERASE)
  })
})
