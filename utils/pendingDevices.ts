import type { DeviceHardware } from '~/types/api'

/**
 * Query parameter that opts a session into the boards below. They are off by
 * default: each one is a board the firmware repo builds but that no published
 * release or nightly carries yet, so offering one to everybody would put a
 * permanently disabled Flash button in front of them.
 */
export const PENDING_DEVICES_QUERY_PARAM = 'pending'

/**
 * Boards the firmware repo already builds but that
 * api.meshtastic.org/resource/deviceHardware has not published yet, for
 * previewing the picker in the window between a firmware variant landing and
 * the registry entry deploying.
 *
 * Each entry mirrors the custom_meshtastic_* metadata in the firmware repo's
 * variants/<arch>/<env>/platformio.ini — the same source the API generates
 * from — so nothing shifts once the API catches up.
 *
 * This is the opt-in twin of `eventOnlyDevices` in ~/utils/eventDevices.
 */
export const pendingRegistryDevices: DeviceHardware[] = [
  // Develop-only; not on master. Registry entry pending in meshtastic/api#145.
  // https://github.com/meshtastic/firmware/blob/develop/variants/esp32s3/axiometa_genesis_mini/platformio.ini
  {
    hwModel: 148,
    hwModelSlug: 'AXIOMETA_GENESIS_MINI',
    platformioTarget: 'axiometa-genesis-mini',
    architecture: 'esp32-s3',
    // custom_meshtastic_actively_supported = false, matching api#145. It is
    // what pins the board to the nightly, the only build line that carries the
    // variant at all.
    activelySupported: false,
    displayName: 'Axiometa Genesis Mini',
    supportLevel: 1,
    tags: ['Axiometa'],
    isMaker: true,
    // Shipped in public/img/devices; api#145 does not carry an `images` array,
    // so the card falls back to the placeholder once the registry takes over.
    images: ['axiometa-genesis-mini.svg'],
    url: 'https://www.axiometa.io/products/axiometa-genesis-mini',
  },
]

/** Whether this session asked for the boards above. */
export function pendingDevicesRequested(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has(PENDING_DEVICES_QUERY_PARAM)
}

/**
 * Overlay the boards above onto the API device list, for a session that asked
 * for them. A no-op otherwise, and a no-op for any board the API already
 * publishes, so this only ever adds an entry the registry is still missing.
 */
export function applyPendingDevices(targets: DeviceHardware[]): DeviceHardware[] {
  if (!pendingDevicesRequested()) return targets
  const missing = pendingRegistryDevices.filter(
    pending => !targets.some(t => t.platformioTarget === pending.platformioTarget),
  )
  if (!missing.length) return targets
  return [...targets, ...missing]
}
