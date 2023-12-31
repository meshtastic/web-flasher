<template>
    <div>
        <button data-modal-target="flash-modal" data-modal-toggle="flash-modal"
            class="block text-black meshtastic-bg hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center "
            type="button">
            Flash
        </button>
        <div id="flash-modal" tabindex="-1" aria-hidden="true"
            class="dark hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <TargetsNrf52 v-if="deviceStore.$state.selectedTarget?.architecture == 'nrf52840'" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useDeviceStore } from '../stores/deviceStore';

// import { useFirmwareStore } from '../stores/firmwareStore';

// const firmwareStore = useFirmwareStore();
const deviceStore = useDeviceStore();

</script>