import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AlphanautReportForm, AlphanautSnapshot } from '~/types/alphanaut'
import { buildPayload, isAlphanautVersion, postReport } from './alphanautSubmit'

const snapshot: AlphanautSnapshot = {
  firmware: { id: 'v2.8.0.b246bcd', version: '2.8.0.b246bcd', isPrBuild: false, prNumber: null },
  device: { platformioTarget: 'heltec-v4', displayName: 'Heltec V4' },
}

function makeForm(overrides: Partial<AlphanautReportForm> = {}): AlphanautReportForm {
  return {
    handle: 'KJ7XYZ',
    contact: '',
    rating: 4,
    whatHappened: 'Screen blank after flash',
    expectedBehavior: 'Display lights up',
    reproSteps: '',
    appPlatform: 'Android',
    appVersion: '',
    otherInfo: '  ',
    attachSerialLog: false,
    appLogs: '',
    ...overrides,
  }
}

describe('isAlphanautVersion', () => {
  it.each([
    ['2.8.0.b246bcd', true],
    ['2.8.0', true],
    ['2.7.23.abc', false],
    ['2.9.0', false],
    ['', false],
  ])('%s -> %s', (version, expected) => {
    expect(isAlphanautVersion(version)).toBe(expected)
  })

  it('handles null/undefined without throwing', () => {
    expect(isAlphanautVersion(undefined)).toBe(false)
    expect(isAlphanautVersion(null)).toBe(false)
  })
})

describe('buildPayload', () => {
  it('shapes the payload and blanks empty optional fields to null', () => {
    const payload = buildPayload({
      snapshot,
      form: makeForm({ contact: '  ', reproSteps: '', appVersion: '2.5.13' }),
      serialLog: '',
      submissionId: 'id-1',
      submittedAt: '2026-07-07T00:00:00.000Z',
      token: 'secret',
    })

    expect(payload.schemaVersion).toBe(1)
    expect(payload.submissionId).toBe('id-1')
    expect(payload.token).toBe('secret')
    expect(payload.firmware?.version).toBe('2.8.0.b246bcd')
    expect(payload.device?.platformioTarget).toBe('heltec-v4')
    expect(payload.report.handle).toBe('KJ7XYZ')
    expect(payload.report.contact).toBeNull()
    expect(payload.report.reproSteps).toBeNull()
    expect(payload.report.otherInfo).toBeNull() // whitespace-only -> null
    expect(payload.report.appVersion).toBe('2.5.13')
    expect(payload.logs.serialLog).toBeNull()
  })

  it('omits the token key when no token is provided', () => {
    const payload = buildPayload({
      snapshot,
      form: makeForm(),
      serialLog: 'INFO boot',
      submissionId: 'id-2',
      submittedAt: '2026-07-07T00:00:00.000Z',
    })
    expect('token' in payload).toBe(false)
    expect(payload.logs.serialLog).toBe('INFO boot')
  })
})

describe('postReport', () => {
  afterEach(() => vi.unstubAllGlobals())

  const payload = buildPayload({
    snapshot,
    form: makeForm(),
    serialLog: '',
    submissionId: 'id-3',
    submittedAt: '2026-07-07T00:00:00.000Z',
  })

  it('returns no-endpoint (permanent) for an empty url', async () => {
    const res = await postReport('', payload)
    expect(res).toEqual({ ok: false, error: 'no-endpoint', transient: false })
  })

  it('POSTs text/plain and reports success on { ok: true }', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, row: 5 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await postReport('https://script.google/exec', payload)
    expect(res.ok).toBe(true)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://script.google/exec')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('text/plain;charset=utf-8')
    expect(JSON.parse(init.body).submissionId).toBe('id-3')
  })

  it('treats { ok: false } as a permanent rejection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, error: 'unsupported-schema' }),
    }))
    const res = await postReport('https://x/exec', payload)
    expect(res).toMatchObject({ ok: false, error: 'unsupported-schema', transient: false })
  })

  it('treats a network error as transient', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')))
    const res = await postReport('https://x/exec', payload)
    expect(res.ok).toBe(false)
    expect(res.transient).toBe(true)
  })

  it('treats a timeout/abort as transient', async () => {
    const err = new Error('aborted')
    err.name = 'TimeoutError'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err))
    const res = await postReport('https://x/exec', payload)
    expect(res).toMatchObject({ ok: false, error: 'timeout', transient: true })
  })

  it('treats a non-2xx as transient', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }))
    const res = await postReport('https://x/exec', payload)
    expect(res).toMatchObject({ ok: false, error: 'http-503', transient: true })
  })
})
