// Event dates in the eventFirmware manifest are date-only strings
// ("2026-08-06"). Parsing those with `new Date(str)` yields UTC midnight,
// which renders as the previous day in negative-offset time zones — so parse
// the parts explicitly into a local Date instead.
function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatEventDateRange(start?: string | null, end?: string | null, locale = 'en'): string {
  const startDate = parseDateOnly(start)
  if (!startDate) return ''
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
  const startText = startDate.toLocaleDateString(locale, options)
  const endDate = parseDateOnly(end)
  if (!endDate || endDate.getTime() === startDate.getTime()) return startText
  return `${startText} – ${endDate.toLocaleDateString(locale, options)}`
}
