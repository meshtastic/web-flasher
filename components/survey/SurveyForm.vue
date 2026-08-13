<template>
  <div class="survey-form">
    <TerminalScreen
      v-if="screen !== 'filling'"
      :kind="screen"
    />

    <form
      v-else
      novalidate
      @submit.prevent="onSubmit"
    >
      <p
        v-if="sectionIndex === 0"
        class="survey-intro text-theme-muted"
      >
        We ran custom event firmware at DEF CON 34, and plenty of people ran
        something else. We want to know how it went for you either way — including
        if you did nothing special at all. It takes about five minutes, it is
        completely anonymous, and there is no sign-in.
      </p>

      <SurveyProgress
        :title="currentSection?.title ?? ''"
        :current="sectionIndex + 1"
        :total="sections.length"
        :percent="progress"
      />

      <p
        v-if="currentSection?.blurb"
        class="survey-blurb text-theme-muted"
      >
        {{ currentSection.blurb }}
      </p>

      <QuestionCard
        v-for="question in currentQuestions"
        :key="question.id"
        :question="question"
        :model-value="answers[question.id]"
        :resolved-options="optionsFor(question, answers)"
        :invalid="attemptedAdvance && missingRequired.includes(question)"
        @set="value => setAnswer(question.id, value)"
        @toggle="code => toggleMulti(question.id, code)"
      />

      <!-- Honeypot: off-screen, unlabelled, never focusable by keyboard. -->
      <div
        class="survey-hp"
        aria-hidden="true"
      >
        <label for="survey-website">Website</label>
        <input
          id="survey-website"
          v-model="honeypot"
          type="text"
          name="website"
          tabindex="-1"
          autocomplete="off"
        >
      </div>

      <div
        v-show="isLastSection"
        class="survey-submit-block"
      >
        <div
          ref="turnstileContainer"
          class="survey-turnstile"
        />
        <p
          v-if="turnstile.error.value"
          class="survey-error"
          role="alert"
        >
          {{ turnstile.error.value }}
        </p>
        <p class="survey-privacy text-theme-muted">
          This survey is anonymous. We do not collect your name, email address,
          or IP address, and there is nothing to sign in to.
        </p>
      </div>

      <p
        v-if="submitError"
        class="survey-error"
        role="alert"
      >
        {{ submitError }}
      </p>

      <nav class="survey-nav">
        <button
          type="button"
          class="btn-secondary"
          :disabled="sectionIndex === 0 || submitting"
          @click="back()"
        >
          <ArrowLeft class="h-4 w-4 shrink-0" /> Back
        </button>

        <button
          v-if="!isLastSection"
          type="button"
          class="btn-primary"
          @click="next()"
        >
          Next <ArrowRight class="h-4 w-4 shrink-0" />
        </button>

        <button
          v-else
          type="submit"
          class="btn-primary"
          :disabled="submitting"
        >
          {{ submitting ? 'Sending…' : 'Submit' }}
          <Send
            v-if="!submitting"
            class="h-4 w-4 shrink-0"
          />
        </button>
      </nav>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight, Send } from 'lucide-vue-next'

import QuestionCard from './QuestionCard.vue'
import SurveyProgress from './SurveyProgress.vue'
import TerminalScreen from './TerminalScreen.vue'
import { optionsFor, SCHEMA_VERSION, type TerminalId } from './schema'
import { useSurveyState } from './useSurveyState'
import { useTurnstile } from './useTurnstile'
import { submitSurvey } from '~/utils/surveySubmit'

/**
 * The survey itself, with no opinion about how it is mounted. Keeping the
 * routing/modal decision out of here means the host can change without
 * touching any survey logic.
 */
const config = useRuntimeConfig()

const {
  answers,
  sections,
  sectionIndex,
  currentSection,
  currentQuestions,
  terminal,
  isLastSection,
  progress,
  missingRequired,
  attemptedAdvance,
  setAnswer,
  toggleMulti,
  next,
  back,
  payloadAnswers,
  elapsedMs,
} = useSurveyState()

const honeypot = ref('')
const submitting = ref(false)
const submitError = ref('')
const submitted = ref(false)

const turnstileContainer = ref<HTMLElement | null>(null)
const turnstile = useTurnstile(config.public.turnstileSiteKey as string, turnstileContainer)

const screen = computed<TerminalId | 'error' | 'filling'>(() => {
  if (submitted.value) return 'complete'
  return terminal.value ?? 'filling'
})

onMounted(() => {
  turnstile.mount()
})

// Scroll the survey back to the top on section change, otherwise a long section
// leaves the respondent halfway down the next one.
watch(sectionIndex, () => {
  document.querySelector('.survey-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})

async function onSubmit() {
  if (submitting.value) return

  // Validate the final section before spending a Turnstile token on a request
  // the backend would reject. next() sets attemptedAdvance so the blank
  // question shows its own error, and does not advance past the last section.
  if (!next()) return

  if (turnstile.enabled && !turnstile.token.value) {
    submitError.value = 'Please complete the spam check before submitting.'
    return
  }

  submitting.value = true
  submitError.value = ''

  const result = await submitSurvey(config.public.surveyWebhookUrl as string, {
    schemaVersion: SCHEMA_VERSION,
    answers: payloadAnswers(),
    durationMs: elapsedMs(),
    turnstileToken: turnstile.token.value,
    hp: honeypot.value,
  })

  submitting.value = false

  if (result.ok) {
    submitted.value = true
    return
  }

  // Tokens are single-use, so a failed attempt always needs a fresh one.
  turnstile.reset()
  submitError.value = result.error
}
</script>

<style scoped>
.survey-intro {
  line-height: 1.6;
  margin-bottom: 2rem;
}

.survey-blurb {
  font-size: 0.9375rem;
  line-height: 1.55;
  margin-bottom: 1.5rem;
}

.survey-submit-block {
  margin: 2rem 0 1rem;
}

.survey-turnstile:not(:empty) {
  margin-bottom: 1rem;
}

.survey-privacy {
  font-size: 0.8125rem;
  line-height: 1.5;
}

.survey-nav {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-default);
}

/* Honeypot: removed from the visual and tab order without display:none,
   which some bots detect and skip. */
.survey-hp {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
</style>
