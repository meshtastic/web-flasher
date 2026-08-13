import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { eventMode, setActiveEventMode } from '~/types/resources'
import { setGlobalI18n } from '~/utils/i18n'
import { useFirmwareStore } from './firmwareStore'

// The store module reads window.location at import time (createUrl).
// vi.hoisted runs before the imports above are evaluated.
vi.hoisted(() => {
  (globalThis as any).window = { location: { host: 'localhost:3000', protocol: 'https:' } }
})

const EVENT_VERSION = '2.8.0.c800fc8'
const EVENT_BASE = `https://raw.githubusercontent.com/meshtastic/meshtastic.github.io/master/event/defcon34/firmware-${EVENT_VERSION}`

const RELEASE_MANIFEST = {
  version: EVENT_VERSION,
  targets: [
    { board: 'tlora-t3s3-epaper', platform: 'esp32s3' },
  ],
}

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

/** Snapshot of the module-level eventMode singleton, restored after each test. */
const defaultEventMode = { ...eventMode }

function enableDefconEventMode() {
  setActiveEventMode({
    enabled: true,
    eventName: 'DEF CON 34',
    eventTag: 'DEFCON',
    slug: 'defcon',
    pathPrefix: 'defcon34',
    domain: 'defcon.meshtastic.org',
    firmware: {
      id: `v${EVENT_VERSION}`,
      title: `Meshtastic Firmware ${EVENT_VERSION}`,
      release_notes: 'Welcome to DEF CON',
    },
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  setGlobalI18n({ t: (key: string) => key })
  fetchMock.mockReset()
})

afterEach(() => {
  setActiveEventMode(defaultEventMode as any)
})

describe('firmwareStore event mode', () => {
  it('resolves the locked firmware so the release manifest loads', async () => {
    enableDefconEventMode()
    fetchMock.mockResolvedValueOnce(jsonResponse(RELEASE_MANIFEST))

    const store = useFirmwareStore()
    await store.fetchList()

    // Only the release manifest — the firmware list API is never called in event mode
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(`${EVENT_BASE}/firmware-${EVENT_VERSION}.json`)
    expect(store.releaseManifest).toEqual(RELEASE_MANIFEST)
    expect(store.selectedFirmware?.id).toBe(`v${EVENT_VERSION}`)
  })

  it('does not re-resolve the locked firmware once the manifest is loaded', async () => {
    enableDefconEventMode()
    fetchMock.mockResolvedValueOnce(jsonResponse(RELEASE_MANIFEST))

    const store = useFirmwareStore()
    await store.fetchList()
    await store.fetchList()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('leaves the release manifest alone when the event build has not shipped yet', async () => {
    setActiveEventMode({
      enabled: true,
      eventName: 'DEF CON 34',
      eventTag: 'DEFCON',
      slug: 'defcon',
      pathPrefix: '',
      domain: 'defcon.meshtastic.org',
      firmware: { id: '', title: 'DEF CON 34' },
    })

    const store = useFirmwareStore()
    await store.fetchList()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(store.releaseManifest).toBeUndefined()
  })
})

describe('firmwareStore file getters', () => {
  it('are false rather than throwing before a file is picked', () => {
    const store = useFirmwareStore()

    expect(store.selectedFile).toBeUndefined()
    expect(store.hasFirmwareFile).toBe(false)
    expect(store.isZipFile).toBe(false)
    expect(store.isFactoryBin).toBe(false)
  })

  it('classifies a picked file by name', async () => {
    const store = useFirmwareStore()

    await store.setFirmwareFile(new File([''], 'firmware-2.8.0.zip'))
    expect(store.isZipFile).toBe(true)
    expect(store.isFactoryBin).toBe(false)

    await store.setFirmwareFile(new File([''], 'firmware-tlora-t3s3-epaper-2.8.0.factory.bin'))
    expect(store.isZipFile).toBe(false)
    expect(store.isFactoryBin).toBe(true)
  })
})

describe('fetchBinaryContent', () => {
  it('throws instead of flashing the body of a failed download', async () => {
    const store = useFirmwareStore()
    store.selectedFirmware = { id: `v${EVENT_VERSION}`, title: 'test' }
    enableDefconEventMode()
    fetchMock.mockResolvedValueOnce(new Response('404: Not Found', { status: 404 }))

    await expect(store.fetchBinaryContent('bleota-s3.bin')).rejects.toThrow(/HTTP 404/)
  })
})
