<template>
    <button id="dropdownFirmwareButton" data-dropdown-toggle="dropdownFirmware" class="content-center text-black meshtastic-bg hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800" type="button" v-if="!isUpload">
        {{ selectedVersion.replace('Meshtastic Firmware ', '') }}
        <svg class="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
        </svg>
    </button>
    <div id="dropdownFirmware" class="z-10 hidden bg-gray-200 divide-y divide-gray-600 rounded-lg shadow w-44" v-if="!isUpload">
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
        <!-- <div class="px-4 py-2 text-sm text-gray-900 dark:text-white">
            <strong>Experimental (PRs)</strong>
        </div>
        <ul class="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="dropdownInformationButton">
            <li v-for="release in store.$state.pullRequests">
                <a href="#" class="block px-4 py-1 hover:bg-gray-500 dark:hover:bg-gray-600 dark:hover:text-white cursor-pointer" @click="store.setSelectedFirmware(release)">
                    {{ release.title }}
                </a>
            </li>
        </ul> -->
    </div>
</template>

<script lang="ts" setup>
import type { FirmwareResource } from '~/types/api';

import { ArrowUpTrayIcon } from '@heroicons/vue/24/solid';

import { useFirmwareStore } from '../stores/firmwareStore';

const store = useFirmwareStore();
store.fetchList();

const getReleaseFile = (event: any) => {
    const file = event.target.files[0];
    store.uploadFirmware(file);
}

const isUpload = ref(false)

const selectedVersion = computed(() => store.$state.selectedFirmware?.id ? store.$state.selectedFirmware?.title : "Select Firmware Version")

const setSelectedFirmware = (release: FirmwareResource) => {
    store.setSelectedFirmware(release);
    document.getElementById('dropdownFirmware')?.classList.toggle('hidden'); // Flowbite bug
}
</script>