<template>
    <div class="flex flex-col items-center p-2 w-56">
        <h5 class="mb-1 text-[0.8rem] text-white" :class="{ 'text-yellow-400': !isSupporterDevice(props.device) }">
            {{ props.device.displayName }}
            <div class="float-right items-center mx-1">
              <CheckBadgeIcon v-if="isSupporterDevice(props.device)" class="w-6 h-6 text-green-400 opacity-75" />
              <ShieldExclamationIcon v-else class="w-6 h-6 text-yellow-400 opacity-75" />
            </div>
        </h5>
        <div class="flex justify-start w-full">
            <span class="text-xs font-medium me-2 px-2.5 py-0.5  h-6 rounded bg-blue-900 text-gray-100">{{ props.device.architecture }}</span>
            <span v-for="tag in props.device.tags" class="text-xs font-medium px-2.5 py-0.5 h-6 rounded bg-indigo-500 text-gray-100 me-1">{{ tag }}</span>
            <img v-if="props.device.hasMui && isPreviewUnlocked()" src="/img/Meshtastic-UI-Short.svg" class="h-6 m-1 pb-1" alt="Meshtastic UI" />
        </div>
        <div v-if="props.device.images && isSupporterDevice(props.device)" class="relative w-32 h-32 m-2">
            <img v-for="(image, index) in props.device.images" :key="image" class="absolute inset-0 w-32 h-32" :style="{ left: `${index * 20}px` }" :src="`/img/devices/${image}`" :alt="props.device.displayName"/>
        </div>
        <img v-else class="w-32 h-32 m-2" :src="`/img/devices/unknown.svg`" :alt="props.device.displayName"/>
    </div>
</template>

<script lang="ts" setup>
import type { DeviceHardware } from '~/types/api';
import { supportedVendorDeviceTags } from '~/types/resources';
import { useFirmwareStore } from '../stores/firmwareStore';

const firmwareStore = useFirmwareStore();

import {
  CheckBadgeIcon,
  ShieldExclamationIcon,
} from '@heroicons/vue/24/solid';

const props = defineProps({
  device: {
    type: Object as PropType<DeviceHardware>,
    required: true,
  },
})

const isPreviewUnlocked = () => false;//firmwareStore.$state.prereleaseUnlocked;
const isSupporterDevice = (device: DeviceHardware) => {
    // Add your logic to determine if the device is a supporter device
    return device.tags?.some(t => supportedVendorDeviceTags.includes(t));
};
</script>