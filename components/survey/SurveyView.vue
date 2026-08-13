<template>
  <div class="container mx-auto max-w-3xl py-6">
    <header class="survey-header">
      <h1 class="title-doto text-theme survey-title">
        DEF CON 34 Survey
      </h1>
      <div class="header-accent-container">
        <div class="header-accent-line" />
      </div>
    </header>

    <SurveyForm />

    <div class="survey-back">
      <button
        type="button"
        class="btn-secondary"
        @click="emit('close')"
      >
        <ArrowLeft class="h-4 w-4 shrink-0" /> Back to the flasher
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'

import SurveyForm from './SurveyForm.vue'

const emit = defineEmits<{ close: [] }>()
</script>

<style scoped>
.survey-header {
  margin-bottom: 2rem;
}

.survey-title {
  font-size: 2rem;
  text-align: center;
}

.survey-back {
  margin-top: 2rem;
  text-align: center;
}
</style>
