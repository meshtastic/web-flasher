import type { DeviceHardware, FirmwareResource } from '~/types/api'

/**
 * Boards the device registry does not mark `activelySupported` never reach the
 * picker. That covers both ends of a board's life: hardware too new to have
 * been promoted, and hardware retired years ago. The Konami code reveals them
 * all, but only a nightly may be flashed onto one - `develop` is the only
 * branch guaranteed to still build the variant, whether it landed last week or
 * is only kept alive at `board_level = extra`.
 *
 * Nightlies are cut from `develop`, so their series is always the one in
 * progress - 2.8 when this gate was added. Treated as a floor rather than an
 * exact match so the gate does not quietly close the day `develop` opens 2.9.
 */
export const MIN_UNLOCK_NIGHTLY_SERIES: readonly [number, number] = [2, 8]

/**
 * Whether a firmware id belongs to a series at or past the floor above.
 * Ids look like `v2.8.0.abc1234`; anything unparsable is treated as too old.
 */
export function isUnlockNightlySeries(id?: string): boolean {
  if (!id) return false
  const match = /^v?(\d+)\.(\d+)\./.exec(id)
  if (!match) return false
  const [major, minor] = [Number(match[1]), Number(match[2])]
  const [minMajor, minMinor] = MIN_UNLOCK_NIGHTLY_SERIES
  if (major !== minMajor) return major > minMajor
  return minor >= minMinor
}

/** The published nightly eligible to flash a not-actively-supported board. */
export function findUnlockNightly(nightly: FirmwareResource[]): FirmwareResource | undefined {
  return nightly.find(release => isUnlockNightlySeries(release.id))
}

/** Boards hidden from the picker until the Konami code is entered. */
export function isUnsupportedDevice(device?: DeviceHardware): boolean {
  return !!device && !device.activelySupported
}
