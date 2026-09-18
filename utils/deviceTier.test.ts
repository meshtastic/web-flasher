import { describe, it, expect } from 'vitest'
import { deviceTier } from './deviceTier'
import type { DeviceHardware } from '~/types/api'

const board = (overrides: Partial<DeviceHardware>): DeviceHardware => ({
  hwModel: 9,
  hwModelSlug: 'RAK4631',
  platformioTarget: 'rak4631',
  architecture: 'nrf52840',
  activelySupported: true,
  displayName: 'RAK WisBlock 4631',
  supportLevel: 1,
  tags: ['RAK'],
  ...overrides,
})

describe('deviceTier', () => {
  it('puts an allow-listed vendor at supportLevel 1 in the supported tier', () => {
    expect(deviceTier(board({}))).toBe('supported')
  })

  it('keeps supportLevel 2 in the supported tier', () => {
    // Station G2 and RAK WisBlock 11310 render alongside the flagships today.
    expect(deviceTier(board({ supportLevel: 2, tags: ['B&Q'] }))).toBe('supported')
  })

  it('demotes an allow-listed vendor at supportLevel 3 to community', () => {
    // LILYGO T-Beam: a known vendor, but legacy hardware.
    expect(deviceTier(board({ supportLevel: 3, tags: ['LilyGo'] }))).toBe('community')
  })

  it('puts a board the registry marks isMaker in the maker tier', () => {
    expect(deviceTier(board({
      hwModel: 148,
      hwModelSlug: 'AXIOMETA_GENESIS_MINI',
      platformioTarget: 'axiometa-genesis-mini',
      architecture: 'esp32-s3',
      displayName: 'Axiometa Genesis Mini',
      supportLevel: 1,
      tags: ['Axiometa'],
      isMaker: true,
    }))).toBe('maker')
  })

  it('does not need a vendor tag to be a maker board', () => {
    expect(deviceTier(board({ supportLevel: 1, tags: undefined, isMaker: true }))).toBe('maker')
  })

  it('demotes a maker board at supportLevel 3 to community', () => {
    expect(deviceTier(board({ supportLevel: 3, tags: ['Axiometa'], isMaker: true }))).toBe('community')
  })

  it('leaves an unrecognised vendor in community even at supportLevel 1', () => {
    // Meshnology, Waveshare and RadioMaster are graded 1 or 2 upstream but the
    // registry marks none of them isMaker, so they stay where they are today.
    expect(deviceTier(board({ supportLevel: 1, tags: ['Meshnology'] }))).toBe('community')
    expect(deviceTier(board({ supportLevel: 2, tags: ['Waveshare'] }))).toBe('community')
  })

  it('treats isMaker false and isMaker absent the same way', () => {
    expect(deviceTier(board({ supportLevel: 1, tags: ['Axiometa'], isMaker: false }))).toBe('community')
    expect(deviceTier(board({ supportLevel: 1, tags: ['Axiometa'] }))).toBe('community')
  })

  it('treats a missing supportLevel as 3', () => {
    // deviceStore's sort and boardAttributes both use `?? 3`; the old
    // `supportLevel != 3` test in Device.vue disagreed and promoted these.
    expect(deviceTier(board({ supportLevel: undefined }))).toBe('community')
  })

  it('treats a missing tags array as community', () => {
    expect(deviceTier(board({ tags: undefined }))).toBe('community')
  })

  it('prefers the supported tier for a Backer/Partner board the registry also marks isMaker', () => {
    expect(deviceTier(board({ tags: ['RAK'], isMaker: true }))).toBe('supported')
  })
})
