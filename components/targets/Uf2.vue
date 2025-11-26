<template>
  <div class="relative p-4 w-full max-w-4xl max-h-full">
    <div class="relative rounded-lg shadow bg-zinc-700">
      <FlashHeader />
      <div class="p-4 md:p-5">
        <ReleaseNotes />
        <ol
          v-if="firmwareStore.canShowFlash"
          class="relative border-s border-gray-200 border-gray-600 ms-3.5 mb-4 md:mb-5"
        >
          <li class="mb-10 ms-8">
            <span class="absolute flex items-center justify-center w-6 h-6 rounded-full -start-3 ring-8 bg-cyan-900 text-gray-100 ring-gray-900">
              1
            </span>
            <h3 class="flex items-start mb-1 text-lg font-semibold text-white">
              {{ $t('flash.uf2.enter_dfu_mode') }}
            </h3>
            <div
              class="p-4 mb-4 my-2 text-sm rounded-lg bg-blue-50 bg-gray-800 text-blue-200"
              role="alert"
            >
              <span class="font-medium">
                <Info class="h-4 w-4 inline" />
                {{ $t('flash.uf2.dfu_firmware_clause') }} &lt; {{ deviceStore.enterDfuVersion }}, {{ $t('flash.uf2.dfu_firmware_clause_2') }} {{ deviceStore.dfuStepAction }}
              </span>
            </div>
            <button
              type="button"
              class="inline-flex items-center py-2 px-3 text-sm font-medium focus:outline-none bg-meshtastic rounded-lg hover:bg-white focus:z-10 focus:ring-4 focus:ring-gray-200 text-black"
              @click="() => deviceStore.enterDfuMode($t)"
            >
              <FolderDown class="h-4 w-4 text-black" />
              {{ $t('flash.uf2.enter_dfu') }}
            </button>
          </li>
          <li class="mb-10 ms-8">
            <span class="absolute flex items-center justify-center w-6 h-6 rounded-full -start-3 ring-8 bg-cyan-900 text-gray-100 ring-gray-900">
              2
            </span>
            <h3 class="flex items-start mb-1 text-lg font-semibold text-white">
              {{ $t('flash.uf2.ensure_drive_mounted') }}
            </h3>
            <span>
              {{ $t('flash.uf2.drive_name_info') }}
            </span>
            <div>
              <img
                v-if="deviceStore.isSelectedNrf"
                src="@/assets/img/dfu.png"
                :alt="$t('flash.uf2.dfu_drive')"
              >
              <img
                v-else
                src="@/assets/img/uf2_rp2040.png"
                :alt="$t('flash.uf2.dfu_drive')"
              >
            </div>
          </li>
          <li class="ms-8">
            <span class="absolute flex items-center justify-center w-6 h-6 rounded-full -start-3 ring-8 bg-cyan-900 text-gray-100 ring-gray-900">
              3
            </span>
            <h3 class="mb-1 text-lg font-semibold text-white">
              {{ $t('flash.uf2.download_copy_uf2') }}
            </h3>
            <span>
              {{ $t('flash.uf2.copy_instructions') }}
            </span>
            <div
              class="p-4 mb-4 my-2 text-sm rounded-lg bg-blue-50 bg-gray-800 text-blue-200"
              role="alert"
            >
              <span class="font-medium">
                <Info class="h-4 w-4 inline" />
                {{ $t('flash.uf2.auto_reboot_warning') }}
              </span>
            </div>
          </li>
          <li>
            <label
              v-if="canInstallInkHud"
              class="relative inline-flex items-center me-5 ml-8 my-2 cursor-pointer"
            >
              <input
                v-model="firmwareStore.shouldInstallInkHud"
                type="checkbox"
                value=""
                class="sr-only peer"
              >
              <div class="w-11 h-6 rounded-full peer peer-focus:ring-4 bg-gray-400 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-red-600" />
              <span class="ms-3 text-sm font-medium text-gray-100">{{ $t('flash.uf2.install_inkhud') }}</span>
            </label>
          </li>
        </ol>

        <div v-if="firmwareStore.canShowFlash">
          <template v-if="hasVariantChoices">
            <div class="grid gap-2">
              <template v-for="variant in variantTargets" :key="variant.platformioTarget">
                <a
                  v-if="firmwareStore.selectedFirmware?.id"
                  :href="getDownloadUf2Url(variant)"
                  class="text-black inline-flex w-full justify-center bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                >
                  {{ formatVariantLabel(variant) }} &ndash; {{ $t('flash.uf2.download_uf2') }}
                </a>
                <button
                  v-else
                  type="button"
                  class="text-black inline-flex w-full justify-center bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                  @click="downloadUf2FileFsForTarget(variant)"
                >
                  {{ formatVariantLabel(variant) }} &ndash; {{ $t('flash.uf2.download_uf2') }}
                </button>
              </template>
            </div>
          </template>
          <template v-else>
            <a
              v-if="firmwareStore.selectedFirmware?.id"
              :href="getDownloadUf2Url(deviceStore.$state.selectedTarget)"
              class="text-black inline-flex w-full justify-center bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
            >
              {{ $t('flash.uf2.download_uf2') }}
            </a>
            <button
              v-else
              class="text-black inline-flex w-full justify-center bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
              @click="downloadUf2FileFsForTarget(deviceStore.$state.selectedTarget)"
            >
              {{ $t('flash.uf2.download_uf2') }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  FolderDown,
  Info,
} from 'lucide-vue-next'
import { computed } from 'vue'

import { useDeviceStore } from '../../stores/deviceStore'
import { useFirmwareStore } from '../../stores/firmwareStore'
import type { DeviceHardware } from '~/types/api'
import FlashHeader from './FlashHeader.vue'
import ReleaseNotes from './ReleaseNotes.vue'

const deviceStore = useDeviceStore()
const firmwareStore = useFirmwareStore()

const variantTargets = computed<DeviceHardware[]>(() => {
  const selected = deviceStore.$state.selectedTarget
  if (!selected) return []
  const targets = deviceStore.targets || []
  let candidates = targets.filter(target => target.hwModel === selected.hwModel)
  if (selected.key) {
    const keyMatches = targets.filter(target => target.key === selected.key)
    if (keyMatches.length > 0) {
      candidates = keyMatches
    }
  }

  const uniqueByEnv = new Map<string, DeviceHardware>()
  candidates.forEach((candidate) => {
    uniqueByEnv.set(candidate.platformioTarget, candidate)
  })

  const result = Array.from(uniqueByEnv.values())
  if (!result.find(candidate => candidate.platformioTarget === selected.platformioTarget)) {
    result.push(selected)
  }

  return result.sort((a, b) => {
    if (a.displayName === b.displayName) {
      return (a.variant || '').localeCompare(b.variant || '')
    }
    return a.displayName.localeCompare(b.displayName)
  })
})

const hasVariantChoices = computed(() => variantTargets.value.length > 1)

const formatVariantLabel = (target?: DeviceHardware) => {
  if (!target) return ''
  return target.variant ? `${target.displayName} ${target.variant}` : target.displayName
}

const downloadUf2FileFsForTarget = (target?: DeviceHardware) => {
  if (!target) return
  let suffix = ''
  if (firmwareStore.shouldInstallInkHud) {
    suffix = '-inkhud'
  }
  const searchRegex = new RegExp(`firmware-${target.platformioTarget}${suffix}-.+.uf2`)
  console.log(searchRegex)
  firmwareStore.trackDownload(target, false)
  firmwareStore.downloadUf2FileSystem(searchRegex)
}

const isNewFirmware = computed(() => {
  // Just check for *not* 2.5 firmware version for now
  return !firmwareStore.firmwareVersion.includes('2.5')
})

const canInstallInkHud = computed(() => {
  if (!isNewFirmware.value)
    return false
  return deviceStore.$state.selectedTarget?.hasInkHud === true
})

const getDownloadUf2Url = (target?: DeviceHardware) => {
  if (!target || !firmwareStore.selectedFirmware?.id) return ''
  const firmwareVersion = firmwareStore.selectedFirmware.id.replace('v', '')
  let suffix = ''
  if (firmwareStore.shouldInstallInkHud) {
    suffix = '-inkhud'
  }
  const firmwareFile = `firmware-${target.platformioTarget}${suffix}-${firmwareVersion}.uf2`
  firmwareStore.trackDownload(target, false)
  console.log(firmwareFile)
  return firmwareStore.getReleaseFileUrl(firmwareFile)
}
</script>
