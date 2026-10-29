import { saveAs } from 'file-saver'
import type { DeviceHardware } from '~/types/api'
import type { MaintenanceUf2Manifest } from '~/types/maintenanceUf2'
import { createUrl } from '~/stores/store'

const API_TIMEOUT_MS = 2500

export const NRF52_BOOTLOADER_UPDATE_DOCS_URL
  = 'https://meshtastic.org/docs/getting-started/flashing-firmware/nrf52/update-nrf52-bootloader/'

/**
 * Live manifest from the API. Null on any failure; the erase modal then offers
 * only the bundled SoftDevice-specific images, so the API is never a blocker.
 */
export async function fetchMaintenanceUf2Manifest(): Promise<MaintenanceUf2Manifest | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
    const res = await fetch(createUrl('api/resource/maintenanceUf2'), { signal: controller.signal })
    clearTimeout(timer)
    if (res.ok) {
      const manifest = await res.json() as MaintenanceUf2Manifest
      return manifest.erase ? manifest : null
    }
  }
  catch {
    // offline, slow, timed out, or non-JSON body
  }
  return null
}

/** The board-agnostic factory-erase image, served next to the manifest. */
export function bootloaderEraseAssetUrl(manifest: MaintenanceUf2Manifest | null): string | null {
  const fileName = manifest?.erase?.nrf52Bootloader?.fileName
  return fileName ? createUrl(`api/resource/maintenanceUf2/asset/${fileName}`) : null
}

/** GitHub release page for the pinned bootloader tag, derived from its download base. */
export function otafixReleasePageUrl(manifest: MaintenanceUf2Manifest | null): string | null {
  const base = manifest?.otafixBase
  if (!base || !base.includes('/releases/download/')) return null
  return base.replace('/releases/download/', '/releases/tag/')
}

/** Whether the pinned bootloader release ships a build for this target. */
export function supportsOtafix(manifest: MaintenanceUf2Manifest | null, target?: DeviceHardware | null): boolean {
  if (!manifest?.otafixSupportedTargets || !target) return false
  if (!target.architecture.startsWith('nrf52')) return false
  return manifest.otafixSupportedTargets.includes(target.platformioTarget)
}

export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Fetch a UF2, check it against the manifest's digest, then hand it to the
 * browser as a download. A cross-origin anchor ignores `download`, and a
 * corrupted erase image is not something to find out about on the device.
 */
export async function fetchVerifiedUf2(url: string, expectedSha256: string): Promise<Blob> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  const bytes = await res.arrayBuffer()
  const actual = await sha256Hex(bytes)
  if (actual !== expectedSha256.toLowerCase()) {
    throw new Error(`SHA-256 mismatch for ${url}: expected ${expectedSha256}, got ${actual}`)
  }
  return new Blob([bytes], { type: 'application/octet-stream' })
}

export async function downloadVerifiedUf2(url: string, expectedSha256: string, fileName: string): Promise<void> {
  const blob = await fetchVerifiedUf2(url, expectedSha256)
  saveAs(blob, fileName)
}
