<template>
    <div v-if="firmwareStore.canShowFlash" class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-600">
        <h3 class="text-lg font-semibold text-white">
            {{ $t('flash.title') }} {{ deviceStore.$state.selectedTarget?.displayName }}
        </h3>
        <button type="button"
            class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm h-8 w-8 ms-auto inline-flex justify-center items-center hover:bg-gray-600 hover:text-white"
            data-modal-toggle="flash-modal"
            @click="closeFlashModal">
            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 14 14">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
            </svg>
            <span class="sr-only">{{ $t('actions.close_dialog') }}</span>
        </button>
    </div>
</template>

<script lang="ts" setup>
import { useDeviceStore } from '../../stores/deviceStore';
import { useFirmwareStore } from '../../stores/firmwareStore';

const deviceStore = useDeviceStore();
const firmwareStore = useFirmwareStore();

const closeFlashModal = () => {
    document.getElementById('flash-modal')?.click(); // Flowbite bug
}

</script>