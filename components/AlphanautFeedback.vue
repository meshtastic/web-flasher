<template>
  <div v-if="store.isVisible">
    <!-- Floating reveal badge (subtle, bottom-left so it clears the connection badge) -->
    <button
      type="button"
      class="fixed left-2 sm:left-4 bottom-2 sm:bottom-4 z-[55] inline-flex items-center gap-2 rounded-xl border border-meshtastic/50 bg-meshtastic/10 px-3 py-2 text-xs font-medium text-meshtastic shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-meshtastic/20"
      title="Report a bug (alphanaut testers)"
      @click="openPanel"
    >
      <Bug class="h-4 w-4 shrink-0" />
      <span class="hidden sm:inline">Feedback</span>
      <span
        v-if="store.pendingCount > 0"
        class="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-meshtastic px-1 text-[10px] font-bold text-black"
      >{{ store.pendingCount }}</span>
    </button>

    <!-- Feedback panel -->
    <Teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-[65] modal-backdrop backdrop-blur-sm px-4 py-8 md:py-12"
        @click.self="close"
      >
        <div class="flex h-full w-full items-start justify-center">
          <div class="relative w-full max-w-2xl">
            <div class="modal-content relative flex max-h-[90vh] flex-col overflow-hidden rounded-2xl text-theme shadow-2xl">
              <!-- Header -->
              <div class="flex items-center justify-between border-b border-[var(--border-default)] p-4">
                <h3 class="flex items-center gap-2 text-lg font-semibold text-theme">
                  <Bug class="h-5 w-5 text-meshtastic" />
                  Alphanaut bug report
                </h3>
                <button
                  type="button"
                  class="btn-icon"
                  aria-label="Close"
                  @click="close"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>

              <!-- Body -->
              <div class="flex-1 space-y-4 overflow-y-auto p-4">
                <!-- Auto-captured context (read-only) -->
                <div class="rounded-lg border border-theme bg-surface-primary p-3 text-sm">
                  <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-theme-muted">
                    Auto-captured
                  </p>
                  <dl class="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                    <dt class="text-theme-muted">
                      Hardware
                    </dt>
                    <dd class="break-all font-mono text-theme-accent">
                      {{ store.snapshot.device?.platformioTarget || '—' }}
                      <span
                        v-if="store.snapshot.device?.displayName"
                        class="text-theme-muted"
                      >({{ store.snapshot.device.displayName }})</span>
                    </dd>
                    <dt class="text-theme-muted">
                      Firmware
                    </dt>
                    <dd class="break-all font-mono text-theme-accent">
                      {{ store.snapshot.firmware?.version || '—' }}
                      <span
                        v-if="store.snapshot.firmware?.isPrBuild"
                        class="text-theme-muted"
                      >(PR #{{ store.snapshot.firmware.prNumber }})</span>
                    </dd>
                  </dl>
                </div>

                <!-- Handle + rating -->
                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="block">
                    <span class="text-sm text-theme-muted">Handle / callsign *</span>
                    <input
                      v-model="form.handle"
                      type="text"
                      placeholder="e.g. KJ7XYZ"
                      :class="inputClass"
                    >
                  </label>
                  <div class="block">
                    <span class="text-sm text-theme-muted">Overall rating *</span>
                    <div class="mt-1 flex items-center gap-1">
                      <button
                        v-for="n in 5"
                        :key="n"
                        type="button"
                        class="rounded p-1 transition-colors"
                        :aria-label="`Rate ${n}`"
                        @click="form.rating = n"
                      >
                        <Star
                          class="h-6 w-6"
                          :class="n <= form.rating ? 'fill-meshtastic text-meshtastic' : 'text-theme-muted'"
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- What happened / expected -->
                <label class="block">
                  <span class="text-sm text-theme-muted">What happened *</span>
                  <textarea
                    v-model="form.whatHappened"
                    rows="3"
                    placeholder="Describe the bug…"
                    :class="textareaClass"
                  />
                </label>
                <label class="block">
                  <span class="text-sm text-theme-muted">Expected behavior *</span>
                  <textarea
                    v-model="form.expectedBehavior"
                    rows="2"
                    placeholder="What did you expect instead?"
                    :class="textareaClass"
                  />
                </label>
                <label class="block">
                  <span class="text-sm text-theme-muted">Steps to reproduce</span>
                  <textarea
                    v-model="form.reproSteps"
                    rows="2"
                    placeholder="1. … 2. … 3. …"
                    :class="textareaClass"
                  />
                </label>

                <!-- App platform / version -->
                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="block">
                    <span class="text-sm text-theme-muted">App platform</span>
                    <select
                      v-model="form.appPlatform"
                      :class="inputClass"
                    >
                      <option
                        v-for="p in appPlatforms"
                        :key="p"
                        :value="p"
                      >
                        {{ p }}
                      </option>
                    </select>
                  </label>
                  <label class="block">
                    <span class="text-sm text-theme-muted">App version</span>
                    <input
                      v-model="form.appVersion"
                      type="text"
                      placeholder="e.g. 2.5.13"
                      :class="inputClass"
                    >
                  </label>
                </div>

                <!-- Logs -->
                <label
                  class="flex items-center gap-2 text-sm text-theme-muted"
                  :class="{ 'opacity-50': serialLineCount === 0 }"
                >
                  <input
                    v-model="form.attachSerialLog"
                    type="checkbox"
                    :disabled="serialLineCount === 0"
                    class="h-4 w-4 rounded border-theme accent-meshtastic"
                  >
                  Attach serial monitor log ({{ serialLineCount }} lines)
                </label>
                <label class="block">
                  <span class="text-sm text-theme-muted">App logs (paste)</span>
                  <textarea
                    v-model="form.appLogs"
                    rows="2"
                    placeholder="Paste any relevant app logs…"
                    :class="textareaClass"
                  />
                </label>

                <!-- Optional contact + notes -->
                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="block">
                    <span class="text-sm text-theme-muted">Contact (optional)</span>
                    <input
                      v-model="form.contact"
                      type="text"
                      placeholder="email / Discord"
                      :class="inputClass"
                    >
                  </label>
                  <label class="block">
                    <span class="text-sm text-theme-muted">Anything else</span>
                    <input
                      v-model="form.otherInfo"
                      type="text"
                      placeholder="Other helpful info"
                      :class="inputClass"
                    >
                  </label>
                </div>

                <!-- Inline status -->
                <div
                  v-if="status !== 'idle'"
                  class="flex items-center gap-2 rounded-lg p-3 text-sm"
                  :class="statusClass"
                >
                  <LoaderCircle
                    v-if="status === 'submitting'"
                    class="h-4 w-4 shrink-0 animate-spin"
                  />
                  <CircleCheck
                    v-else-if="status === 'sent'"
                    class="h-4 w-4 shrink-0"
                  />
                  <TriangleAlert
                    v-else
                    class="h-4 w-4 shrink-0"
                  />
                  <span>{{ statusMessage }}</span>
                </div>
              </div>

              <!-- Footer -->
              <div class="flex items-center justify-between gap-3 border-t border-[var(--border-default)] p-4">
                <button
                  v-if="store.pendingCount > 0"
                  type="button"
                  class="inline-flex items-center gap-2 text-xs text-theme-muted transition-colors hover:text-theme disabled:opacity-50"
                  :disabled="store.flushing"
                  @click="retryQueued"
                >
                  <RefreshCw
                    class="h-3.5 w-3.5"
                    :class="{ 'animate-spin': store.flushing }"
                  />
                  {{ store.pendingCount }} pending — retry now
                </button>
                <span v-else />

                <button
                  type="button"
                  class="btn-primary"
                  :disabled="!canSubmit || status === 'submitting'"
                  @click="onSubmit"
                >
                  <Send class="h-4 w-4" />
                  Send report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { Bug, CircleCheck, LoaderCircle, RefreshCw, Send, Star, TriangleAlert, X } from 'lucide-vue-next'
import type { AlphanautReportForm, AppPlatform } from '~/types/alphanaut'
import { useAlphanautStore } from '~/stores/alphanautStore'
import { useFirmwareStore } from '~/stores/firmwareStore'
import { useSerialMonitorStore } from '~/stores/serialMonitorStore'
import { useToastStore } from '~/stores/toastStore'

const store = useAlphanautStore()
const firmwareStore = useFirmwareStore()
const serialMonitorStore = useSerialMonitorStore()
const toastStore = useToastStore()

const appPlatforms: AppPlatform[] = ['Android', 'iOS', 'macOS', 'Linux', 'Windows', 'Web', 'N/A']

const inputClass = 'mt-1 w-full px-3 py-2 text-sm rounded-lg bg-surface-primary border border-theme text-theme'
const textareaClass = `${inputClass} resize-y`

const open = ref(false)
type Status = 'idle' | 'submitting' | 'sent' | 'queued' | 'rejected'
const status = ref<Status>('idle')
const statusError = ref('')

function blankForm(): AlphanautReportForm {
  return {
    handle: '',
    contact: '',
    rating: 0,
    whatHappened: '',
    expectedBehavior: '',
    reproSteps: '',
    appPlatform: 'N/A',
    appVersion: '',
    otherInfo: '',
    attachSerialLog: false,
    appLogs: '',
  }
}
const form = reactive<AlphanautReportForm>(blankForm())

const serialLineCount = computed(() => serialMonitorStore.terminalBuffer.length)

const canSubmit = computed(() =>
  form.handle.trim().length > 0
  && form.rating >= 1
  && form.whatHappened.trim().length > 0
  && form.expectedBehavior.trim().length > 0,
)

const statusMessage = computed(() => {
  switch (status.value) {
    case 'submitting': return 'Sending…'
    case 'sent': return 'Thanks! Your report was sent.'
    case 'queued': return 'Saved offline — it will retry automatically.'
    case 'rejected': return `Couldn't send: ${statusError.value}. Please try again.`
    default: return ''
  }
})

const statusClass = computed(() => {
  switch (status.value) {
    case 'sent': return 'bg-meshtastic/10 text-meshtastic'
    case 'rejected': return 'bg-red-500/10 text-red-400'
    case 'queued': return 'bg-amber-500/10 text-amber-400'
    default: return 'bg-surface-secondary text-theme-muted'
  }
})

function openPanel() {
  store.captureContext()
  status.value = 'idle'
  statusError.value = ''
  open.value = true
}

function close() {
  open.value = false
}

async function onSubmit() {
  if (!canSubmit.value) return
  status.value = 'submitting'
  const serialLog = form.attachSerialLog ? serialMonitorStore.terminalBuffer.join('\n') : ''
  const outcome = await store.submit(form, serialLog)
  if (outcome.status === 'sent') {
    status.value = 'sent'
    Object.assign(form, blankForm())
  }
  else if (outcome.status === 'queued') {
    status.value = 'queued'
  }
  else {
    status.value = 'rejected'
    statusError.value = outcome.error ?? 'unknown'
  }
}

async function retryQueued() {
  const { sent, failed } = await store.flushQueue()
  if (sent > 0 && failed === 0) {
    toastStore.success('Feedback synced', `Sent ${sent} queued report${sent === 1 ? '' : 's'}.`)
  }
  else if (sent > 0) {
    toastStore.warning('Partly synced', `Sent ${sent}, ${store.pendingCount} still pending.`)
  }
  else if (failed > 0) {
    toastStore.warning('Still offline', 'Could not reach the server — will retry later.')
  }
}

onMounted(() => {
  const config = useRuntimeConfig()
  store.configure(config.public.feedbackWebhookUrl as string, config.public.feedbackToken as string)

  // Reuse the existing Konami handler (it sets prereleaseUnlocked) to reveal the
  // tool, and persist that unlock across visits.
  if (firmwareStore.prereleaseUnlocked) store.unlock()
  watch(() => firmwareStore.prereleaseUnlocked, (v) => {
    if (v) store.unlock()
  })

  // Drain any reports queued while offline in a previous session.
  if (store.enabled) {
    void store.flushQueue()
    useEventListener(window, 'online', () => store.flushQueue())
  }
})
</script>
