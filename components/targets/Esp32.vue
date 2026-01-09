<template>
  <div class="space-y-6">
    <ReleaseNotes />
    <ol
      v-if="firmwareStore.canShowFlash"
      class="relative border-s border-gray-700 ms-3.5 mb-6"
    >
      <!-- Step 1: USB Connection -->
      <li class="mb-10 ms-8">
        <span class="absolute -start-4 step-badge">
          1
        </span>
        <div class="p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
          <h3 class="flex items-center mb-3 text-lg font-semibold text-white">
            {{ $t('flash.esp32.step_1_usb') }}
          </h3>
          <div class="flex p-4 text-sm text-blue-400 rounded-lg bg-gray-700/50" role="alert">
            <Info class="flex-shrink-0 inline w-5 h-5 me-3 mt-0.5" />
            <div>
              <p>{{ $t('flash.esp32.s3_instructions') }}</p>
              <p class="mt-2">{{ $t('flash.esp32.reset_alternative') }}</p>
              <button
                type="button"
                class="inline-flex items-center gap-2 mt-3 px-4 py-2 text-sm font-medium text-gray-900 bg-meshtastic rounded-lg hover:bg-green-300 focus:ring-4 focus:ring-green-800 transition-colors"
                @click="deviceStore.baud1200()"
              >
                <Cpu class="w-4 h-4" />
                {{ $t('flash.esp32.reset_button') }}
              </button>
            </div>
          </div>
        </div>
      </li>
      <!-- Step 2: Baud Rate -->
      <li class="mb-10 ms-8">
        <span class="absolute -start-4 step-badge">
          2
        </span>
        <div class="p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
          <h3 class="flex items-center mb-3 text-lg font-semibold text-white">
            {{ $t('flash.esp32.step_2_baud_rate') }}
          </h3>
          <select
            v-model="firmwareStore.$state.baudRate"
            class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5"
          >
            <option value="115200">115200</option>
            <option value="230400">230400</option>
            <option value="460800">460800</option>
            <option value="921600">921600</option>
          </select>
          <p class="mt-2 text-sm text-gray-400">{{ $t('flash.esp32.slow_reliable') }}</p>
        </div>
      </li>
      <!-- Step 3: Flash Options -->
      <li class="ms-8">
        <span class="absolute -start-4 step-badge">
          3
        </span>
        <div class="p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
          <h3 class="flex items-center mb-3 text-lg font-semibold text-white">
            {{ $t('flash.esp32.step_3_flash') }}
          </h3>
          
          <!-- Toggle Options -->
          <div class="flex flex-wrap gap-4 mb-4">
            <label
              v-if="canFullInstall()"
              class="relative inline-flex items-center cursor-pointer"
            >
              <input
                v-model="firmwareStore.$state.shouldCleanInstall"
                type="checkbox"
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
              <span class="ms-3 text-sm font-medium text-gray-300">{{ $t('flash.esp32.full_erase') }}</span>
            </label>
            
            <label
              v-if="canInstallMui"
              class="relative inline-flex items-center cursor-pointer"
            >
              <input
                v-model="firmwareStore.$state.shouldInstallMui"
                type="checkbox"
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600" />
              <img
                src="/img/Meshtastic-UI-Long.svg"
                class="h-5 ms-3"
                alt="Meshtastic UI"
              >
            </label>
            
            <label
              v-if="canInstallInkHud"
              class="relative inline-flex items-center cursor-pointer"
            >
              <input
                v-model="firmwareStore.$state.shouldInstallInkHud"
                type="checkbox"
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600" />
              <span class="ms-3 text-sm font-medium text-gray-300">{{ $t('flash.esp32.install_inkhud') }}</span>
            </label>
          </div>
          
          <!-- Warning Alert -->
          <div
            v-if="firmwareStore.$state.shouldCleanInstall"
            class="flex flex-col p-4 mb-4 text-sm text-red-400 border border-red-800 rounded-lg bg-gray-700/50"
            role="alert"
          >
            <div class="flex items-center">
              <Info class="flex-shrink-0 inline w-5 h-5 me-3" />
              <span>
                {{ $t('flash.esp32.backup_warning') }}
                <span v-if="firmwareStore.$state.shouldBundleWebUI">{{ $t('flash.esp32.webui_space_warning') }}</span>
              </span>
            </div>
            <a
              href="https://meshtastic.org/docs/configuration/radio/security/#security-keys---backup-and-restore"
              target="_blank"
              class="inline-flex items-center gap-1 mt-2 text-red-400 hover:text-red-300 underline transition-colors"
            >
              <Link class="w-4 h-4" />
              {{ $t('flash.esp32.doc_guide') }}
            </a>
          </div>
          
          <p class="text-sm text-gray-400 mb-3">{{ $t('flash.esp32.process_warning') }}</p>
          
          <!-- Info Alert -->
          <div class="flex p-4 text-sm text-blue-400 rounded-lg bg-gray-700/50" role="alert">
            <Info class="flex-shrink-0 inline w-5 h-5 me-3" />
            <span>{{ $t('flash.esp32.reset_after_flash') }}</span>
          </div>
        </div>
      </li>
    </ol>
    <!-- Flash Actions -->
    <div v-if="firmwareStore.canShowFlash" class="space-y-4">
      <button
        v-if="showFlashButton"
        type="button"
        class="w-full text-gray-900 bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-800 shadow-lg shadow-green-800/50 font-medium rounded-lg text-sm px-5 py-3 text-center transition-all"
        @click="flash"
      >
        {{ firmwareStore.$state.shouldCleanInstall ? $t('flash.esp32.erase_and_install') : $t('flash.esp32.update') }}
      </button>
      <button
        v-if="firmwareStore.$state.flashPercentDone > 0 && !firmwareStore.$state.isFlashing"
        type="button"
        class="w-full text-white bg-gray-700 hover:bg-gray-600 focus:ring-4 focus:outline-none focus:ring-gray-600 font-medium rounded-lg text-sm px-5 py-2.5 text-center border border-gray-600 transition-colors"
        @click="startOver"
      >
        {{ $t('flash.esp32.start_over') }}
      </button>
      
      <!-- Progress Bar -->
      <div v-if="firmwareStore.$state.flashPercentDone > 0">
        <div class="flex justify-between mb-1">
          <span class="text-sm font-medium text-white">{{ $t('flash.esp32.flashing_complete') }} {{ partition }}</span>
          <span class="text-sm font-medium text-green-400">{{ firmwareStore.percentDone }}</span>
        </div>
        <div class="w-full bg-gray-700 rounded-full h-2.5">
          <div
            class="bg-gradient-to-r from-green-400 to-green-600 h-2.5 rounded-full transition-all duration-300"
            :style="{ width: firmwareStore.percentDone }"
          />
        </div>
      </div>
    </div>
    <div id="terminal" class="rounded-lg overflow-hidden" />
  </div>
</template>

<script lang="ts" setup>
import '@xterm/xterm/css/xterm.css'
import { useI18n } from 'vue-i18n'

import {
  Cpu,
  Info,
  Link,
} from 'lucide-vue-next'
import {
  BlobReader,
  ZipReader,
} from '@zip.js/zip.js'

import { useDeviceStore } from '../../stores/deviceStore'
import { useFirmwareStore } from '../../stores/firmwareStore'
import ReleaseNotes from './ReleaseNotes.vue'

const { t } = useI18n()

const deviceStore = useDeviceStore()
const firmwareStore = useFirmwareStore()

const partition = computed(() => {
  if (firmwareStore.$state.flashingIndex === 0) {
    return t('flash.esp32.partition_app')
  }
  if (firmwareStore.$state.flashingIndex === 1) {
    return t('flash.esp32.partition_ota')
  }
  if (firmwareStore.$state.flashingIndex === 2) {
    return t('flash.esp32.partition_fs')
  }
  return ''
})

const showFlashButton = computed(() => {
  return !firmwareStore.$state.isFlashing && firmwareStore.$state.flashPercentDone < 1
})

const startOver = () => {
  firmwareStore.$state.isFlashing = false
  firmwareStore.$state.flashPercentDone = 0
}

const flash = () => {
  firmwareStore.$state.partitionScheme = deviceStore.$state.selectedTarget.partitionScheme
  if (firmwareStore.$state.shouldCleanInstall) {
    cleanInstallEsp32()
  }
  else {
    updateEsp32()
  }
}

const canFullInstall = () => {
  // Assume bin file if it's not a zip file and prevent full install if its not a full factory bin
  if (firmwareStore.hasFirmwareFile && !firmwareStore.isZipFile && !firmwareStore.isFactoryBin)
    return false
  return true
}
const canBundleWebUI = ref(false)

const isNewFirmware = computed(() => {
  // Just check for *not* 2.5 firmware version for now
  return !firmwareStore.firmwareVersion.includes('2.5')
})

const canInstallMui = computed(() => {
  if (!isNewFirmware.value)
    return false
    // Can't install MUI if we're installing the WebUI
  return deviceStore.$state.selectedTarget.hasMui === true && !firmwareStore.shouldBundleWebUI
})

const canInstallInkHud = computed(() => {
  if (!isNewFirmware.value)
    return false
  return deviceStore.$state.selectedTarget.hasInkHud === true
})

watch(() => firmwareStore.$state.shouldInstallMui, () => {
  canBundleWebUI.value = !firmwareStore.$state.shouldInstallMui
})

watch(() => firmwareStore.$state.shouldCleanInstall, async () => {
  if (firmwareStore.isZipFile && firmwareStore.$state.selectedFile) {
    const reader = new BlobReader(firmwareStore.$state.selectedFile)
    const zipReader = new ZipReader(reader)
    const entries = await zipReader.getEntries()
    const foundWebUI = entries.find(entry => entry.filename.startsWith('littlefswebui'))
    canBundleWebUI.value = !!foundWebUI
  }
  else if (firmwareStore.selectedFirmware) {
    canBundleWebUI.value = await checkIfRemoteFileExists(firmwareStore.getReleaseFileUrl(littleFsFileName.value)) && !firmwareStore.$state.shouldInstallMui
  }
  else {
    canBundleWebUI.value = false
  }
})

const targetPrefix = computed(() => {
  let pioSuffix = ''
  // Crowpanel ends with -tft, so don't add -tft suffix
  if (firmwareStore.$state.shouldInstallMui && !deviceStore.$state.selectedTarget.platformioTarget.endsWith('-tft')) {
    pioSuffix = '-tft'
  }
  else if (firmwareStore.$state.shouldInstallInkHud) {
    pioSuffix = '-inkhud'
  }
  return `${deviceStore.$state.selectedTarget.platformioTarget}${pioSuffix}-${firmwareStore.firmwareVersion}`
})

const cleanInstallEsp32 = () => {
  const firmwareFile = firmwareStore.$state.hasManifest
    ? `firmware-${targetPrefix.value}.factory.bin`
    : `firmware-${targetPrefix.value}.bin`
  const otaFile = deviceStore.$state.selectedTarget.architecture === 'esp32-s3' ? 'bleota-s3.bin' : 'bleota.bin'
  // Coerce the partition scheme to be the same as the selected target for all 2.6.2+ firmwares
  if (deviceStore.$state.selectedTarget.partitionScheme && twoPointSixPointTwoOrGreater.value) {
    firmwareStore.$state.partitionScheme = deviceStore.$state.selectedTarget.partitionScheme
  }
  console.log(firmwareFile, otaFile, littleFsFileName.value)
  firmwareStore.cleanInstallEspFlash(firmwareFile, otaFile, littleFsFileName.value, deviceStore.$state.selectedTarget)
}

const twoPointSixPointTwoOrGreater = computed(() => {
  if (!firmwareStore.firmwareVersion) {
    return false
  }
  if (firmwareStore.firmwareVersion.includes('2.6')
    && !firmwareStore.firmwareVersion.includes('2.6.0') // 2.6.1 is pre-partition scheme
    && !firmwareStore.firmwareVersion.includes('2.6.1')) { // 2.6.0 is pre-partition scheme
    return true
  }
})

const littleFsFileName = computed(() => {
  const prefix = firmwareStore.shouldBundleWebUI ? 'littlefswebui' : 'littlefs'
  const littleFsInfix = isNewFirmware.value ? `${targetPrefix.value}` : firmwareStore.firmwareVersion
  return `${prefix}-${littleFsInfix}.bin`
})

const updateEsp32 = () => {
  // Get firmware version from selectedFirmware or use regex wildcard to match otherwise
  const firmwareFile = firmwareStore.$state.hasManifest
    ? `firmware-${targetPrefix.value}.bin`
    : `firmware-${targetPrefix.value}-update.bin`
  console.log(firmwareFile)
  firmwareStore.updateEspFlash(firmwareFile, deviceStore.$state.selectedTarget)
}
</script>
