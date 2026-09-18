<template>
  <div class="space-y-6">
    <ReleaseNotes />
    <ol
      v-if="firmwareStore.canShowFlash"
      class="relative ms-3.5 mb-6 border-theme-left"
    >
      <!-- Step 1: Enter the ROM bootloader -->
      <li class="mb-10 ms-8">
        <span class="absolute -start-4 step-badge">1</span>
        <div class="p-4 rounded-lg shadow-sm step-card">
          <h3 class="flex items-center mb-3 text-lg font-semibold text-theme">
            {{ $t('flash.uf2.enter_dfu') }}
          </h3>
          <div
            class="flex p-4 mb-4 text-sm rounded-lg alert-box"
            role="alert"
          >
            <Info class="flex-shrink-0 inline w-5 h-5 me-3 mt-0.5" />
            <span>
              {{ $t('flash.uf2.dfu_firmware_clause') }} &lt; {{ deviceStore.enterStm32BootloaderVersion }},
              {{ $t('flash.uf2.dfu_firmware_clause_2') }} {{ deviceStore.dfuStepAction }}
            </span>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-900 bg-meshtastic rounded-lg hover:bg-green-300 focus:ring-4 focus:ring-green-800 transition-colors"
            @click="tryBootloader"
          >
            <FolderDown class="w-4 h-4" />
            {{ $t('flash.uf2.enter_dfu') }}
          </button>
        </div>
      </li>

      <!-- Step 2: Flash -->
      <li class="ms-8">
        <span class="absolute -start-4 step-badge">2</span>
        <div class="p-4 rounded-lg shadow-sm step-card">
          <h3 class="flex items-center mb-3 text-lg font-semibold text-theme">
            {{ $t('flash.esp32.step_3_flash') }}
          </h3>

          <label class="relative inline-flex items-center cursor-pointer mb-4">
            <input
              v-model="firmwareStore.$state.shouldCleanInstall"
              type="checkbox"
              class="sr-only peer"
            >
            <div class="w-11 h-6 bg-gray-400 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
            <span class="ms-3 text-sm font-medium text-theme-muted">{{ $t('flash.esp32.full_erase') }}</span>
          </label>

          <div
            v-if="firmwareStore.$state.shouldCleanInstall"
            class="flex flex-col p-4 mb-4 text-sm text-red-400 border border-red-800 rounded-lg bg-surface-primary"
            role="alert"
          >
            <div class="flex items-center">
              <Info class="flex-shrink-0 inline w-5 h-5 me-3" />
              <span>{{ $t('flash.esp32.backup_warning') }}</span>
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
          <p
            v-else
            class="text-sm text-theme-muted mb-4"
          >
            {{ updateNote }}
          </p>

          <div
            class="flex p-4 mb-3 text-sm rounded-lg alert-box"
            role="alert"
          >
            <Info class="flex-shrink-0 inline w-5 h-5 me-3" />
            <span>{{ parityNote }}</span>
          </div>
          <div
            class="flex p-4 text-sm rounded-lg alert-box"
            role="alert"
          >
            <Info class="flex-shrink-0 inline w-5 h-5 me-3" />
            <span>{{ $t('flash.esp32.reset_after_flash') }}</span>
          </div>
        </div>
      </li>
    </ol>

    <!-- Flash actions -->
    <div
      v-if="firmwareStore.canShowFlash"
      class="space-y-4"
    >
      <div v-if="firmwareStore.$state.prDownload">
        <div class="flex justify-between mb-1">
          <span class="text-sm font-medium text-theme">{{ $t('firmware.pr.downloading', { arch: firmwareStore.$state.prDownload.arch }) }}</span>
          <span class="text-sm font-medium text-accent">{{ firmwareStore.prDownloadPercent }}%</span>
        </div>
        <div class="w-full rounded-full h-2.5 progress-track">
          <div
            class="bg-gradient-to-r from-amber-400 to-amber-600 h-2.5 rounded-full transition-all duration-300"
            :style="{ width: `${firmwareStore.prDownloadPercent}%` }"
          />
        </div>
      </div>
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
        class="w-full text-theme hover:opacity-80 focus:ring-4 focus:outline-none focus:ring-gray-600 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors step-card"
        @click="startOver"
      >
        {{ $t('flash.esp32.start_over') }}
      </button>

      <div v-if="firmwareStore.$state.flashPercentDone > 0">
        <div class="flex justify-between mb-1">
          <span class="text-sm font-medium text-theme">{{ $t('flash.esp32.flashing_complete') }}</span>
          <span class="text-sm font-medium text-accent">{{ firmwareStore.percentDone }}</span>
        </div>
        <div class="w-full rounded-full h-2.5 progress-track">
          <div
            class="bg-gradient-to-r from-green-400 to-green-600 h-2.5 rounded-full transition-all duration-300"
            :style="{ width: firmwareStore.percentDone }"
          />
        </div>
      </div>
    </div>

    <div
      id="terminal"
      class="rounded-lg overflow-hidden relative z-10 bg-black/40"
    />
  </div>
</template>

<script lang="ts" setup>
import '@xterm/xterm/css/xterm.css'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { FolderDown, Info, Link } from 'lucide-vue-next'

import { useDeviceStore } from '../../stores/deviceStore'
import { useFirmwareStore } from '../../stores/firmwareStore'
import ReleaseNotes from './ReleaseNotes.vue'

const { t } = useI18n()
const deviceStore = useDeviceStore()
const firmwareStore = useFirmwareStore()

// STM32-specific copy that has no Crowdin key yet (i18n/locales is a protected
// path). Inline until a maintainer adds flash.stm32.* strings.
const updateNote = 'Update keeps your configuration and filesystem — only the application flash is erased.'
const parityNote = 'The STM32 bootloader uses 8E1 serial framing. Most USB-serial adapters support this; some low-cost clones do not.'

const showFlashButton = computed(() =>
  !firmwareStore.$state.isFlashing && firmwareStore.$state.flashPercentDone < 1,
)

const startOver = () => {
  firmwareStore.$state.isFlashing = false
  firmwareStore.$state.flashPercentDone = 0
}

const tryBootloader = async () => {
  try {
    await deviceStore.enterStm32Bootloader(t)
  }
  catch {
    // A toast is already shown; the user can fall back to the manual BOOT0 steps.
  }
}

const flash = async () => {
  const selectedTarget = deviceStore.$state.selectedTarget
  if (!selectedTarget) {
    console.error('No target selected')
    return
  }
  await firmwareStore.flashStm32(selectedTarget)
}
</script>
