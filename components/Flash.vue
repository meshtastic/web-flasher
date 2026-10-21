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
        class="hidden fixed inset-0 z-[50] modal-backdrop backdrop-blur-sm px-4 sm:px-6 md:px-8 py-8 md:py-12"
      >
        <div class="flex h-full w-full items-start justify-center">
          <div class="relative w-full max-w-5xl">
            <div class="modal-content relative flex flex-col max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl text-theme">
              <!-- Chirpy Bouncing Background -->
              <video
                v-if="firmwareStore.isFlashing && firmwareStore.$state.konamiUnlocked"
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
        class="hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-sm px-4 sm:px-6 md:px-8 py-8 md:py-12"
      >
        <div class="flex h-full w-full items-start justify-center">
          <div class="relative w-full max-w-3xl">
            <div class="modal-content relative flex flex-col max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl text-theme">
              <!-- Chirpy Bouncing Background -->
              <video
                v-if="firmwareStore.isFlashing && firmwareStore.$state.konamiUnlocked"
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
import { type FirmwareVariant, variantBoard } from '~/utils/firmwareVariants'

import { Trash } from 'lucide-vue-next'

import { useDeviceStore } from '../stores/deviceStore'
import { useFirmwareStore } from '../stores/firmwareStore'
import { useSerialMonitorStore } from '../stores/serialMonitorStore'
import FlashHeader from './targets/FlashHeader.vue'

const firmwareStore = useFirmwareStore()
const deviceStore = useDeviceStore()
const serialMonitorStore = useSerialMonitorStore()

/** Whether the legacy board-list probe below is still in flight. */
const legacyProbePending = ref(false)

/**
 * Whether the selected release published a flashable build for this board.
 *
 * The release manifest lists every board built for the version - including the
 * -tft and -inkhud variants, and nRF and RP2040 boards as well as ESP32 - and
 * is synthesized from the artifact's targets for PR builds, so this is a plain
 * lookup with no network probing. It used to HEAD the *plain* board name even
 * for a device whose only build is the -tft one, which left the Wio Tracker L2
 * permanently unflashable. Being a computed, it also re-resolves on its own
 * when the board list arrives after the firmware selection it belongs to.
 */
const boardPublished = computed<boolean>(() => {
  const pioTarget = deviceStore.$state.selectedTarget?.platformioTarget
  if (!firmwareStore.hasOnlineFirmware || !pioTarget) return false
  // Still working out which boards exist: nothing to flash yet.
  if (firmwareStore.releaseManifestPending || legacyProbePending.value) return false
  const { stock, mui, inkhud, unknown } = firmwareStore.targetVariants(pioTarget)
  if (unknown) return false
  return stock || mui || inkhud
})

/**
 * Board names to probe on a release that publishes no board list - v2.7.15 and
 * older, the only one of the six the dropdown offers.
 *
 * Every name the selected board could use, so the probe answers the same
 * question the manifest does and its result can stand in for the manifest.
 * Deliberately independent of the MUI/InkHUD toggles: that keeps flipping one
 * from re-probing, and stops the result that *sets* those toggles from
 * feeding back into what gets probed.
 */
const legacyProbeBoards = computed<string[]>(() => {
  const target = deviceStore.$state.selectedTarget
  if (!firmwareStore.hasOnlineFirmware || firmwareStore.releaseManifestPending) return []
  if (firmwareStore.$state.releaseManifest || !target?.platformioTarget) return []
  const variants: FirmwareVariant[] = ['stock']
  if (target.hasMui === true) variants.push('mui')
  if (target.hasInkHud === true) variants.push('inkhud')
  return [...new Set(variants.map(variant => variantBoard(target.platformioTarget, variant)))]
})

// -update.bin is the file the legacy flash path fetches, so what is probed and
// what is flashed agree; it stands in for the clean-install trio too.
watch(() => legacyProbeBoards.value.join('|'), async (key, _previous, onCleanup) => {
  let superseded = false
  onCleanup(() => {
    superseded = true
  })
  // Clear first: a board list left over from the previous board would keep the
  // Flash button enabled for this one until the probe came back.
  firmwareStore.$state.probedBoards = undefined
  if (!key) {
    legacyProbePending.value = false
    return
  }
  legacyProbePending.value = true
  const boards = legacyProbeBoards.value
  const extension = ['nrf52840', 'rp2040'].includes(deviceStore.selectedArchitecture) ? '.uf2' : '-update.bin'
  const found = await Promise.all(boards.map((board) => {
    const url = firmwareStore.getReleaseFileUrl(`firmware-${board}-${firmwareStore.firmwareVersion}${extension}`)
    return url ? checkIfRemoteFileExists(url) : Promise.resolve(false)
  }))
  // A newer selection may have started its own probe while this one was in
  // flight; letting the slower, older one land would overwrite its answer.
  if (superseded) return
  firmwareStore.$state.probedBoards = new Set(boards.filter((_, index) => found[index]))
  legacyProbePending.value = false
}, { immediate: true })

// Either we have a custom zip file or a selected firmware release
const canFlash = computed(() => {
  const hasDevice = deviceStore.selectedTarget?.hwModel > 0
  // A board the registry does not mark activelySupported is pinned to the
  // nightly, so a local upload is never a valid source for one - Firmware.vue
  // refuses the upload, and this refuses to flash anything that slipped past.
  if (deviceStore.nightlyOnlyTarget && firmwareStore.hasFirmwareFile) return false
  const hasFirmware = firmwareStore.hasFirmwareFile || firmwareStore.hasOnlineFirmware
  return !serialMonitorStore.isConnected && hasDevice && hasFirmware
    && (boardPublished.value || firmwareStore.hasFirmwareFile)
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
