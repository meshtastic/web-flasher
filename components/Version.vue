<template>
    <div>
        <button id="dropdownFirmwareButton" data-dropdown-toggle="dropdownFirmware" 
            class="content-center text-black bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:bg-gray-500" 
            type="button">
            {{ store.$state.branch }}
            <svg class="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
            </svg>
        </button>
        <div id="dropdownFirmware" class="z-10 hidden bg-gray-200 divide-y divide-gray-600 rounded-lg shadow w-44">
            <ul v-if="store.$state.branches.length > 0" class="py-2 text-sm text-gray-800" aria-labelledby="dropdownInformationButton">
                <li v-for="branch in store.$state.branches">
                    <a href="#" class="block px-4 py-1 hover:bg-gray-400 cursor-pointer">
                        {{ branch }}
                    </a>
                </li>
            </ul> 
            <!-- <div class="px-4 py-2 w-96 rounded-lg text-sm text-gray-900 bg-yellow-100" v-if="store.couldntFetchFirmwareApi">
                <strong>Could not fetch firmware versions from API.</strong>
                <br />
                Refresh the page later to try again.
                Alternatively, you can upload a firmware.zip file from the Github releases or an individual firmware-update.bin file for an ESP32 based device by clicking the <FolderOpenIcon class="h-3 w-3 inline" /> icon.
            </div> -->
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useBuilderStore } from '../stores/builderStore';

const store = useBuilderStore();
store.fetchVersion();

</script>
