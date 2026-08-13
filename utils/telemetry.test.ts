import { describe, it, expect } from 'vitest'
import {
  boardAttributes,
  classifyFlashError,
  eventAttributes,
  NO_EVENT_SLUG,
  resolveFirmwareChannel,
  slugify,
} from './telemetry'
import type { DeviceHardware, FirmwareResource } from '~/types/api'
import type { EventModeConfig } from '~/types/resources'

const rak4631: DeviceHardware = {
  hwModel: 9,
  hwModelSlug: 'RAK4631',
  platformioTarget: 'rak4631',
  architecture: 'nrf52840',
  activelySupported: true,
  displayName: 'RAK WisBlock 4631',
  supportLevel: 1,
}

const defcon: EventModeConfig = {
  enabled: true,
  eventName: 'DEF CON 34',
  eventTag: 'DEFCON',
  slug: 'defcon',
  pathPrefix: 'defcon2026',
  domain: 'defcon.meshtastic.org',
  firmware: { id: 'v2.7.26.abc1234', title: 'Meshtastic Firmware 2.7.26.abc1234' },
}

describe('slugify', () => {
  it('lowercases and collapses separators', () => {
    expect(slugify('OPEN_SAUCE')).toBe('open_sauce')
    expect(slugify('Orlando Hamcation 2026')).toBe('orlando_hamcation_2026')
    expect(slugify('  DEF CON!  ')).toBe('def_con')
  })
})

describe('boardAttributes', () => {
  it('describes the board the funnel groups by', () => {
    expect(boardAttributes(rak4631)).toEqual({
      hw_model: 9,
      hw_model_slug: 'RAK4631',
      platformio_target: 'rak4631',
      architecture: 'nrf52840',
      support_level: 1,
    })
  })

  it('defaults an unset support level to community (3)', () => {
    expect(boardAttributes({ ...rak4631, supportLevel: undefined }).support_level).toBe(3)
  })

  it('is empty without a selected board', () => {
    expect(boardAttributes(undefined)).toEqual({})
  })
})

describe('eventAttributes', () => {
  it('tags traffic with the active edition', () => {
    expect(eventAttributes(defcon)).toEqual({
      event_mode: true,
      event_slug: 'defcon',
      event_name: 'DEF CON 34',
    })
  })

  it('falls back to the tag when an edition carries no slug', () => {
    const { slug: _slug, ...noSlug } = defcon
    expect(eventAttributes(noSlug as EventModeConfig).event_slug).toBe('defcon')
  })

  it('buckets non-event traffic so a group-by keeps it', () => {
    expect(eventAttributes({ ...defcon, enabled: false })).toEqual({
      event_mode: false,
      event_slug: NO_EVENT_SLUG,
    })
    expect(eventAttributes(undefined)).toEqual({ event_mode: false, event_slug: NO_EVENT_SLUG })
  })
})

describe('resolveFirmwareChannel', () => {
  const stable: FirmwareResource = { id: 'v2.7.11.abc1234', title: 'Meshtastic Firmware 2.7.11' }
  const alpha: FirmwareResource = { id: 'v2.8.0.def5678', title: 'Meshtastic Firmware 2.8.0 Alpha' }
  const preview: FirmwareResource = { id: 'v2.8.1.aaa1111', title: 'Meshtastic Firmware 2.8.1 Preview' }
  const nightly: FirmwareResource = { id: 'v2.8.2.bbb2222', title: 'Meshtastic Firmware 2.8.2 Nightly' }

  const lists = {
    alphaIds: [alpha.id],
    previewIds: [preview.id],
    nightlyId: nightly.id,
  }

  it('reports the section a release was chosen from', () => {
    expect(resolveFirmwareChannel({ firmware: stable, ...lists })).toBe('stable')
    expect(resolveFirmwareChannel({ firmware: alpha, ...lists })).toBe('alpha')
    expect(resolveFirmwareChannel({ firmware: preview, ...lists })).toBe('preview')
    expect(resolveFirmwareChannel({ firmware: nightly, ...lists })).toBe('nightly')
  })

  it('prefers the source over the section for PR, event and uploaded builds', () => {
    expect(resolveFirmwareChannel({
      firmware: { ...alpha, prBuild: { prNumber: 10665 } as FirmwareResource['prBuild'] },
      ...lists,
    })).toBe('pr')
    expect(resolveFirmwareChannel({ firmware: stable, isEventMode: true, ...lists })).toBe('event')
    // A local zip wins outright: it is flashed instead of whatever was selected.
    expect(resolveFirmwareChannel({ firmware: stable, hasLocalFile: true, isEventMode: true })).toBe('local')
  })

  it('is unknown before anything is selected', () => {
    expect(resolveFirmwareChannel({})).toBe('unknown')
    expect(resolveFirmwareChannel({ firmware: { id: '', title: '' } })).toBe('unknown')
  })
})

describe('classifyFlashError', () => {
  it('separates a dismissed port picker from a real failure', () => {
    const cancelled = new Error('No port selected by the user.')
    cancelled.name = 'NotFoundError'
    expect(classifyFlashError(cancelled)).toEqual({
      error_class: 'NotFoundError',
      error_message: 'No port selected by the user.',
      error_kind: 'user_cancelled',
    })

    expect(classifyFlashError(new Error('Timed out waiting for packet header')))
      .toEqual({
        error_class: 'Error',
        error_message: 'Timed out waiting for packet header',
        error_kind: 'flash_failed',
      })
  })

  it('handles non-Error throws and caps the message', () => {
    expect(classifyFlashError('boom')).toEqual({
      error_class: 'Error',
      error_message: 'boom',
      error_kind: 'flash_failed',
    })
    expect(classifyFlashError(undefined).error_message).toBe('')
    expect(classifyFlashError(new Error('x'.repeat(500))).error_message).toHaveLength(200)
  })
})
