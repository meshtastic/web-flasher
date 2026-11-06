import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DeviceHardware } from '~/types/api'
import type { MaintenanceUf2Manifest } from '~/types/maintenanceUf2'
import {
  bootloaderEraseAssetUrl,
  fetchMaintenanceUf2Manifest,
  fetchVerifiedUf2,
  otafixReleasePageUrl,
  sha256Hex,
  supportsOtafix,
} from './maintenanceUf2'

// createUrl reads window.location at import time.
vi.hoisted(() => {
  (globalThis as any).window = { location: { host: 'localhost:3000', protocol: 'https:' } }
})

const MANIFEST: MaintenanceUf2Manifest = {
  manifestVersion: 1,
  otafixReleaseTag: '0.9.2-OTAFIX2.5',
  otafixBase: 'https://github.com/meshtastic/nRF52_Bootloader/releases/download/0.9.2-OTAFIX2.5',
  erase: {
    nrf52Bootloader: {
      fileName: 'meshtastic_factory_erase.uf2',
      sha256: '6ef3146505c40079ee9e7e692448e40a793dad636f55d1545063299d28908f0d',
    },
  },
  otafixSupportedTargets: ['rak4631', 't-echo'],
}

function makeTarget(overrides: Partial<DeviceHardware>): DeviceHardware {
  return {
    hwModel: 1,
    hwModelSlug: 'TEST',
    platformioTarget: 'test',
    architecture: 'nrf52840',
    activelySupported: true,
    displayName: 'Test',
    ...overrides,
  }
}

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('maintenanceUf2 url helpers', () => {
  it('serves the board-agnostic erase image from the API asset route', () => {
    expect(bootloaderEraseAssetUrl(MANIFEST))
      .toBe('https://api.meshtastic.org/resource/maintenanceUf2/asset/meshtastic_factory_erase.uf2')
  })

  it('has no erase image without a manifest or without the bootloader entry', () => {
    expect(bootloaderEraseAssetUrl(null)).toBeNull()
    expect(bootloaderEraseAssetUrl({ ...MANIFEST, erase: {} })).toBeNull()
  })

  it('derives the release page from the download base', () => {
    expect(otafixReleasePageUrl(MANIFEST))
      .toBe('https://github.com/meshtastic/nRF52_Bootloader/releases/tag/0.9.2-OTAFIX2.5')
    expect(otafixReleasePageUrl({ ...MANIFEST, otafixBase: 'https://example.invalid/x' })).toBeNull()
    expect(otafixReleasePageUrl(null)).toBeNull()
  })
})

describe('supportsOtafix', () => {
  it('matches on platformioTarget for nRF52 boards', () => {
    expect(supportsOtafix(MANIFEST, makeTarget({ platformioTarget: 'rak4631' }))).toBe(true)
    expect(supportsOtafix(MANIFEST, makeTarget({ platformioTarget: 'rak_wismesh_pocket' }))).toBe(false)
  })

  it('never matches a non-nRF52 board or an empty manifest', () => {
    expect(supportsOtafix(MANIFEST, makeTarget({ platformioTarget: 'rak4631', architecture: 'esp32' }))).toBe(false)
    expect(supportsOtafix(null, makeTarget({ platformioTarget: 'rak4631' }))).toBe(false)
    expect(supportsOtafix(MANIFEST, undefined)).toBe(false)
  })
})

describe('fetchMaintenanceUf2Manifest', () => {
  it('returns the manifest from the API resource', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(MANIFEST), { status: 200 }))
    await expect(fetchMaintenanceUf2Manifest()).resolves.toEqual(MANIFEST)
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.meshtastic.org/resource/maintenanceUf2')
  })

  it('returns null on a non-ok response, a non-manifest body, or a network error', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }))
    await expect(fetchMaintenanceUf2Manifest()).resolves.toBeNull()
    fetchMock.mockResolvedValueOnce(new Response('<html></html>', { status: 200 }))
    await expect(fetchMaintenanceUf2Manifest()).resolves.toBeNull()
    fetchMock.mockResolvedValueOnce(new Response('{"editions":[]}', { status: 200 }))
    await expect(fetchMaintenanceUf2Manifest()).resolves.toBeNull()
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    await expect(fetchMaintenanceUf2Manifest()).resolves.toBeNull()
  })
})

describe('fetchVerifiedUf2', () => {
  const bytes = new TextEncoder().encode('UF2 test payload')

  it('returns the blob when the digest matches', async () => {
    const expected = await sha256Hex(bytes.buffer as ArrayBuffer)
    fetchMock.mockResolvedValueOnce(new Response(bytes, { status: 200 }))
    const blob = await fetchVerifiedUf2('https://example.invalid/erase.uf2', expected.toUpperCase())
    expect(blob.size).toBe(bytes.length)
  })

  it('rejects on a digest mismatch', async () => {
    fetchMock.mockResolvedValueOnce(new Response(bytes, { status: 200 }))
    await expect(fetchVerifiedUf2('https://example.invalid/erase.uf2', '00'.repeat(32)))
      .rejects.toThrow(/SHA-256 mismatch/)
  })

  it('rejects on a non-ok response', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }))
    await expect(fetchVerifiedUf2('https://example.invalid/erase.uf2', '00'.repeat(32)))
      .rejects.toThrow(/HTTP 404/)
  })
})
