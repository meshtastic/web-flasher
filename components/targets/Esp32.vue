<template>
    <div class="relative w-full max-w-4xl max-h-full">
        <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
            <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    Flash {{ deviceStore.$state.selectedTarget?.hwModelSlug?.replace('_', '-') }}
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
                            Ensure device is plugged in via USB
                        </h3>
                        <div class="p-4 mb-4 my-2 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400" role="alert">
                            <span class="font-medium">
                                <InformationCircleIcon class="h-4 w-4 inline" />
                                If your device is ESP32-S3 based, you may need to turn off, press and hold the BOOT / USR button while plugging in the USB cable.
                            </span>
                        </div>
                    </li>
                    <li class="mb-10 ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -start-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                            2
                        </span>
                        <h3 class="flex items-start mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                            Choose baud rate
                        </h3>
                        <div>
                            <select class="block w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" v-model="firmwareStore.$state.baudRate">
                                <option value="115200">115200</option>
                                <option value="921600">921600</option>
                                <!-- TODO styling and wire this up -->
                            </select>
                            <span class="text-sm mt-1">115200 is slower, but can be more reliable for low-quality connections.</span>
                        </div>
                    </li>
                    <li class="ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -start-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                            3
                        </span>
                        <h3 class="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                            Flash firmware
                        </h3>
                        <label class="relative inline-flex items-center me-5 cursor-pointer">
                            <input type="checkbox" value="" class="sr-only peer" v-model="firmwareStore.$state.shouldCleanInstall">
                            <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4  dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                            <span class="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">Full Erase and Install</span>
                        </label>
                        <p>
                            This process could take a minute. 
                        </p>
                        <p>
                            After the flashing process is complete, you may need to press the RST button if the device does not reboot automatically.
                        </p>
                    </li>
                </ol>
                <button v-if="!firmwareStore.$state.isFlashing && firmwareStore.$state.flashPercentDone < 1"
                    class="text-black inline-flex w-full justify-center meshtastic-bg hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center" @click="flash">
                    {{ firmwareStore.$state.shouldCleanInstall ? 'Erase Flash and Install' : 'Update' }}
                </button>
                <button v-if="firmwareStore.$state.flashPercentDone > 99"
                    class="text-black inline-flex w-full justify-center meshtastic-bg hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center" @click="startOver">
                    Start Over
                </button>
                <div v-if="firmwareStore.$state.flashPercentDone > 0" class="mb-1 text-center font-medium text-white">Flashing {{ firmwareStore.percentDone }} complete</div>
                <div class="w-fullrounded-full h-2.5 mb-4 bg-gray-700" v-if="firmwareStore.$state.flashPercentDone > 0">
                    <div class="meshtastic-bg h-2.5 rounded-full" :style=" { 'width': firmwareStore.percentDone }"></div>
                </div>
                <div id="terminal"></div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import '@/node_modules/xterm/css/xterm.css';

import { InformationCircleIcon } from '@heroicons/vue/24/solid';

import { useDeviceStore } from '../../stores/deviceStore';
import { useFirmwareStore } from '../../stores/firmwareStore';

// onMounted(async () => {
//     // Dynamic import to avoid SSR because xterm wants window
//     const { Terminal } = await import('xterm')
//     const term = new Terminal({ cols: 40, rows: 40 });
//     term.open(document.getElementById('terminal')!);
//     firmwareStore.$state.terminal = term;
// })
const deviceStore = useDeviceStore();
const firmwareStore = useFirmwareStore();
const closeFlashModal = () => {
    document.getElementById('flash-modal')?.click(); // Flowbite bug
}
const startOver = () => {
    firmwareStore.$state.isFlashing = false;
    firmwareStore.$state.flashPercentDone = 0;
}

const flash = () => {
    if (firmwareStore.$state.shouldCleanInstall) {  
        cleanInstallEsp32();
    } else {
        updateEsp32();
    }
}

const cleanInstallEsp32 = () => {
    const firmwareVersion = firmwareStore.selectedFirmware.id.replace('v', '');
    const firmwareFile = `firmware-${deviceStore.$state.selectedTarget.platformioTarget}-${firmwareVersion}.bin`;
    const otaFile = deviceStore.$state.selectedTarget.architecture == 'esp32-s3' ? 'bleota-s3.bin' : 'bleota.bin';
    const littleFsFile = `littlefs-${firmwareVersion}.bin`;
    firmwareStore.cleanInstallEspFlash(firmwareFile, otaFile, littleFsFile);
}

const updateEsp32 = () => {
    const firmwareVersion = firmwareStore.selectedFirmware.id.replace('v', '')
    const firmwareFile = `firmware-${deviceStore.$state.selectedTarget.platformioTarget}-${firmwareVersion}-update.bin`
    firmwareStore.updateEspFlash(firmwareFile);
}
</script>