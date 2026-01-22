<template>
  <div
    v-if="firmwareStore.canShowFlash"
    class="flash-header sticky top-0 z-10 flex items-center justify-between p-3 sm:p-4 md:p-5 rounded-t"
  >
    <!-- Device type icon + title -->
    <div class="flex items-center gap-3">
      <div class="flash-header-icon">
        <component :is="deviceIcon" class="w-5 h-5 text-meshtastic" />
      </div>
      <h3 class="text-base sm:text-lg font-semibold text-theme">
        {{ headerTitle }}
      </h3>
    </div>

    <!-- Close button with glow -->
    <button
      type="button"
      class="flash-header-close"
      :data-modal-toggle="modalId"
      @click="closeFlashModal"
    >
      <X class="w-4 h-4" />
      <span class="sr-only">{{ $t('actions.close_dialog') }}</span>
    </button>
    
    <!-- Gradient accent line -->
    <div class="flash-header-accent"></div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDeviceStore } from '../../stores/deviceStore'
import { useFirmwareStore } from '../../stores/firmwareStore'
import { X, Cpu, Radio, Microchip } from 'lucide-vue-next'

const props = defineProps<{
  modalId?: string
  titleOverride?: string
}>()

const { t } = useI18n()
const deviceStore = useDeviceStore()
const firmwareStore = useFirmwareStore()

const modalId = computed(() => props.modalId ?? 'flash-modal')
const headerTitle = computed(() => {
  if (props.titleOverride) {
    return props.titleOverride
  }
  const name = deviceStore.$state.selectedTarget?.displayName
  return name ? `${t('flash.title')} ${name}` : t('flash.title')
})

// Pick icon based on device architecture
const deviceIcon = computed(() => {
  const arch = deviceStore.$state.selectedTarget?.architecture?.toLowerCase() ?? ''
  if (arch.includes('nrf')) return Radio
  if (arch.includes('rp2')) return Microchip
  return Cpu // ESP32 and default
})

const closeFlashModal = () => {
  document.getElementById(modalId.value)?.click() // Flowbite bug
}
</script>
