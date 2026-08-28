import type { DeviceHardware } from '../types/api'

import { describe, expect, it } from 'vitest'

import { matchesDeviceSearch } from './deviceSearch'

const device = {
  hwModel: 8,
  hwModelSlug: 'RAK4631',
  platformioTarget: 'rak4631',
  architecture: 'nrf52840',
  activelySupported: true,
  displayName: 'RAK WisBlock 4631',
  tags: ['RAK', 'Supporter'],
} satisfies DeviceHardware

describe('matchesDeviceSearch', () => {
  it.each([
    '4631',
    'wisblock',
    'RAK4631',
    'nrf52840',
    'supporter',
  ])('matches "%s" against searchable device metadata', (query) => {
    expect(matchesDeviceSearch(device, query)).toBe(true)
  })

  it('normalizes whitespace and casing', () => {
    expect(matchesDeviceSearch(device, '  rAk  ')).toBe(true)
  })

  it('keeps all devices visible for an empty query', () => {
    expect(matchesDeviceSearch(device, '   ')).toBe(true)
  })

  it('rejects devices without matching metadata', () => {
    expect(matchesDeviceSearch(device, 'heltec')).toBe(false)
  })
})
