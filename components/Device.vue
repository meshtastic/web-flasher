<template>
  <div class="inline-flex items-center gap-2">
    <button
      id="selectDeviceButton"
      data-modal-target="device-modal"
      data-modal-toggle="device-modal"
      class="btn-primary"
      type="button"
    >
      {{ selectedTarget.replace('_', '-') }}
    </button>
    <button
      data-tooltip-target="tooltip-auto"
      class="btn-icon mx-2"
      type="button"
      @click="() => store.autoSelectHardware($t)"
    >
      <Rocket
        class="h-4 w-4"
        :style="{ willChange: cardHovered ? 'transform' : 'auto', transform: cardHovered ? 'translateZ(0)' : 'auto' }"
        :class="{ 'animate-bounce-in-place': cardHovered && !store.$state.selectedTarget?.hwModel }"
      />
    </button>
    <div
      id="tooltip-auto"
      role="tooltip"
      class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-theme transition-opacity duration-300 rounded-lg shadow-sm opacity-0 tooltip bg-surface-modal"
    >
      {{ $t('device.auto_detect') }}
      <div
        class="tooltip-arrow"
        data-popper-arrow
      />
    </div>
    <Teleport to="body">
      <div
        id="device-modal"
        tabindex="-1"
        aria-hidden="true"
        class="hidden fixed inset-0 z-[60] modal-backdrop backdrop-blur-sm px-4 sm:px-6 md:px-8 py-8 md:py-12"
      >
        <div class="flex min-h-full items-start justify-center">
          <div
            class="relative w-full max-w-6xl"
            :class="{ 'max-w-4xl': vendorCobrandingTag.length > 0, 'max-w-7xl': vendorCobrandingTag.length == 0 }"
          >
            <div class="modal-content relative flex flex-col max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl text-theme">
              <DeviceHeader />
              <div class="flex-1 overflow-y-auto">
                <div class="flex flex-col gap-3 py-3 px-3">
                  <div class="flex flex-wrap items-center gap-2 sm:gap-3 overflow-x-auto">
                    <button
                      type="button"
                      class="tag-pill tag-pill-active shrink-0"
                      @click="store.setSelectedTag('all')"
                    >
                      {{ $t('device.all_devices') }}
                    </button>
                    <button
                      v-if="vendorCobrandingTag.length === 0"
                      type="button"
                      class="tag-pill tag-pill-inactive shrink-0"
                      @click="store.setSelectedTag('RAK')"
                    >
                      RAK
                    </button>
                    <button
                      v-if="vendorCobrandingTag.length === 0"
                      type="button"
                      class="tag-pill tag-pill-inactive shrink-0"
                      @click="store.setSelectedTag('B&Q')"
                    >
                      B&Q
                    </button>
                    <button
                      v-if="vendorCobrandingTag.length === 0"
                      type="button"
                      class="tag-pill tag-pill-inactive shrink-0"
                      @click="store.setSelectedTag('LilyGo')"
                    >
                      LilyGo
                    </button>
                    <button
                      v-if="vendorCobrandingTag.length === 0"
                      type="button"
                      class="tag-pill tag-pill-inactive shrink-0"
                      @click="store.setSelectedTag('Seeed')"
                    >
                      Seeed
                    </button>
                    <button
                      v-if="vendorCobrandingTag.length === 0"
                      type="button"
                      class="tag-pill tag-pill-inactive shrink-0"
                      @click="store.setSelectedTag('Heltec')"
                    >
                      Heltec
                    </button>
                    <button
                      v-if="vendorCobrandingTag.length === 0"
                      type="button"
                      class="tag-pill tag-pill-inactive shrink-0"
                      @click="store.setSelectedTag('Elecrow')"
                    >
                      Elecrow
                    </button>
                    <button
                      v-if="vendorCobrandingTag.length === 0"
                      type="button"
                      class="tag-pill tag-pill-inactive shrink-0"
                      @click="store.setSelectedTag('M5Stack')"
                    >
                      M5Stack
                    </button>
                    <button
                      v-if="vendorCobrandingTag.length === 0"
                      type="button"
                      class="tag-pill tag-pill-inactive shrink-0"
                      @click="store.setSelectedTag('NomadStar')"
                    >
                      NomadStar
                    </button>
                    <button
                      v-if="vendorCobrandingTag.length === 0"
                      type="button"
                      class="tag-pill tag-pill-inactive shrink-0"
                      @click="store.setSelectedTag('muzi')"
                    >
                      muzi ᴡᴏʀᴋꜱ
                    </button>
                  </div>
                  <div class="flex flex-wrap items-center gap-2 sm:gap-3 overflow-x-auto">
                    <button
                      v-for="arch in store.allArchs"
                      :key="arch"
                      type="button"
                      class="tag-pill tag-pill-arch shrink-0"
                      @click="store.setSelectedTag(arch)"
                    >
                      {{ arch }}
                    </button>
                  </div>
                </div>
                <div
                  class="p-3 sm:p-4 mb-1 mx-3 my-3 text-xs sm:text-sm rounded-xl text-theme-muted step-card"
                  role="alert"
                >
                  <span class="font-medium">
                    <Info class="h-4 w-4 inline text-meshtastic" />
                    {{ $t('device.subheading') }} <button
                      type="button"
                      class="btn-primary inline-flex py-1.5 sm:py-2 mx-1 sm:mx-2 px-3 sm:px-4 text-xs sm:text-sm"
                      @click="() => store.autoSelectHardware($t)"
                    ><Rocket class="h-3 w-3 sm:h-4 sm:w-4" /> {{ $t('device.auto_detect') }}</button>
                  </span>
                </div>
                <div
                  v-if="vendorCobrandingTag.length === 0"
                  class="p-2 sm:p-3 m-1 sm:m-2 flex flex-wrap items-center justify-center gap-3"
                >
                  <div class="w-full text-center mb-2">
                    <h2 class="text-xl sm:text-xl font-semibold text-theme">
                      {{ $t('device.supported_devices') }}
                    </h2>
                  </div>
                  <div
                    v-for="device in uniqueDevices.filter(d => isSupporterDevice(d) && d.supportLevel != 3)"
                    :key="device.key"
                    class="device-card w-full sm:w-auto sm:max-w-sm"
                    @click="setSelectedTarget(device)"
                  >
                    <DeviceDetail :device="device" />
                  </div>
                  <div class="divider-glow my-4" />
                  <div
                    v-if="uniqueDevices.filter(d => !isSupporterDevice(d) || d.supportLevel == 3).length > 0"
                    class="w-full text-center"
                  >
                    <h2 class="text-xl sm:text-xl font-semibold text-warning">
                      {{ $t('device.diy_devices') }}
                    </h2>
                  </div>
                  <div
                    v-for="device in uniqueDevices.filter(d => !isSupporterDevice(d) || d.supportLevel == 3)"
                    :key="device.key"
                    class="device-card w-full sm:w-auto sm:max-w-sm"
                    @click="setSelectedTarget(device)"
                  >
                    <DeviceDetail :device="device" />
                  </div>
                </div>
                <div
                  v-else
                  class="p-2 sm:p-3 m-1 sm:m-2 flex flex-wrap items-center justify-center gap-3"
                >
                  <div
                    v-for="device in uniqueDevices"
                    :key="device.key"
                    class="device-card w-full sm:w-auto sm:max-w-sm"
                    @click="store.setSelectedTarget(device)"
                  >
                    <DeviceDetail :device="device" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
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
import { computed } from 'vue'

const { t } = useI18n()

defineProps<{
  cardHovered?: boolean
}>()

const store = useDeviceStore()
const firmwareStore = useFirmwareStore()
store.fetchList()

const uniqueDevices = computed(() => {
  const seen = new Set<string>()
  return store.sortedDevices.filter((device) => {
    const groupKey = device.key || `${device.hwModel}-${device.displayName}`
    if (seen.has(groupKey)) {
      return false
    }
    seen.add(groupKey)
    return true
  })
})

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
