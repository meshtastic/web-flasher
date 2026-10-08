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
    expect(store.eraseUf2File).toBe('/uf2/pico_erase.uf2')
  })

  it('is not SoftDevice 7.3 when nothing is selected', () => {
    const store = useDeviceStore()
    expect(store.isSoftDevice7point3).toBe(false)
  })
})

describe('deviceStore sortedDevices', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // sortedDevices concatenates three supportLevel buckets by hand, so a board
  // carrying a value none of them match would vanish from the picker entirely
  // — and from alphanautStore's hardware-override list, which reads the same
  // getter. Assert the invariant rather than the buckets.
  it('returns every input device, whatever its supportLevel', () => {
    const store = useDeviceStore()
    store.apiTargets = [
      makeTarget({ hwModel: 1, displayName: 'Level 1', supportLevel: 1, tags: ['RAK'] }),
      makeTarget({ hwModel: 2, displayName: 'Level 2', supportLevel: 2, tags: ['B&Q'] }),
      makeTarget({ hwModel: 3, displayName: 'Level 3', supportLevel: 3, tags: ['LilyGo'] }),
      makeTarget({ hwModel: 4, displayName: 'Untiered', supportLevel: undefined, tags: ['Heltec'] }),
      makeTarget({ hwModel: 5, displayName: 'Maker', supportLevel: 1, tags: ['Axiometa'], isMaker: true }),
    ]
    expect(store.sortedDevices).toHaveLength(store.filteredDevices.length)
    expect(store.sortedDevices.map(d => d.displayName).sort())
      .toEqual(['Level 1', 'Level 2', 'Level 3', 'Maker', 'Untiered'])
  })

  it('orders the supported buckets ahead of legacy hardware', () => {
    const store = useDeviceStore()
    store.apiTargets = [
      makeTarget({ hwModel: 3, displayName: 'Level 3', supportLevel: 3, tags: ['LilyGo'] }),
      makeTarget({ hwModel: 2, displayName: 'Level 2', supportLevel: 2, tags: ['B&Q'] }),
      makeTarget({ hwModel: 1, displayName: 'Level 1', supportLevel: 1, tags: ['RAK'] }),
    ]
    expect(store.sortedDevices.map(d => d.supportLevel)).toEqual([1, 2, 3])
  })
})

describe('deviceStore maker tier filter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const rak = makeTarget({ hwModel: 9, displayName: 'RAK WisBlock 4631', supportLevel: 1, tags: ['RAK'] })
  const axiometa = makeTarget({
    hwModel: 148,
    hwModelSlug: 'AXIOMETA_GENESIS_MINI',
    platformioTarget: 'axiometa-genesis-mini',
    architecture: 'esp32-s3',
    displayName: 'Axiometa Genesis Mini',
    supportLevel: 1,
    tags: ['Axiometa'],
    isMaker: true,
  })
  const legacyLilygo = makeTarget({ hwModel: 4, displayName: 'LILYGO T-Beam', supportLevel: 3, tags: ['LilyGo'] })

  it('selects every maker board, whatever its vendor tag', () => {
    const store = useDeviceStore()
    store.apiTargets = [rak, axiometa, legacyLilygo]
    store.setSelectedTag('maker')
    expect(store.filteredDevices.map(d => d.displayName)).toEqual(['Axiometa Genesis Mini'])
  })

  it('still filters by vendor tag and by architecture', () => {
    const store = useDeviceStore()
    store.apiTargets = [rak, axiometa, legacyLilygo]
    store.setSelectedTag('RAK')
    expect(store.filteredDevices.map(d => d.displayName)).toEqual(['RAK WisBlock 4631'])
    store.setSelectedTag('esp32-s3')
    expect(store.filteredDevices.map(d => d.displayName)).toEqual(['Axiometa Genesis Mini'])
  })

  it('clears the tier filter when the pill is toggled off', () => {
    const store = useDeviceStore()
    store.apiTargets = [rak, axiometa, legacyLilygo]
    store.setSelectedTag('maker')
    store.setSelectedTag('maker')
    expect(store.tag).toBeUndefined()
    expect(store.filteredDevices).toHaveLength(3)
  })
})
