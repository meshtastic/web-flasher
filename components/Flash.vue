<template>
  <div class="relative inline-flex items-center gap-2">
    <button
      data-modal-target="flash-modal"
      data-modal-toggle="flash-modal"
      class="btn-primary disabled:bg-zinc-600"
      type="button"
      :disabled="!canFlash"
    >
      {{ $t('flash.title') }}
    </button>
    <button
      v-show="['nrf52840', 'rp2040'].includes(deviceStore.selectedArchitecture)"
      data-tooltip-target="tooltip-erase"
      class="btn-icon mx-2"
      type="button"
      data-modal-target="erase-modal"
      data-modal-toggle="erase-modal"
    >
      <Trash
        class="h-4 w-4"
        :class="{ 'animate-pulse text-red-400': deviceStore.$state.selectedTarget?.hwModel }"
      />
    </button>
    <div
      id="tooltip-erase"
      role="tooltip"
      class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-theme transition-opacity duration-300 rounded-lg shadow-sm opacity-0 tooltip bg-surface-modal"
    >
      {{ $t('flash.erase_flash_prefix') }} {{ deviceStore.selectedTarget?.displayName }}.
      <div
        class="tooltip-arrow"
        data-popper-arrow
      />
    </div>
    <Teleport to="body">
      <div
        id="flash-modal"
        tabindex="-1"
        aria-hidden="true"
        class="hidden fixed inset-0 z-[60] modal-backdrop backdrop-blur-sm px-4 sm:px-6 md:px-8 py-8 md:py-12"
      >
        <div class="flex h-full w-full items-start justify-center">
          <div class="relative w-full max-w-5xl">
            <div class="modal-content relative flex flex-col max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl text-theme">
              <!-- Chirpy Bouncing Background -->
              <video
                v-if="firmwareStore.isFlashing && firmwareStore.$state.prereleaseUnlocked"
                autoplay
                loop
                muted
                playsinline
                class="modal-background-video"
              >
                <source src="@/assets/img/chirpy_bounce.webm" type="video/webm">
              </video>
              <FlashHeader />
              <div class="flex-1 overflow-y-auto p-3 sm:p-4 relative z-10">
                <TargetsUf2 v-if="['nrf52840', 'rp2040'].includes(deviceStore.selectedArchitecture)" />
                <TargetsEsp32 v-if="deviceStore.selectedArchitecture.startsWith('esp32')" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div
        id="erase-modal"
        tabindex="-1"
        aria-hidden="true"
        class="hidden fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm px-4 sm:px-6 md:px-8 py-8 md:py-12"
      >
        <div class="flex h-full w-full items-start justify-center">
          <div class="relative w-full max-w-3xl">
            <div class="modal-content relative flex flex-col max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl text-theme">
              <!-- Chirpy Bouncing Background -->
              <video
                v-if="firmwareStore.isFlashing && firmwareStore.$state.prereleaseUnlocked"
                autoplay
                loop
                muted
                playsinline
                class="modal-background-video"
              >
                <source src="@/assets/img/chirpy_bounce.webm" type="video/webm">
              </video>
              <FlashHeader
                modal-id="erase-modal"
                :title-override="`${$t('flash.erase_flash')} ${deviceStore.$state.selectedTarget?.displayName || ''}`"
              />
              <div class="flex-1 overflow-y-auto p-3 sm:p-4 relative z-10">
                <TargetsEraseUf2 v-if="['nrf52840', 'rp2040'].includes(deviceStore.selectedArchitecture)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { checkIfRemoteFileExists } from '~/utils/fileUtils'

import { Trash } from 'lucide-vue-next'

import { useDeviceStore } from '../stores/deviceStore'
import { useFirmwareStore } from '../stores/firmwareStore'
import { useSerialMonitorStore } from '../stores/serialMonitorStore'
import FlashHeader from './targets/FlashHeader.vue'

const firmwareStore = useFirmwareStore()
const deviceStore = useDeviceStore()
const serialMonitorStore = useSerialMonitorStore()

const fileExistsOnServer = ref(false)

watch(() => firmwareStore.$state.selectedFirmware, async () => {
  await preflightCheck()
})

watch(() => deviceStore.$state.selectedTarget, async () => {
  await preflightCheck()
})

const preflightCheck = async () => {
  firmwareStore.$state.hasManifest = false

  if (!firmwareStore.hasOnlineFirmware) {
    fileExistsOnServer.value = false
    return
  }

  if (!deviceStore.$state.selectedTarget) {
    fileExistsOnServer.value = false
    return
  }

  if (['nrf52840', 'rp2040'].includes(deviceStore.selectedArchitecture)) {
    const firmwareVersion = firmwareStore.selectedFirmware!.id.replace('v', '')
    const firmwareFile = `firmware-${deviceStore.selectedTarget.platformioTarget}-${firmwareVersion}.uf2`
    fileExistsOnServer.value = await checkIfRemoteFileExists(firmwareStore.getReleaseFileUrl(firmwareFile))
  }
  else if (deviceStore.selectedArchitecture.startsWith('esp32')) {
    const basePrefix = `firmware-${deviceStore.$state.selectedTarget.platformioTarget}-${firmwareStore.firmwareVersion}`
    let manifestExists = false
    const manifestName = `${basePrefix}.mt.json`
    const manifestUrl = firmwareStore.getReleaseFileUrl(manifestName)
    manifestExists = manifestUrl ? await checkIfRemoteFileExists(manifestUrl) : false
    firmwareStore.$state.hasManifest = manifestExists

    if (manifestExists) {
      const binUrl = firmwareStore.getReleaseFileUrl(`${basePrefix}.bin`)
      const factoryUrl = firmwareStore.getReleaseFileUrl(`${basePrefix}.factory.bin`)
      const [binExists, factoryExists] = await Promise.all([
        binUrl ? checkIfRemoteFileExists(binUrl) : Promise.resolve(false),
        factoryUrl ? checkIfRemoteFileExists(factoryUrl) : Promise.resolve(false),
      ])
      fileExistsOnServer.value = binExists || factoryExists
    }
    else {
      const updateFileUrl = firmwareStore.getReleaseFileUrl(`${basePrefix}-update.bin`)
      fileExistsOnServer.value = updateFileUrl ? await checkIfRemoteFileExists(updateFileUrl) : false
    }
  }
  else {
    fileExistsOnServer.value = false
  }
}

// Either we have a custom zip file or a selected firmware release
const canFlash = computed(() => {
  const hasDevice = deviceStore.selectedTarget?.hwModel > 0
  const hasFirmware = firmwareStore.hasFirmwareFile || firmwareStore.hasOnlineFirmware
  return !serialMonitorStore.isConnected && hasDevice && hasFirmware
    && (fileExistsOnServer.value || firmwareStore.hasFirmwareFile)
})
</script>

<style scoped>
.modal-background-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  opacity: 0.25;
  z-index: 0;
  /* transform: scale(0.8); */
}
</style>
