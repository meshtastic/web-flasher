<template>
  <div>
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
        :class="{ 'animate-bounce': !store.$state.selectedTarget?.hwModel }"
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
        class="hidden fixed inset-0 z-[50] flex items-start justify-center modal-backdrop backdrop-blur-sm px-4 sm:px-6 md:px-8 py-8 md:py-12"
      >
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
                class="tag-pill shrink-0"
                :class="store.tag ? 'tag-pill-inactive' : 'tag-pill-active'"
                @click="store.setSelectedTag('all')"
              >
                {{ $t('device.all_devices') }}
                <span class="tag-pill-count">{{ store.targets.length }}</span>
              </button>
              <button
                v-for="filter in vendorFilters"
                :key="filter.tag"
                type="button"
                class="tag-pill shrink-0"
                :class="store.tag === filter.tag ? 'tag-pill-active' : 'tag-pill-inactive'"
                @click="store.setSelectedTag(filter.tag)"
              >
                <span
                  v-if="filter.dotClass"
                  class="w-1.5 h-1.5 rounded-full me-[7px] shrink-0"
                  :class="filter.dotClass"
                />
                {{ filter.label }}
                <span class="tag-pill-count">{{ filter.count }}</span>
              </button>
            </div>
            <div class="flex flex-wrap items-center gap-2 sm:gap-3 overflow-x-auto">
              <button
                v-for="arch in store.allArchs"
                :key="arch"
                type="button"
                class="tag-pill shrink-0"
                :class="store.tag === arch ? 'tag-pill-arch-active' : 'tag-pill-arch'"
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
              <h2
                v-if="supportedDevices.length > 0"
                class="text-xl sm:text-xl font-semibold text-tier-supported"
              >
                {{ $t('device.supported_devices') }}
              </h2>
              <p class="max-w-xl mx-auto mt-2 text-[11px] leading-[1.55] text-theme-muted">
                {{ $t('device.affiliate_disclosure') }}
              </p>
            </div>
            <div
              v-for="device in supportedDevices"
              :key="device.key || `${device.hwModel}-${device.displayName}`"
              class="device-card w-full sm:w-auto sm:max-w-sm"
              @click="setSelectedTarget(device)"
            >
              <DeviceDetail :device="device" />
            </div>
            <template v-if="makerDevices.length > 0">
              <div
                v-if="supportedDevices.length > 0"
                class="divider-glow my-4"
              />
              <div class="w-full text-center mb-2">
                <h2 class="text-xl sm:text-xl font-semibold text-tier-maker">
                  {{ $t('device.maker_devices') }}
                </h2>
              </div>
              <div
                v-for="device in makerDevices"
                :key="device.key || `${device.hwModel}-${device.displayName}`"
                class="device-card w-full sm:w-auto sm:max-w-sm"
                @click="setSelectedTarget(device)"
              >
                <DeviceDetail :device="device" />
              </div>
            </template>
            <template v-if="communityDevices.length > 0">
              <div
                v-if="supportedDevices.length > 0 || makerDevices.length > 0"
                class="divider-glow my-4"
              />
              <div class="w-full text-center">
                <h2 class="text-xl sm:text-xl font-semibold text-tier-community">
                  {{ $t('device.diy_devices') }}
                </h2>
              </div>
              <div
                v-for="device in communityDevices"
                :key="device.key || `${device.hwModel}-${device.displayName}`"
                class="device-card w-full sm:w-auto sm:max-w-sm"
                @click="setSelectedTarget(device)"
              >
                <DeviceDetail :device="device" />
              </div>
            </template>
          </div>
              <div
                v-else
                class="p-2 sm:p-3 m-1 sm:m-2 flex flex-wrap items-center justify-center gap-3"
              >
                <div class="w-full text-center mb-2">
                  <p class="max-w-xl mx-auto mt-2 text-[11px] leading-[1.55] text-theme-muted">
                    {{ $t('device.affiliate_disclosure') }}
                  </p>
                </div>
                <div
                  v-for="device in uniqueDevices"
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
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import type { DeviceHardware } from '~/types/api'
import { vendorCobrandingTag } from '~/types/resources'
import { MAKER_TIER_FILTER, deviceTier } from '~/utils/deviceTier'

import {
  Info,
  Rocket,
} from 'lucide-vue-next'

import { shouldAutoSelectMui, useDeviceStore } from '../stores/deviceStore'
import { useFirmwareStore } from '../stores/firmwareStore'
import DeviceDetail from './DeviceDetail.vue'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const { t } = useI18n()

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

/**
 * The Backer/Partner vendors, in the order the row has always shown them.
 * `supportedVendorDeviceTags` also carries DIY, which is a build style rather
 * than a vendor and has never had a pill.
 */
const VENDOR_FILTERS: { tag: string, label: string }[] = [
  { tag: 'RAK', label: 'RAK' },
  { tag: 'B&Q', label: 'B&Q' },
  { tag: 'LilyGo', label: 'LilyGo' },
  { tag: 'Seeed', label: 'Seeed' },
  { tag: 'Heltec', label: 'Heltec' },
  { tag: 'Elecrow', label: 'Elecrow' },
  { tag: 'M5Stack', label: 'M5Stack' },
  { tag: 'NomadStar', label: 'NomadStar' },
  { tag: 'muzi', label: 'muzi ᴡᴏʀᴋꜱ' },
]

/**
 * Vendor pills with the number of boards behind each, and the Makers pill
 * last. Counts come from the unfiltered target list, so they stay put while a
 * filter is applied and a pill never becomes the one you cannot get back to.
 * A vendor the registry currently ships nothing for gets no pill rather than
 * one that filters to an empty modal.
 */
const vendorFilters = computed(() => {
  const counts = new Map<string, number>()
  for (const device of store.targets) {
    for (const tag of device.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  const filters = VENDOR_FILTERS
    .map(vendor => ({ ...vendor, count: counts.get(vendor.tag) ?? 0, dotClass: '' }))
    .filter(vendor => vendor.count > 0)

  const makerCount = store.targets.filter(d => deviceTier(d) === 'maker').length
  if (makerCount > 0) {
    filters.push({
      tag: MAKER_TIER_FILTER,
      label: t('device.makers'),
      count: makerCount,
      dotClass: 'bg-tier-maker',
    })
  }
  return filters
})

// sortedDevices already orders by tier, so each band keeps the store's order.
const supportedDevices = computed(() => uniqueDevices.value.filter(d => deviceTier(d) === 'supported'))
const makerDevices = computed(() => uniqueDevices.value.filter(d => deviceTier(d) === 'maker'))
const communityDevices = computed(() => uniqueDevices.value.filter(d => deviceTier(d) === 'community'))

const setSelectedTarget = (device: DeviceHardware) => {
  store.setSelectedTarget(device)
  firmwareStore.clearState()

  if (shouldAutoSelectMui(device)) {
    firmwareStore.$state.shouldInstallMui = true
  }
}

const selectedTarget = computed(() => store.$state.selectedTarget?.hwModel ? store.$state.selectedTarget?.displayName : t('device.select_device'))
</script>
