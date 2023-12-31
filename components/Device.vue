<template>
    <button id="dropdownDeviceButton" data-dropdown-toggle="dropdownDevices" class="content-center text-black meshtastic-bg hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800" type="button">
        {{ selectedTarget.replace('_', '-') }}
        <svg class="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
        </svg>
    </button>
    <div id="dropdownDevices" class="z-10 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700">
        <ul class="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="dropdownDeviceButton">
            <li v-for="target in store.$state.targets">
                <a class="block px-4 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white cursor-pointer" @click="store.setSelectedTarget(target)">
                    {{ target.hwModelSlug.replace('_', '-') }}
                </a>
            </li>
        </ul>
    </div>
</template>

<script lang="ts" setup>
import { useDeviceStore } from '../stores/deviceStore';

const store = useDeviceStore();
store.fetchList();

const selectedTarget = computed(() => store.$state.selectedTarget?.hwModel ? store.$state.selectedTarget?.hwModelSlug : "Select Target Device")

// client.createSerialConnection();
// console.log(client);
</script>