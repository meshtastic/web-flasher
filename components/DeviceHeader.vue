<template>
    <div class="flex items-center justify-between p-4 border-b rounded-t">
        <h3 class="text-xl font-semibold text-white">
            {{ $t('device.header') }}
        </h3>
        <button type="button"
            class="text-gray-400 rounded-lg text-sm size-8 p-1 flex justify-center items-center shrink-0 hover:bg-gray-600 hover:text-white"
            data-modal-toggle="device-modal">
            <XMarkIcon />
            <span class="sr-only">{{ $t('actions.close_dialog') }}</span>
        </button>
    </div>
</template>

<script setup>
import { XMarkIcon } from '@heroicons/vue/24/solid';
</script>