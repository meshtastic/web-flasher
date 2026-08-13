<template>
  <button
    type="button"
    class="survey-banner"
    @click="emit('open')"
  >
    <ClipboardList
      class="survey-banner-icon"
      aria-hidden="true"
    />

    <div class="survey-banner-copy">
      <p class="survey-banner-title title-doto">
        DEF CON 34 is a wrap — how did it go?
      </p>
      <p class="survey-banner-body">
        Whether you flashed the event firmware, configured your own settings, or
        just ran LongFast, we want to hear how the mesh behaved for you. Five
        minutes, completely anonymous, no sign-in.
      </p>
    </div>

    <span class="survey-banner-cta btn-primary">
      Take the survey
      <ArrowRight class="h-4 w-4 shrink-0" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { ArrowRight, ClipboardList } from 'lucide-vue-next'

const emit = defineEmits<{ open: [] }>()
</script>

<style scoped>
.survey-banner {
  /* Was a link, now a button: reset UA button styling. */
  width: 100%;
  appearance: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin: 0 auto 1.5rem;
  padding: 1.25rem 1.5rem;
  max-width: 80rem;
  border-radius: 1rem;
  text-decoration: none;
  /* Accent-tinted rather than the neutral card surface: the event has passed,
     so this is the primary action on the page, not one option among several. */
  background: linear-gradient(135deg, var(--bg-glow-green), var(--surface-secondary));
  border: 1px solid var(--border-hover);
  transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
}

.survey-banner:hover {
  border-color: var(--accent);
  box-shadow: 0 8px 30px var(--accent-glow);
  transform: translateY(-2px);
}

.survey-banner-icon {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  color: var(--accent);
}

.survey-banner-copy {
  flex: 1;
  min-width: 0;
}

.survey-banner-title {
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--text-default);
  margin-bottom: 0.25rem;
}

.survey-banner-body {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-muted);
}

.survey-banner-cta {
  flex-shrink: 0;
  /* Inherits .btn-primary; pointer events belong to the wrapping link. */
  pointer-events: none;
}

@media (max-width: 768px) {
  .survey-banner {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  .survey-banner-cta {
    width: 100%;
  }
}
</style>
