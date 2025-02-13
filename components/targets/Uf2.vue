<template>
    <div class="relative p-4 w-full max-w-4xl max-h-full">
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
                            Enter (UF2) DFU Mode
                        </h3>
                        <div class="p-4 mb-4 my-2 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400" role="alert">
                            <span class="font-medium">
                                <InformationCircleIcon class="h-4 w-4 inline" />
                                For firmware versions &lt; {{ deviceStore.enterDfuVersion }}, trigger DFU mode manually by {{ deviceStore.dfuStepAction }}
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
                            The drive may have a different name depending on your device hardware and its bootloader.
                        </span>
                        <div>
                            <img v-if="deviceStore.isSelectedNrf" src="@/assets/img/dfu.png" alt="DFU Drive" />
                            <img v-else src="@/assets/img/uf2_rp2040.png" alt="DFU Drive" />
                        </div>
                    </li>
                    <li class="ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -start-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                            3
                        </span>
                        <h3 class="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                            Download or copy UF2 file to DFU drive
                        </h3>
                        <span>
                            Download or copy UF2 file to the DFU drive.
                            The device will automatically reboot when the transfer completes and will start with the new firmware.
                        </span>
                        <div class="p-4 mb-4 my-2 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400" role="alert">
                            <span class="font-medium">
                                <InformationCircleIcon class="h-4 w-4 inline" />
                                The auto reboot may cause messages about file transfer failures, write errors, or the device being ejected
                            </span>
                        </div>
                    </li>
                    <li>
                        <label class="relative inline-flex items-center me-5 ml-8 my-2 cursor-pointer" v-if="canInstallInkHud">
                            <input type="checkbox" value="" class="sr-only peer" v-model="firmwareStore.shouldInstallInkHud">
                            <div class="w-11 h-6 rounded-full peer peer-focus:ring-4 bg-gray-400 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                            <span class="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">Install InkHUD display</span>
                        </label>
                    </li>
                </ol>

                <div v-if="firmwareStore.canShowFlash">
                    <a :href="downloadUf2FileUrl" v-if="firmwareStore.selectedFirmware?.id"
                    class="text-black inline-flex w-full justify-center bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center">
                    Download UF2
                    </a>
                    <button @click="downloadUf2FileFs" v-else
                        class="text-black inline-flex w-full justify-center bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center">
                        Download UF2
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {
  FolderArrowDownIcon,
  InformationCircleIcon,
} from '@heroicons/vue/24/solid';
import { track } from '@vercel/analytics';

import { useDeviceStore } from '../../stores/deviceStore';
import { useFirmwareStore } from '../../stores/firmwareStore';
import FlashHeader from './FlashHeader.vue';
import ReleaseNotes from './ReleaseNotes.vue';

const deviceStore = useDeviceStore();
const firmwareStore = useFirmwareStore();

const downloadUf2FileFs = () => {
    let suffix = "";
    if (firmwareStore.shouldInstallInkHud) {
        suffix = "-inkhud";
    }
    const searchRegex = new RegExp(`firmware-${deviceStore.$state.selectedTarget.platformioTarget}${suffix}-.+.uf2`);
    console.log(searchRegex);
    firmwareStore.downloadUf2FileSystem(searchRegex);
}

const isNewFirmware = computed(() => {
    // Just check for *not* 2.5 firmware version for now
    return !firmwareStore.firmwareVersion.includes('2.5');
});

const canInstallInkHud = computed(() => {
    if (!firmwareStore.$state.prereleaseUnlocked)
        return false;
    if (!isNewFirmware.value)
        return false;
    return deviceStore.$state.selectedTarget.hasInkHud === true;
});


const downloadUf2FileUrl = computed(() => {
    if (!firmwareStore.selectedFirmware?.id) return '';
    const firmwareVersion = firmwareStore.selectedFirmware.id.replace('v', '')
    let suffix = "";
    if (firmwareStore.shouldInstallInkHud) {
        suffix = "-inkhud";
    }
    const firmwareFile = `firmware-${deviceStore.$state.selectedTarget.platformioTarget}${suffix}-${firmwareVersion}.uf2`
    firmwareStore.trackDownload(deviceStore.$state.selectedTarget, false);
    console.log(firmwareFile);
    return firmwareStore.getReleaseFileUrl(firmwareFile);
});
</script>
