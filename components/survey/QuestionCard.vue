<template>
  <fieldset class="survey-question">
    <legend class="survey-prompt">
      {{ question.prompt }}
      <span
        v-if="question.required"
        class="survey-required"
        aria-hidden="true"
      >*</span>
    </legend>

    <p
      v-if="question.help"
      class="survey-help"
    >
      {{ question.help }}
    </p>

    <!-- Single choice -->
    <div
      v-if="question.type === 'single'"
      class="survey-options"
    >
      <label
        v-for="option in resolvedOptions"
        :key="option.code"
        class="survey-option"
        :class="{ 'survey-option-active': modelValue === option.code }"
      >
        <input
          type="radio"
          class="survey-input"
          :name="question.id"
          :value="option.code"
          :checked="modelValue === option.code"
          @change="emit('set', option.code)"
        >
        <span
          class="survey-marker survey-marker-radio"
          aria-hidden="true"
        />
        <span class="survey-option-label">{{ option.label }}</span>
      </label>
    </div>

    <!-- Device picker: 88 options, so it gets search and vendor filters -->
    <DevicePicker
      v-else-if="question.picker === 'device'"
      :selected="selectedCodes"
      @toggle="code => emit('toggle', code)"
    />

    <!-- Multiple choice -->
    <div
      v-else-if="question.type === 'multi'"
      class="survey-options"
    >
      <label
        v-for="option in resolvedOptions"
        :key="option.code"
        class="survey-option"
        :class="{ 'survey-option-active': selectedCodes.includes(option.code) }"
      >
        <input
          type="checkbox"
          class="survey-input"
          :value="option.code"
          :checked="selectedCodes.includes(option.code)"
          @change="emit('toggle', option.code)"
        >
        <span
          class="survey-marker survey-marker-check"
          aria-hidden="true"
        />
        <span class="survey-option-label">{{ option.label }}</span>
      </label>
    </div>

    <!-- Rating scale -->
    <div
      v-else-if="question.type === 'scale' && question.scale"
      class="survey-scale-wrap"
    >
      <div class="survey-scale">
        <label
          v-for="step in scaleSteps"
          :key="step"
          class="survey-scale-step"
          :class="{ 'survey-option-active': modelValue === step }"
        >
          <input
            type="radio"
            class="survey-input"
            :name="question.id"
            :value="step"
            :checked="modelValue === step"
            @change="emit('set', step)"
          >
          <span class="survey-scale-number">{{ step }}</span>
        </label>
      </div>
      <div class="survey-scale-labels">
        <span>{{ question.scale.minLabel }}</span>
        <span>{{ question.scale.maxLabel }}</span>
      </div>
      <label
        v-if="question.scale.allowNa"
        class="survey-option survey-option-na"
        :class="{ 'survey-option-active': modelValue === 'na' }"
      >
        <input
          type="radio"
          class="survey-input"
          :name="question.id"
          value="na"
          :checked="modelValue === 'na'"
          @change="emit('set', 'na')"
        >
        <span
          class="survey-marker survey-marker-radio"
          aria-hidden="true"
        />
        <span class="survey-option-label">Not applicable</span>
      </label>
    </div>

    <!-- Short text -->
    <input
      v-else-if="question.type === 'text'"
      class="survey-text"
      type="text"
      :maxlength="question.maxLength"
      :value="typeof modelValue === 'string' ? modelValue : ''"
      @input="emit('set', ($event.target as HTMLInputElement).value)"
    >

    <!-- Long text -->
    <div v-else-if="question.type === 'textarea'">
      <textarea
        class="survey-text survey-textarea"
        rows="4"
        :maxlength="question.maxLength"
        :value="typeof modelValue === 'string' ? modelValue : ''"
        @input="emit('set', ($event.target as HTMLTextAreaElement).value)"
      />
      <p
        v-if="question.maxLength"
        class="survey-counter"
      >
        {{ textLength }} / {{ question.maxLength }}
      </p>
    </div>

    <p
      v-if="invalid"
      class="survey-error"
      role="alert"
    >
      Please answer this question to continue.
    </p>
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import DevicePicker from './DevicePicker.vue'
import type { AnswerValue, Question, SurveyOption } from './schema'

const props = defineProps<{
  question: Question
  modelValue: AnswerValue | undefined
  resolvedOptions: SurveyOption[]
  invalid?: boolean
}>()

const emit = defineEmits<{
  set: [value: AnswerValue]
  toggle: [code: string]
}>()

const selectedCodes = computed(() =>
  Array.isArray(props.modelValue) ? props.modelValue : [],
)

const scaleSteps = computed(() => {
  const spec = props.question.scale
  if (!spec) return []
  return Array.from({ length: spec.max - spec.min + 1 }, (_, i) => spec.min + i)
})

const textLength = computed(() =>
  typeof props.modelValue === 'string' ? props.modelValue.length : 0,
)
</script>

<style scoped>
.survey-question {
  margin-bottom: 2rem;
  border: 0;
  padding: 0;
}

.survey-prompt {
  display: block;
  font-size: 1.0625rem;
  font-weight: 700;
  line-height: 1.45;
  color: var(--text-default);
  margin-bottom: 0.25rem;
}

.survey-required {
  color: var(--accent);
  margin-left: 0.125rem;
}

.survey-help {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

.survey-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.survey-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  cursor: pointer;
  background: var(--tag-inactive-bg);
  border: 1px solid var(--tag-inactive-border);
  color: var(--tag-inactive-text);
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.survey-option:hover {
  background: var(--tag-inactive-bg-hover);
  border-color: var(--tag-inactive-border-hover);
  color: var(--tag-inactive-text-hover);
}

.survey-option-active {
  background: var(--tag-active-bg);
  border-color: var(--tag-active-border);
  color: var(--text-default);
}

.survey-option-na {
  margin-top: 0.75rem;
}

/* The real input stays focusable for keyboard and screen readers but is
   visually replaced by .survey-marker. */
.survey-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.survey-marker {
  flex-shrink: 0;
  width: 1.125rem;
  height: 1.125rem;
  margin-top: 0.1875rem;
  border: 2px solid currentColor;
  position: relative;
  transition: background 0.2s ease;
}

.survey-marker-radio {
  border-radius: 999px;
}

.survey-marker-check {
  border-radius: 0.3125rem;
}

.survey-option-active .survey-marker {
  border-color: var(--accent);
  background: var(--accent);
}

.survey-option-active .survey-marker::after {
  content: '';
  position: absolute;
  inset: 0;
  margin: auto;
  width: 0.3125rem;
  height: 0.625rem;
  border: solid var(--text-inverse);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg) translate(-1px, -1px);
}

/* Radios get a dot rather than the checkbox tick. */
.survey-option-active .survey-marker-radio::after {
  width: 0.375rem;
  height: 0.375rem;
  border: 0;
  border-radius: 999px;
  background: var(--text-inverse);
  transform: none;
}

.survey-input:focus-visible + .survey-marker {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.survey-option-label {
  line-height: 1.45;
}

/* Scale ------------------------------------------------------------------ */
.survey-scale-wrap {
  margin-top: 0.75rem;
}

.survey-scale {
  display: flex;
  gap: 0.5rem;
}

.survey-scale-step {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  border-radius: 0.75rem;
  cursor: pointer;
  font-weight: 700;
  background: var(--tag-inactive-bg);
  border: 1px solid var(--tag-inactive-border);
  color: var(--tag-inactive-text);
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.survey-scale-step:hover {
  background: var(--tag-inactive-bg-hover);
  border-color: var(--tag-inactive-border-hover);
}

.survey-scale-step.survey-option-active {
  background: var(--tag-active-bg);
  border-color: var(--tag-active-border);
  color: var(--text-default);
}

.survey-input:focus-visible + .survey-scale-number {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
  border-radius: 0.25rem;
}

.survey-scale-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
}

/* Text ------------------------------------------------------------------- */
.survey-text {
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background: var(--surface-secondary);
  border: 1px solid var(--border-default);
  color: var(--text-default);
  font: inherit;
}

.survey-text:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.survey-textarea {
  resize: vertical;
  min-height: 6rem;
}

.survey-counter {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: right;
  margin-top: 0.25rem;
}
</style>
