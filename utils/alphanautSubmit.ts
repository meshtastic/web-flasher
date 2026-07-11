// Pure submit service for the alphanaut feedback tool. No Vue/Pinia deps so it
// is trivially unit-testable. See stores/alphanautStore.ts for orchestration.

import type {
  AlphanautPayload,
  AlphanautReportForm,
  AlphanautSnapshot,
} from '~/types/alphanaut'

/**
 * Firmware version prefix that reveals the tool. Bump to '2.9' next cycle.
 * The alphanaut group only tests the current pre-release line.
 */
export const ALPHANAUT_VERSION_PREFIX = '2.8'

export const ALPHANAUT_SCHEMA_VERSION = 1

/**
 * Client-side cap for log fields. A single Google Sheet cell tops out at ~50k
 * chars; cap below that so a long serial capture or pasted log isn't truncated
 * server-side without the tester knowing. Keeps the tail (most recent output).
 */
export const MAX_LOG_CHARS = 45000

/** Request timeout — an abort is treated as a transient failure (safe: retries are idempotent). */
const REQUEST_TIMEOUT_MS = 15000

/** Keep only the last MAX_LOG_CHARS of a log so it fits in one Sheet cell. */
function capLog(value: string): string {
  return value.length > MAX_LOG_CHARS ? value.slice(-MAX_LOG_CHARS) : value
}

/** True when a selected firmware version belongs to the alphanaut test line. */
export function isAlphanautVersion(version?: string | null): boolean {
  return typeof version === 'string' && version.startsWith(ALPHANAUT_VERSION_PREFIX)
}

/** Trim a string and collapse empty to null (keeps the Sheet tidy). */
function nullIfBlank(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

interface BuildPayloadArgs {
  snapshot: AlphanautSnapshot
  form: AlphanautReportForm
  serialLog: string
  submissionId: string
  submittedAt: string
  token?: string
}

/** Assemble the wire payload. Pure: same inputs → same output. */
export function buildPayload(args: BuildPayloadArgs): AlphanautPayload {
  const { snapshot, form, serialLog, submissionId, submittedAt, token } = args
  return {
    schemaVersion: ALPHANAUT_SCHEMA_VERSION,
    submissionId,
    submittedAt,
    ...(token ? { token } : {}),
    firmware: snapshot.firmware,
    device: snapshot.device,
    report: {
      handle: form.handle.trim(),
      contact: nullIfBlank(form.contact),
      // Submission is gated on a chosen outcome (see canSubmit), so '' never ships.
      outcome: form.outcome as Exclude<typeof form.outcome, ''>,
      whatHappened: form.whatHappened.trim(),
      expectedBehavior: form.expectedBehavior.trim(),
      reproSteps: nullIfBlank(form.reproSteps),
      appPlatform: form.appPlatform,
      appVersion: nullIfBlank(form.appVersion),
      otherInfo: nullIfBlank(form.otherInfo),
    },
    logs: {
      serialLog: nullIfBlank(capLog(serialLog)),
      appLogs: nullIfBlank(capLog(form.appLogs)),
    },
  }
}

export interface PostResult {
  ok: boolean
  deduped?: boolean
  error?: string
  /**
   * transient = worth retrying later (network down, timeout, 5xx).
   * !transient = the server rejected the request (validation) — retrying won't help.
   */
  transient: boolean
}

/**
 * POST a report to the Google Apps Script web app.
 *
 * Uses Content-Type: text/plain so the request stays a CORS "simple request"
 * (no preflight — Apps Script has no doOptions). fetch follows the 302 to
 * script.googleusercontent.com and Google adds Access-Control-Allow-Origin: *
 * to that final response, so we can read the { ok } JSON back. Never throws.
 */
export async function postReport(url: string, payload: AlphanautPayload): Promise<PostResult> {
  if (!url) return { ok: false, error: 'no-endpoint', transient: false }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    // Non-2xx is almost always infra (rate limit, transient Google error) — retry.
    if (!res.ok) return { ok: false, error: `http-${res.status}`, transient: true }

    let body: { ok?: boolean, deduped?: boolean, error?: string } | null = null
    try {
      body = await res.json()
    }
    catch {
      // Readable response expected; an unreadable body means we can't confirm — retry.
      return { ok: false, error: 'unreadable-response', transient: true }
    }

    if (body?.ok === true) return { ok: true, deduped: !!body.deduped }

    // Server was reached and explicitly rejected the payload — permanent.
    return { ok: false, error: String(body?.error ?? 'rejected'), transient: false }
  }
  catch (e: unknown) {
    const name = (e as Error)?.name
    const error = name === 'TimeoutError' ? 'timeout' : ((e as Error)?.message ?? 'network-error')
    return { ok: false, error, transient: true }
  }
}
