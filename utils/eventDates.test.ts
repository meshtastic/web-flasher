import { describe, expect, it } from 'vitest'

import { formatEventDateRange } from './eventDates'

describe('formatEventDateRange', () => {
  it('formats a start/end range', () => {
    expect(formatEventDateRange('2026-08-06', '2026-08-09')).toBe('Aug 6, 2026 – Aug 9, 2026')
  })

  it('formats a start-only date', () => {
    expect(formatEventDateRange('2026-08-06', null)).toBe('Aug 6, 2026')
  })

  it('collapses a same-day range to a single date', () => {
    expect(formatEventDateRange('2026-08-06', '2026-08-06')).toBe('Aug 6, 2026')
  })

  it('returns an empty string without a valid start date', () => {
    expect(formatEventDateRange(null, '2026-08-09')).toBe('')
    expect(formatEventDateRange(undefined)).toBe('')
    expect(formatEventDateRange('', '')).toBe('')
    expect(formatEventDateRange('not-a-date')).toBe('')
    expect(formatEventDateRange('2026-8-6')).toBe('')
  })

  it('keeps the calendar day regardless of the local time zone', () => {
    // A UTC-midnight parse would render Aug 6 as Aug 5 anywhere west of UTC.
    expect(formatEventDateRange('2026-08-06')).toContain('6')
  })

  it('respects the requested locale', () => {
    expect(formatEventDateRange('2026-08-06', '2026-08-09', 'de')).toContain('Aug')
  })
})
