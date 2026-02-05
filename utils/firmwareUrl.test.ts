import { describe, it, expect } from 'vitest'
import { getManifestBasePath, getFirmwareBaseUrl, GITHUB_IO_BASE } from './firmwareUrl'

describe('firmwareUrl', () => {
  describe('getManifestBasePath', () => {
    it('returns event path for event firmware version', () => {
      // Event firmware version from resources.ts: 2.7.18.7e03cae
      const eventVersion = '2.7.18.7e03cae'
      const result = getManifestBasePath(eventVersion)
      console.log(`[EVENT] getManifestBasePath('${eventVersion}') => ${result}`)
      expect(result).toBe('event/hamcation2026/firmware-2.7.18.7e03cae')
    })

    it('returns event path for event firmware version with v prefix', () => {
      const eventVersion = 'v2.7.18.7e03cae'
      const result = getManifestBasePath(eventVersion)
      console.log(`[EVENT] getManifestBasePath('${eventVersion}') => ${result}`)
      expect(result).toBe('event/hamcation2026/firmware-2.7.18.7e03cae')
    })

    it('returns standard path for regular firmware version', () => {
      const regularVersion = '2.7.19.abcdef'
      const result = getManifestBasePath(regularVersion)
      console.log(`[REGULAR] getManifestBasePath('${regularVersion}') => ${result}`)
      expect(result).toBe('firmware-2.7.19.abcdef')
    })

    it('returns standard path for regular firmware version with v prefix', () => {
      const regularVersion = 'v2.7.19.abcdef'
      const result = getManifestBasePath(regularVersion)
      console.log(`[REGULAR] getManifestBasePath('${regularVersion}') => ${result}`)
      expect(result).toBe('firmware-2.7.19.abcdef')
    })

    it('returns standard path for stable release', () => {
      const stableVersion = '2.5.0'
      const result = getManifestBasePath(stableVersion)
      console.log(`[STABLE] getManifestBasePath('${stableVersion}') => ${result}`)
      expect(result).toBe('firmware-2.5.0')
    })
  })

  describe('getFirmwareBaseUrl', () => {
    it('returns full event URL for event firmware', () => {
      const eventVersion = '2.7.18.7e03cae'
      const result = getFirmwareBaseUrl(eventVersion)
      console.log(`[EVENT FULL URL] getFirmwareBaseUrl('${eventVersion}') =>\n  ${result}`)
      expect(result).toBe(
        `${GITHUB_IO_BASE}/event/hamcation2026/firmware-2.7.18.7e03cae`
      )
    })

    it('returns full standard URL for regular firmware', () => {
      const regularVersion = '2.7.19.abcdef'
      const result = getFirmwareBaseUrl(regularVersion)
      console.log(`[REGULAR FULL URL] getFirmwareBaseUrl('${regularVersion}') =>\n  ${result}`)
      expect(result).toBe(
        `${GITHUB_IO_BASE}/firmware-2.7.19.abcdef`
      )
    })

    it('returns full standard URL for stable release', () => {
      const stableVersion = '2.5.0'
      const result = getFirmwareBaseUrl(stableVersion)
      console.log(`[STABLE FULL URL] getFirmwareBaseUrl('${stableVersion}') =>\n  ${result}`)
      expect(result).toBe(
        `${GITHUB_IO_BASE}/firmware-2.5.0`
      )
    })
  })

  describe('GITHUB_IO_BASE', () => {
    it('has the correct base URL', () => {
      console.log(`[BASE URL] GITHUB_IO_BASE = ${GITHUB_IO_BASE}`)
      expect(GITHUB_IO_BASE).toBe('https://raw.githubusercontent.com/meshtastic/meshtastic.github.io/master')
    })
  })
})
