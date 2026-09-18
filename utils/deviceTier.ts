import type { DeviceHardware } from '~/types/api'
import { makerVendorDeviceTags, supportedVendorDeviceTags } from '~/types/resources'

/**
 * How prominently a board is presented in the device picker. This is the
 * vendor relationship, not the registry's capability grade: `supportLevel` is
 * validated upstream to {1,2,3} and means flagship / niche / legacy, so it
 * cannot carry a commercial rung. The vendor tag decides the rung, and
 * supportLevel only demotes legacy hardware out of the top two.
 */
export type DeviceTier = 'supported' | 'maker' | 'community'

export function deviceTier(device: DeviceHardware): DeviceTier {
  // A missing supportLevel counts as 3, matching deviceStore's sort order and
  // boardAttributes' telemetry. Device.vue used to test `!= 3`, which let an
  // untiered board with a known vendor tag into the top section while the sort
  // put it last and the product link stayed hidden.
  if ((device.supportLevel ?? 3) === 3) return 'community'

  const tags = device.tags ?? []
  if (tags.some(tag => supportedVendorDeviceTags.includes(tag))) return 'supported'
  if (tags.some(tag => makerVendorDeviceTags.includes(tag))) return 'maker'
  return 'community'
}
