<template>
  <div class="flex items-center justify-between p-3 sm:p-4 md:p-5 border-b rounded-t order-gray-600">
    <h3 class="text-lg sm:text-xl font-semibold text-white">
      {{ $t('device.header') }}
    </h3>
    <button
      type="button"
      class="text-gray-400 bg-transparent hover:bg-gray-600 hover:text-white rounded-lg text-sm h-8 w-8 ms-auto inline-flex justify-center items-center"
      data-modal-toggle="device-modal"
    >
      <X class="w-3 h-3" />
      <span class="sr-only">{{ $t('actions.close_dialog') }}</span>
    </button>
  </div>
</template>

<script setup>
import { X } from 'lucide-vue-next'
</script>
