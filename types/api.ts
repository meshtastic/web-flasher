export interface FirmwareResource {
  id: string
  title: string
  page_url?: string
  zip_url?: string
  release_notes?: string
}

export interface FirmwareReleases {
  releases: {
    stable: FirmwareResource[]
    alpha: FirmwareResource[]
  }
  pullRequests: FirmwareResource[]
}

export interface DeviceHardware {
  hwModel: number
  hwModelSlug: string
  platformioTarget: string
  architecture: string
  activelySupported: boolean
  displayName: string
  supportLevel?: number
  tags?: string[]
  images?: string[]
  partitionScheme?: string
  requiresDfu?: boolean
  hasMui?: boolean
  hasInkHud?: boolean
  url?: string,
  key?: string; // Optional key to differentiate multiple entries for the same hwModel
  variant?: string; // Optional variant to differentiate multiple entries for the same hwModel
}

export function getCorsFriendyReleaseUrl(url: string) {
  const zipName = url.split('/').slice(-1)[0]
  let firmwareName = zipName.replace('.zip', '')

  if (firmwareName.endsWith('.json')) {
    firmwareName = firmwareName.slice(0, -5)
  }

  firmwareName = firmwareName
    .replace('-esp32-', '-')
    .replace('-esp32c3-', '-')
    .replace('-esp32c6-', '-')
    .replace('-esp32s3-', '-')
    .replace('-nrf52840-', '-')
    .replace('-stm32-', '-')
    .replace('-rp2040-', '-')

  return `https://raw.githubusercontent.com/meshtastic/meshtastic.github.io/master/${firmwareName}`
}
