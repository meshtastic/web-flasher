import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { FirmwareResource } from '~/types/api'
import { setGlobalI18n } from '~/utils/i18n'
import { useFirmwareStore } from './firmwareStore'

// The store module reads window.location at import time (createUrl).
// vi.hoisted runs before the imports above are evaluated.
vi.hoisted(() => {
  (globalThis as any).window = { location: { host: 'localhost:3000', protocol: 'https:' } }
})

const VERSION = '2.8.1.8e6a88d'

// A slice of the real v2.8.1 board list: a board with both builds, one with
// only -tft, one with only the plain env, and an env that is itself -tft.
const RELEASE_MANIFEST = {
  version: VERSION,
  targets: [
    { board: 't-deck', platform: 'esp32s3' },
    { board: 't-deck-tft', platform: 'esp32s3' },
    { board: 'seeed_wio_tracker_L2-tft', platform: 'esp32s3' },
    { board: 'unphone', platform: 'esp32s3' },
    { board: 'elecrow-adv-35-tft', platform: 'esp32s3' },
  ],
}

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

/** Release notes are pre-filled so the only fetch is the release manifest. */
const firmware = (): FirmwareResource => ({
  id: `v${VERSION}`,
  title: `Meshtastic Firmware ${VERSION}`,
  release_notes: 'notes',
} as FirmwareResource)

beforeEach(() => {
  setActivePinia(createPinia())
  setGlobalI18n({ t: (key: string) => key })
  fetchMock.mockReset()
})

describe('firmwareStore release variants', () => {
  it('reads variants off the release manifest with no extra requests', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(RELEASE_MANIFEST))
    const store = useFirmwareStore()
    await store.setSelectedFirmware(firmware())

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(store.targetVariants('t-deck')).toMatchObject({ stock: true, mui: true, unknown: false })
    expect(store.targetVariants('seeed_wio_tracker_L2')).toMatchObject({ stock: false, mui: true, unknown: false })
    expect(store.targetVariants('unphone')).toMatchObject({ stock: true, mui: false, unknown: false })
    expect(store.targetVariants('elecrow-adv-35-tft')).toMatchObject({ stock: false, mui: true, unknown: false })
    expect(store.targetVariants('tbeam')).toMatchObject({ stock: false, mui: false, unknown: false })
  })

  it('reports unknown until the manifest resolves', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(RELEASE_MANIFEST))
    const store = useFirmwareStore()

    // setSelectedFirmware assigns selectedFirmware before awaiting the manifest,
    // so anything gating on availability must tolerate this window and then
    // re-resolve - which is why the Flash gate is a computed.
    const pending = store.setSelectedFirmware(firmware())
    expect(store.hasOnlineFirmware).toBe(true)
    expect(store.releaseBoards).toBeUndefined()
    expect(store.targetVariants('t-deck').unknown).toBe(true)
    // An absent board list and one that has not arrived yet look identical, so
    // callers that would otherwise probe for files need them told apart.
    expect(store.releaseManifestPending).toBe(true)

    await pending
    expect(store.targetVariants('t-deck').unknown).toBe(false)
    expect(store.releaseManifestPending).toBe(false)
  })

  it('stops pending once a missing board list comes back 404', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 404 }))
    const store = useFirmwareStore()
    const pending = store.setSelectedFirmware(firmware())

    expect(store.releaseManifestPending).toBe(true)
    await pending
    // v2.7.15: genuinely no board list, so the legacy probe may now run.
    expect(store.releaseManifestPending).toBe(false)
    expect(store.targetVariants('unphone').unknown).toBe(true)
  })

  it('never reports a PR build as pending', async () => {
    const store = useFirmwareStore()
    await store.setSelectedFirmware({
      ...firmware(),
      prBuild: { version: VERSION, targets: [{ board: 't-deck-tft', platform: 'esp32s3' }] },
    } as FirmwareResource)

    // hasOnlineFirmware is true here, so this exercises releaseManifestResolved
    // rather than passing because no firmware is selected.
    expect(store.hasOnlineFirmware).toBe(true)
    expect(store.releaseManifestResolved).toBe(true)
    expect(store.releaseManifestPending).toBe(false)
  })

  it('falls back to probed boards when there is no manifest', async () => {
    // v2.7.15: Flash.vue probes the names the board could use and records the
    // ones that exist, so the chooser and the filename logic get real data.
    fetchMock.mockResolvedValue(new Response('', { status: 404 }))
    const store = useFirmwareStore()
    await store.setSelectedFirmware(firmware())
    expect(store.targetVariants('unphone').unknown).toBe(true)

    store.$state.probedBoards = new Set(['unphone'])
    expect(store.targetVariants('unphone')).toMatchObject({ stock: true, mui: false, unknown: false })
    expect(store.isTargetAvailable('unphone')).toBe(true)
  })

  it('reports unknown for a release that publishes no board list', async () => {
    // v2.7.15 and older: firmware-<version>.json does not exist.
    fetchMock.mockResolvedValue(new Response('', { status: 404 }))
    const store = useFirmwareStore()
    await store.setSelectedFirmware(firmware())

    expect(store.releaseBoards).toBeUndefined()
    expect(store.targetVariants('unphone').unknown).toBe(true)
    expect(store.isTargetAvailable('unphone')).toBe(false)
  })

  it('answers from the manifest synthesized for a PR build', async () => {
    const store = useFirmwareStore()
    // Go through setSelectedFirmware so the PR path synthesizes the manifest
    // itself; assigning releaseManifest directly would leave selectedFirmware
    // unset and prove nothing about how a PR build resolves.
    await store.setSelectedFirmware({
      ...firmware(),
      prBuild: { version: VERSION, targets: [{ board: 't-deck-tft', platform: 'esp32s3' }] },
    } as FirmwareResource)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(store.isPrBuild).toBe(true)
    expect(store.targetVariants('t-deck')).toMatchObject({ stock: false, mui: true, unknown: false })
    expect(store.isTargetAvailable('t-deck-tft')).toBe(true)
    expect(store.isTargetAvailable('t-deck')).toBe(false)
  })

  it('keeps isPrTargetAvailable scoped to PR builds', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(RELEASE_MANIFEST))
    const store = useFirmwareStore()
    await store.setSelectedFirmware(firmware())

    // The release manifest is populated, but this firmware is not a PR build.
    expect(store.targetVariants('t-deck').mui).toBe(true)
    expect(store.isPrTargetAvailable('t-deck')).toBe(false)
  })
})
