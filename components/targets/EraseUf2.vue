<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold text-theme">
      {{ $t('flash.erase_flash') }} {{ deviceStore.$state.selectedTarget?.displayName }}
    </h3>
    <NrfBootloaderNotice />
    <ol class="relative ms-3.5 mb-4 md:mb-5 border-theme-left">
      <li class="mb-10 ms-8">
        <span class="absolute -start-4 step-badge">
          1
        </span>
        <h3 class="flex items-start mb-1 text-lg font-semibold text-theme">
          {{ $t('flash.uf2.enter_dfu_mode') }}
        </h3>
        <div
          class="p-4 mb-4 my-2 text-sm rounded-lg alert-box"
          role="alert"
        >
          <span class="font-medium">
            <Info class="h-4 w-4 inline" />
            {{ $t('flash.uf2.dfu_firmware_clause') }} &lt; {{ deviceStore.enterDfuVersion }}, {{ $t('flash.uf2.dfu_firmware_clause_2') }} {{ deviceStore.dfuStepAction }}
            <br>
            {{ $t('flash.erase_uf2.dfu_warning') }}
          </span>
        </div>
        <button
          type="button"
          class="inline-flex w-[250px] justify-center items-center py-2 px-3 text-sm font-medium focus:outline-none bg-meshtastic rounded-lg hover:bg-white focus:z-10 focus:ring-4 focus:ring-gray-200 text-black"
          @click="() => deviceStore.enterDfuMode($t)"
        >
          <FolderDown class="h-4 w-4 text-black" />
          {{ $t('flash.uf2.enter_dfu') }}
        </button>
      </li>
      <li class="mb-10 ms-8">
        <span class="absolute -start-4 step-badge">
          2
        </span>
        <h3 class="flex items-start mb-1 text-lg font-semibold text-theme">
          {{ $t('flash.uf2.ensure_drive_mounted') }}
        </h3>
        <span class="text-theme-muted">
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
        <span class="absolute -start-4 step-badge">
          3
        </span>
        <h3 class="mb-1 text-lg font-semibold text-theme">
          {{ $t('flash.uf2.download_copy_uf2') }}
        </h3>
        <div class="py-2">
          <span class="text-theme-muted">
            {{ $t('flash.uf2.copy_instructions') }}
            {{ !deviceStore.isSelectedNrf ? $t('flash.erase_uf2.warning') : '' }}
          </span>
        </div>
        <template v-if="deviceStore.bootloaderEraseImage">
          <div class="py-2 text-theme-muted">
            {{ $t('flash.erase_uf2.bootloader_file_hint') }}
          </div>
          <button
            type="button"
            class="inline-flex w-[250px] justify-center items-center py-2 px-3 text-sm font-medium focus:outline-none bg-meshtastic rounded-lg hover:bg-white focus:z-10 focus:ring-4 focus:ring-gray-200 text-black disabled:opacity-60"
            :disabled="bootloaderEraseDownloading"
            @click="downloadBootloaderErase"
          >
            {{ $t('flash.erase_uf2.download_bootloader_file') }}
          </button>
          <div class="py-2 text-theme-muted">
            {{ $t('flash.erase_uf2.softdevice_file_hint') }}
          </div>
          <a
            :href="deviceStore.eraseUf2File"
            download=""
            class="inline-flex w-[250px] justify-center items-center py-2 px-3 text-sm font-medium focus:outline-none rounded-lg border-theme hover:bg-surface-secondary focus:z-10 focus:ring-4 focus:ring-gray-200 text-theme"
          >
            {{ $t('flash.erase_uf2.download_softdevice_file') }}
          </a>
        </template>
        <a
          v-else
          :href="deviceStore.eraseUf2File"
          download=""
          class="inline-flex w-[250px] justify-center items-center py-2 px-3 text-sm font-medium focus:outline-none bg-meshtastic rounded-lg hover:bg-white focus:z-10 focus:ring-4 focus:ring-gray-200 text-black"
        >
          {{ $t('flash.uf2.download_uf2') }}
        </a>
      </li>
      <li
        v-if="deviceStore.isSelectedNrf"
        class="ms-8 mt-4"
      >
        <span class="absolute -start-4 step-badge">
          4
        </span>
        <h3 class="mb-1 text-lg font-semibold text-theme">
          {{ $t('buttons.serial_monitor') }}
        </h3>
        <div class="py-2 text-theme-muted">
          <template v-if="deviceStore.bootloaderEraseImage">
            {{ $t('flash.erase_uf2.bootloader_file_skip_serial') }}
          </template>
          {{ $t('flash.erase_uf2.wait_for_drive') }}
        </div>
        <div>
          <button
            v-if="deviceStore.isSelectedNrf"
            class="text-black inline-flex w-[250px] justify-center bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
            @click="openSerial"
          >
            {{ $t('buttons.serial_monitor') }}
          </button>
        </div>
      </li>
      <li
        v-if="deviceStore.isSelectedNrf"
        class="ms-8 mt-4"
      >
        <span class="absolute -start-4 step-badge">
          5
        </span>
        <h3 class="mb-1 text-lg font-semibold text-theme">
          {{ $t('firmware.title') }}
        </h3>
        <div class="py-2 text-theme-muted">
          {{ $t('flash.erase_uf2.close_instructions') }}
        </div>
        <div>
          <button
            type="button"
            class="inline-flex w-[250px] justify-center items-center py-2 px-3 text-sm font-medium focus:outline-none bg-meshtastic rounded-lg hover:bg-white focus:z-10 focus:ring-4 focus:ring-gray-200 text-black"
            @click="closeModal"
          >
            {{ $t('actions.continue') }}
          </button>
        </div>
      </li>
    </ol>
    <div id="terminal" />
  </div>
</template>

<script lang="ts" setup>
import {
  FolderDown,
  Info,
} from 'lucide-vue-next'
import { track } from '@vercel/analytics'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDeviceStore } from '../../stores/deviceStore'
import { useFirmwareStore } from '../../stores/firmwareStore'
import { useToastStore } from '../../stores/toastStore'
import { downloadVerifiedUf2 } from '~/utils/maintenanceUf2'
import NrfBootloaderNotice from './NrfBootloaderNotice.vue'

const deviceStore = useDeviceStore()
const firmwareStore = useFirmwareStore()
const toastStore = useToastStore()
const { t } = useI18n()

const bootloaderEraseDownloading = ref(false)

// The asset is cross-origin, where an anchor's download attribute is ignored,
// so it is fetched, checked against the manifest digest and saved by hand.
const downloadBootloaderErase = async () => {
  const image = deviceStore.bootloaderEraseImage
  if (!image || bootloaderEraseDownloading.value) return
  bootloaderEraseDownloading.value = true
  try {
    await downloadVerifiedUf2(image.url, image.sha256, image.fileName)
  }
  catch (error) {
    console.error('Error downloading factory erase UF2:', error)
    toastStore.addToast({
      type: 'error',
      title: t('flash.erase_uf2.download_failed_title'),
      message: t('flash.erase_uf2.download_failed_message'),
    })
  }
  finally {
    bootloaderEraseDownloading.value = false
  }
}

const closeModal = () => {
  document.getElementById('erase-modal')?.click() // Flowbite bug
}

const openSerial = async () => {
  const terminal = await openTerminal()
  const port = await navigator.serial.requestPort({})
  await port.open({ baudRate: 115200 })
  // read from the serial port
  const reader = port.readable!.getReader()
  const writer = port.writable!.getWriter()
  while (true) {
    const { value, done } = await reader.read()
    if (value) {
      terminal.write(value)
      writer.write(new Uint8Array([0x01, 0x01]))
    }
    if (done) {
      console.log('[readLoop] DONE', done)
      reader.releaseLock()
      break
    }
  }
}
</script>
