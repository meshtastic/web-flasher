import type { DeviceHardware } from '~/types/api'

/**
 * Which board a link into the flasher names, from its `?device=` or
 * `?hwModel=` query param.
 *
 * `device` is a CI board name (a PlatformIO env), which may carry a `-tft` or
 * `-inkhud` suffix that maps to the MUI / InkHUD toggle. `hwModel` is the
 * HardwareModel number a connected radio reports, which is what the web client
 * knows about the radio it is talking to. Several boards share one hwModel
 * (the Tracksenger variants, Pico and Pico W, ...), so a shared one is left for
 * the user to pick rather than guessed. That includes boards held back from
 * `targets` (`hidden`): a model one of them shares is still ambiguous, even
 * though only one of its boards can be picked.
 */
export type DeviceQueryMatch
  = | { kind: 'target', target: DeviceHardware, installMui?: boolean, installInkHud?: boolean }
    | { kind: 'ambiguous', candidates: DeviceHardware[] }
    | { kind: 'unknown' }

export function resolveDeviceQuery(
  params: { device?: string | null, hwModel?: string | null },
  targets: DeviceHardware[],
  hidden: DeviceHardware[] = [],
): DeviceQueryMatch | undefined {
  const device = params.device?.trim()
  if (device) return resolveDeviceName(device, targets)

  const hwModelParam = params.hwModel?.trim()
  if (!hwModelParam) return undefined
  const hwModel = Number(hwModelParam)
  // 0 is UNSET; anything that is not a plain positive integer is not a model.
  if (!/^\d+$/.test(hwModelParam) || !Number.isSafeInteger(hwModel) || hwModel <= 0) {
    return { kind: 'unknown' }
  }
  // A Set, since a hidden board is also in `targets` once it has been revealed.
  const candidates = [...new Set([...targets, ...hidden])].filter(target => target.hwModel === hwModel)
  if (candidates.length > 1) return { kind: 'ambiguous', candidates }
  const target = targets.find(target => target.hwModel === hwModel)
  return target ? { kind: 'target', target } : { kind: 'unknown' }
}

function resolveDeviceName(device: string, targets: DeviceHardware[]): DeviceQueryMatch {
  const exact = targets.find(item => item.platformioTarget === device)
  if (exact) return { kind: 'target', target: exact }
  if (device.endsWith('-tft')) {
    const target = targets.find(item => item.platformioTarget === device.slice(0, -'-tft'.length))
    if (target) return { kind: 'target', target, installMui: true }
  }
  else if (device.endsWith('-inkhud')) {
    const target = targets.find(item => item.platformioTarget === device.slice(0, -'-inkhud'.length))
    if (target) return { kind: 'target', target, installInkHud: true }
  }
  return { kind: 'unknown' }
}
