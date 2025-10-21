<template>
    <div v-if="firmwareStore.canShowFlash" class="flex items-center justify-between p-3 sm:p-4 md:p-5 border-b rounded-t border-gray-600">
        <h3 class="text-base sm:text-lg font-semibold text-white">
            {{ $t('flash.title') }} {{ deviceStore.$state.selectedTarget?.displayName }}
        </h3>
        <button type="button"
            class="text-gray-400 bg-transparent hover:bg-gray-600 hover:text-white rounded-lg text-sm h-8 w-8 ms-auto inline-flex justify-center items-center"
            data-modal-toggle="flash-modal"
            @click="closeFlashModal">
            <X class="w-3 h-3" />
            <span class="sr-only">{{ $t('actions.close_dialog') }}</span>
        </button>
    </div>
</template>

<script lang="ts" setup>
import { useDeviceStore } from '../../stores/deviceStore';
import { useFirmwareStore } from '../../stores/firmwareStore';
import { X } from 'lucide-vue-next';

const deviceStore = useDeviceStore();
const firmwareStore = useFirmwareStore();

const closeFlashModal = () => {
    document.getElementById('flash-modal')?.click(); // Flowbite bug
}

</script>