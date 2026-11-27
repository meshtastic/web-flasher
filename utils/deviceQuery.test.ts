import { describe, it, expect } from 'vitest'
import { resolveDeviceQuery } from './deviceQuery'
import type { DeviceHardware } from '~/types/api'

const board = (overrides: Partial<DeviceHardware>): DeviceHardware => ({
  hwModel: 9,
  hwModelSlug: 'RAK4631',
  platformioTarget: 'rak4631',
  architecture: 'nrf52840',
  activelySupported: true,
  displayName: 'RAK WisBlock 4631',
  ...overrides,
})

const RAK = board({})
const HELTEC_V4 = board({ hwModel: 110, hwModelSlug: 'HELTEC_V4', platformioTarget: 'heltec-v4', architecture: 'esp32-s3', hasMui: true })
const PICO = board({ hwModel: 47, hwModelSlug: 'RPI_PICO', platformioTarget: 'pico', architecture: 'rp2040' })
const PICO_W = board({ hwModel: 47, hwModelSlug: 'RPI_PICO', platformioTarget: 'picow', architecture: 'rp2040' })
const TARGETS = [RAK, HELTEC_V4, PICO, PICO_W]

describe('resolveDeviceQuery', () => {
  it('returns nothing when the link names no board', () => {
    expect(resolveDeviceQuery({}, TARGETS)).toBeUndefined()
    expect(resolveDeviceQuery({ device: '', hwModel: ' ' }, TARGETS)).toBeUndefined()
  })

  it('selects a board by its CI name', () => {
    expect(resolveDeviceQuery({ device: 'heltec-v4' }, TARGETS)).toEqual({ kind: 'target', target: HELTEC_V4 })
  })

  it('maps a -tft suffix to the MUI build and -inkhud to InkHUD', () => {
    expect(resolveDeviceQuery({ device: 'heltec-v4-tft' }, TARGETS)).toEqual({ kind: 'target', target: HELTEC_V4, installMui: true })
    expect(resolveDeviceQuery({ device: 'rak4631-inkhud' }, TARGETS)).toEqual({ kind: 'target', target: RAK, installInkHud: true })
  })

  it('reports an unknown CI name', () => {
    expect(resolveDeviceQuery({ device: 'not-a-board' }, TARGETS)).toEqual({ kind: 'unknown' })
  })

  it('prefers device over hwModel when a link carries both', () => {
    expect(resolveDeviceQuery({ device: 'picow', hwModel: '9' }, TARGETS)).toEqual({ kind: 'target', target: PICO_W })
  })

  it('selects the only board with a given hwModel', () => {
    expect(resolveDeviceQuery({ hwModel: '110' }, TARGETS)).toEqual({ kind: 'target', target: HELTEC_V4 })
  })

  it('does not guess between boards that share a hwModel', () => {
    expect(resolveDeviceQuery({ hwModel: '47' }, TARGETS)).toEqual({ kind: 'ambiguous', candidates: [PICO, PICO_W] })
  })

  it('reports an hwModel no board has, UNSET, or one that is not a number', () => {
    for (const hwModel of ['999', '0', '-9', '9.5', 'RAK4631', '1e1']) {
      expect(resolveDeviceQuery({ hwModel }, TARGETS)).toEqual({ kind: 'unknown' })
    }
  })
})
