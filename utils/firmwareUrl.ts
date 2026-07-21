import { reactive } from 'vue'
import { eventMode } from '~/types/resources'

export const GITHUB_IO_BASE = 'https://raw.githubusercontent.com/meshtastic/meshtastic.github.io/master'

// Single, stable github.io folder that always holds the current develop nightly build.
export const NIGHTLY_DIR = 'firmware-nightly'

// Nightly (develop) build version, discovered at runtime from
// firmware-nightly/index.json (never surfaced in event mode). Reactive so the
// dropdown re-renders when it resolves; read synchronously below to route this
// version to the firmware-nightly/ folder.
export const nightlyState = reactive<{ id: string }>({ id: '' })

/** Record the current nightly firmware version id (e.g. 'v2.8.0.abc1234'). */
export function setNightlyVersion(id: string): void {
  nightlyState.id = id
}

/**
 * Determine the correct base path for a firmware version
 * Event firmware uses a special path, while normal firmware uses the standard path
 * @param version - The firmware version (with or without 'v' prefix)
 * @returns The base path for fetching firmware files
 */
export function getManifestBasePath(version: string): string {
  const cleanVersion = version.replace(/^v/, '')
  // Nightly (develop) build lives in a single stable folder, not firmware-<version>/
  if (nightlyState.id && cleanVersion === nightlyState.id.replace(/^v/, '')) {
    return NIGHTLY_DIR
  }
  const eventVersion = eventMode.firmware.id.replace(/^v/, '')
  // Check if this is the event firmware version
  if (cleanVersion === eventVersion) {
    return `event/${eventMode.pathPrefix}/firmware-${cleanVersion}`
  }
  return `firmware-${cleanVersion}`
}

/**
 * Get the base URL for fetching firmware files
 * @param version - The firmware version (with or without 'v' prefix)
 * @returns The base URL for the firmware files directory
 */
export function getFirmwareBaseUrl(version: string): string {
  return `${GITHUB_IO_BASE}/${getManifestBasePath(version)}`
}
