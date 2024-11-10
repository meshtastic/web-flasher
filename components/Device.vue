<template>
    <div>
        <button id="selectDeviceButton" data-modal-target="device-modal" data-modal-toggle="device-modal" class="display-inline content-center text-black bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center" type="button">
            {{ selectedTarget.replace('_', '-') }}
        </button>
        <div id="device-modal" tabindex="-1" aria-hidden="true" class="dark hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <div class="relative p-4 w-full max-w-8xl max-h-full">
                <div class="relative rounded-lg shadow bg-gray-700">
                    <DeviceHeader />
                    <div class="flex items-center justify-center py-2 flex-wrap">
                        <button @click="store.setSelectedTag('all')" type="button" class="text-gray-100 border-gray-900 hover:border-gray-400 bg-green-800 hover:bg-green-700 focus:ring focus:ring-gray-200 rounded-md text-xs px-2 py-2 text-center me-1">All Devices</button>
                        <button @click="store.setSelectedTag('Heltec')" type="button" class="text-gray-100 border-gray-900 hover:border-gray-400 bg-gray-900 hover:bg-gray-800 focus:ring focus:ring-gray-200 rounded-md text-xs px-2 py-2 text-center me-1">Heltec</button>
                        <button @click="store.setSelectedTag('RAK')" type="button" class="text-gray-100 border-gray-900 hover:border-gray-400 bg-gray-900 hover:bg-gray-800 focus:ring focus:ring-gray-200 rounded-md text-xs px-2 py-2 text-center me-1">RAK</button>
                        <button @click="store.setSelectedTag('LilyGo')" type="button" class="text-gray-100 border-gray-900 hover:border-gray-400 bg-gray-900 hover:bg-gray-800 focus:ring focus:ring-gray-200 rounded-md text-xs px-2 py-2 text-center me-1">LilyGo</button>
                        <button @click="store.setSelectedTag('Seeed')" type="button" class="text-gray-100 border-gray-900 hover:border-gray-400 bg-gray-900 hover:bg-gray-800 focus:ring focus:ring-gray-200 rounded-md text-xs px-2 py-2 text-center me-1">Seeed</button>
                        <br />
                        <button @click="store.setSelectedTag(arch)" v-for="arch in store.allArchs" type="button" class=" border-gray-900 focus:ring focus:ring-gray-200 hover:border-gray-700 bg-indigo-500 hover:bg-indigo-400 text-gray-100 rounded-md text-xs px-2 py-2 text-center me-1">{{ arch }}</button>
                    </div>
                    <div class="p-4 mb-1 m-2 text-sm rounded-lg bg-gray-800 text-gray-100" role="alert">
                            <span class="font-medium">
                                <InformationCircleIcon class="h-4 w-4 inline" />
                                If your connected device already has Meshtastic installed, you can automatically detect it: <button type="button" @click="store.autoSelectHardware" class="bg-meshtastic inline-flex py-2 px-3 text-sm font-medium rounded-md hover:bg-white text-black"><SparklesIcon class="h-4 w-4 text-black" /> Auto-detect</button>
                            </span>
                        </div>
                    <div class="p-2 m-2 flex flex-wrap items-center justify-center">
                        <div v-for="device in store.sortedDevices" class="max-w-sm border hover:border-gray-300 border-gray-600 rounded-lg m-2">
                            <div class="flex flex-col items-center p-2 w-56">
                                <h5 class="mb-1 text-sm text-white">{{ device.displayName }}</h5>
                                <div class="flex justify-start w-full">
                                    <span class="text-xs font-medium me-2 px-2.5 py-0.5 rounded bg-blue-900 text-gray-100">{{ device.architecture }}</span>
                                    <span v-for="tag in device.tags" class="text-xs font-medium px-2.5 py-0.5 rounded bg-indigo-500 text-gray-100 me-1">{{ tag }}</span>
                                </div>
                                <div v-if="device.images" class="relative w-32 h-32 m-2">
                                    <img v-for="(image, index) in device.images" :key="image" class="absolute inset-0 w-32 h-32" :style="{ left: `${index * 20}px` }" :src="`/img/devices/${image}`" :alt="device.displayName"/>
                                </div>
                                <img v-else class="w-32 h-32 m-2" src="/img/devices/unknown.svg" :alt="device.displayName"/>
                                <button @click="store.setSelectedTarget(device)" type="button" class="w-full text-sm py-1 font-medium text-center rounded-lg focus:ring-4 focus:outline-none bg-meshtastic hover:bg-white text-gray-900">Select</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import type { DeviceHardware } from '~/types/api';

import {
  InformationCircleIcon,
  SparklesIcon,
} from '@heroicons/vue/24/solid';

import { useDeviceStore } from '../stores/deviceStore';

const store = useDeviceStore();
store.fetchList();

const selectedTarget = computed(() => store.$state.selectedTarget?.hwModel ? store.$state.selectedTarget?.displayName : "Select Target Device")

</script>