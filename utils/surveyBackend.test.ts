import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'

/**
 * Exercises the survey's Apps Script backend without deploying it.
 *
 * appscript/survey/Code.gs is plain ES5-flavoured JavaScript whose only Google
 * dependencies in the validation path are PropertiesService, UrlFetchApp and
 * console — so it loads into Node with small stubs. That makes the server-side
 * allowlist, the layer that actually has to hold against a hostile payload,
 * testable in CI rather than only after a deploy.
 */

const appscriptDir = resolve(__dirname, '..', 'appscript', 'survey')
const source = ['Schema.gs', 'Code.gs']
  .map(file => readFileSync(resolve(appscriptDir, file), 'utf8'))
  .join('\n')

let turnstileSecret: string | null = 'test-secret'
let allowInsecureBypass = false
let turnstileSucceeds = true

function loadBackend() {
  const stubs = {
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key: string) => {
          if (key === 'TURNSTILE_SECRET') return turnstileSecret
          if (key === 'ALLOW_INSECURE_TURNSTILE_BYPASS') return allowInsecureBypass ? 'true' : null
          return 'sheet-id'
        },
      }),
    },
    UrlFetchApp: {
      fetch: () => ({ getContentText: () => JSON.stringify({ success: turnstileSucceeds }) }),
    },
    console: { warn() {}, error() {}, log() {} },
  }

  const factory = new Function(
    ...Object.keys(stubs),
    `${source}\n; return { validateSubmission, expectedHeaders, sanitizeCell, SCHEMA_VERSION, MIN_FILL_MS, QUESTIONS };`,
  )
  return factory(...Object.values(stubs))
}

let gs: ReturnType<typeof loadBackend>

beforeEach(() => {
  turnstileSecret = 'test-secret'
  allowInsecureBypass = false
  turnstileSucceeds = true
  gs = loadBackend()
})

/** A complete, valid event-firmware submission. */
function validPayload() {
  return {
    schemaVersion: gs.SCHEMA_VERSION,
    durationMs: 120000,
    turnstileToken: 'token',
    hp: '',
    answers: {
      q_attend: 'venue',
      q_powered: 'whole_event',
      q_cohort: 'event_fw',
      q_cohort_changed: 'no_change',
      q_fw_method: 'web_flasher',
      q_fw_first_try: 'yes_after_retries',
      q_fw_problems: ['driver_port'],
      q_fw_browser: 'chrome',
      q_fw_kept: 'still_on_it',
      q_devices: ['t-deck'],
      q_role: 'client',
      q_interaction: 'phone_app',
      q_clients: ['ios'],
      q_client_version: '2.5.1',
      q_overall: 3,
      q_issues: ['no_delivery', 'long_delays'],
      q_worst_issue: 'no_delivery',
      q_where_worst: ['halls'],
      q_dm: 'unreliable',
      q_channel_used: ['defconnect'],
      q_heard: ['defcon_site'],
      q_next_year: 'definitely',
      q_one_change: 'More repeaters in the contest area.',
      q_node_id: '!a1b2c3d4',
    } as Record<string, unknown>,
  }
}

function submit(mutate: (p: ReturnType<typeof validPayload>) => void = () => {}) {
  const payload = validPayload()
  mutate(payload)
  return gs.validateSubmission(payload)
}

describe('survey backend — happy path', () => {
  it('accepts a valid submission', () => {
    expect(submit().ok).toBe(true)
  })

  it('accepts free text at exactly the limit', () => {
    expect(submit((p) => {
      p.answers.q_one_change = 'x'.repeat(300)
    }).ok).toBe(true)
  })
})

describe('survey backend — anti-spam', () => {
  it('rejects a filled honeypot', () => {
    expect(submit((p) => {
      p.hp = 'http://spam.example'
    }).ok).toBe(false)
  })

  it('rejects an impossibly fast fill', () => {
    expect(submit((p) => {
      p.durationMs = gs.MIN_FILL_MS - 1
    }).ok).toBe(false)
  })

  it.each([[-5], ['120000'], [Number.NaN]])('rejects a bad duration (%s)', (duration) => {
    expect(submit((p) => {
      p.durationMs = duration as number
    }).ok).toBe(false)
  })

  it('distinguishes a missing token from a rejected one', () => {
    // These have entirely different causes — a broken widget versus an expired
    // token — so they must not surface as the same message.
    const missing = submit((p) => {
      p.turnstileToken = ''
    })
    expect(missing.ok).toBe(false)
    expect(missing.message).toContain('did not complete')

    turnstileSucceeds = false
    gs = loadBackend()
    const rejected = submit()
    expect(rejected.ok).toBe(false)
    expect(rejected.message).toContain('rejected')
    expect(rejected.message).not.toContain('did not complete')
  })

  it('rejects a token Cloudflare refuses', () => {
    turnstileSucceeds = false
    gs = loadBackend()
    expect(submit().ok).toBe(false)
  })

  it('fails closed when no secret is configured', () => {
    // A missing secret in production is a config error. Accepting everything
    // would admit bots while the rows looked indistinguishable from real ones.
    turnstileSecret = null
    gs = loadBackend()
    const result = submit()
    expect(result.ok).toBe(false)
  })

  it('bypasses the bot check only on explicit opt-in, and records that it did', () => {
    turnstileSecret = null
    allowInsecureBypass = true
    gs = loadBackend()
    const result = submit()
    expect(result.ok).toBe(true)
    expect(result.botCheck.mode).toBe('skipped')
  })
})

describe('survey backend — spreadsheet formula injection', () => {
  it.each([['=1+1'], ['+1'], ['-1'], ['@SUM(A1)'], ['\tx'], ['\rx']])(
    'escapes a cell beginning with %j so Sheets stores it as text',
    (value) => {
      expect(gs.sanitizeCell(value)).toBe(`'${value}`)
    },
  )

  it('leaves ordinary answers untouched', () => {
    for (const value of ['More repeaters please', 't-deck', '!a1b2c3d4', '']) {
      expect(gs.sanitizeCell(value)).toBe(value)
    }
  })

  it('passes non-strings through unchanged', () => {
    expect(gs.sanitizeCell(3)).toBe(3)
    expect(gs.sanitizeCell(true)).toBe(true)
  })
})

describe('survey backend — answer validation', () => {
  it('rejects a schema version mismatch', () => {
    expect(submit((p) => {
      p.schemaVersion = 999
    }).ok).toBe(false)
  })

  it('rejects an unknown question id', () => {
    expect(submit((p) => {
      p.answers.q_not_real = 'x'
    }).ok).toBe(false)
  })

  it('rejects an invalid option code', () => {
    expect(submit((p) => {
      p.answers.q_cohort = 'nonsense'
    }).ok).toBe(false)
  })

  it('rejects over-length free text', () => {
    expect(submit((p) => {
      p.answers.q_one_change = 'x'.repeat(301)
    }).ok).toBe(false)
  })

  it.each([[9], [3.5]])('rejects an out-of-range scale value (%s)', (value) => {
    expect(submit((p) => {
      p.answers.q_overall = value
    }).ok).toBe(false)
  })

  it('rejects duplicate multi selections', () => {
    expect(submit((p) => {
      p.answers.q_devices = ['t-deck', 't-deck']
    }).ok).toBe(false)
  })

  it('rejects an exclusive option combined with others', () => {
    expect(submit((p) => {
      p.answers.q_issues = ['none', 'no_delivery']
    }).ok).toBe(false)
  })

  it('rejects a string where a list is expected', () => {
    expect(submit((p) => {
      p.answers.q_devices = 't-deck'
    }).ok).toBe(false)
  })

  it('rejects a missing required answer', () => {
    expect(submit((p) => {
      delete p.answers.q_cohort
    }).ok).toBe(false)
  })
})

describe('survey backend — tamper resistance', () => {
  it('rejects answers from a branch the respondent never saw', () => {
    const result = submit((p) => {
      p.answers.q_cohort = 'default_longfast'
      p.answers.q_default_aware = 'knew_before'
      // q_fw_* belong to the event-firmware branch and are now hidden.
    })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('not shown')
  })

  it('rejects a piped answer not selected in its source', () => {
    expect(submit((p) => {
      p.answers.q_worst_issue = 'battery'
    }).ok).toBe(false)
  })

  it('rejects a piped answer when the source reports no issues', () => {
    expect(submit((p) => {
      p.answers.q_issues = ['none']
    }).ok).toBe(false)
  })

  it('rejects a submission carrying a terminal answer', () => {
    // Screened-out respondents land on a thank-you screen with no submit
    // button, so such a payload cannot have come from the real flow.
    expect(submit((p) => {
      p.answers.q_attend = 'no'
    }).ok).toBe(false)
  })

  it('rejects a minimal screened-out submission', () => {
    const result = gs.validateSubmission({
      schemaVersion: gs.SCHEMA_VERSION,
      durationMs: 120000,
      turnstileToken: 'token',
      hp: '',
      answers: { q_attend: 'no', q_powered: 'never' },
    })
    expect(result.ok).toBe(false)
  })
})

describe('survey backend — sheet layout', () => {
  it('leads with the system columns', () => {
    const headers = gs.expectedHeaders()
    expect(headers.slice(0, 5)).toEqual([
      'submission_id', 'submitted_at', 'schema_version', 'duration_ms', 'bot_check',
    ])
  })

  it('has no duplicate columns', () => {
    const headers = gs.expectedHeaders()
    expect(new Set(headers).size).toBe(headers.length)
  })

  it('gives every question a column and every multi option a one-hot column', () => {
    const headers: string[] = gs.expectedHeaders()
    for (const q of gs.QUESTIONS) {
      expect(headers, q.id).toContain(q.id)
      if (q.type !== 'multi') continue
      for (const option of q.options ?? []) {
        expect(headers, `${q.id}__${option.code}`).toContain(`${q.id}__${option.code}`)
      }
    }
  })
})
