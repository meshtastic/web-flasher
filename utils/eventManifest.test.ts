import { describe, it, expect } from 'vitest'
import { manifestEditionToEventMode, isFirmwareDowngrade } from './eventManifest'
import type { EventFirmwareEdition } from '~/types/eventFirmware'

// A manifest edition whose custom build has shipped (Open Sauce-shaped).
const shippedEdition: EventFirmwareEdition = {
  edition: 'OPEN_SAUCE',
  displayName: 'Open Sauce 2026',
  welcomeMessage: 'Welcome to Open Sauce! 🔧',
  tag: 'Open Sauce',
  domain: 'opensauce.meshtastic.org',
  theme: { colors: { primary: '#E94F1D' } },
  firmware: {
    slug: 'opensauce2026',
    version: '2.7.26.004b486',
    id: 'v2.7.26.004b486',
    title: 'Meshtastic Firmware 2.7.26.004b486',
    zipUrl: 'https://example.com/firmware-2.7.26.004b486.zip',
    releaseNotes: '## Welcome',
  },
}

// The same edition before its build ships (version/id/zip still null) — the
// shape the live API currently returns for Open Sauce.
const comingSoonEdition: EventFirmwareEdition = {
  ...shippedEdition,
  firmware: { slug: 'opensauce2026', version: null, id: null, title: null, zipUrl: null, releaseNotes: null },
}

describe('manifestEditionToEventMode', () => {
  it('maps a shipped build into a flashable event config', () => {
    const cfg = manifestEditionToEventMode(shippedEdition)
    expect(cfg.enabled).toBe(true)
    expect(cfg.eventName).toBe('Open Sauce 2026')
    expect(cfg.pathPrefix).toBe('opensauce2026')
    expect(cfg.firmware.id).toBe('v2.7.26.004b486')
    expect(cfg.firmware.zip_url).toBe('https://example.com/firmware-2.7.26.004b486.zip')
  })

  it('leaves firmware id empty ("coming soon") when the build has not shipped', () => {
    const cfg = manifestEditionToEventMode(comingSoonEdition)
    expect(cfg.enabled).toBe(true)
    expect(cfg.firmware.id).toBe('')
    // Falls back to the display name so the header still reads sensibly.
    expect(cfg.firmware.title).toBe('Open Sauce 2026')
  })
})

describe('isFirmwareDowngrade', () => {
  const shipped = manifestEditionToEventMode(shippedEdition)
  const comingSoon = manifestEditionToEventMode(comingSoonEdition)

  it('flags a lagging API edition (no build) replacing a shipped build for the same event', () => {
    expect(isFirmwareDowngrade(shipped, comingSoon)).toBe(true)
  })

  it('allows a real build to replace a shipped build (upgrade path)', () => {
    expect(isFirmwareDowngrade(shipped, shipped)).toBe(false)
  })

  it('does not flag when there is no shipped build to protect', () => {
    expect(isFirmwareDowngrade(comingSoon, comingSoon)).toBe(false)
  })

  it('does not flag across different events', () => {
    const other = manifestEditionToEventMode({ ...comingSoonEdition, domain: 'defcon.meshtastic.org' })
    expect(isFirmwareDowngrade(shipped, other)).toBe(false)
  })

  it('does not flag a disabled current config', () => {
    expect(isFirmwareDowngrade({ ...shipped, enabled: false }, comingSoon)).toBe(false)
  })
})
