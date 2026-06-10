import type { ReleaseTarget } from './manifest'

export interface PrBuildArtifact {
  arch: string
  artifact_id: number
  name: string
  size_in_bytes: number
  expires_at: string
}

export interface PrBuildInfo {
  prNumber: number
  prTitle: string
  pageUrl: string
  author: string
  headSha: string
  runId: number
  version: string
  expiresAt: string
  artifacts: PrBuildArtifact[]
  targets: ReleaseTarget[]
}

export interface FirmwareResource {
  id: string
  title: string
  page_url?: string
  zip_url?: string
  release_notes?: string
  prBuild?: PrBuildInfo
}

/**
 * Response shape of the api.meshtastic.org /github/firmware/pr/{number} endpoint
 */
export interface PrBuildResponse {
  pr: {
    number: number
    title: string
    page_url: string
    author: string
    head_sha: string
    state: string
    merged: boolean
  }
  run_id: number
  version: string
  expires_at: string
  artifacts: PrBuildArtifact[]
  targets: ReleaseTarget[]
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