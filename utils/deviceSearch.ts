import type { DeviceHardware } from '../types/api'

export function matchesDeviceSearch(device: DeviceHardware, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return true

  const searchableValues = [
    device.displayName,
    device.platformioTarget,
    device.hwModelSlug,
    device.architecture,
    device.key,
    device.variant,
    ...(device.tags ?? []),
  ]

  return searchableValues.some(value => value?.toLocaleLowerCase().includes(normalizedQuery))
}
