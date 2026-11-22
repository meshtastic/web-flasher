import { describe, expect, it } from 'vitest'
import type { DeviceHardware } from '~/types/api'
import { resolveDeviceQuery } from './deviceQuery'

const board = (platformioTarget: string, hwModelSlug: string, hwModel: number): DeviceHardware =>
  ({ platformioTarget, hwModelSlug, hwModel, architecture: 'esp32', activelySupported: true, displayName: platformioTarget }) as DeviceHardware

const targets = [
  board('t-echo', 'T_ECHO', 7),
  board('t-deck', 'T_DECK', 50),
  board('rak4631', 'RAK4631', 9),
  board('rak4631_eth_gw', 'RAK4631', 9),
]

describe('resolveDeviceQuery', () => {
  it('ignores a missing or blank param', () => {
    expect(resolveDeviceQuery(null, targets)).toBeUndefined()
    expect(resolveDeviceQuery(undefined, targets)).toBeUndefined()
    expect(resolveDeviceQuery('  ', targets)).toBeUndefined()
  })

  it('matches a platformio target exactly', () => {
    expect(resolveDeviceQuery('t-echo', targets)).toEqual({ target: targets[0], shouldInstallMui: false, shouldInstallInkHud: false })
    expect(resolveDeviceQuery('rak4631_eth_gw', targets)?.target).toBe(targets[3])
  })

  it('maps CI variant suffixes onto their base board and toggle', () => {
    expect(resolveDeviceQuery('t-deck-tft', targets)).toEqual({ target: targets[1], shouldInstallMui: true, shouldInstallInkHud: false })
    expect(resolveDeviceQuery('t-echo-inkhud', targets)).toEqual({ target: targets[0], shouldInstallMui: false, shouldInstallInkHud: true })
  })

  it('matches a hardware model slug case-insensitively', () => {
    expect(resolveDeviceQuery('T_ECHO', targets)?.target).toBe(targets[0])
    expect(resolveDeviceQuery('t_deck', targets)?.target).toBe(targets[1])
  })

  it('matches a numeric hardware model, first board winning', () => {
    expect(resolveDeviceQuery('7', targets)?.target).toBe(targets[0])
    expect(resolveDeviceQuery('9', targets)?.target).toBe(targets[2])
  })

  it('returns undefined for an unknown device', () => {
    expect(resolveDeviceQuery('nope', targets)).toBeUndefined()
    expect(resolveDeviceQuery('999', targets)).toBeUndefined()
    expect(resolveDeviceQuery('nope-tft', targets)).toBeUndefined()
  })
})
