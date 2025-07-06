<template>
    <div>
        <div class="flex gap-1">
            <button id="selectDeviceButton" data-modal-target="device-modal" data-modal-toggle="device-modal" class="button-template text-sm px-5 py-2.5 text-black bg-meshtastic">
                {{ selectedTarget.replace('_', '-') }}
            </button>
            <button data-tooltip-target="tooltip-auto" class="button-template px-3 text-white hover:text-black"
                @click="store.autoSelectHardware">
                <RocketLaunchIcon class="size-4" :class="{'animate-bounce': !store.selectedTarget?.hwModel }" />
            </button>
        </div>
        <div id="device-modal" tabindex="-1" aria-hidden="true" class="device-modal-main hidden">
            <div class="device-modal-wrapper" :class="[vendorCobrandingEnabled ? 'max-w-4xl' : 'max-w-8xl' ]">
                <div class="device-modal">
                    <DeviceHeader />
                    <div class="vendor-tag-wrapper">
                        <button @click="store.setSelectedTag('all')" class="vendor-tag bg-green-800 hover:bg-green-700">
                            {{ $t('device.all_devices') }}
                        </button>
                        <template v-if="!vendorCobrandingEnabled">
                            <button @click="store.setSelectedTag('RAK')" class="vendor-tag bg-gray-900 hover:bg-gray-800">RAK</button>
                            <button @click="store.setSelectedTag('B&Q')" class="vendor-tag bg-gray-900 hover:bg-gray-800">B&Q</button>
                            <button @click="store.setSelectedTag('LilyGo')" class="vendor-tag bg-gray-900 hover:bg-gray-800">LilyGo</button>
                            <button @click="store.setSelectedTag('Seeed')" class="vendor-tag bg-gray-900 hover:bg-gray-800">Seeed</button>
                            <button @click="store.setSelectedTag('Heltec')" class="vendor-tag bg-gray-900 hover:bg-gray-800">Heltec</button>
                            <button @click="store.setSelectedTag('Elecrow')" class="vendor-tag bg-gray-900 hover:bg-gray-800">Elecrow</button>
                        </template>
                    </div>
                    <div class="vendor-tag-wrapper">
                        <button @click="store.setSelectedTag(arch)" v-for="arch in store.allArchs" class="vendor-tag bg-indigo-500 hover:bg-indigo-400">
                            {{ arch }}
                        </button>
                    </div>
                    <div class="p-4 mx-2 my-4 text-sm rounded-lg bg-gray-800 text-gray-100">
                        <InformationCircleIcon class="inline size-4" />
                        {{ $t('device.subheading') }}
                        <button @click="store.autoSelectHardware" class="block bg-meshtastic py-2 px-3 mt-2 rounded-md hover:bg-white text-black duration-150">
                            <RocketLaunchIcon class="inline size-4" /> {{ $t('device.auto_detect') }}
                        </button>
                    </div>
                    <div class="flex flex-wrap items-center justify-center gap-4">
                        <template v-if="!vendorCobrandingEnabled">
                            <h2 class="section-heading">
                                {{ $t('device.supported_devices') }}
                            </h2>
                            <div v-for="device in supportedDevices" class="device-card" @click="setSelectedTarget(device)">
                                <DeviceDetail :device="device" />
                            </div>
                            <hr class="section-divider" />
                            <h2 v-if="diyDevices.length > 0" class="section-heading text-yellow-400">
                                {{ $t('device.diy_devices') }}
                            </h2>
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

  // Auto-select MUI for devices that support it (after clearing state)
  if (device.hasMui === true) {
    firmwareStore.$state.shouldInstallMui = true;
  }
}
const selectedTarget = computed(() => store.selectedTarget?.hwModel ? store.selectedTarget?.displayName : t('device.select_device'));

const vendorCobrandingEnabled = computed(() => vendorCobrandingTag.length > 0);
const supportedDevices = computed(() => store.sortedDevices.filter(d => isSupporterDevice(d) && d.supportLevel != 3))
const diyDevices = computed(() => store.sortedDevices.filter(d => !isSupporterDevice(d) || d.supportLevel == 3))
</script>

<style scoped>
    .button-template {
        @apply rounded-lg;
        @apply duration-150 hover:bg-gray-200;
        @apply focus:ring focus:outline-none focus:ring-blue-300;
    }

    .vendor-tag-wrapper {
        @apply mt-2 flex flex-wrap items-center justify-center gap-1;
    }
    .vendor-tag {
        @apply p-2 text-xs text-gray-100;
        @apply rounded-md;
        @apply focus:ring focus:outline-none focus:ring-gray-200;
        @apply duration-150;
    }

    .device-modal-main {
        @apply fixed inset-0 z-50 size-full;
    }
    .device-modal-wrapper {
        @apply p-4 size-full overflow-y-scroll;
    }
    .device-modal {
        @apply pb-4 rounded-lg shadow bg-gray-700;
    }
    .device-card {
        @apply rounded-lg border border-gray-600 hover:border-gray-300;
        @apply hover:scale-105 hover:shadow-[0_35px_60px_-15px_rgba(200,200,200,.3)];
        @apply cursor-pointer;
    }
    .section-divider {
        @apply w-full border-gray-400 my-2;
    }
    .section-heading {
        @apply w-full text-center text-2xl;
    }
</style>
