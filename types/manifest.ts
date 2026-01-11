export interface FirmwareManifestFile {
  name: string
  md5: string
  bytes: number
}

export interface FirmwareManifestPartition {
  name: string
  type: string
  subtype: string
  offset: string
  size: string
  flags: string
}

export interface FirmwareManifest {
  version: string
  build_epoch?: number
  board: string
  mcu: string
  repo?: string
  files: FirmwareManifestFile[]
  part: FirmwareManifestPartition[]
  has_mui?: boolean
  has_inkhud?: boolean
}
