<template>
    <div>
        <button data-modal-target="flash-modal" data-modal-toggle="flash-modal"
            class="inline text-black bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 disabled:bg-gray-500 text-center"
            type="button" :disabled="!canFlash">
            Build
        </button>
        <div id="flash-modal" tabindex="-1" aria-hidden="true"
            class="dark hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <Configure />
        </div>
    </div>
</template>

<script lang="ts" setup>

import { useSerialMonitorStore } from '../stores/serialMonitorStore';
import Configure from './Configure.vue';

const builderStore = useBuilderStore();

const serialMonitorStore = useSerialMonitorStore();

const canFlash = computed(() => builderStore.$state.selectedEnv);
</script>