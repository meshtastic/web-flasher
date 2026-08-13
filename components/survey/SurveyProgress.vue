<template>
  <div class="survey-progress">
    <div class="survey-progress-meta">
      <span class="title-doto tracking-wide">{{ title }}</span>
      <span>{{ current }} / {{ total }}</span>
    </div>
    <div
      class="survey-progress-track progress-track"
      role="progressbar"
      :aria-valuenow="percent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`Survey progress: ${percent}% complete`"
    >
      <div
        class="survey-progress-fill"
        :style="{ width: `${percent}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  current: number
  total: number
  percent: number
}>()
</script>

<style scoped>
.survey-progress {
  margin-bottom: 2rem;
}

.survey-progress-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.survey-progress-track {
  height: 0.375rem;
  border-radius: 999px;
  overflow: hidden;
}

.survey-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent) 0%, var(--accent-dark) 100%);
  transition: width 0.35s ease-out;
}
</style>
