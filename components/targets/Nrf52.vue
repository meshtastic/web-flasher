<template>
    <div class="relative p-4 w-full max-w-md max-h-full">
        <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
            <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    Flash {{ deviceStore.$state.selectedTarget?.displayName }}
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
            <div class="p-4 md:p-5">
                <ol class="relative border-s border-gray-200 dark:border-gray-600 ms-3.5 mb-4 md:mb-5">
                    <li class="mb-10 ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -start-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                            1
                        </span>
                        <h3 class="flex items-start mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                            Enter (UF2) DFU Mode
                        </h3>
                        <div class="p-4 mb-4 my-2 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400" role="alert">
                            <span class="font-medium">
                                <InformationCircleIcon class="h-4 w-4 inline" />
                                For versions &lt; 2.2.17, trigger DFU manually by double-clicking RST button
                            </span>
                        </div>
                        <button type="button"
                            class="inline-flex items-center py-2 px-3 text-sm font-medium focus:outline-none bg-meshtastic rounded-lg hover:bg-white focus:z-10 focus:ring-4 focus:ring-gray-200 text-black"
                            @click="deviceStore.enterDfuMode()">
                            <FolderArrowDownIcon class="h-4 w-4 text-black" />
                            Enter DFU Mode
                        </button>
                    </li>
                    <li class="mb-10 ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -start-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                            2
                        </span>
                        <h3 class="flex items-start mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                            Ensure device DFU mode drive is mounted
                        </h3>
                        <span>
                            The drive may have a different name depending on your device and its bootloader.
                        </span>
                        <div>
                            <img src="@/assets/img/dfu.png" alt="DFU Drive" />
                        </div>
                    </li>
                    <li class="ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -start-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                            3
                        </span>
                        <h3 class="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                            Download UF2 file to DFU drive
                        </h3>
                        <span>
                            Download and Copy UF2 file to the DFU drive.
                            Firmware should be flashed after the file is downloaded and the device reboots.
                        </span>
                    </li>
                </ol>
                <a :href="downloadUf2FileUrl"
                    class="text-black inline-flex w-full justify-center bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center">
                    Download UF2
                </a>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {
  FolderArrowDownIcon,
  InformationCircleIcon,
} from '@heroicons/vue/24/solid';

import { useDeviceStore } from '../../stores/deviceStore';
import { useFirmwareStore } from '../../stores/firmwareStore';

const deviceStore = useDeviceStore();
const firmwareStore = useFirmwareStore();

const closeFlashModal = () => {
    document.getElementById('flash-modal')?.click(); // Flowbite bug
}

const downloadUf2 = () => {
    const firmwareVersion = firmwareStore.selectedFirmware.id.replace('v', '')
    const firmwareFile = `firmware-${deviceStore.$state.selectedTarget.platformioTarget}-${firmwareVersion}.uf2`
    firmwareStore.downloadUf2FileFileSystemAccess(firmwareFile);
}

const downloadUf2FileUrl = computed(() => {
    if (!firmwareStore.selectedFirmware?.id) return '';
    const firmwareVersion = firmwareStore.selectedFirmware.id.replace('v', '')
    const firmwareFile = `firmware-${deviceStore.$state.selectedTarget.platformioTarget}-${firmwareVersion}.uf2`
    return firmwareStore.getUf2FileUrl(firmwareFile);
});
</script>