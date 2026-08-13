<template>
  <div class="survey-terminal card-modern">
    <component
      :is="icon"
      class="survey-terminal-icon card-icon"
      aria-hidden="true"
    />
    <h2 class="title-doto text-theme survey-terminal-title">
      {{ copy.title }}
    </h2>
    <p class="text-theme-muted survey-terminal-body">
      {{ copy.body }}
    </p>
    <div class="survey-terminal-actions">
      <NuxtLink
        to="/"
        class="btn-secondary"
      >
        Back to the flasher
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CircleCheck, Info, TriangleAlert } from 'lucide-vue-next'

import type { TerminalId } from './schema'

const props = defineProps<{
  kind: TerminalId | 'error'
}>()

const COPY: Record<string, { title: string, body: string }> = {
  screened_out: {
    title: 'Thanks for stopping by',
    body: 'This survey is specifically about how the mesh behaved on the ground at DEF CON 34, so we are only collecting responses from people who were there. We appreciate you taking a look.',
  },
  complete: {
    title: 'Response received',
    body: 'Thank you — this is genuinely useful. What you told us feeds directly into whether we ship event firmware again next year and what we change about it.',
  },
  error: {
    title: 'That didn\'t go through',
    body: 'We could not record your response. Your answers are still on this page, so you can try submitting again. If it keeps failing, please let us know in the Meshtastic Discord.',
  },
}

const copy = computed(() => COPY[props.kind] ?? COPY.error)

const icon = computed(() => {
  if (props.kind === 'complete') return CircleCheck
  if (props.kind === 'error') return TriangleAlert
  return Info
})
</script>

<style scoped>
.survey-terminal {
  padding: 3rem 2rem;
  text-align: center;
}

/* This card is terminal content, not a control — suppress the lift-on-hover
   that .card-modern applies to the interactive cards on the index page. */
.survey-terminal:hover {
  transform: none;
  border-color: var(--border-default);
  box-shadow: none;
}

.survey-terminal-icon {
  width: 3.5rem;
  height: 3.5rem;
  margin: 0 auto 1.25rem;
}

.survey-terminal-title {
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
}

.survey-terminal-body {
  max-width: 34rem;
  margin: 0 auto;
  line-height: 1.6;
}

.survey-terminal-actions {
  margin-top: 2rem;
}
</style>
