<template>
  <div class="flex flex-col items-center p-2 w-full sm:w-56">
    <h5
      class="mb-1 text-md sm:text-[0.75rem] text-white"
      :class="{ 'text-yellow-400': !isSupporterDevice(props.device) }"
    >
      {{ props.device.displayName }}
      <div class="float-right items-center mx-1">
        <BadgeCheck
          v-if="isSupporterDevice(props.device)"
          class="w-6 h-6 text-green-400 opacity-75"
        />
        <ShieldAlert
          v-else
          class="w-6 h-6 text-yellow-400 opacity-75"
        />
      </div>
    </h5>
    <div class="flex justify-start w-full">
      <span class="text-xs font-medium me-2 px-2.5 py-0.5 h-6 rounded bg-blue-900 text-gray-100">
        {{ props.device.architecture.replace('-', '') }}
      </span>
      <span
        v-for="tag in props.device.tags"
        class="text-xs font-medium px-2.5 py-0.5 h-6 rounded bg-indigo-500 text-gray-100 me-1"
      >
        {{ tag }}
      </span>
      <img
        v-if="props.device.hasMui"
        src="/img/Meshtastic-UI-Short.svg"
        class="h-6 m-1 pb-1"
        alt="Meshtastic UI"
      >
    </div>
    <div
      v-if="props.device.images && isSupporterDevice(props.device)"
      class="relative w-24 h-24 sm:w-32 sm:h-32 m-2"
    >
      <img
        v-for="(image, index) in props.device.images"
        :key="image"
        class="absolute inset-0 w-24 h-24 sm:w-32 sm:h-32"
        :style="{ left: `${index * 15}px` }"
        :src="`/img/devices/${image}`"
        :alt="props.device.displayName"
      >
    </div>
    <img
      v-else
      class="w-24 h-24 sm:w-32 sm:h-32 m-2"
      :src="`/img/devices/unknown.svg`"
      :alt="props.device.displayName"
    >
    <div class="flex justify-start w-full">
      <div
        v-if="props.device.supportLevel! < 3"
        class="product-link"
      >
        <a
          :href="deviceUrl"
          target="_blank"
          rel="noopener"
          title="Manufacturer page (external link)"
          class="text-gray-100 hover:text-white"
        >
          <Link2Icon class="w-6 h-6 text-meshtastic transition-transform duration-300 ease-in-out hover:scale-110 hover:rotate-12 cursor-default" />
        </a>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { DeviceHardware } from '~/types/api'
import { supportedVendorDeviceTags } from '~/types/resources'
import { useFirmwareStore } from '../stores/firmwareStore'
import { computed } from 'vue'

import {
  BadgeCheck,
  ShieldAlert,
  Link2Icon,
} from 'lucide-vue-next'

const firmwareStore = useFirmwareStore()

const props = defineProps({
  device: {
    type: Object as PropType<DeviceHardware>,
    required: true,
  },
})

const isSupporterDevice = (device: DeviceHardware) => {
  // Add your logic to determine if the device is a supporter device
  return device.tags?.some(t => supportedVendorDeviceTags.includes(t))
}

const deviceUrl = computed(() => {
  if (props.device.url) {
    return props.device.url
  }
  return `https://msh.to/${props.device.platformioTarget}`
})
</script>
