import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { API_ORIGIN, createUrl } from './store'

// createUrl reads window.location for the same-origin paths.
vi.hoisted(() => {
  (globalThis as any).window = { location: { host: 'localhost:3000', protocol: 'http:' } }
})

describe('createUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to the v2 API deployment', () => {
    expect(API_ORIGIN).toBe('https://apiv2.meshtastic.org')
  })

  it('strips the api/ prefix and resolves against the API origin', () => {
    expect(createUrl('api/resource/deviceHardware')).toBe('https://apiv2.meshtastic.org/resource/deviceHardware')
    expect(createUrl('api/github/firmware/list')).toBe('https://apiv2.meshtastic.org/github/firmware/list')
    expect(createUrl('api/resource/eventFirmware')).toBe('https://apiv2.meshtastic.org/resource/eventFirmware')
  })

  it('keeps the API on https even when the page is not', () => {
    // window.location.protocol is http: above; the API is https-only.
    expect(createUrl('api/resource/deviceHardware')).toMatch(/^https:/)
  })

  it('keeps api/ same-origin in development so the Vite proxy handles it', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(createUrl('api/resource/deviceHardware')).toBe('http://localhost:3000/api/resource/deviceHardware')
  })

  it('leaves non-api paths on the page origin', () => {
    expect(createUrl('data/event_firmware.json')).toBe('http://localhost:3000/data/event_firmware.json')
  })
})

describe('API_ORIGIN override', () => {
  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('honours API_ORIGIN, which is how a rollback to the v1 server is deployed', async () => {
    vi.stubEnv('API_ORIGIN', 'https://api.meshtastic.org')
    const fresh = await import('./store')
    expect(fresh.API_ORIGIN).toBe('https://api.meshtastic.org')
    expect(fresh.createUrl('api/github/firmware/list')).toBe('https://api.meshtastic.org/github/firmware/list')
  })
})
