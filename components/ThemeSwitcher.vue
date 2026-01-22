<template>
  <div class="theme-switcher">
    <button
      class="theme-toggle-btn"
      :title="themeLabel"
      @click="themeStore.toggleTheme()"
    >
      <!-- Dark mode icon -->
      <Moon
        v-if="themeStore.theme === 'dark'"
        class="theme-icon"
      />
      <!-- Light mode icon -->
      <Sun
        v-else
        class="theme-icon"
      />
    </button>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { Moon, Sun } from 'lucide-vue-next'
import { useThemeStore } from '~/stores/themeStore'

const themeStore = useThemeStore()

const themeLabel = computed(() => {
  if (themeStore.theme === 'dark') return 'Dark mode'
  return 'Light mode'
})
</script>

<style scoped>
.theme-switcher {
  @apply relative;
}

.theme-toggle-btn {
  @apply inline-flex items-center justify-center;
  @apply w-10 h-10 rounded-xl;
  @apply transition-all duration-300 ease-out;
  @apply hover:scale-105;
}

/* Dark theme button styles */
:root[data-theme="dark"] .theme-toggle-btn {
  @apply text-white/70 hover:text-white;
  @apply bg-white/5 hover:bg-white/10;
  @apply border border-white/10 hover:border-white/20;
}

/* Light theme button styles */
:root[data-theme="light"] .theme-toggle-btn {
  @apply text-gray-600 hover:text-gray-900;
  @apply bg-gray-100 hover:bg-gray-200;
  @apply border border-gray-200 hover:border-gray-300;
}

.theme-icon {
  @apply w-5 h-5;
}
</style>
