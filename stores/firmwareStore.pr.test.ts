import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js'
import { saveAs } from 'file-saver'
import type { PrBuildResponse } from '~/types/api'
import { setGlobalI18n } from '~/utils/i18n'
import { useFirmwareStore } from './firmwareStore'
import { useToastStore } from './toastStore'

// The store module reads window.location at import time (createUrl).
// vi.hoisted runs before the imports above are evaluated.
vi.hoisted(() => {
  (globalThis as any).window = { location: { host: 'localhost:3000', protocol: 'https:' } }
})

vi.mock('file-saver', () => ({ saveAs: vi.fn() }))

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

function makePayload(overrides: Partial<PrBuildResponse> = {}): PrBuildResponse {
  return {
    pr: {
      number: 10665,
      title: 'Clamp position precision on public / known-keys',
      page_url: 'https://github.com/meshtastic/firmware/pull/10665',
      author: 'thebentern',
      head_sha: '9c4317ef9d2178381cecbf72e342adeba95c2784',
      state: 'open',
      merged: false,
    },
    run_id: 27241663552,
    version: '2.8.0.7a414be',
    expires_at: FUTURE,
    artifacts: [
      { arch: 'esp32', artifact_id: 7523942107, name: 'firmware-esp32-2.8.0.7a414be', size_in_bytes: 1000, expires_at: FUTURE },
      { arch: 'nrf52840', artifact_id: 7523945881, name: 'firmware-nrf52840-2.8.0.7a414be', size_in_bytes: 1000, expires_at: FUTURE },
    ],
    targets: [
      { board: 'rak11200', platform: 'esp32' },
      { board: 't-echo', platform: 'nrf52840' },
      { board: 't-deck-tft', platform: 'esp32s3' },
    ],
    ...overrides,
  }
}

async function makeZip(entries: Record<string, string>): Promise<Blob> {
  const writer = new ZipWriter(new BlobWriter('application/zip'))
  for (const [name, content] of Object.entries(entries)) {
    await writer.add(name, new TextReader(content))
  }
  return writer.close()
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

function zipResponse(zip: Blob): Response {
  return new Response(zip, { status: 200, headers: { 'content-length': String(zip.size) } })
}

const RAK_MANIFEST = {
  version: '2.8.0.7a414be',
  mcu: 'esp32',
  files: [
    { name: 'firmware-rak11200-2.8.0.7a414be.bin', md5: 'x', bytes: 3, part_name: 'app0' },
    { name: 'mt-esp32-ota.bin', md5: 'x', bytes: 3, part_name: 'app1' },
  ],
  part: [
    { name: 'app', type: 'app', subtype: 'ota_0', offset: '0x10000', size: '0x250000', flags: '' },
    { name: 'flashApp', type: 'app', subtype: 'ota_1', offset: '0x260000', size: '0xA0000', flags: '' },
  ],
}

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

/** Load PR metadata into the store with a single mocked metadata fetch */
async function loadPr(store: ReturnType<typeof useFirmwareStore>, payload = makePayload()) {
  fetchMock.mockResolvedValueOnce(jsonResponse(payload))
  const loaded = await store.loadPrFirmware(payload.pr.number)
  expect(loaded).toBe(true)
  return payload
}

beforeEach(() => {
  setActivePinia(createPinia())
  setGlobalI18n({ t: (key: string) => key })
  fetchMock.mockReset()
})

describe('firmwareStore PR builds', () => {
  describe('loadPrFirmware', () => {
    it('selects the PR build and synthesizes the release manifest without touching meshtastic.github.io', async () => {
      const store = useFirmwareStore()
      const payload = await loadPr(store)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith('https://api.meshtastic.org/github/firmware/pr/10665')

      expect(store.selectedFirmware?.id).toBe('v2.8.0.7a414be')
      expect(store.selectedFirmware?.prBuild?.prNumber).toBe(10665)
      expect(store.prFirmware?.id).toBe('v2.8.0.7a414be')
      expect(store.releaseManifest).toEqual({ version: payload.version, targets: payload.targets })
      expect(store.isPrBuild).toBe(true)

      // Non-empty synthesized notes keep the warning gate engaged
      expect(store.selectedFirmware?.release_notes).toContain('[!WARNING]')
      expect(store.hasSeenReleaseNotes).toBe(false)
    })

    it('returns false and toasts when the PR does not exist', async () => {
      const store = useFirmwareStore()
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'pr_not_found' }, 404))

      const loaded = await store.loadPrFirmware(999999)

      expect(loaded).toBe(false)
      expect(store.hasOnlineFirmware).toBe(false)
      expect(useToastStore().toasts).toMatchObject([
        { type: 'error', message: 'firmware.pr.not_found' },
      ])
    })

    it('maps expired artifacts to the expiry message', async () => {
      const store = useFirmwareStore()
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'artifacts_expired' }, 410))

      const loaded = await store.loadPrFirmware(10665)

      expect(loaded).toBe(false)
      expect(useToastStore().toasts).toMatchObject([
        { type: 'error', message: 'firmware.pr.expired' },
      ])
    })
  })

  describe('getPrArchZip', () => {
    it('downloads the artifact zip once and serves later calls from cache', async () => {
      const store = useFirmwareStore()
      await loadPr(store)
      const zip = await makeZip({ 'firmware-rak11200-2.8.0.7a414be.bin': 'BIN' })
      fetchMock.mockImplementation(async () => zipResponse(zip))

      const first = await store.getPrArchZip('esp32')
      const second = await store.getPrArchZip('esp32')

      expect(first.size).toBe(zip.size)
      expect(second).toBe(first)
      // 1 metadata call + 1 artifact download
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock).toHaveBeenLastCalledWith('https://api.meshtastic.org/github/firmware/artifact/7523942107/download')
      expect(store.prDownload).toBeUndefined()
    })

    it('shares one download between concurrent callers', async () => {
      const store = useFirmwareStore()
      await loadPr(store)
      const zip = await makeZip({ 'firmware-t-echo-2.8.0.7a414be.uf2': 'UF2' })
      fetchMock.mockImplementation(async () => zipResponse(zip))

      const [a, b] = await Promise.all([store.getPrArchZip('nrf52840'), store.getPrArchZip('nrf52840')])

      expect(a.size).toBe(zip.size)
      expect(b.size).toBe(zip.size)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('rejects an architecture the PR did not build', async () => {
      const store = useFirmwareStore()
      await loadPr(store)
      useToastStore().clearAll()

      await expect(store.getPrArchZip('stm32')).rejects.toThrow('does not include stm32')
      expect(useToastStore().toasts).toMatchObject([
        { type: 'error', message: 'firmware.pr.arch_not_built' },
      ])
    })

    it('rejects expired artifacts before downloading', async () => {
      const store = useFirmwareStore()
      const payload = makePayload()
      payload.artifacts = payload.artifacts.map(artifact => ({ ...artifact, expires_at: PAST }))
      await loadPr(store, payload)
      useToastStore().clearAll()

      await expect(store.getPrArchZip('esp32')).rejects.toThrow('expired')
      expect(fetchMock).toHaveBeenCalledTimes(1) // metadata only
    })

    it('treats a 404 download response as expired', async () => {
      const store = useFirmwareStore()
      await loadPr(store)
      fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }))

      await expect(store.getPrArchZip('esp32')).rejects.toThrow('expired')
    })
  })

  describe('loadTargetManifest', () => {
    it('reads the target manifest from the artifact zip', async () => {
      const store = useFirmwareStore()
      await loadPr(store)
      const zip = await makeZip({
        'firmware-rak11200-2.8.0.7a414be.mt.json': JSON.stringify(RAK_MANIFEST),
        'firmware-rak11200-2.8.0.7a414be.bin': 'BIN',
      })
      fetchMock.mockImplementation(async () => zipResponse(zip))

      const loaded = await store.loadTargetManifest('rak11200')

      expect(loaded).toBe(true)
      expect(store.hasManifest).toBe(true)
      expect(store.prActiveArch).toBe('esp32')
      expect(store.manifest?.files.map(file => file.name)).toContain('firmware-rak11200-2.8.0.7a414be.bin')
    })

    it('fails fast for a board the PR did not build, without legacy fallback fetches', async () => {
      const store = useFirmwareStore()
      await loadPr(store)

      const loaded = await store.loadTargetManifest('tbeam')

      expect(loaded).toBe(false)
      expect(store.hasManifest).toBe(false)
      expect(fetchMock).toHaveBeenCalledTimes(1) // metadata only, no github.io requests
    })

    it('returns false when the zip is missing the manifest', async () => {
      const store = useFirmwareStore()
      await loadPr(store)
      const zip = await makeZip({ 'firmware-t-echo-2.8.0.7a414be.uf2': 'UF2' })
      fetchMock.mockImplementation(async () => zipResponse(zip))

      const loaded = await store.loadTargetManifest('t-echo')

      expect(loaded).toBe(false)
      expect(store.hasManifest).toBe(false)
    })
  })

  describe('fetchBinaryContent', () => {
    it('extracts manifest-named files from the cached artifact zip', async () => {
      const store = useFirmwareStore()
      await loadPr(store)
      const zip = await makeZip({
        'firmware-rak11200-2.8.0.7a414be.mt.json': JSON.stringify(RAK_MANIFEST),
        'firmware-rak11200-2.8.0.7a414be.bin': 'BIN',
        'littlefs-rak11200-2.8.0.7a414be.bin': 'FS',
      })
      fetchMock.mockImplementation(async () => zipResponse(zip))
      await store.loadTargetManifest('rak11200')

      const exact = await store.fetchBinaryContent('firmware-rak11200-2.8.0.7a414be.bin')
      expect(exact).toBe('BIN')

      // Legacy convention lookups pass regex patterns instead of exact names
      const byPattern = await store.fetchBinaryContent('littlefs-rak11200-.+.bin')
      expect(byPattern).toBe('FS')

      await expect(store.fetchBinaryContent('bleota.bin')).rejects.toThrow('Could not find')
    })

    it('refuses to flash before a target manifest is loaded', async () => {
      const store = useFirmwareStore()
      await loadPr(store)

      await expect(store.fetchBinaryContent('firmware-rak11200-2.8.0.7a414be.bin'))
        .rejects.toThrow('target manifest')
    })
  })

  describe('downloadUf2FileSystem', () => {
    it('extracts the uf2 from the arch zip and saves it', async () => {
      const store = useFirmwareStore()
      await loadPr(store)
      const zip = await makeZip({ 'firmware-t-echo-2.8.0.7a414be.uf2': 'UF2!' })
      fetchMock.mockImplementation(async () => zipResponse(zip))

      await store.downloadUf2FileSystem(/firmware-t-echo-.+\.uf2/, 'nrf52840')

      expect(saveAs).toHaveBeenCalledTimes(1)
      expect(vi.mocked(saveAs).mock.calls[0]?.[1]).toBe('firmware-t-echo-2.8.0.7a414be.uf2')
    })
  })

  describe('release URL guards', () => {
    it('returns no release file URL for PR builds', async () => {
      const store = useFirmwareStore()
      await loadPr(store)
      expect(store.getReleaseFileUrl('firmware-rak11200-2.8.0.7a414be.bin')).toBe('')
    })

    it('still serves meshtastic.github.io URLs for regular releases', async () => {
      const store = useFirmwareStore()
      fetchMock.mockResolvedValue(new Response('', { status: 404 }))

      await store.setSelectedFirmware({ id: 'v2.7.15.567b8ea', title: 'Meshtastic Firmware 2.7.15.567b8ea Beta' })

      expect(store.getReleaseFileUrl('firmware-tbeam-2.7.15.567b8ea.bin'))
        .toBe('https://raw.githubusercontent.com/meshtastic/meshtastic.github.io/master/firmware-2.7.15.567b8ea/firmware-tbeam-2.7.15.567b8ea.bin')
      // The regular path still fetches release notes and manifest from github.io
      const urls = fetchMock.mock.calls.map(call => String(call[0]))
      expect(urls.some(url => url.includes('raw.githubusercontent.com'))).toBe(true)
    })
  })

  describe('isPrTargetAvailable', () => {
    it('accepts exact and variant-suffixed boards, rejects unbuilt ones', async () => {
      const store = useFirmwareStore()
      await loadPr(store)

      expect(store.isPrTargetAvailable('rak11200')).toBe(true)
      // Only the -tft variant env was built for t-deck
      expect(store.isPrTargetAvailable('t-deck')).toBe(true)
      expect(store.isPrTargetAvailable('tbeam')).toBe(false)
    })
  })
})
