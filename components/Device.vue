<template>
  <div>
    <button
      id="selectDeviceButton"
      data-modal-target="device-modal"
      data-modal-toggle="device-modal"
      class="display-inline content-center text-black bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center"
      type="button"
    >
      {{ selectedTarget.replace('_', '-') }}
    </button>
    <button
      data-tooltip-target="tooltip-auto"
      class="mx-2 display-inline content-center px-3 py-2 text-xs font-medium text-center  hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg inline-flex items-center text-white hover:text-black"
      type="button"
      @click="() => store.autoSelectHardware($t)"
    >
      <Rocket
        class="h-4 w-4"
        :class="{ 'animate-bounce': !store.$state.selectedTarget?.hwModel }"
      />
    </button>
    <div
      id="tooltip-auto"
      role="tooltip"
      class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 rounded-lg shadow-sm opacity-0 tooltip bg-gray-700"
    >
      {{ $t('device.auto_detect') }}
      <div
        class="tooltip-arrow"
        data-popper-arrow
      />
    </div>
    <div
      id="device-modal"
      tabindex="-1"
      aria-hidden="true"
      class="dark hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full"
    >
      <div
        class="relative p-2 sm:p-4 w-full max-h-full"
        :class="{ 'max-w-4xl': vendorCobrandingTag.length > 0, 'max-w-7xl': vendorCobrandingTag.length == 0 }"
      >
        <div class="relative rounded-lg shadow bg-zinc-700">
          <DeviceHeader />
          <div class="flex items-center justify-center py-2 px-2 overflow-x-auto">
            <button
              type="button"
              class="text-gray-100 border-gray-900 hover:border-gray-400 bg-green-800 hover:bg-green-700 focus:ring focus:ring-gray-200 rounded-md text-xs px-2 py-1.5 text-center me-1 whitespace-nowrap flex-shrink-0"
              @click="store.setSelectedTag('all')"
            >
              {{ $t('device.all_devices') }}
            </button>
            <button
              v-if="vendorCobrandingTag.length === 0"
              type="button"
              class="text-gray-100 border-gray-900 hover:border-gray-400 bg-gray-900 hover:bg-gray-800 focus:ring focus:ring-gray-200 rounded-md text-xs px-2 py-1.5 text-center me-1 whitespace-nowrap flex-shrink-0"
              @click="store.setSelectedTag('RAK')"
            >
              RAK
            </button>
            <button
              v-if="vendorCobrandingTag.length === 0"
              type="button"
              class="text-gray-100 border-gray-900 hover:border-gray-400 bg-gray-900 hover:bg-gray-800 focus:ring focus:ring-gray-200 rounded-md text-xs px-2 py-1.5 text-center me-1 whitespace-nowrap flex-shrink-0"
              @click="store.setSelectedTag('B&Q')"
            >
              B&Q
            </button>
            <button
              v-if="vendorCobrandingTag.length === 0"
              type="button"
              class="text-gray-100 border-gray-900 hover:border-gray-400 bg-gray-900 hover:bg-gray-800 focus:ring focus:ring-gray-200 rounded-md text-xs px-2 py-1.5 text-center me-1 whitespace-nowrap flex-shrink-0"
              @click="store.setSelectedTag('LilyGo')"
            >
              LilyGo
            </button>
            <button
              v-if="vendorCobrandingTag.length === 0"
              type="button"
              class="text-gray-100 border-gray-900 hover:border-gray-400 bg-gray-900 hover:bg-gray-800 focus:ring focus:ring-gray-200 rounded-md text-xs px-2 py-1.5 text-center me-1 whitespace-nowrap flex-shrink-0"
              @click="store.setSelectedTag('Seeed')"
            >
              Seeed
            </button>
            <button
              v-if="vendorCobrandingTag.length === 0"
              type="button"
              class="text-gray-100 border-gray-900 hover:border-gray-400 bg-gray-900 hover:bg-gray-800 focus:ring focus:ring-gray-200 rounded-md text-xs px-2 py-1.5 text-center me-1 whitespace-nowrap flex-shrink-0"
              @click="store.setSelectedTag('Heltec')"
            >
              Heltec
            </button>
            <button
              v-if="vendorCobrandingTag.length === 0"
              type="button"
              class="text-gray-100 border-gray-900 hover:border-gray-400 bg-gray-900 hover:bg-gray-800 focus:ring focus:ring-gray-200 rounded-md text-xs px-2 py-1.5 text-center me-1 whitespace-nowrap flex-shrink-0"
              @click="store.setSelectedTag('Elecrow')"
            >
              Elecrow
            </button>
            <button
              v-if="vendorCobrandingTag.length === 0"
              type="button"
              class="text-gray-100 border-gray-900 hover:border-gray-400 bg-gray-900 hover:bg-gray-800 focus:ring focus:ring-gray-200 rounded-md text-xs px-2 py-1.5 text-center me-1 whitespace-nowrap flex-shrink-0"
              @click="store.setSelectedTag('M5Stack')"
            >
              M5Stack
            </button>
            <button
              v-if="vendorCobrandingTag.length === 0"
              type="button"
              class="text-gray-100 border-gray-900 hover:border-gray-400 bg-gray-900 hover:bg-gray-800 focus:ring focus:ring-gray-200 rounded-md text-xs px-2 py-1.5 text-center me-1 whitespace-nowrap flex-shrink-0"
              @click="store.setSelectedTag('NomadStar')"
            >
              NomadStar
            </button>
            <button
              v-if="vendorCobrandingTag.length === 0"
              type="button"
              class="text-gray-100 border-gray-900 hover:border-gray-400 bg-gray-900 hover:bg-gray-800 focus:ring focus:ring-gray-200 rounded-md text-xs px-2 py-1.5 text-center me-1 whitespace-nowrap flex-shrink-0"
              @click="store.setSelectedTag('muzi')"
            >
              muzi ᴡᴏʀᴋꜱ
            </button>
            <br>
            <button
              v-for="arch in store.allArchs"
              type="button"
              class="border-gray-900 focus:ring focus:ring-gray-200 hover:border-gray-700 bg-indigo-500 hover:bg-indigo-400 text-gray-100 rounded-md text-xs px-2 py-1.5 text-center me-1 whitespace-nowrap flex-shrink-0"
              @click="store.setSelectedTag(arch)"
            >
              {{ arch }}
            </button>
          </div>
          <div
            class="p-3 sm:p-4 mb-1 mx-2 my-2 text-xs sm:text-sm rounded-lg bg-gray-800 text-gray-100"
            role="alert"
          >
            <span class="font-medium">
              <Info class="h-4 w-4 inline" />
              {{ $t('device.subheading') }} <button
                type="button"
                class="bg-meshtastic inline-flex py-1.5 sm:py-2 mx-1 sm:mx-2 px-2 sm:px-3 text-xs sm:text-sm font-medium rounded-md hover:bg-white text-black"
                @click="() => store.autoSelectHardware($t)"
              ><Rocket class="h-3 w-3 sm:h-4 sm:w-4 text-black" /> {{ $t('device.auto_detect') }}</button>
            </span>
          </div>
          <div
            v-if="vendorCobrandingTag.length === 0"
            class="p-1 sm:p-2 m-1 sm:m-2 flex flex-wrap items-center justify-center"
          >
            <div class="w-full text-center">
              <h2 class="text-lg sm:text-xl">
                {{ $t('device.supported_devices') }}
              </h2>
            </div>
            <div
              v-for="device in store.sortedDevices.filter(d => isSupporterDevice(d) && d.supportLevel != 3)"
              class="w-full sm:w-auto sm:max-w-sm border hover:border-gray-300 border-gray-600 rounded-lg m-1 sm:m-2 cursor-pointer hover:scale-105 shadow hover:shadow-[0_35px_60px_-15px_rgba(200,200,200,.3)]"
              @click="setSelectedTarget(device)"
            >
              <DeviceDetail :device="device" />
            </div>
            <hr class="w-full border-gray-400 my-4">
            <div
              v-if="store.sortedDevices.filter(d => !isSupporterDevice(d) || d.supportLevel == 3).length > 0"
              class="w-full text-center"
            >
              <h2 class="text-lg sm:text-xl text-yellow-400">
                {{ $t('device.diy_devices') }}
              </h2>
            </div>
            <div
              v-for="device in store.sortedDevices.filter(d => !isSupporterDevice(d) || d.supportLevel == 3)"
              class="w-full sm:w-auto sm:max-w-sm border hover:border-gray-300 border-gray-600 rounded-lg m-1 sm:m-2 cursor-pointer hover:scale-105 shadow hover:shadow-2xl"
              @click="setSelectedTarget(device)"
            >
              <DeviceDetail :device="device" />
            </div>
          </div>
          <div
            v-else
            class="p-1 sm:p-2 m-1 sm:m-2 flex flex-wrap items-center justify-center"
          >
            <div
              v-for="device in store.sortedDevices"
              class="w-full sm:w-auto sm:max-w-sm border hover:border-gray-300 border-gray-600 rounded-lg m-1 sm:m-2 cursor-pointer hover:scale-105 hover:shadow-2xl"
              @click="store.setSelectedTarget(device)"
            >
              <DeviceDetail :device="device" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { DeviceHardware } from '~/types/api'
import {
  supportedVendorDeviceTags,
  vendorCobrandingTag,
} from '~/types/resources'

import {
  Info,
  Rocket,
} from 'lucide-vue-next'

import { useDeviceStore } from '../stores/deviceStore'
import { useFirmwareStore } from '../stores/firmwareStore'
import DeviceDetail from './DeviceDetail.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const store = useDeviceStore()
const firmwareStore = useFirmwareStore()
store.fetchList()

const isSupporterDevice = (device: DeviceHardware) => {
  return device.tags?.some((tag: string) => supportedVendorDeviceTags.includes(tag))
}

const setSelectedTarget = (device: DeviceHardware) => {
  store.setSelectedTarget(device)
  firmwareStore.clearState()

  // Auto-select MUI for devices that support it (after clearing state)
  if (device.hasMui === true) {
    firmwareStore.$state.shouldInstallMui = true
  }
}

const selectedTarget = computed(() => store.$state.selectedTarget?.hwModel ? store.$state.selectedTarget?.displayName : t('device.select_device'))
</script>
