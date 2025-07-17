<template>
    <div class="flex flex-col items-center p-2 w-56">
        <p class="text-[0.8rem] text-white" :class="{ 'text-yellow-400': !isSupporterDevice(props.device) }">
            {{ props.device.displayName }}
            <CheckBadgeIcon v-if="isSupporterDevice(props.device)" class="state-badge text-green-400" />
            <ShieldExclamationIcon v-else class="state-badge text-yellow-400" />
        </p>
        <div class="flex flex-wrap self-start items-center gap-1 my-1">
            <div class="vendor-tag bg-blue-900">
                {{ props.device.architecture }}
            </div>
            <div v-for="tag in props.device.tags" class="vendor-tag bg-indigo-500">
                {{ tag }}
            </div>
            <img v-if="props.device.hasMui" src="/img/Meshtastic-UI-Short.svg" class="h-5" alt="Meshtastic UI" />
        </div>
        <div v-if="props.device.images && isSupporterDevice(props.device)" class="device-img relative">
            <img v-for="(image, index) in props.device.images" :key="image" class="absolute inset-0 size-full" :style="{ left: `${index * 20}px` }" :src="`/img/devices/${image}`" :alt="props.device.displayName"/>
        </div>
        <img v-else class="device-img" :src="`/img/devices/unknown.svg`" :alt="props.device.displayName"/>
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

const isSupporterDevice = (device: DeviceHardware) => {
    return device.tags?.some(t => supportedVendorDeviceTags.includes(t));
};
</script>

<style scoped>
.state-badge {
    @apply inline size-6 opacity-75;
}
.vendor-tag {
    @apply flex items-center;
    @apply h-6 px-2.5 rounded;
    @apply text-xs text-gray-100;
}
.device-img {
    @apply size-32 m-2;
}
</style>