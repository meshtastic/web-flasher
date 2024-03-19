<template>
    <div>
        <button id="dropdownFirmwareButton" data-dropdown-toggle="dropdownFirmware" 
            class="content-center text-black bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:bg-gray-500" 
            type="button"
            :disabled="!canSelectFirmware">
            {{ selectedVersion.replace('Meshtastic Firmware ', '') }}
            <svg class="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
            </svg>
        </button>
        <div id="dropdownFirmware" class="z-10 hidden bg-gray-200 divide-y divide-gray-600 rounded-lg shadow w-44">
            <div class="px-4 py-2 text-sm text-gray-900 dark:text-white">
                <strong>Stable</strong>
            </div>
            <ul class="py-2 text-sm text-gray-800" aria-labelledby="dropdownInformationButton">
                <li v-for="release in store.$state.stable">
                    <span class="block px-4 py-1 hover:bg-gray-400 cursor-pointer" @click="setSelectedFirmware(release)">
                        {{ release.title.replace('Meshtastic Firmware ', '') }}
                    </span>
                </li>
            </ul>
            <div class="px-4 py-2 text-sm text-gray-900">
                <strong>Alpha</strong>
            </div>
            <ul class="py-2 text-sm text-gray-800" aria-labelledby="dropdownInformationButton">
                <li v-for="release in store.$state.alpha">
                    <a href="#" class="block px-4 py-1 hover:bg-gray-400 cursor-pointer" @click="setSelectedFirmware(release)">
                        {{ release.title.replace('Meshtastic Firmware ', '') }}
                    </a>
                </li>
            </ul>
        </div>
        <button data-tooltip-target="tooltip-file" class="mx-2 display-inline content-center px-3 py-2 text-xs font-medium text-center  hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg inline-flex items-center text-white hover:text-black"
            type="button"
            for="file-upload"
            accept=".zip"
            @click="openFile()">
            <FolderOpenIcon class="h-4 w-4 " />
        </button>
        <div id="tooltip-file" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300  rounded-lg shadow-sm opacity-0 tooltip bg-gray-700">
            Upload your own firmware release zip.
            <div class="tooltip-arrow" data-popper-arrow></div>
        </div>
        <input id="file_upload" type="file" class="hidden" @change="setFirmwareFile" />
    </div>
</template>

<script lang="ts" setup>
import type { FirmwareResource } from '~/types/api';

import { FolderOpenIcon } from '@heroicons/vue/24/solid';

import { useDeviceStore } from '../stores/deviceStore';
import { useFirmwareStore } from '../stores/firmwareStore';

const store = useFirmwareStore();
const deviceStore = useDeviceStore();
store.fetchList();

const selectedVersion = computed(() => 
{
    if (store.$state.selectedFirmware?.id) {
        return store.$state.selectedFirmware.title;
    } else if (store.$state.selectedFile?.name) {
        return store.$state.selectedFile?.name;
    }
    return "Select Firmware Version";
});

const canSelectFirmware = computed(() => {
    return deviceStore.selectedTarget?.hwModel > 0;
});

const openFile = () => {
    document.getElementById('file_upload')?.click();
}

const setFirmwareFile = (event: any) => {
    store.setFirmwareFile(event.target.files[0]);
}

const setSelectedFirmware = (release: FirmwareResource) => {
    store.setSelectedFirmware(release);
    document.getElementById('dropdownFirmware')?.classList.toggle('hidden'); // Flowbite bug
}
</script>