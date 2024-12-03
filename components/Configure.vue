<template>
    <div class="relative w-full max-w-6xl max-h-full">
        <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
            <FlashHeader />
            <div class="p-4 md:p-5">
                <ol class="relative border-s border-gray-200 dark:border-gray-600 ms-3.5 mb-4 md:mb-5">
                    <li class="mb-10 ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -start-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                            1
                        </span>
                        <h3 class="flex items-start mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                            Set any user preferences before flashing
                        </h3>
                        <div>
                            <JsonEditorVue 
                                :model-value="store.$state.userPrefs"
                                :escape-control-characters="true" 
                                :stringified="true" 
                                :main-menu-bar="false" 
                                class="jse-theme-dark" />
                        </div>
                    </li>
                    <li class="mb-10 ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -start-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                            2
                        </span>
                        <h3 class="flex items-start mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                            Optionally choose a serial port if you wish to upload the firmware to a device
                        </h3>
                        <div>
                            <select class="block w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" v-model="store.$state.selectedPort">
                                <option value="" selected>Select a serial port</option>
                                <option v-for="port in store.$state.ports" :key="port" :value="port">{{ port }}</option>
                            </select>
                        </div>
                    </li>
                    <!-- <li class="ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -start-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                            3
                        </span>
                        <h3 class="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                            Flash firmware
                        </h3>
                        <label class="relative inline-flex items-center me-5 cursor-pointer" v-if="canFullInstall()">
                            <input type="checkbox" value="" class="sr-only peer" v-model="firmwareStore.$state.shouldCleanInstall">
                            <div class="w-11 h-6 rounded-full peer peer-focus:ring-4 bg-gray-400 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                            <span class="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">Full Erase and Install</span>
                        </label>
                        <label class="relative inline-flex items-center me-5 cursor-pointer" v-if="firmwareStore.$state.shouldCleanInstall && canBundleWebUI">
                            <input type="checkbox" value="" class="sr-only peer" v-model="firmwareStore.$state.shouldBundleWebUI">
                            <div class="w-11 h-6 rounded-full peer peer-focus:ring-4 bg-gray-400 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                            <span class="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">Bundle Web UI</span>
                        </label>
                        <div v-if="firmwareStore.$state.shouldCleanInstall" role="alert" class="flex flex-col p-4 mb-4 mt-2 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
                            <div class="flex items-center">
                                <InformationCircleIcon class="flex-shrink-0 inline w-4 h-4 mr-1" />
                                <span>
                                    Back up the device's public and private keys before a full erase and install to restore them after re-flashing if needed.
                                    <span v-if="firmwareStore.$state.shouldBundleWebUI">Additionally, bundling the Web UI will increase the flash utilization, taking away space from core usage and will take longer to install.</span>
                                </span>
                            </div>
                            <div class="flex items-center mt-2">
                                <LinkIcon class="h-4 w-4 mr-1 text-red-800 dark:text-red-400" />
                                <a href="https://meshtastic.org/docs/configuration/radio/security/#security-keys---backup-and-restore" target="_blank" class="underline text-red-800 dark:text-red-400">
                                    Check out this guide in our documentation.
                                </a>
                            </div>
                        </div>
                        <p>
                            This process could take a while. 
                        </p>
                        <div>
                            <div class="p-4 mb-4 my-2 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400" role="alert">
                                <span class="font-medium">
                                    <InformationCircleIcon class="h-4 w-4 inline" />
                                    After the flashing process is complete, you may need to press the RST button if the device does not reboot automatically or says "waiting to download" in the console.
                                </span>
                            </div>
                        </div>
                    </li> -->
                </ol>
                <div v-if="store.selectedEnv" class="mb-2">
                    <button v-if="showBuildButton"
                        class="text-black inline-flex w-full justify-center bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center" @click="store.build">
                        {{ store.$state.isUpload ? 'Upload and Monitor' : 'Build Firmware' }}
                    </button>
                    <!-- <button v-if="firmwareStore.$state.flashPercentDone > 0 && !firmwareStore.$state.isFlashing"
                        class="text-black inline-flex w-full justify-center bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center" @click="startOver">
                        Start Over
                    </button> -->
                </div>
                <div id="terminal"></div>
                <div v-if="!store.$state.isBuilding && store.$state.manifest.length > 0" class="mt-2 flex items-center justify-center">
                    <button v-for="file in store.$state.manifest" 
                        @click="store.download(file)"
                        type="button" 
                        class="text-black mx-2 inline-flex justify-center bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center">
                        <ArrowDownTrayIcon class="w-4 h-4 mr-1" />
                        {{ file }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import '@/node_modules/xterm/css/xterm.css'
import 'vanilla-jsoneditor/themes/jse-theme-dark.css'
import JsonEditorVue from 'json-editor-vue'

import FlashHeader from './FlashHeader.vue'
import { useBuilderStore } from '../stores/builderStore'
import { ArrowDownTrayIcon } from '@heroicons/vue/24/solid'

const store = useBuilderStore();
store.fetchPrefs();

const showBuildButton = computed(() => {
    return store.$state.selectedEnv && !store.$state.isBuilding;
})

</script>
