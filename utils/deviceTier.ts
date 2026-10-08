import type { DeviceHardware } from '~/types/api'
import { supportedVendorDeviceTags } from '~/types/resources'

/**
 * How prominently a board is presented in the device picker.
 *
 * The maker rung is the registry's call, carried on the entry as `isMaker`,
 * rather than a vendor allow-list this repo would have to keep in step. The
 * top rung is still the hard-coded `supportedVendorDeviceTags`, which is the
 * Backer/Partner relationship and is not something the registry publishes.
 *
 * `supportLevel` is a capability grade, not a rung: it is validated upstream to
 * {1,2,3} and means flagship / niche / legacy. It only demotes legacy hardware
 * out of the top two bands.
 */
export type DeviceTier = 'supported' | 'maker' | 'community'

/**
 * Filter value that selects the whole maker tier rather than one vendor, so
 * the picker carries a single Makers pill instead of gaining one per vendor
 * the way the Backer/Partner row does. deviceStore.filteredDevices matches it
 * against the tier; no vendor tag in the registry uses this name.
 */
export const MAKER_TIER_FILTER = 'maker'

export function deviceTier(device: DeviceHardware): DeviceTier {
  // A missing supportLevel counts as 3, matching deviceStore's sort order and
  // boardAttributes' telemetry. Device.vue used to test `!= 3`, which let an
  // untiered board with a known vendor tag into the top section while the sort
  // put it last and the product link stayed hidden.
  if ((device.supportLevel ?? 3) === 3) return 'community'

  // Backer/Partner outranks maker, for a board that is somehow both.
  const tags = device.tags ?? []
  if (tags.some(tag => supportedVendorDeviceTags.includes(tag))) return 'supported'
  if (device.isMaker) return 'maker'
  return 'community'
}
