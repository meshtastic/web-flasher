<template>
  <div>
    <button
      data-modal-target="flash-modal"
      data-modal-toggle="flash-modal"
      class="inline text-black bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 disabled:bg-gray-500 text-center"
      type="button"
      :disabled="!canFlash"
    >
      {{ $t('flash.title') }}
    </button>
    <button
      v-show="['nrf52840', 'rp2040'].includes(deviceStore.selectedArchitecture)"
      data-tooltip-target="tooltip-erase"
      class="mx-2 display-inline content-center px-3 py-2 text-xs font-medium text-center  hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg inline-flex items-center text-white hover:text-black"
      type="button"
      data-modal-target="erase-modal"
      data-modal-toggle="erase-modal"
    >
      <Trash
        class="h-4 w-4"
        :class="{ 'animate-pulse': deviceStore.$state.selectedTarget?.hwModel }"
      />
    </button>
    <div
      id="tooltip-erase"
      role="tooltip"
      class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300  rounded-lg shadow-sm opacity-0 tooltip bg-zinc-700"
    >
      {{ $t('flash.erase_flash_prefix') }} {{ deviceStore.selectedTarget?.displayName }}.
      <div
        class="tooltip-arrow"
        data-popper-arrow
      />
    </div>
    <div
      id="flash-modal"
      tabindex="-1"
      aria-hidden="true"
      class="dark hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full"
    >
      <TargetsUf2 v-if="['nrf52840', 'rp2040'].includes(deviceStore.selectedArchitecture)" />
      <TargetsEsp32 v-if="deviceStore.selectedArchitecture.startsWith('esp32')" />
    </div>
    <div
      id="erase-modal"
      tabindex="-1"
      aria-hidden="true"
      class="dark hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full"
    >
      <TargetsEraseUf2 v-if="['nrf52840', 'rp2040'].includes(deviceStore.selectedArchitecture)" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { checkIfRemoteFileExists } from '~/utils/fileUtils'

import { Trash } from 'lucide-vue-next'

import { useDeviceStore } from '../stores/deviceStore'
import { useFirmwareStore } from '../stores/firmwareStore'
import { useSerialMonitorStore } from '../stores/serialMonitorStore'

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
  if (!firmwareStore.hasOnlineFirmware) {
    fileExistsOnServer.value = false
    return
  }

  if (['nrf52840', 'rp2040'].includes(deviceStore.selectedArchitecture)) {
    const firmwareVersion = firmwareStore.selectedFirmware!.id.replace('v', '')
    const firmwareFile = `firmware-${deviceStore.selectedTarget.platformioTarget}-${firmwareVersion}.uf2`
    fileExistsOnServer.value = await checkIfRemoteFileExists(firmwareStore.getReleaseFileUrl(firmwareFile))
  }
  else if (deviceStore.selectedArchitecture.startsWith('esp32')) {
    const firmwareFile = `firmware-${deviceStore.$state.selectedTarget.platformioTarget}-${firmwareStore.firmwareVersion}.bin`
    fileExistsOnServer.value = await checkIfRemoteFileExists(firmwareStore.getReleaseFileUrl(firmwareFile))
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
