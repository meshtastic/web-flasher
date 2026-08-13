import { computed, ref } from 'vue'

import {
  type AnswerValue,
  type Answers,
  type Question,
  type TerminalId,
  optionsFor,
  QUESTIONS_BY_ID,
  terminalFor,
  visibleQuestions,
  visibleSections,
} from './schema'

/**
 * Survey navigation and answer state.
 *
 * Two behaviours here are load-bearing for data quality:
 *
 * 1. Answers to questions that later become invisible are kept in memory (so
 *    backtracking doesn't silently destroy input) but pruned at submit time.
 *    Someone who picks "event firmware", answers the flashing questions, then
 *    switches to "default LongFast" must not ship orphaned flashing answers.
 *
 * 2. Piped answers are revalidated whenever their source changes, so
 *    q_worst_issue can never reference a problem no longer selected.
 */
export function useSurveyState() {
  const answers = ref<Answers>({})
  const sectionIndex = ref(0)
  const startedAt = ref(Date.now())
  const attemptedAdvance = ref(false)

  const sections = computed(() => visibleSections(answers.value))

  const currentSection = computed(() => sections.value[sectionIndex.value] ?? null)

  const currentQuestions = computed<Question[]>(() => {
    const section = currentSection.value
    if (!section) return []
    return visibleQuestions(answers.value).filter(q => q.section === section.id)
  })

  /** Non-null once an answer has selected a terminal option. */
  const terminal = computed<TerminalId | null>(() => {
    for (const question of visibleQuestions(answers.value)) {
      const hit = terminalFor(question, answers.value[question.id] ?? null)
      if (hit) return hit
    }
    return null
  })

  const isLastSection = computed(() => sectionIndex.value >= sections.value.length - 1)

  const progress = computed(() => {
    if (sections.value.length === 0) return 0
    return Math.round((sectionIndex.value / sections.value.length) * 100)
  })

  /** Required questions in the current section that are still blank. */
  const missingRequired = computed(() =>
    currentQuestions.value.filter(q => q.required && !isAnswered(answers.value[q.id])),
  )

  const canAdvance = computed(() => missingRequired.value.length === 0)

  function isAnswered(value: AnswerValue | undefined): boolean {
    if (value === null || value === undefined) return false
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'string') return value.trim() !== ''
    return true
  }

  function setAnswer(id: string, value: AnswerValue) {
    answers.value = { ...answers.value, [id]: value }
    revalidatePiped()
  }

  /**
   * Toggle one option of a multi-select, honouring exclusive options such as
   * "None of the above" in both directions.
   */
  function toggleMulti(id: string, code: string) {
    const question = QUESTIONS_BY_ID[id]
    const current = answers.value[id]
    const selected = Array.isArray(current) ? [...current] : []
    const option = question?.options?.find(o => o.code === code)

    if (selected.includes(code)) {
      setAnswer(id, selected.filter(c => c !== code))
      return
    }

    if (option?.exclusive) {
      setAnswer(id, [code])
      return
    }

    const exclusiveCodes = new Set(
      (question?.options ?? []).filter(o => o.exclusive).map(o => o.code),
    )
    setAnswer(id, [...selected.filter(c => !exclusiveCodes.has(c)), code])
  }

  /** Drop piped answers whose source option is no longer selected. */
  function revalidatePiped() {
    for (const question of Object.values(QUESTIONS_BY_ID)) {
      if (!question.pipeFrom) continue
      const value = answers.value[question.id]
      if (typeof value !== 'string') continue
      const stillValid = optionsFor(question, answers.value).some(o => o.code === value)
      if (!stillValid) {
        answers.value = Object.fromEntries(
          Object.entries(answers.value).filter(([key]) => key !== question.id),
        )
      }
    }
  }

  function next(): boolean {
    attemptedAdvance.value = true
    if (!canAdvance.value) return false
    attemptedAdvance.value = false
    if (!isLastSection.value) sectionIndex.value += 1
    return true
  }

  function back() {
    attemptedAdvance.value = false
    if (sectionIndex.value > 0) sectionIndex.value -= 1
  }

  /**
   * Answers for currently-visible questions only, ready to submit. Blank
   * optional answers are omitted entirely rather than sent as empty strings.
   */
  function payloadAnswers(): Answers {
    const result: Answers = {}
    for (const question of visibleQuestions(answers.value)) {
      const value = answers.value[question.id]
      if (isAnswered(value)) result[question.id] = value as AnswerValue
    }
    return result
  }

  function elapsedMs(): number {
    return Date.now() - startedAt.value
  }

  return {
    answers,
    sections,
    sectionIndex,
    currentSection,
    currentQuestions,
    terminal,
    isLastSection,
    progress,
    missingRequired,
    canAdvance,
    attemptedAdvance,
    isAnswered,
    setAnswer,
    toggleMulti,
    next,
    back,
    payloadAnswers,
    elapsedMs,
  }
}
