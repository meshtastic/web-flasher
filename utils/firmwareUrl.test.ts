import { describe, it, expect, afterEach } from 'vitest'
import {
  getManifestBasePath,
  getFirmwareBaseUrl,
  isNightlyVersion,
  setNightlyVersion,
  RELEASE_BASE,
  NIGHTLY_BASE,
} from './firmwareUrl'
import { eventMode } from '~/types/resources'

// Derived from the active event config so the tests don't go stale when the
// event (or its firmware version) rotates in types/resources.ts
const eventVersion = eventMode.firmware.id.replace(/^v/, '')
const eventBasePath = `event/${eventMode.pathPrefix}/${eventVersion}`

describe('firmwareUrl', () => {
  describe('getManifestBasePath', () => {
    it('returns event path for event firmware version', () => {
      const result = getManifestBasePath(eventVersion)
      console.log(`[EVENT] getManifestBasePath('${eventVersion}') => ${result}`)
      expect(result).toBe(eventBasePath)
    })

    it('returns event path for event firmware version with v prefix', () => {
      const result = getManifestBasePath(`v${eventVersion}`)
      console.log(`[EVENT] getManifestBasePath('v${eventVersion}') => ${result}`)
      expect(result).toBe(eventBasePath)
    })

    it('uses pathPrefix from the active eventMode config', () => {
      const result = getManifestBasePath(eventMode.firmware.id)
      console.log(`[ACTIVE EVENT] pathPrefix='${eventMode.pathPrefix}' => ${result}`)
      expect(result).toBe(`event/${eventMode.pathPrefix}/${eventMode.firmware.id.replace(/^v/, '')}`)
    })

    it('returns standard path for regular firmware version', () => {
      const regularVersion = '2.7.19.abcdef'
      const result = getManifestBasePath(regularVersion)
      console.log(`[REGULAR] getManifestBasePath('${regularVersion}') => ${result}`)
      expect(result).toBe('2.7.19.abcdef')
    })

    it('returns standard path for regular firmware version with v prefix', () => {
      const regularVersion = 'v2.7.19.abcdef'
      const result = getManifestBasePath(regularVersion)
      console.log(`[REGULAR] getManifestBasePath('${regularVersion}') => ${result}`)
      expect(result).toBe('2.7.19.abcdef')
    })

    it('returns standard path for stable release', () => {
      const stableVersion = '2.5.0'
      const result = getManifestBasePath(stableVersion)
      console.log(`[STABLE] getManifestBasePath('${stableVersion}') => ${result}`)
      expect(result).toBe('2.5.0')
    })
  })

  describe('getFirmwareBaseUrl', () => {
    it('returns full event URL for event firmware', () => {
      const result = getFirmwareBaseUrl(eventVersion)
      console.log(`[EVENT FULL URL] getFirmwareBaseUrl('${eventVersion}') =>\n  ${result}`)
      expect(result).toBe(
        `${RELEASE_BASE}/${eventBasePath}`
      )
    })

    it('returns full standard URL for regular firmware', () => {
      const regularVersion = '2.7.19.abcdef'
      const result = getFirmwareBaseUrl(regularVersion)
      console.log(`[REGULAR FULL URL] getFirmwareBaseUrl('${regularVersion}') =>\n  ${result}`)
      expect(result).toBe(
        `${RELEASE_BASE}/2.7.19.abcdef`
      )
    })

    it('returns full standard URL for stable release', () => {
      const stableVersion = '2.5.0'
      const result = getFirmwareBaseUrl(stableVersion)
      console.log(`[STABLE FULL URL] getFirmwareBaseUrl('${stableVersion}') =>\n  ${result}`)
      expect(result).toBe(
        `${RELEASE_BASE}/2.5.0`
      )
    })
  })

  // Nightlies are served flat from their own host, not a per-version folder
  describe('nightly', () => {
    const nightlyId = 'v2.8.1.97d916e'

    // Module-level state; clear it or later cases inherit the pin
    afterEach(() => setNightlyVersion(''))

    it('routes the registered nightly to the nightly host', () => {
      setNightlyVersion(nightlyId)
      expect(getFirmwareBaseUrl(nightlyId)).toBe(NIGHTLY_BASE)
    })

    it('routes the nightly without the v prefix too', () => {
      setNightlyVersion(nightlyId)
      expect(getFirmwareBaseUrl('2.8.1.97d916e')).toBe(NIGHTLY_BASE)
      expect(isNightlyVersion('2.8.1.97d916e')).toBe(true)
    })

    it('matches a nightly id registered without the v prefix', () => {
      setNightlyVersion('2.8.1.97d916e')
      expect(getFirmwareBaseUrl(nightlyId)).toBe(NIGHTLY_BASE)
    })

    it('leaves every other version on release.meshtastic.org', () => {
      setNightlyVersion(nightlyId)
      expect(getFirmwareBaseUrl('2.7.19.abcdef')).toBe(`${RELEASE_BASE}/2.7.19.abcdef`)
      expect(getFirmwareBaseUrl(eventVersion)).toBe(`${RELEASE_BASE}/${eventBasePath}`)
      expect(isNightlyVersion('2.7.19.abcdef')).toBe(false)
    })

    it('matches nothing before a nightly has been discovered', () => {
      expect(isNightlyVersion(nightlyId)).toBe(false)
      expect(getFirmwareBaseUrl(nightlyId)).toBe(`${RELEASE_BASE}/2.8.1.97d916e`)
    })
  })

  describe('base URLs', () => {
    it('has the correct release base URL', () => {
      console.log(`[BASE URL] RELEASE_BASE = ${RELEASE_BASE}`)
      expect(RELEASE_BASE).toBe('https://release.meshtastic.org')
    })

    it('has the correct nightly base URL', () => {
      console.log(`[BASE URL] NIGHTLY_BASE = ${NIGHTLY_BASE}`)
      expect(NIGHTLY_BASE).toBe('https://nightly.meshtastic.org')
    })
  })
})
