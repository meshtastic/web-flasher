<template>
    <div class="header-wrapper">
        <p class="text-xl font-semibold text-white">
            {{ $t('device.header') }}
        </p>
        <button
            class="header-toggle"
            data-modal-toggle="device-modal">
            <XMarkIcon />
            <span class="sr-only">{{ $t('actions.close_dialog') }}</span>
        </button>
    </div>
</template>

<script setup>
import { XMarkIcon } from '@heroicons/vue/24/solid';
</script>

<style scoped>
.header-wrapper {
    @apply flex items-center justify-between;
    @apply p-4 border-b rounded-t;
}
.header-toggle {
    @apply text-gray-400;
    @apply size-8 p-1 shrink-0;
    @apply rounded-lg;
    @apply hover:bg-gray-600 hover:text-white duration-150;
    @apply focus:ring focus:ring-gray-200 focus:outline-none;
}
</style>