<template>
  <label class="relative block">
    <span class="sr-only">{{ $t('device.select_device') }}</span>
    <Search
      aria-hidden="true"
      class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-theme-muted"
    />
    <input
      v-model="query"
      type="search"
      :aria-label="$t('device.select_device')"
      :placeholder="$t('device.select_device')"
      class="min-h-11 w-full rounded-lg border border-theme bg-surface-primary py-2 pl-10 pr-3 text-base text-theme focus:border-meshtastic focus:outline-none focus:ring-2 focus:ring-meshtastic/60"
    >
  </label>
</template>

<script lang="ts" setup>
import { Search } from 'lucide-vue-next'

const query = defineModel<string>({ required: true })
</script>
