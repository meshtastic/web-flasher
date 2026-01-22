<template>
  <div class="space-y-6">
    <ReleaseNotes />
    <ol
      v-if="firmwareStore.canShowFlash"
      class="relative ms-3.5 mb-6 border-theme-left"
    >
      <!-- Step 1: Enter DFU Mode -->
      <li class="mb-10 ms-8">
        <span class="absolute -start-4 step-badge">
          1
        </span>
        <div class="p-4 rounded-lg shadow-sm step-card">
          <h3 class="flex items-center mb-3 text-lg font-semibold text-theme">
            {{ $t('flash.uf2.enter_dfu_mode') }}
          </h3>
          <div class="flex p-4 mb-4 text-sm rounded-lg alert-box" role="alert">
            <Info class="flex-shrink-0 inline w-5 h-5 me-3 mt-0.5" />
            <span>
              {{ $t('flash.uf2.dfu_firmware_clause') }} &lt; {{ deviceStore.enterDfuVersion }}, {{ $t('flash.uf2.dfu_firmware_clause_2') }} {{ deviceStore.dfuStepAction }}
            </span>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-900 bg-meshtastic rounded-lg hover:bg-green-300 focus:ring-4 focus:ring-green-800 transition-colors"
            @click="() => deviceStore.enterDfuMode($t)"
          >
            <FolderDown class="w-4 h-4" />
            {{ $t('flash.uf2.enter_dfu') }}
          </button>
        </div>
      </li>
      <!-- Step 2: Ensure Drive Mounted -->
      <li class="mb-10 ms-8">
        <span class="absolute -start-4 step-badge">
          2
        </span>
        <div class="p-4 rounded-lg shadow-sm step-card">
          <h3 class="flex items-center mb-3 text-lg font-semibold text-theme">
            {{ $t('flash.uf2.ensure_drive_mounted') }}
          </h3>
          <p class="text-sm text-theme-muted mb-3">{{ $t('flash.uf2.drive_name_info') }}</p>
          <div class="rounded-lg overflow-hidden bg-surface-primary border-theme">
            <img
              v-if="deviceStore.isSelectedNrf"
              src="@/assets/img/dfu.png"
              :alt="$t('flash.uf2.dfu_drive')"
              class="max-w-full h-auto"
            >
            <img
              v-else
              src="@/assets/img/uf2_rp2040.png"
              :alt="$t('flash.uf2.dfu_drive')"
              class="max-w-full h-auto"
            >
          </div>
        </div>
      </li>
      <!-- Step 3: Download & Copy -->
      <li class="ms-8">
        <span class="absolute -start-4 step-badge">
          3
        </span>
        <div class="p-4 rounded-lg shadow-sm step-card">
          <h3 class="flex items-center mb-3 text-lg font-semibold text-theme">
            {{ $t('flash.uf2.download_copy_uf2') }}
          </h3>
          <p class="text-sm text-theme-muted mb-3">{{ $t('flash.uf2.copy_instructions') }}</p>
          <div class="flex p-4 text-sm rounded-lg alert-box" role="alert">
            <Info class="flex-shrink-0 inline w-5 h-5 me-3" />
            <span>{{ $t('flash.uf2.auto_reboot_warning') }}</span>
          </div>
          
          <!-- InkHud Toggle -->
          <label
            v-if="canInstallInkHud"
            class="relative inline-flex items-center mt-4 cursor-pointer"
          >
            <input
              v-model="firmwareStore.shouldInstallInkHud"
              type="checkbox"
              class="sr-only peer"
            >
            <div class="w-11 h-6 bg-gray-400 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600" />
            <span class="ms-3 text-sm font-medium text-theme-muted">{{ $t('flash.uf2.install_inkhud') }}</span>
          </label>
        </div>
      </li>
    </ol>

    <!-- Download Actions -->
    <div v-if="firmwareStore.canShowFlash" class="space-y-3">
      <template v-if="hasVariantChoices">
        <div class="grid gap-3">
          <template v-for="variant in variantTargets" :key="variant.platformioTarget">
            <a
              v-if="firmwareStore.selectedFirmware?.id"
              :href="getDownloadUf2Url(variant)"
              class="w-full text-gray-900 bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-800 shadow-lg shadow-green-800/50 font-medium rounded-lg text-sm px-5 py-3 text-center transition-all"
            >
              {{ formatVariantLabel(variant) }} &ndash; {{ $t('flash.uf2.download_uf2') }}
            </a>
            <button
              v-else
              type="button"
              class="w-full text-gray-900 bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-800 shadow-lg shadow-green-800/50 font-medium rounded-lg text-sm px-5 py-3 text-center transition-all"
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
          class="block w-full text-gray-900 bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-800 shadow-lg shadow-green-800/50 font-medium rounded-lg text-sm px-5 py-3 text-center transition-all"
        >
          {{ $t('flash.uf2.download_uf2') }}
        </a>
        <button
          v-else
          type="button"
          class="w-full text-gray-900 bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-800 shadow-lg shadow-green-800/50 font-medium rounded-lg text-sm px-5 py-3 text-center transition-all"
          @click="downloadUf2FileFsForTarget(deviceStore.$state.selectedTarget)"
        >
          {{ $t('flash.uf2.download_uf2') }}
        </button>
      </template>
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
