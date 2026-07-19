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
import DOMPurify from 'dompurify'

import { useFirmwareStore } from '../../stores/firmwareStore'

const firmwareStore = useFirmwareStore()

const releaseNotes = ref<string | undefined>(undefined)

const renderReleaseNotes = async () => {
  const notes = firmwareStore.selectedFirmware?.release_notes || ''
  if (!notes || notes.trim().length < 1) {
    releaseNotes.value = undefined
    return
  }

  // Release notes can contain untrusted content (e.g. PR titles for PR builds),
  // so sanitize the rendered HTML before it reaches v-html. The trusted
  // hardcoded markup below (alert icons) is applied after sanitization.
  //
  // Markdown block structure (paragraphs, headings, lists, blockquotes) is left
  // intact and styled with the scoped CSS below — only real `> ...` blockquotes
  // in the source render with the accent bar.
  const output = DOMPurify.sanitize(await marked(notes))
  releaseNotes.value = output
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

/* v-html content is not touched by Vue's scoped attribute, so :deep() is
   required to style the markdown that marked renders. */
.release-notes-box :deep(h1),
.release-notes-box :deep(h2),
.release-notes-box :deep(h3) {
  font-weight: 600;
  line-height: 1.3;
  margin: 1.25rem 0 0.5rem;
}

.release-notes-box :deep(h1) { font-size: 1.25rem; }
.release-notes-box :deep(h2) { font-size: 1.125rem; }
.release-notes-box :deep(h3) { font-size: 1rem; }

.release-notes-box :deep(p) {
  margin: 0.75rem 0;
  line-height: 1.6;
}

.release-notes-box :deep(ul),
.release-notes-box :deep(ol) {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}

.release-notes-box :deep(ul) { list-style: disc; }
.release-notes-box :deep(ol) { list-style: decimal; }
.release-notes-box :deep(li) { margin: 0.25rem 0; }

.release-notes-box :deep(a) {
  color: #67ea94;
  text-decoration: underline;
}

.release-notes-box :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.875em;
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
  background: rgba(255, 255, 255, 0.08);
}

.release-notes-box :deep(pre) {
  margin: 0.75rem 0;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  background: rgba(255, 255, 255, 0.05);
}

.release-notes-box :deep(pre code) {
  padding: 0;
  background: none;
}

/* Only real `> ...` blockquotes in the source get the accent bar. */
.release-notes-box :deep(blockquote) {
  border-left: 4px solid #67ea94;
  padding: 0.5rem 1rem;
  margin: 1rem 0;
}

.release-notes-box :deep(blockquote) > :first-child { margin-top: 0; }
.release-notes-box :deep(blockquote) > :last-child { margin-bottom: 0; }

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
