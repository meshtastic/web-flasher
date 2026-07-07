import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Mock } from 'vitest'
import type { AlphanautPayload, AlphanautReportForm } from '~/types/alphanaut'
import { postReport } from '~/utils/alphanautSubmit'
import { useAlphanautStore } from './alphanautStore'

// Controllable fakes for the stores the alphanaut store reads. Mocking these
// avoids importing the heavy real device/firmware stores (which pull in
// @meshtastic/core and Web Serial transports at module scope). vi.hoisted lets
// the (hoisted) vi.mock factories reference them while keeping imports on top.
const { fakeFirmware, fakeDevice } = vi.hoisted(() => ({
  fakeFirmware: { selectedFirmware: {} as Record<string, unknown> },
  fakeDevice: { selectedTarget: undefined as Record<string, unknown> | undefined },
}))

vi.mock('./firmwareStore', () => ({ useFirmwareStore: () => fakeFirmware }))
vi.mock('./deviceStore', () => ({ useDeviceStore: () => fakeDevice }))

// Keep buildPayload/isAlphanautVersion real; stub only the network call.
vi.mock('~/utils/alphanautSubmit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/alphanautSubmit')>()
  return { ...actual, postReport: vi.fn() }
})

const postReportMock = postReport as unknown as Mock

function makeForm(overrides: Partial<AlphanautReportForm> = {}): AlphanautReportForm {
  return {
    handle: 'KJ7XYZ',
    contact: '',
    rating: 4,
    whatHappened: 'bug',
    expectedBehavior: 'no bug',
    reproSteps: '',
    appPlatform: 'Android',
    appVersion: '',
    otherInfo: '',
    attachSerialLog: false,
    appLogs: '',
    ...overrides,
  }
}

function payloadStub(id: string): AlphanautPayload {
  return { submissionId: id } as AlphanautPayload
}

beforeEach(() => {
  setActivePinia(createPinia())
  fakeFirmware.selectedFirmware = {}
  fakeDevice.selectedTarget = undefined
  postReportMock.mockReset()
})

describe('visibility gate', () => {
  it('is visible only when enabled + unlocked + a 2.8 firmware is selected', () => {
    const store = useAlphanautStore()
    fakeFirmware.selectedFirmware = { id: 'v2.8.0.abc' }
    store.configure('https://x/exec', '')
    store.unlock()

    expect(store.currentVersion).toBe('2.8.0.abc')
    expect(store.isTargetVersion).toBe(true)
    expect(store.isVisible).toBe(true)
  })

  it('hides for a non-2.8 firmware', () => {
    const store = useAlphanautStore()
    fakeFirmware.selectedFirmware = { id: 'v2.7.9.abc' }
    store.configure('https://x/exec', '')
    store.unlock()
    expect(store.isTargetVersion).toBe(false)
    expect(store.isVisible).toBe(false)
  })

  it('hides when the endpoint is empty (kill switch)', () => {
    const store = useAlphanautStore()
    fakeFirmware.selectedFirmware = { id: 'v2.8.0.abc' }
    store.configure('', '')
    store.unlock()
    expect(store.enabled).toBe(false)
    expect(store.isVisible).toBe(false)
  })

  it('hides while locked', () => {
    const store = useAlphanautStore()
    fakeFirmware.selectedFirmware = { id: 'v2.8.0.abc' }
    store.configure('https://x/exec', '')
    expect(store.unlocked).toBe(false)
    expect(store.isVisible).toBe(false)
  })

  it('matches 2.8 PR builds via prBuild.version', () => {
    const store = useAlphanautStore()
    fakeFirmware.selectedFirmware = { id: '', prBuild: { version: '2.8.0', prNumber: 42 } }
    store.configure('https://x/exec', '')
    store.unlock()
    expect(store.currentVersion).toBe('2.8.0')
    expect(store.isTargetVersion).toBe(true)
  })
})

describe('captureContext', () => {
  it('returns null firmware/device when nothing is selected', () => {
    const store = useAlphanautStore()
    const snap = store.captureContext()
    expect(snap.firmware).toBeNull()
    expect(snap.device).toBeNull()
  })

  it('captures firmware (with hash/PR) and hardware when selected', () => {
    const store = useAlphanautStore()
    fakeFirmware.selectedFirmware = { id: 'v2.8.0.abc', prBuild: { prNumber: 7, version: '2.8.0' } }
    fakeDevice.selectedTarget = { platformioTarget: 'heltec-v4', displayName: 'Heltec V4' }
    const snap = store.captureContext()
    expect(snap.firmware).toEqual({ id: 'v2.8.0.abc', version: '2.8.0.abc', isPrBuild: true, prNumber: 7 })
    expect(snap.device).toEqual({ platformioTarget: 'heltec-v4', displayName: 'Heltec V4' })
  })
})

describe('submit', () => {
  it('returns "sent" and leaves the queue empty on success', async () => {
    const store = useAlphanautStore()
    fakeDevice.selectedTarget = { platformioTarget: 'heltec-v4', displayName: 'Heltec V4' }
    store.configure('https://x/exec', 'tok')
    store.captureContext()
    postReportMock.mockResolvedValue({ ok: true })

    const outcome = await store.submit(makeForm(), '')
    expect(outcome.status).toBe('sent')
    expect(store.pendingCount).toBe(0)

    const sentPayload = postReportMock.mock.calls[0][1] as AlphanautPayload
    expect(sentPayload.device?.platformioTarget).toBe('heltec-v4')
    expect(sentPayload.token).toBe('tok')
    expect(sentPayload.submissionId).toBeTruthy()
  })

  it('queues on a transient failure', async () => {
    const store = useAlphanautStore()
    store.configure('https://x/exec', '')
    postReportMock.mockResolvedValue({ ok: false, transient: true, error: 'network-error' })

    const outcome = await store.submit(makeForm(), '')
    expect(outcome.status).toBe('queued')
    expect(store.pendingCount).toBe(1)
    expect(store.queue[0].payload.submissionId).toBeTruthy()
  })

  it('does not queue a permanent rejection', async () => {
    const store = useAlphanautStore()
    store.configure('https://x/exec', '')
    postReportMock.mockResolvedValue({ ok: false, transient: false, error: 'unsupported-schema' })

    const outcome = await store.submit(makeForm(), '')
    expect(outcome).toEqual({ status: 'rejected', error: 'unsupported-schema' })
    expect(store.pendingCount).toBe(0)
  })
})

describe('flushQueue', () => {
  it('drains all queued reports when the network recovers', async () => {
    const store = useAlphanautStore()
    store.configure('https://x/exec', '')
    store.enqueue(payloadStub('a'))
    store.enqueue(payloadStub('b'))
    postReportMock.mockResolvedValue({ ok: true })

    const res = await store.flushQueue()
    expect(res).toEqual({ sent: 2, failed: 0 })
    expect(store.pendingCount).toBe(0)
  })

  it('stops on the first transient failure and keeps the rest', async () => {
    const store = useAlphanautStore()
    store.configure('https://x/exec', '')
    store.enqueue(payloadStub('a'))
    store.enqueue(payloadStub('b'))
    postReportMock
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, transient: true, error: 'network-error' })

    const res = await store.flushQueue()
    expect(res).toEqual({ sent: 1, failed: 1 })
    expect(store.pendingCount).toBe(1)
    expect(store.queue[0].id).toBe('b')
    expect(store.queue[0].attempts).toBe(2)
  })

  it('drops a permanently-rejected queued report', async () => {
    const store = useAlphanautStore()
    store.configure('https://x/exec', '')
    store.enqueue(payloadStub('a'))
    postReportMock.mockResolvedValue({ ok: false, transient: false, error: 'unsupported-schema' })

    const res = await store.flushQueue()
    expect(res).toEqual({ sent: 0, failed: 0 })
    expect(store.pendingCount).toBe(0)
  })

  it('is a no-op when the queue is empty', async () => {
    const store = useAlphanautStore()
    store.configure('https://x/exec', '')
    const res = await store.flushQueue()
    expect(res).toEqual({ sent: 0, failed: 0 })
    expect(postReportMock).not.toHaveBeenCalled()
  })
})
