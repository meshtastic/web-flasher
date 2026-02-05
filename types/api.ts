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