import { describe, it, expect } from 'vitest'
import { applyEventDeviceOverrides, eventOnlyDevices } from './eventDevices'
import type { DeviceHardware } from '~/types/api'

const tbeam1w: DeviceHardware = {
  hwModel: 122,
  hwModelSlug: 'TBEAM_1_WATT',
  platformioTarget: 't-beam-1w',
  architecture: 'esp32-s3',
  activelySupported: true,
  displayName: 'LilyGo T-Beam 1W',
  supportLevel: 1,
  tags: ['LilyGo'],
}

const apiList: DeviceHardware[] = [tbeam1w]

describe('applyEventDeviceOverrides', () => {
  it('adds the T-Beam BPF in DEF CON mode', () => {
    const targets = applyEventDeviceOverrides(apiList, 'DEFCON')
    const bpf = targets.find(t => t.platformioTarget === 't-beam-bpf')
    expect(bpf).toBeDefined()
    expect(bpf?.activelySupported).toBe(true)
    expect(bpf?.hwModel).toBe(124)
    expect(bpf?.architecture).toBe('esp32-s3')
    // 16MB drives the OTA/spiffs offsets of the legacy clean-install path.
    expect(bpf?.partitionScheme).toBe('16MB')
    expect(bpf?.images).toEqual(['tbeam-bpf.svg'])
  })

  it('leaves the list untouched off the DEF CON domain', () => {
    expect(applyEventDeviceOverrides(apiList, undefined)).toBe(apiList)
    expect(applyEventDeviceOverrides(apiList, 'Hamvention')).toBe(apiList)
    expect(applyEventDeviceOverrides(apiList, 'Burning Man')).toBe(apiList)
  })

  it('does not duplicate a device the API already publishes', () => {
    const published = [...apiList, ...eventOnlyDevices.DEFCON]
    const targets = applyEventDeviceOverrides(published, 'DEFCON')
    expect(targets).toBe(published)
    expect(targets.filter(t => t.platformioTarget === 't-beam-bpf')).toHaveLength(1)
  })

  it('does not mutate the source list', () => {
    const source = [...apiList]
    applyEventDeviceOverrides(source, 'DEFCON')
    expect(source).toEqual(apiList)
  })
})
