<template>
    <div v-if="store.$state.selectedEnv" class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Build {{ store.$state.selectedEnv }}
        </h3>
        <button type="button"
            class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm h-8 w-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
            data-modal-toggle="flash-modal"
            @click="closeFlashModal">
            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 14 14">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
            </svg>
            <span class="sr-only">Close dialog</span>
        </button>
    </div>
</template>

<script lang="ts" setup>
import { useBuilderStore } from '../stores/builderStore';
const store = useBuilderStore();
const closeFlashModal = () => {
    document.getElementById('flash-modal')?.click(); // Flowbite bug
}
</script>