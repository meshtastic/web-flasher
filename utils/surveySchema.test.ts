import { describe, expect, it } from 'vitest'

import { DEVICE_OPTIONS } from '~/components/survey/devices.generated'
import {
  type Answers,
  type Rule,
  QUESTIONS,
  QUESTIONS_BY_ID,
  SECTIONS,
  SECTIONS_BY_ID,
  terminalFor,
  visibleQuestions,
} from '~/components/survey/schema'

/**
 * Integrity checks for the DEF CON survey schema.
 *
 * These catch the failures that are invisible until a real respondent hits
 * them: a branch rule pointing at a renamed question, an option code that no
 * longer exists, or a branch that has quietly grown past its intended length.
 */

describe('survey schema structure', () => {
  it('has unique question ids', () => {
    const ids = QUESTIONS.map(q => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('places every question in a declared section', () => {
    for (const q of QUESTIONS) {
      expect(SECTIONS_BY_ID[q.section], `${q.id} -> ${q.section}`).toBeDefined()
    }
  })

  it('has unique option codes within each question', () => {
    for (const q of QUESTIONS) {
      const codes = (q.options ?? []).map(o => o.code)
      expect(new Set(codes).size, q.id).toBe(codes.length)
    }
  })

  it('only marks options exclusive on multi questions', () => {
    for (const q of QUESTIONS) {
      for (const option of q.options ?? []) {
        if (option.exclusive) expect(q.type, `${q.id}.${option.code}`).toBe('multi')
      }
    }
  })

  it('gives every choice question options or a pipe source', () => {
    for (const q of QUESTIONS.filter(q => q.type === 'single' || q.type === 'multi')) {
      expect(Boolean(q.options?.length || q.pipeFrom), q.id).toBe(true)
    }
  })

  it('gives every scale a spec and every free-text a maxLength', () => {
    for (const q of QUESTIONS) {
      if (q.type === 'scale') expect(q.scale, q.id).toBeDefined()
      if (q.type === 'text' || q.type === 'textarea') expect(q.maxLength, q.id).toBeGreaterThan(0)
    }
  })

  it('pipes only from multi questions that exist', () => {
    for (const q of QUESTIONS.filter(q => q.pipeFrom)) {
      const source = QUESTIONS_BY_ID[q.pipeFrom!]
      expect(source, `${q.id} -> ${q.pipeFrom}`).toBeDefined()
      expect(source.type).toBe('multi')
    }
  })
})

describe('survey branch rules', () => {
  const problems: string[] = []

  function walk(rule: Rule | undefined, context: string) {
    if (!rule) return
    if ('all' in rule) return rule.all.forEach(r => walk(r, context))
    if ('any' in rule) return rule.any.forEach(r => walk(r, context))
    if ('not' in rule) return walk(rule.not, context)

    const target = QUESTIONS_BY_ID[rule.q]
    if (!target) {
      problems.push(`${context}: unknown question "${rule.q}"`)
      return
    }
    const codes = new Set((target.options ?? []).map(o => o.code))

    if ('eq' in rule && !codes.has(rule.eq)) {
      problems.push(`${context}: eq "${rule.eq}" is not an option of ${rule.q}`)
    }
    if ('in' in rule) {
      for (const code of rule.in) {
        if (!codes.has(code)) problems.push(`${context}: in "${code}" is not an option of ${rule.q}`)
      }
    }
    if ('includes' in rule) {
      if (target.type !== 'multi') problems.push(`${context}: includes targets non-multi ${rule.q}`)
      if (!codes.has(rule.includes)) {
        problems.push(`${context}: includes "${rule.includes}" is not an option of ${rule.q}`)
      }
    }
  }

  it('only references questions and option codes that exist', () => {
    problems.length = 0
    for (const q of QUESTIONS) walk(q.visibleIf, `question ${q.id}`)
    for (const s of SECTIONS) walk(s.visibleIf, `section ${s.id}`)
    expect(problems).toEqual([])
  })
})

describe('survey branch lengths', () => {
  /** Questions a persona actually sees, stopping at any terminal answer. */
  function seenBy(answers: Answers): string[] {
    const visible = visibleQuestions(answers)
    const terminalAt = visible.findIndex(q => terminalFor(q, answers[q.id] ?? null))
    const shown = terminalAt === -1 ? visible : visible.slice(0, terminalAt + 1)
    return shown.map(q => q.id)
  }

  it('ends the survey immediately for non-attendees', () => {
    expect(seenBy({ q_attend: 'no' })).toEqual(['q_attend'])
  })

  it('keeps the never-powered-on path short', () => {
    const seen = seenBy({ q_attend: 'venue', q_powered: 'never', q_never_why: ['no_hardware'] })
    expect(seen.length).toBeLessThanOrEqual(8)
    expect(seen).toContain('q_never_why')
    expect(seen).not.toContain('q_cohort')
  })

  it.each([
    ['event firmware', {
      q_attend: 'venue',
      q_powered: 'whole_event',
      q_cohort: 'event_fw',
      q_cohort_changed: 'no_change',
      q_fw_method: 'web_flasher',
      q_fw_first_try: 'yes_after_retries',
      q_devices: ['t-deck'],
      q_interaction: 'phone_app',
      q_issues: ['no_delivery'],
      q_worst_issue: 'no_delivery',
    }],
    ['manual config', {
      q_attend: 'venue',
      q_powered: 'most_days',
      q_cohort: 'manual_full',
      q_cohort_changed: 'no_change',
      q_devices: ['rak4631'],
      q_interaction: 'standalone',
      q_issues: ['none'],
    }],
    ['default LongFast', {
      q_attend: 'vegas',
      q_powered: 'one_day_or_less',
      q_cohort: 'default_longfast',
      q_default_aware: 'knew_before',
      q_devices: ['heltec-v3'],
      q_interaction: 'phone_app',
      q_issues: ['too_busy'],
      q_worst_issue: 'too_busy',
    }],
  ])('keeps the %s branch near the ~20 question target', (_name, answers) => {
    const seen = seenBy(answers as Answers)
    expect(seen.length).toBeGreaterThanOrEqual(15)
    expect(seen.length).toBeLessThanOrEqual(26)
  })

  it('hides the other branches once a cohort is chosen', () => {
    const seen = seenBy({
      q_attend: 'venue',
      q_powered: 'whole_event',
      q_cohort: 'default_longfast',
    })
    expect(seen).not.toContain('q_fw_method')
    expect(seen).not.toContain('q_manual_why_not_fw')
    expect(seen).toContain('q_default_aware')
  })

  it('hides the worst-issue follow-up when no problems were reported', () => {
    const base = { q_attend: 'venue', q_powered: 'whole_event', q_cohort: 'event_fw' }
    expect(seenBy({ ...base, q_issues: ['none'] })).not.toContain('q_worst_issue')
    expect(seenBy({ ...base, q_issues: ['ble_drops'] })).toContain('q_worst_issue')
  })
})

describe('generated device options', () => {
  it('has unique codes', () => {
    const codes = DEVICE_OPTIONS.map(d => d.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('has unique labels, so no two picker rows are indistinguishable', () => {
    const labels = DEVICE_OPTIONS.map(d => d.label)
    const duplicates = labels.filter((l, i) => labels.indexOf(l) !== i)
    expect(duplicates).toEqual([])
  })

  it('leads with the devices actually seen at the event', () => {
    expect(DEVICE_OPTIONS.slice(0, 3).map(d => d.code)).toEqual([
      'rak4631', 'heltec-v3', 'tracker-t1000-e',
    ])
  })
})
