<template>
  <div
    ref="triggerRef"
    class="relative inline-flex items-center gap-2 z-[1000]"
  >
    <button
      id="dropdownFirmwareButton"
      ref="buttonRef"
      class="btn-primary disabled:bg-zinc-600"
      :class="{ 'animate-bounce': store.prereleaseUnlocked && !store.$state.selectedFirmware?.id }"
      type="button"
      :disabled="!canSelectFirmware"
      @click.stop="toggleDropdown"
    >
      {{ selectedVersion.replace('Meshtastic Firmware ', '').replace('Technical ', '') }}
      <ChevronDown class="w-2.5 h-2.5 ms-2" />
    </button>
    <Teleport to="body">
      <div
        v-show="isOpen"
        id="dropdownFirmware"
        ref="dropdownRef"
        class="fixed z-[120] rounded-xl shadow-2xl max-w-sm overflow-y-auto backdrop-blur-xl dropdown-menu"
        :style="dropdownStyle"
      >
        <!-- Event Mode: Single firmware option -->
        <template v-if="eventMode.enabled">
          <div
            class="px-4 py-2 text-sm text-meshtastic font-semibold border-theme-bottom"
          >
            {{ eventMode.eventName }}
          </div>
          <ul
            class="py-2 text-sm text-theme-muted"
            aria-labelledby="dropdownInformationButton"
          >
            <li>
              <a
                href="#"
                class="block px-4 py-2 hover:text-meshtastic-dark hover:bg-surface-secondary cursor-pointer transition-colors"
                @click="setSelectedFirmware(eventMode.firmware)"
              >
                {{ eventMode.firmware.title.replace('Meshtastic Firmware ', '') }}
              </a>
            </li>
          </ul>
        </template>

        <!-- Normal Mode: Full firmware list -->
        <template v-else>
          <div
            v-if="store.prereleaseUnlocked && store.$state.previews.length > 0"
            class="px-4 py-2 text-sm text-meshtastic font-semibold border-theme-bottom"
          >
            {{ $t('firmware.prerelease') }}
          </div>
          <ul
            v-if="store.prereleaseUnlocked && store.$state.previews.length > 0"
            class="py-2 text-sm text-theme-muted"
            aria-labelledby="dropdownInformationButton"
          >
            <li
              v-for="release in store.$state.previews"
              :key="release.id"
            >
              <a
                href="#"
                class="block px-4 py-2 hover:text-meshtastic-dark hover:bg-surface-secondary cursor-pointer transition-colors"
                @click="setSelectedFirmware(release)"
              >
                {{ release.title.replace('Meshtastic Firmware ', '').replace('Pre-release ', '') }}
              </a>
            </li>
          </ul>
          <div
            v-if="!store.couldntFetchFirmwareApi"
            class="px-4 py-2 text-sm text-warning font-semibold border-theme-bottom border-theme-top"
          >
            {{ $t('firmware.unstable') }}
          </div>
          <ul
            v-if="!store.couldntFetchFirmwareApi"
            class="py-2 text-sm text-theme-muted"
            aria-labelledby="dropdownInformationButton"
          >
            <li
              v-for="release in store.$state.alpha"
              :key="release.id"
            >
              <a
                href="#"
                class="block px-4 py-2 hover:text-meshtastic-dark hover:bg-surface-secondary cursor-pointer transition-colors"
                @click="setSelectedFirmware(release)"
              >
                {{ release.title.replace('Meshtastic Firmware ', '') }}
              </a>
            </li>
          </ul>
          <div
            v-if="!store.couldntFetchFirmwareApi"
            class="px-4 py-2 text-sm text-green-400 font-semibold border-theme-bottom border-theme-top"
          >
            {{ $t('firmware.stable') }}
          </div>
          <ul
            v-if="!store.couldntFetchFirmwareApi"
            class="py-2 text-sm text-theme-muted"
            aria-labelledby="dropdownInformationButton"
          >
            <li
              v-for="release in store.$state.stable"
              :key="release.id"
            >
              <span
                class="block px-4 py-2 hover:text-meshtastic-dark hover:bg-surface-secondary cursor-pointer transition-colors"
                @click="setSelectedFirmware(release)"
              >
                {{ release.title.replace('Meshtastic Firmware ', '') }}
              </span>
            </li>
          </ul>
          <div
            v-if="store.couldntFetchFirmwareApi"
            class="px-3 sm:px-4 py-3 w-full sm:w-96 max-w-sm rounded-xl text-xs sm:text-sm border error-fetch-box break-words"
          >
            <strong>{{ $t('firmware.error_fetching') }}</strong>
            <br>
            {{ $t('firmware.refresh_later') }}
            {{ $t('firmware.upload_alternative') }}
            <FolderOpen class="h-3 w-3 inline" /> {{ $t('firmware.icon') }}
          </div>
        </template>
      </div>
    </Teleport>
    <button
      data-tooltip-target="tooltip-file"
      class="btn-icon mx-2"
      type="button"
      for="file-upload"
      accept=".zip,.bin"
      @click="openFile()"
    >
      <FolderOpen
        class="h-4 w-4"
        :class="{ 'animate-bounce text-meshtastic': (store.couldntFetchFirmwareApi && canSelectFirmware) }"
      />
    </button>
    <div
      id="tooltip-file"
      role="tooltip"
      class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-theme transition-opacity duration-300 rounded-lg shadow-sm opacity-0 tooltip bg-surface-modal"
    >
      {{ $t('firmware.upload_tooltip') }}
      <div
        class="tooltip-arrow"
        data-popper-arrow
      />
    </div>
    <input
      id="file_upload"
      type="file"
      class="hidden"
      @change="setFirmwareFile"
    >
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FolderOpen, ChevronDown } from 'lucide-vue-next'

import { useDeviceStore } from '../stores/deviceStore'
import { useFirmwareStore } from '../stores/firmwareStore'
import type { FirmwareResource } from '~/types/api'
import { useEventMode } from '~/composables/useEventMode'

const { t } = useI18n()

const { eventMode } = useEventMode()
const store = useFirmwareStore()
const deviceStore = useDeviceStore()
store.fetchList()

const selectedVersion = computed(() => {
  if (store.$state.selectedFirmware?.id) {
    return store.$state.selectedFirmware.title
  }
  else if (store.$state.selectedFile?.name) {
    return store.$state.selectedFile?.name
  }
  return t('firmware.select_firmware')
})

const canSelectFirmware = computed(() => {
  return (deviceStore.selectedTarget?.hwModel ?? 0) > 0
})

const openFile = () => {
  document.getElementById('file_upload')?.click()
}

const setFirmwareFile = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) store.setFirmwareFile(file)
}

const setSelectedFirmware = (release: FirmwareResource) => {
  store.setSelectedFirmware(release)
  closeDropdown()
}

const isOpen = ref(false)
const dropdownStyle = ref<Record<string, string>>({})
const triggerRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)

const positionDropdown = () => {
  const trigger = triggerRef.value
  if (!trigger) return

  const rect = trigger.getBoundingClientRect()
  const padding = 12
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const dropdownWidth = dropdownRef.value?.offsetWidth || rect.width

  const left = Math.min(
    Math.max(rect.left, padding),
    viewportWidth - padding - dropdownWidth,
  )
  const top = rect.bottom + 8
  const maxHeight = Math.max(160, viewportHeight - top - padding)

  dropdownStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    minWidth: `${rect.width}px`,
    maxWidth: 'min(360px, calc(100vw - 24px))',
    maxHeight: `${maxHeight}px`,
  }
}

const closeDropdown = () => {
  isOpen.value = false
}

const toggleDropdown = async () => {
  if (isOpen.value) {
    closeDropdown()
    return
  }
  isOpen.value = true
  await nextTick()
  positionDropdown()
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node
  if (!triggerRef.value || !dropdownRef.value) return
  if (triggerRef.value.contains(target) || dropdownRef.value.contains(target)) return
  closeDropdown()
}

const handleResizeOrScroll = () => {
  if (isOpen.value) positionDropdown()
}

onMounted(() => {
  window.addEventListener('resize', handleResizeOrScroll)
  window.addEventListener('scroll', handleResizeOrScroll, true)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResizeOrScroll)
  window.removeEventListener('scroll', handleResizeOrScroll, true)
  document.removeEventListener('click', handleClickOutside)
})
</script>
