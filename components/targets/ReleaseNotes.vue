<template>
  <div
    v-show="releaseNotes && !firmwareStore.hasSeenReleaseNotes"
    class="mb-4"
  >
    <h1 class="text-theme text-xl font-semibold mb-3">
      {{ firmwareStore.selectedFirmware?.title }}
    </h1>
    <div
      v-if="releaseNotes"
      class="release-notes-box"
      v-html="releaseNotes"
    />
    <button
      class="border border-meshtastic focus:ring-4 focus:outline-none font-medium rounded-lg text-small px-4 py-2 text-center me-2 mb-2 text-meshtastic hover:text-black hover:bg-white hover:border-transparent hover:shadow"
      @click="firmwareStore.continueToFlash()"
    >
      {{ $t('actions.continue') }}
    </button>
  </div>
</template>

<script lang="ts" setup>
import { marked } from 'marked'

import { useFirmwareStore } from '../../stores/firmwareStore'

const firmwareStore = useFirmwareStore()

const releaseNotes = ref<string | undefined>(undefined)

const renderReleaseNotes = async () => {
  const notes = firmwareStore.selectedFirmware?.release_notes || ''
  if (!notes || notes.trim().length < 1) {
    releaseNotes.value = undefined
    return
  }

  const output = await marked(notes)
  releaseNotes.value = output
    .replaceAll('<p>', '<blockquote class="p-4 my-4 border-s-4 border-meshtastic release-notes-quote">')
    .replaceAll('</p>', '</blockquote>')
    .replaceAll('<br>', '')
    .replaceAll('[!CAUTION]', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>')
    .replaceAll('[!IMPORTANT]', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>')
    .replaceAll('[!WARNING]', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>')
    .replaceAll('[!NOTE]', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>')
}

// Re-render whenever the selected firmware or its release_notes change
watch(
  () => firmwareStore.selectedFirmware?.release_notes,
  () => { renderReleaseNotes() },
  { immediate: true },
)
</script>

<style scoped>
.release-notes-box {
  overflow-y: auto;
  scrollbar-gutter: stable both-edges;
}

.release-notes-box::-webkit-scrollbar {
  width: 10px;
}

.release-notes-box::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 9999px;
}

.release-notes-box::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}
</style>
