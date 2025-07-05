<template>
    <div>
        <div class="flex gap-1">
            <button id="selectDeviceButton" data-modal-target="device-modal" data-modal-toggle="device-modal" class="flex justify-center items-center text-black bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg text-sm px-5 py-2.5 duration-150">
                {{ selectedTarget.replace('_', '-') }}
            </button>
            <button data-tooltip-target="tooltip-auto" class="flex items-center justify-center px-3 text-xs hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg text-white hover:text-black duration-150"
                @click="store.autoSelectHardware">
                <RocketLaunchIcon class="size-4" :class="{'animate-bounce': !store.selectedTarget?.hwModel }" />
            </button>
        </div>
        <div id="device-modal" tabindex="-1" aria-hidden="true" class="hidden fixed inset-0 z-50 size-full">
            <div class="p-4 size-full overflow-y-scroll" :class="[vendorCobrandingEnabled ? 'max-w-4xl' : 'max-w-8xl' ]">
                <div class="pb-4 rounded-lg shadow bg-gray-700">
                    <DeviceHeader />
                    <div class="mt-2 flex flex-wrap items-center justify-center gap-1">
                        <button @click="store.setSelectedTag('all')" class="filter-tag bg-green-800 hover:bg-green-700">
                            {{ $t('device.all_devices') }}
                        </button>
                        <template v-if="!vendorCobrandingEnabled">
                            <button @click="store.setSelectedTag('RAK')" class="filter-tag bg-gray-900 hover:bg-gray-800">RAK</button>
                            <button @click="store.setSelectedTag('B&Q')" class="filter-tag bg-gray-900 hover:bg-gray-800">B&Q</button>
                            <button @click="store.setSelectedTag('LilyGo')" class="filter-tag bg-gray-900 hover:bg-gray-800">LilyGo</button>
                            <button @click="store.setSelectedTag('Seeed')" class="filter-tag bg-gray-900 hover:bg-gray-800">Seeed</button>
                            <button @click="store.setSelectedTag('Heltec')" class="filter-tag bg-gray-900 hover:bg-gray-800">Heltec</button>
                            <button @click="store.setSelectedTag('Elecrow')" class="filter-tag bg-gray-900 hover:bg-gray-800">Elecrow</button>
                        </template>
                    </div>
                    <div class="mt-2 flex flex-wrap items-center justify-center gap-1">
                        <button @click="store.setSelectedTag(arch)" v-for="arch in store.allArchs" class="filter-tag bg-indigo-500 hover:bg-indigo-400">
                            {{ arch }}
                        </button>
                    </div>
                    <div class="p-4 mx-2 my-4 text-sm rounded-lg bg-gray-800 text-gray-100" role="alert">
                        <InformationCircleIcon class="size-4 inline" />
                        {{ $t('device.subheading') }}
                        <button @click="store.autoSelectHardware" class="bg-meshtastic flex items-center gap-2 py-2 px-3 mt-2 rounded-md hover:bg-white text-black duration-150">
                            <RocketLaunchIcon class="size-4" /> {{ $t('device.auto_detect') }}
                        </button>
                    </div>
                    <div class="flex flex-wrap items-center justify-center gap-2">
                        <template v-if="!vendorCobrandingEnabled">
                            <div class="w-full text-center">
                                <h2>{{ $t('device.supported_devices') }}</h2>
                            </div>
                            <div v-for="device in supportedDevices" class="device-card" @click="setSelectedTarget(device)">
                                <DeviceDetail :device="device" />
                            </div>
                            <hr class="w-full border-gray-400 my-2" />
                            <div v-if="diyDevices.length > 0" class="w-full text-center">
                                <h2 class="text-yellow-400">{{ $t('device.diy_devices') }}</h2>
                            </div>
                            <div v-for="device in diyDevices" class="device-card" @click="setSelectedTarget(device)">
                                <DeviceDetail :device="device" />
                            </div>
                        </template>
                        <template v-else>
                            <div v-for="device in store.sortedDevices" @click="store.setSelectedTarget(device)" class="device-card">
                                <DeviceDetail :device="device" />
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>


<script lang="ts" setup>
import type { DeviceHardware } from '~/types/api';
import {
  supportedVendorDeviceTags,
  vendorCobrandingTag,
} from '~/types/resources';

import {
  InformationCircleIcon,
  RocketLaunchIcon,
} from '@heroicons/vue/24/solid';

import { useDeviceStore } from '../stores/deviceStore';
import { useFirmwareStore } from '../stores/firmwareStore';
import DeviceDetail from './DeviceDetail.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const store = useDeviceStore();
const firmwareStore = useFirmwareStore();
store.fetchList();

const isSupporterDevice = (device: DeviceHardware) => {
  return device.tags?.some((tag: string) => supportedVendorDeviceTags.includes(tag));
}

const setSelectedTarget = (device: DeviceHardware) => {
  store.setSelectedTarget(device);
  firmwareStore.clearState();
}
const selectedTarget = computed(() => store.selectedTarget?.hwModel ? store.selectedTarget?.displayName : t('device.select_device'));

const vendorCobrandingEnabled = computed(() => vendorCobrandingTag.length > 0);
const supportedDevices = computed(() => store.sortedDevices.filter(d => isSupporterDevice(d) && d.supportLevel != 3))
const diyDevices = computed(() => store.sortedDevices.filter(d => !isSupporterDevice(d) || d.supportLevel == 3))
</script>

<style scoped>
    .filter-tag {
        @apply text-gray-100 border-gray-900 hover:border-gray-400 focus:ring focus:ring-gray-200 rounded-md text-xs p-2;
    }
    .device-card {
        @apply border hover:border-gray-300 border-gray-600 rounded-lg cursor-pointer hover:scale-105 hover:shadow-[0_35px_60px_-15px_rgba(200,200,200,.3)];
    }
</style>
