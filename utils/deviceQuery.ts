import type { DeviceHardware } from '~/types/api'

export interface DeviceQueryMatch {
  target: DeviceHardware
  /** The param named a `-tft` CI board, so MUI should be installed. */
  shouldInstallMui: boolean
  /** The param named an `-inkhud` CI board, so InkHUD should be installed. */
  shouldInstallInkHud: boolean
}

/**
 * Resolve a `?device=` query param to a board in the picker. Accepts, in order:
 *  - a platformio target (`t-echo`), as the PR bot links with
 *  - a CI board name with a `-tft`/`-inkhud` variant suffix (`t-deck-tft`)
 *  - a hardware model slug (`T_ECHO`, case-insensitive), as the web client knows it
 *  - a numeric hardware model (`7`), straight from a node's metadata
 * Several boards can share a hardware model; like auto-detect, the first wins.
 */
export function resolveDeviceQuery(param: string | null | undefined, targets: DeviceHardware[]): DeviceQueryMatch | undefined {
  const value = param?.trim()
  if (!value) return undefined
  const match = (target: DeviceHardware | undefined, flags: Partial<DeviceQueryMatch> = {}) =>
    target ? { target, shouldInstallMui: false, shouldInstallInkHud: false, ...flags } : undefined
  const byPio = (pio: string) => targets.find(t => t.platformioTarget === pio)

  const exact = byPio(value)
  if (exact) return match(exact)
  if (value.endsWith('-tft')) {
    const tft = match(byPio(value.slice(0, -'-tft'.length)), { shouldInstallMui: true })
    if (tft) return tft
  }
  if (value.endsWith('-inkhud')) {
    const inkHud = match(byPio(value.slice(0, -'-inkhud'.length)), { shouldInstallInkHud: true })
    if (inkHud) return inkHud
  }
  const slug = value.toUpperCase()
  const bySlug = targets.find(t => t.hwModelSlug?.toUpperCase() === slug)
  if (bySlug) return match(bySlug)
  if (/^\d+$/.test(value)) {
    const hwModel = Number(value)
    return match(targets.find(t => t.hwModel === hwModel))
  }
  return undefined
}
