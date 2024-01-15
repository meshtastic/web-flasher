<template>
    <div>
        <button data-modal-target="flash-modal" data-modal-toggle="flash-modal"
            class="block text-black bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 disabled:bg-gray-500 text-center"
            type="button" :disabled="!canFlash">
            Flash
        </button>
        <div id="flash-modal" tabindex="-1" aria-hidden="true"
            class="dark hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <TargetsUf2 v-if="['nrf52840', 'rp2040'].includes(deviceStore.selectedArchitecture)" />
            <TargetsEsp32 v-if="deviceStore.selectedArchitecture.startsWith('esp32')" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useDeviceStore } from '../stores/deviceStore';
import { useFirmwareStore } from '../stores/firmwareStore';

const firmwareStore = useFirmwareStore();
const deviceStore = useDeviceStore();

// Either we have a custom zip file or a selected firmware release
const canFlash = computed(() => {
    if (firmwareStore.$state.selectedFile?.name) {
        return true;
    }
    return (firmwareStore.$state.selectedFirmware?.id || '').length > 0 && deviceStore.$state.selectedTarget?.hwModel > 0;
})
</script>