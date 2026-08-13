import type { Answers } from '../components/survey/schema'

export interface SurveySubmission {
  schemaVersion: number
  answers: Answers
  /** Time from first paint of the survey to pressing submit. */
  durationMs: number
  /** Cloudflare Turnstile token, verified server-side. */
  turnstileToken: string
  /**
   * Honeypot. Rendered off-screen and never labelled, so a human never fills
   * it. Any non-empty value means the submission is discarded server-side.
   */
  hp: string
}

export type SubmitResult
  = | { ok: true }
    | { ok: false, error: string, retryable: boolean }

/**
 * POST a completed survey to the Apps Script web app.
 *
 * The Content-Type is deliberately `text/plain`. Apps Script serves no CORS
 * headers on the initial response and 302-redirects to googleusercontent.com,
 * so any request that triggers a preflight (which `application/json` would)
 * fails outright from a browser. `text/plain` is CORS-safelisted, skips the
 * preflight, and the followed redirect does return `Access-Control-Allow-Origin`,
 * which is what lets us read the result rather than firing blind with no-cors.
 *
 * The body is still JSON; only the declared media type differs.
 */
export async function submitSurvey(
  endpoint: string,
  submission: SurveySubmission,
): Promise<SubmitResult> {
  if (!endpoint) {
    return {
      ok: false,
      error: 'The survey endpoint is not configured. Set SURVEY_ENDPOINT and redeploy.',
      retryable: false,
    }
  }

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(submission),
      redirect: 'follow',
    })
  }
  catch {
    return {
      ok: false,
      error: 'We could not reach the server. Check your connection and try again.',
      retryable: true,
    }
  }

  if (!response.ok) {
    return {
      ok: false,
      error: `The server rejected the submission (HTTP ${response.status}).`,
      retryable: response.status >= 500,
    }
  }

  // Apps Script always returns 200, including for validation failures, so the
  // body is the real status signal.
  let body: { status?: string, message?: string }
  try {
    body = JSON.parse(await response.text())
  }
  catch {
    return {
      ok: false,
      error: 'The server sent back a response we could not read.',
      retryable: true,
    }
  }

  if (body.status !== 'ok') {
    return {
      ok: false,
      error: body.message || 'The server rejected the submission.',
      retryable: false,
    }
  }

  return { ok: true }
}
