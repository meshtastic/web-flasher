<template>
    <div class="relative w-full max-w-4xl max-h-full">
        <div class="relative rounded-lg shadow bg-gray-700">
            <FlashHeader />
            <div class="p-4 md:p-5">
                <ReleaseNotes />
                <ol v-if="firmwareStore.canShowFlash" class="relative border-s border-gray-200 border-gray-600 ms-3.5 mb-4 md:mb-5">
                    <li class="mb-10 ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 rounded-full -start-3 ring-8 bg-cyan-900 text-gray-100 ring-gray-900">
                            1
                        </span>
                        <h3 class="flex items-start mb-1 text-lg font-semibold text-white">
                            {{ $t('flash.esp32.step_1_usb') }}
                        </h3>
                        <div class="p-4 mb-4 my-2 text-sm rounded-lg bg-blue-50 bg-gray-800 text-blue-200" role="alert">
                            <span class="font-medium">
                                <InformationCircleIcon class="h-4 w-4 inline" />
                                {{ $t('flash.esp32.s3_instructions') }}
                                <br />
                                {{ $t('flash.esp32.reset_alternative') }}
                                <button type="button"
                                    class="inline-flex items-center mt-1 mx-1 py-1 px-2 text-sm font-medium focus:outline-none bg-meshtastic rounded-lg hover:bg-white focus:z-10 focus:ring-4 focus:ring-gray-200 text-black"
                                    @click="deviceStore.baud1200()">
                                    <CpuChipIcon class="h-4 w-4 text-black" />
                                    {{ $t('flash.esp32.reset_button') }}
                                </button>
                            </span>
                        </div>
                    </li>
                    <li class="mb-10 ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 rounded-full -start-3 ring-8 bg-cyan-900 text-gray-100 ring-gray-900">
                            2
                        </span>
                        <h3 class="flex items-start mb-1 text-lg font-semibold text-white">
                            {{ $t('flash.esp32.step_2_baud_rate') }}
                        </h3>
                        <div>
                            <select class="block w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" v-model="firmwareStore.$state.baudRate">
                                <option value="115200">115200</option>
                                <option value="230400">230400</option>
                                <option value="460800">460800</option>
                                <option value="921600">921600</option>
                                <!-- TODO styling and wire this up -->
                            </select>
                            <span class="text-sm mt-1">{{ $t('flash.esp32.slow_reliable') }}</span>
                        </div>
                    </li>
                    <li class="ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 rounded-full -start-3 ring-8 bg-cyan-900 text-gray-100 ring-gray-900">
                            3
                        </span>
                        <h3 class="mb-1 text-lg font-semibold text-white">
                            {{ $t('flash.esp32.step_3_flash') }}
                        </h3>
                        <label class="relative inline-flex items-center me-5 cursor-pointer" v-if="canFullInstall()">
                            <input type="checkbox" value="" class="sr-only peer" v-model="firmwareStore.$state.shouldCleanInstall">
                            <div class="w-11 h-6 rounded-full peer peer-focus:ring-4 bg-gray-400 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-red-600"></div>
                            <span class="ms-3 text-sm font-medium text-gray-100">{{ $t('flash.esp32.full_erase') }}</span>
                        </label>
                        <label class="relative inline-flex items-center me-5 cursor-pointer" v-if="firmwareStore.$state.shouldCleanInstall && canBundleWebUI">
                            <input type="checkbox" value="" class="sr-only peer" v-model="firmwareStore.$state.shouldBundleWebUI">
                            <div class="w-11 h-6 rounded-full peer peer-focus:ring-4 bg-gray-400 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-red-600"></div>
                            <span class="ms-3 text-sm font-medium text-gray-100">{{ $t('flash.esp32.bundle_webui') }}</span>
                        </label>
                        <label class="relative inline-flex items-center me-5 cursor-pointer" v-if="canInstallMui">
                            <input type="checkbox" value="" class="sr-only peer" v-model="firmwareStore.$state.shouldInstallMui">
                            <div class="w-11 h-6 rounded-full peer peer-focus:ring-4 bg-gray-400 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-red-600"></div>
                            <img src="/img/Meshtastic-UI-Long.svg" class="h-6 mx-1" alt="Meshtastic UI" />
                        </label>
                        <label class="relative inline-flex items-center me-5 cursor-pointer" v-if="canInstallInkHud">
                            <input type="checkbox" value="" class="sr-only peer" v-model="firmwareStore.$state.shouldInstallInkHud">
                            <div class="w-11 h-6 rounded-full peer peer-focus:ring-4 bg-gray-400 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-red-600"></div>
                            <span class="ms-3 text-sm font-medium text-gray-100">{{ $t('flash.esp32.install_inkhud') }}</span>
                        </label>
                        <div v-if="firmwareStore.$state.shouldCleanInstall" role="alert" class="flex flex-col p-4 mb-4 mt-2 text-sm text-red-800 rounded-lg bg-red-50 bg-gray-800 text-red-400">
                            <div class="flex items-center">
                                <InformationCircleIcon class="flex-shrink-0 inline w-4 h-4 mr-1" />
                                <span>
                                    {{ $t('flash.esp32.backup_warning') }}
                                    <span v-if="firmwareStore.$state.shouldBundleWebUI">{{ $t('flash.esp32.webui_space_warning') }}</span>
                                </span>
                            </div>
                            <div class="flex items-center mt-2">
                                <LinkIcon class="h-4 w-4 mr-1 text-red-800 text-red-400" />
                                <a href="https://meshtastic.org/docs/configuration/radio/security/#security-keys---backup-and-restore" target="_blank" class="underline text-red-800 text-red-400">
                                    {{ $t('flash.esp32.doc_guide') }}</a>
                            </div>
                        </div>
                        <p>
                            {{ $t('flash.esp32.process_warning') }}
                        </p>
                        <div>
                            <div class="p-4 mb-4 my-2 text-sm rounded-lg bg-blue-50 bg-gray-800 text-blue-200" role="alert">
                                <span class="font-medium">
                                    <InformationCircleIcon class="h-4 w-4 inline" />
                                    {{ $t('flash.esp32.reset_after_flash') }}
                                </span>
                            </div>
                        </div>
                    </li>
                </ol>
                <div v-if="firmwareStore.canShowFlash">
                    <button v-if="showFlashButton"
                        class="text-black inline-flex w-full justify-center bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center" @click="flash">
                        {{ firmwareStore.$state.shouldCleanInstall ? $t('flash.esp32.erase_and_install') : $t('flash.esp32.update') }}
                    </button>
                    <button v-if="firmwareStore.$state.flashPercentDone > 0 && !firmwareStore.$state.isFlashing"
                        class="text-black inline-flex w-full justify-center bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center" @click="startOver">
                        {{ $t('flash.esp32.start_over') }}
                    </button>
                    <div v-if="firmwareStore.$state.flashPercentDone > 0" class="mb-1 text-center font-medium text-white">{{ $t('flash.esp32.flashing_complete') }} {{ partition }} {{ firmwareStore.percentDone }} {{ $t('flash.esp32.complete') }}</div>
                    <div class="w-fullrounded-full h-2.5 mb-4 bg-gray-700" v-if="firmwareStore.$state.flashPercentDone > 0">
                        <div class="bg-meshtastic h-2.5 rounded-full" :style=" { 'width': firmwareStore.percentDone }"></div>
                    </div>
                </div>
                <div id="terminal"></div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import '@/node_modules/xterm/css/xterm.css';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

import {
  CpuChipIcon,
  InformationCircleIcon,
  LinkIcon,
} from '@heroicons/vue/24/solid';
import {
  BlobReader,
  ZipReader,
} from '@zip.js/zip.js';


import { useDeviceStore } from '../../stores/deviceStore';
import { useFirmwareStore } from '../../stores/firmwareStore';
import FlashHeader from './FlashHeader.vue';
import ReleaseNotes from './ReleaseNotes.vue';

const deviceStore = useDeviceStore();
const firmwareStore = useFirmwareStore();

const partition = computed(() => {
    if (firmwareStore.$state.flashingIndex === 0) {
        return t('flash.esp32.partition_app');
    } 
    if (firmwareStore.$state.flashingIndex === 1) {
        return t('flash.esp32.partition_ota');
    } 
    if (firmwareStore.$state.flashingIndex === 2) {
        return t('flash.esp32.partition_fs');
    }
    return ''
})

const showFlashButton = computed(() => {
    return !firmwareStore.$state.isFlashing && firmwareStore.$state.flashPercentDone < 1;
})

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

const canFullInstall = () => {
    // Assume bin file if it's not a zip file and prevent full install if its not a full factory bin
    if (firmwareStore.hasFirmwareFile && !firmwareStore.isZipFile && !firmwareStore.isFactoryBin)
        return false;
    return true;
}
const canBundleWebUI = ref(false);

const isNewFirmware = computed(() => {
    // Just check for *not* 2.5 firmware version for now
    return !firmwareStore.firmwareVersion.includes('2.5');
});

const canInstallMui = computed(() => {
    if (!isNewFirmware.value)
        return false;
    // Can't install MUI if we're installing the WebUI
    return deviceStore.$state.selectedTarget.hasMui === true && !firmwareStore.shouldBundleWebUI;
});

const canInstallInkHud = computed(() => {
    if (!isNewFirmware.value)
        return false;
    return deviceStore.$state.selectedTarget.hasInkHud === true;
});

watch(() => firmwareStore.$state.shouldInstallMui, () => {
    canBundleWebUI.value = !firmwareStore.$state.shouldInstallMui;
    firmwareStore.$state.partitionScheme = deviceStore.$state.selectedTarget.partitionScheme;
});

watch(() => firmwareStore.$state.shouldCleanInstall, async () => {
    if (firmwareStore.isZipFile && firmwareStore.$state.selectedFile) {
        const reader = new BlobReader(firmwareStore.$state.selectedFile);
        const zipReader = new ZipReader(reader);
        const entries = await zipReader.getEntries();
        const foundWebUI = entries.find(entry => entry.filename.startsWith('littlefswebui'));
        canBundleWebUI.value = !!foundWebUI;
    } else if (firmwareStore.selectedFirmware) {
        canBundleWebUI.value = await checkIfRemoteFileExists(firmwareStore.getReleaseFileUrl(littleFsFileName.value));
    }
    else {
        canBundleWebUI.value = false;
    }
});

const targetPrefix = computed(() => {
    let pioSuffix = "";
    // Crowpanel ends with -tft, so don't add -tft suffix
    if (firmwareStore.$state.shouldInstallMui && !deviceStore.$state.selectedTarget.platformioTarget.endsWith("-tft")) {
        pioSuffix = "-tft";
    } else if (firmwareStore.$state.shouldInstallInkHud) {
        pioSuffix = "-inkhud";
    }
    return `${deviceStore.$state.selectedTarget.platformioTarget}${pioSuffix}-${firmwareStore.firmwareVersion}`;
});

const cleanInstallEsp32 = () => {
    const firmwareFile = `firmware-${targetPrefix.value}.bin`;
    const otaFile = deviceStore.$state.selectedTarget.architecture === 'esp32-s3' ? 'bleota-s3.bin' : 'bleota.bin';
    // Coerce the partition scheme to be the same as the selected target for all 2.6.2+ firmwares
    if (deviceStore.$state.selectedTarget.partitionScheme && twoPointSixPointTwoOrGreater.value) {
        firmwareStore.$state.partitionScheme = deviceStore.$state.selectedTarget.partitionScheme;
    }
    console.log(firmwareFile, otaFile, littleFsFileName.value);
    firmwareStore.cleanInstallEspFlash(firmwareFile, otaFile, littleFsFileName.value, deviceStore.$state.selectedTarget);
}

const twoPointSixPointTwoOrGreater = computed(() => {
    if (!firmwareStore.firmwareVersion) {
        return false;
    }
    if (firmwareStore.firmwareVersion.includes('2.6') &&
        !firmwareStore.firmwareVersion.includes('2.6.0') && // 2.6.1 is pre-partition scheme
        !firmwareStore.firmwareVersion.includes('2.6.1')) { // 2.6.0 is pre-partition scheme
        return true;
    }
});

const littleFsFileName = computed(() => {
    let prefix = firmwareStore.shouldBundleWebUI ? 'littlefswebui' : 'littlefs';
    const littleFsInfix = isNewFirmware.value ? `${targetPrefix.value}` : firmwareStore.firmwareVersion;
    return `${prefix}-${littleFsInfix}.bin`;
});

const updateEsp32 = () => {
    // Get firmware version from selectedFirmware or use regex wildcard to match otherwise
    const firmwareFile = `firmware-${targetPrefix.value}-update.bin`;
    console.log(firmwareFile);
    firmwareStore.updateEspFlash(firmwareFile, deviceStore.$state.selectedTarget);
}
</script>
