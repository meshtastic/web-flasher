import { describe, expect, it } from 'vitest'
import type { DeviceHardware, FirmwareResource } from '~/types/api'
import { findUnlockNightly, isUnlockNightlySeries, isUnsupportedDevice } from './unsupportedDevices'

const nightly = (id: string): FirmwareResource => ({ id, title: `Meshtastic Firmware ${id} Nightly` })

describe('isUnlockNightlySeries', () => {
  it('accepts the 2.8 nightlies the gate was opened for', () => {
    expect(isUnlockNightlySeries('v2.8.0.abc1234')).toBe(true)
    expect(isUnlockNightlySeries('2.8.13.deadbee')).toBe(true)
  })

  it('accepts later series so the gate does not close when develop opens 2.9', () => {
    expect(isUnlockNightlySeries('v2.9.0.abc1234')).toBe(true)
    expect(isUnlockNightlySeries('v3.0.0.abc1234')).toBe(true)
  })

  it('rejects anything below the floor', () => {
    expect(isUnlockNightlySeries('v2.7.11.abc1234')).toBe(false)
    expect(isUnlockNightlySeries('v1.9.0.abc1234')).toBe(false)
  })

  it('rejects ids it cannot parse rather than guessing', () => {
    expect(isUnlockNightlySeries(undefined)).toBe(false)
    expect(isUnlockNightlySeries('')).toBe(false)
    expect(isUnlockNightlySeries('nightly')).toBe(false)
    expect(isUnlockNightlySeries('v2.8')).toBe(false)
  })
})

describe('findUnlockNightly', () => {
  it('returns nothing when no nightly is published', () => {
    expect(findUnlockNightly([])).toBeUndefined()
  })

  it('returns nothing when the only nightly predates the floor', () => {
    expect(findUnlockNightly([nightly('v2.7.9.abc1234')])).toBeUndefined()
  })

  it('returns the eligible nightly', () => {
    const eligible = nightly('v2.8.2.bbb2222')
    expect(findUnlockNightly([eligible])).toBe(eligible)
  })
})

describe('isUnsupportedDevice', () => {
  const device = (activelySupported: boolean): DeviceHardware => ({
    hwModel: 1,
    hwModelSlug: 'TEST',
    platformioTarget: 'test',
    architecture: 'esp32-s3',
    activelySupported,
    displayName: 'Test',
  })

  it('is true only for boards the registry has not promoted', () => {
    expect(isUnsupportedDevice(device(false))).toBe(true)
    expect(isUnsupportedDevice(device(true))).toBe(false)
    expect(isUnsupportedDevice(undefined)).toBe(false)
  })
})
