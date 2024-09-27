<template>
    <div class="relative w-full max-w-4xl max-h-full">
        <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
            <FlashHeader />
            <div class="p-4 md:p-5">
                <ReleaseNotes />
                <ol v-if="firmwareStore.canShowFlash" class="relative border-s border-gray-200 dark:border-gray-600 ms-3.5 mb-4 md:mb-5">
                    <li class="mb-10 ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -start-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                            1
                        </span>
                        <h3 class="flex items-start mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                            Ensure device is plugged in via USB
                        </h3>
                    </li>
                    <li class="mb-10 ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -start-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                            2
                        </span>
                        <h3 class="flex items-start mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                            Enter DFU Mode
                        </h3>
                        <div class="p-4 mb-4 my-2 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400" role="alert">
                            <span class="font-medium">
                                <!-- <InformationCircleIcon class="h-4 w-4 inline" /> -->
                                <button type="button"
                                    class="inline-flex items-center py-2 px-3 text-sm font-medium focus:outline-none bg-meshtastic rounded-lg hover:bg-white focus:z-10 focus:ring-4 focus:ring-gray-200 text-black"
                                    @click="deviceStore.enterDfuMode">
                                    <FolderArrowDownIcon class="h-4 w-4 text-black" />
                                    Enter DFU Mode
                                </button> or you can optionally enter DFU mode manually by {{ deviceStore.dfuStepAction }}.
                            </span>
                        </div>
                    </li>
                    <li class="ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -start-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                            3
                        </span>
                        <h3 class="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                            Flash firmware via DFU utility or 
                                <a :href="downloadUf2FileUrl" v-if="firmwareStore.selectedFirmware?.id" class="inline-flex items-center py-2 px-3 text-sm font-medium focus:outline-none bg-meshtastic rounded-lg hover:bg-white focus:z-10 focus:ring-4 focus:ring-gray-200 text-black">
                                    <ArrowDownTrayIcon class="h-4 w-4 text-black" />
                                    Download UF2
                                </a>
                                <button @click="downloadUf2FileFs" v-else
                                    class="inline-flex items-center py-2 px-3 text-sm font-medium focus:outline-none bg-meshtastic rounded-lg hover:bg-white focus:z-10 focus:ring-4 focus:ring-gray-200 text-black">
                                    <ArrowDownTrayIcon class="h-4 w-4 text-black" />
                                    Download UF2
                                </button>
                                onto the USB mass storage device
                        </h3>
                        <p>
                            This process could take a while. 
                        </p>
                    </li>
                </ol>
                <div v-if="firmwareStore.canShowFlash">
                    <button v-if="showFlashButton"
                        class="text-black inline-flex w-full justify-center bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center" @click="flash">
                       Update via DFU Utility
                    </button>
                    <button v-if="firmwareStore.$state.flashPercentDone > 0 && !firmwareStore.$state.isFlashing"
                        class="mx-2 my-2 text-black inline-flex w-full justify-center bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center" @click="flash">
                        Start Over
                    </button>
                    <button v-if="firmwareStore.$state.flashPercentDone > 0 && !firmwareStore.$state.isFlashing"
                        class="mx-2 text-black inline-flex w-full justify-center bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center" @click="serialMonitor">
                        Open Serial Monitor
                    </button>
                    <div v-if="firmwareStore.$state.flashPercentDone > 0" class="mb-1 text-center font-medium text-white">Flashing {{ firmwareStore.percentDone }} complete</div>
                    <div class="w-fullrounded-full h-2.5 mb-4 bg-gray-700" v-if="firmwareStore.$state.flashPercentDone > 0">
                        <div class="bg-meshtastic h-2.5 rounded-full" :style=" { 'width': firmwareStore.percentDone }"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import '@/node_modules/xterm/css/xterm.css';

import {
  ArrowDownTrayIcon,
  FolderArrowDownIcon,
} from '@heroicons/vue/24/solid';

import { useDeviceStore } from '../../stores/deviceStore';
import { useFirmwareStore } from '../../stores/firmwareStore';
import FlashHeader from './FlashHeader.vue';
import ReleaseNotes from './ReleaseNotes.vue';

const deviceStore = useDeviceStore();
const firmwareStore = useFirmwareStore();
const serialMonitorStore = useSerialMonitorStore();
const showFlashButton = computed(() => {
    return !firmwareStore.$state.isFlashing && firmwareStore.$state.flashPercentDone < 1;
})

const downloadUf2FileFs = () => {
    const searchRegex = new RegExp(`firmware-${deviceStore.$state.selectedTarget.platformioTarget}-.+.uf2`);
    firmwareStore.downloadUf2FileSystem(searchRegex);
}

const downloadUf2FileUrl = computed(() => {
    if (!firmwareStore.selectedFirmware?.id) return '';
    const firmwareVersion = firmwareStore.selectedFirmware.id.replace('v', '')
    const firmwareFile = `firmware-${deviceStore.$state.selectedTarget.platformioTarget}-${firmwareVersion}.uf2`
    firmwareStore.trackDownload(deviceStore.$state.selectedTarget, false);
    return firmwareStore.getReleaseFileUrl(firmwareFile);
})

const flash = async () => {
    const otaZipFile = `firmware-${deviceStore.$state.selectedTarget.platformioTarget}-${firmwareStore.firmwareVersion}-ota.zip`
    const port = await firmwareStore.flashNrf52(otaZipFile, deviceStore.$state.selectedTarget);
    // await serialMonitorStore.monitorSerial(port);
}

const serialMonitor = async () => {
    document.getElementById('flash-modal')?.click();
    await serialMonitorStore.monitorSerial();
}

</script>