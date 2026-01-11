<template>
  <div class="device-header sticky top-0 z-10 flex items-center justify-between p-3 sm:p-4 md:p-5 rounded-t">
    <!-- Icon + title -->
    <div class="flex items-center gap-3">
      <div class="flash-header-icon">
        <Plug class="w-5 h-5 text-meshtastic" />
      </div>
      <h3 class="text-base sm:text-lg font-semibold text-white">
        {{ $t('device.header') }}
      </h3>
    </div>

    <!-- Close button with glow -->
    <button
      type="button"
      class="device-header-close"
      data-modal-toggle="device-modal"
    >
      <X class="w-4 h-4" />
      <span class="sr-only">{{ $t('actions.close_dialog') }}</span>
    </button>

    <!-- Gradient accent line -->
    <div class="device-header-accent"></div>
  </div>
</template>

<script setup>
import { X, Plug } from 'lucide-vue-next'
</script>
