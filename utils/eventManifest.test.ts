import { describe, it, expect } from 'vitest'
import { manifestEditionToEventMode, isFirmwareDowngrade, resolveEventAccentVars } from './eventManifest'
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

describe('resolveEventAccentVars', () => {
  it('prefers a dedicated accent over a dark primary (DEF CON) and uses white on-accent', () => {
    const vars = resolveEventAccentVars({ colors: { primary: '#0D294A', secondary: '#017FA4', accent: '#E0004E' } })
    expect(vars?.['--accent']).toBe('#E0004E')
    expect(vars?.['--on-accent']).toBe('#ffffff')
    // The brand-colour utilities track the accent, not the dark navy primary,
    // so .text-meshtastic icons/links stay legible on the dark UI.
    expect(vars?.['--primary-color']).toBe('#E0004E')
    // accent-dark is derived from the accent hue, not the (teal) secondary.
    expect(vars?.['--accent-dark']).not.toBe('#017FA4')
  })

  it('falls back to primary when no dedicated accent is set', () => {
    const vars = resolveEventAccentVars({ colors: { primary: '#E94F1D' } })
    expect(vars?.['--accent']).toBe('#E94F1D')
  })

  it('picks black on-accent for a light accent, white for a dark one', () => {
    expect(resolveEventAccentVars({ colors: { primary: '#67ea94' } })?.['--on-accent']).toBe('#000000')
    expect(resolveEventAccentVars({ colors: { primary: '#0D294A' } })?.['--on-accent']).toBe('#ffffff')
  })

  it('returns null for a missing or unparseable theme', () => {
    expect(resolveEventAccentVars(null)).toBeNull()
    expect(resolveEventAccentVars({ colors: { primary: 'not-a-color' } })).toBeNull()
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
