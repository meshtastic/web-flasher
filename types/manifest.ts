export interface FirmwareManifestFile {
  name: string
  md5: string
  bytes: number
  part_name?: string
}

export interface FirmwareManifestPartition {
  name: string
  type: string
  subtype: string
  offset: string
  size: string
  flags: string
}

// Partition Subtype Constants
export const PARTITION_SUBTYPES = {
  NVS: 'nvs',
  OTA: 'ota',
  OTA_0: 'ota_0',
  OTA_1: 'ota_1',
  SPIFFS: 'spiffs',
  COREDUMP: 'coredump',
} as const

// Partition Name Constants
export const PARTITION_NAMES = {
  NVS: 'nvs',
  OTADATA: 'otadata',
  APP0: 'app0',
  APP1: 'app1',
  SPIFFS: 'spiffs',
  COREDUMP: 'coredump',
} as const

export interface FirmwareManifest {
  version: string
  build_epoch?: number
  board?: string
  platformioTarget?: string
  mcu: string
  repo?: string
  files: FirmwareManifestFile[]
  part: FirmwareManifestPartition[]
  has_mui?: boolean
  has_inkhud?: boolean
  hwModel?: number
  hwModelSlug?: string
  architecture?: string
  activelySupported?: boolean
  displayName?: string
  supportLevel?: number
  images?: string[]
  tags?: string[]
  requiresDfu?: boolean
  partitionScheme?: string
}

/**
 * A target entry in the release manifest
 */
export interface ReleaseTarget {
  board: string
  platform: string
}

/**
 * The release manifest that lists all available targets for a firmware version
 */
export interface ReleaseManifest {
  version: string
  targets: ReleaseTarget[]
}
