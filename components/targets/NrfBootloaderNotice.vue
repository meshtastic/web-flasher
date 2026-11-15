<template>
  <div
    v-if="deviceStore.bootloaderUpdateAvailable"
    class="flex p-4 text-sm rounded-lg alert-box"
    role="note"
  >
    <Info class="flex-shrink-0 inline w-5 h-5 me-3 mt-0.5" />
    <span>
      {{ $t('flash.bootloader.update_available', { tag: deviceStore.$state.maintenanceUf2?.otafixReleaseTag ?? '' }) }}
      <a
        :href="NRF52_BOOTLOADER_UPDATE_DOCS_URL"
        target="_blank"
        rel="noopener noreferrer"
        class="underline text-theme-accent"
      >{{ $t('flash.bootloader.update_guide') }}</a>
      <template v-if="deviceStore.bootloaderReleasePageUrl">
        &middot;
        <a
          :href="deviceStore.bootloaderReleasePageUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="underline text-theme-accent"
        >{{ $t('flash.bootloader.release_page') }}</a>
      </template>
    </span>
  </div>
</template>

<script lang="ts" setup>
import { Info } from 'lucide-vue-next'

import { useDeviceStore } from '../../stores/deviceStore'
import { NRF52_BOOTLOADER_UPDATE_DOCS_URL } from '~/utils/maintenanceUf2'

const deviceStore = useDeviceStore()
</script>
