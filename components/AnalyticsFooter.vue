<template>
  <footer
    v-if="!hasAcknowledged"
    class="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-700 text-gray-100"
  >
    <div class="max-w-7xl mx-auto flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm">
        {{ $t('analytics.footer.message') }}
        {{ $t('analytics.footer.detailsPrefix') }}
        <a
          href="https://meshtastic.org/docs/legal/privacy/"
          target="_blank"
          rel="noopener noreferrer"
          class="underline text-blue-400 hover:text-blue-300"
        >
          {{ $t('analytics.footer.privacyLink') }}
        </a>
        {{ $t('analytics.footer.detailsSuffix') }}
      </p>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
        @click="acknowledge"
      >
        {{ $t('analytics.footer.button') }}
      </button>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';

const hasAcknowledged = useLocalStorage('analytics-acknowledged', false);

const acknowledge = () => {
  hasAcknowledged.value = true;
};
</script>
