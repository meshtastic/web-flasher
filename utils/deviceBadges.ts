import type { DeviceHardware } from '~/types/api'

/**
 * Devices that transmit in an amateur radio band rather than an ISM band — the
 * T-Beam BPF is a 144–148 MHz (2 m) ~5 W board — so operating one legally needs
 * an amateur radio licence. Matched on platformioTarget so the badge survives
 * the device graduating from the event overlay (utils/eventDevices.ts) to the
 * published API device list.
 */
const hamBandTargets = new Set([
  't-beam-bpf',
])

export function requiresHamLicense(device: DeviceHardware): boolean {
  return hamBandTargets.has(device.platformioTarget)
}
