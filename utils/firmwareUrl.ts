import { eventMode } from '~/types/resources'

export const GITHUB_IO_BASE = 'https://raw.githubusercontent.com/meshtastic/meshtastic.github.io/master'

/**
 * Determine the correct base path for a firmware version
 * Event firmware uses a special path, while normal firmware uses the standard path
 * @param version - The firmware version (with or without 'v' prefix)
 * @returns The base path for fetching firmware files
 */
export function getManifestBasePath(version: string): string {
  const cleanVersion = version.replace(/^v/, '')
  const eventVersion = eventMode.firmware.id.replace(/^v/, '')
  // Check if this is the event firmware version
  if (cleanVersion === eventVersion) {
    return `event/hamcation2026/firmware-${cleanVersion}`
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
