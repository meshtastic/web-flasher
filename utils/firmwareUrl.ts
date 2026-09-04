import { reactive } from 'vue'
import { eventMode } from '~/types/resources'

export const GITHUB_IO_BASE = 'https://raw.githubusercontent.com/meshtastic/meshtastic.github.io/master'

// Nightlies moved off meshtastic.github.io to their own host, same flat layout
// as the old firmware-nightly/ folder: everything sits at the root.
export const NIGHTLY_BASE = 'https://nightly.meshtastic.org'

// Nightly (develop) build version, discovered at runtime from
// nightly.meshtastic.org/index.json (never surfaced in event mode). Reactive so
// the dropdown re-renders when it resolves; read synchronously below to route
// this version to the nightly host.
export const nightlyState = reactive<{ id: string }>({ id: '' })

/** Record the current nightly firmware version id (e.g. 'v2.8.0.abc1234'). */
export function setNightlyVersion(id: string): void {
  nightlyState.id = id
}

/** Whether this version is the nightly discovered from NIGHTLY_BASE. */
export function isNightlyVersion(version: string): boolean {
  if (!nightlyState.id) return false
  return version.replace(/^v/, '') === nightlyState.id.replace(/^v/, '')
}

/**
 * Determine the correct base path for a firmware version within meshtastic.github.io
 * Event firmware uses a special path, while normal firmware uses the standard path
 * @param version - The firmware version (with or without 'v' prefix)
 * @returns The base path for fetching firmware files
 */
export function getManifestBasePath(version: string): string {
  const cleanVersion = version.replace(/^v/, '')
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
  // The nightly lives on its own host, flat at the root
  if (isNightlyVersion(version)) return NIGHTLY_BASE
  return `${GITHUB_IO_BASE}/${getManifestBasePath(version)}`
}
