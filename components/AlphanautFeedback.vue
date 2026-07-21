<template>
  <div v-if="store.isVisible">
    <!-- Floating reveal badge. z-[9999] keeps it above the konami vignette overlay
         (::after, z-index 9998) and app modal backdrops so it never gets dimmed;
         hidden while its own panel is open so it can't overlap the dialog. -->
    <button
      v-show="!open"
      ref="badgeButton"
      type="button"
      class="fixed right-2 sm:right-4 bottom-2 sm:bottom-4 z-[9999] inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-meshtastic/50 bg-meshtastic/10 px-3 py-2 text-xs font-medium text-meshtastic shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-meshtastic/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-meshtastic"
      :title="$t('alphanaut.badge_title')"
      @click="openPanel"
    >
      <Bug class="h-4 w-4 shrink-0" />
      <span class="hidden sm:inline">{{ $t('alphanaut.badge_label') }}</span>
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
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="alphanaut-title"
              class="modal-content relative flex max-h-[90vh] flex-col overflow-hidden rounded-2xl text-theme shadow-2xl"
            >
              <!-- Header -->
              <div class="flex items-center justify-between border-b border-[var(--border-default)] p-4">
                <h3
                  id="alphanaut-title"
                  class="flex items-center gap-2 text-lg font-semibold text-theme"
                >
                  <Bug class="h-5 w-5 text-meshtastic" />
                  {{ $t('alphanaut.title') }}
                </h3>
                <button
                  type="button"
                  class="btn-icon focus:outline-none focus-visible:ring-2 focus-visible:ring-meshtastic"
                  :aria-label="$t('alphanaut.close')"
                  @click="close"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>

              <!-- Body -->
              <div class="flex-1 space-y-4 overflow-y-auto p-4">
                <!-- Auto-captured firmware context (read-only) -->
                <div class="rounded-lg border border-theme bg-surface-primary p-3 text-sm">
                  <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-theme-muted">
                    {{ $t('alphanaut.captured') }}
                  </p>
                  <dl class="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                    <dt class="text-theme-muted">
                      {{ $t('alphanaut.firmware') }}
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

                <!-- Hardware — auto-detected, but the tester can correct it -->
                <label class="block">
                  <span class="text-sm text-theme-muted">{{ $t('alphanaut.hardware') }}</span>
                  <select
                    v-model="selectedHardware"
                    :class="inputClass"
                  >
                    <option value="">
                      {{ $t('alphanaut.hardware_unknown') }}
                    </option>
                    <option
                      v-for="opt in hardwareOptions"
                      :key="opt.platformioTarget"
                      :value="opt.platformioTarget"
                    >
                      {{ opt.displayName ? `${opt.displayName} (${opt.platformioTarget})` : opt.platformioTarget }}
                    </option>
                  </select>
                  <span class="mt-1 block text-xs text-theme-muted">{{ $t('alphanaut.hardware_hint') }}</span>
                </label>

                <!-- Handle -->
                <label class="block">
                  <span class="text-sm text-theme-muted">{{ $t('alphanaut.handle') }} *</span>
                  <input
                    ref="handleInput"
                    v-model="form.handle"
                    type="text"
                    :placeholder="$t('alphanaut.handle_ph')"
                    :class="inputClass"
                  >
                </label>

                <!-- Outcome: pass / fail / observation -->
                <div class="block">
                  <span class="text-sm text-theme-muted">{{ $t('alphanaut.outcome') }} *</span>
                  <div
                    class="mt-1 grid grid-cols-3 gap-2"
                    role="radiogroup"
                    :aria-label="$t('alphanaut.outcome')"
                  >
                    <button
                      v-for="(opt, i) in outcomeOptions"
                      :key="opt.value"
                      type="button"
                      role="radio"
                      :aria-checked="form.outcome === opt.value"
                      :tabindex="outcomeTabindex(i)"
                      class="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-meshtastic"
                      :class="form.outcome === opt.value ? opt.activeClass : 'border-theme text-theme-muted hover:bg-surface-secondary'"
                      @click="form.outcome = opt.value"
                      @keydown="onOutcomeKeydown($event, i)"
                    >
                      <component
                        :is="opt.icon"
                        class="h-4 w-4 shrink-0"
                      />
                      {{ $t(opt.label) }}
                    </button>
                  </div>
                </div>

                <!-- What happened / expected -->
                <label class="block">
                  <span class="text-sm text-theme-muted">{{ $t('alphanaut.what_happened') }} *</span>
                  <textarea
                    v-model="form.whatHappened"
                    rows="3"
                    :placeholder="$t('alphanaut.what_happened_ph')"
                    :class="textareaClass"
                  />
                </label>
                <label class="block">
                  <span class="text-sm text-theme-muted">{{ $t('alphanaut.expected') }} *</span>
                  <textarea
                    v-model="form.expectedBehavior"
                    rows="2"
                    :placeholder="$t('alphanaut.expected_ph')"
                    :class="textareaClass"
                  />
                </label>
                <label class="block">
                  <span class="text-sm text-theme-muted">{{ $t('alphanaut.repro') }}</span>
                  <textarea
                    v-model="form.reproSteps"
                    rows="2"
                    :placeholder="$t('alphanaut.repro_ph')"
                    :class="textareaClass"
                  />
                </label>

                <!-- App platform / version -->
                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="block">
                    <span class="text-sm text-theme-muted">{{ $t('alphanaut.app_platform') }}</span>
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
                    <span class="text-sm text-theme-muted">{{ $t('alphanaut.app_version') }}</span>
                    <input
                      v-model="form.appVersion"
                      type="text"
                      :placeholder="$t('alphanaut.app_version_ph')"
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
                  {{ $t('alphanaut.attach_serial', { n: serialLineCount }) }}
                </label>
                <label class="block">
                  <span class="text-sm text-theme-muted">{{ $t('alphanaut.app_logs') }}</span>
                  <textarea
                    v-model="form.appLogs"
                    rows="2"
                    :placeholder="$t('alphanaut.app_logs_ph')"
                    :class="textareaClass"
                  />
                </label>

                <!-- Optional contact + notes -->
                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="block">
                    <span class="text-sm text-theme-muted">{{ $t('alphanaut.contact') }}</span>
                    <input
                      v-model="form.contact"
                      type="text"
                      :placeholder="$t('alphanaut.contact_ph')"
                      :class="inputClass"
                    >
                  </label>
                  <label class="block">
                    <span class="text-sm text-theme-muted">{{ $t('alphanaut.other') }}</span>
                    <input
                      v-model="form.otherInfo"
                      type="text"
                      :placeholder="$t('alphanaut.other_ph')"
                      :class="inputClass"
                    >
                  </label>
                </div>

                <!-- Inline status -->
                <div
                  v-if="status !== 'idle'"
                  class="flex items-center gap-2 rounded-lg p-3 text-sm"
                  :class="statusClass"
                  role="status"
                  aria-live="polite"
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
                  class="inline-flex items-center gap-2 text-xs text-theme-muted transition-colors hover:text-theme focus:outline-none focus-visible:ring-2 focus-visible:ring-meshtastic disabled:opacity-50"
                  :disabled="store.flushing"
                  @click="retryQueued"
                >
                  <RefreshCw
                    class="h-3.5 w-3.5"
                    :class="{ 'animate-spin': store.flushing }"
                  />
                  {{ $t('alphanaut.retry_pending', { n: store.pendingCount }) }}
                </button>
                <span v-else />

                <button
                  type="button"
                  class="btn-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-meshtastic"
                  :disabled="!canSubmit || status === 'submitting'"
                  @click="onSubmit"
                >
                  <Send class="h-4 w-4" />
                  {{ $t('alphanaut.submit') }}
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
import { computed, nextTick, onMounted, reactive, ref, type Component } from 'vue'
import { onKeyStroke, useEventListener } from '@vueuse/core'
import { Bug, CircleCheck, CircleX, Eye, LoaderCircle, RefreshCw, Send, TriangleAlert, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { AlphanautOutcome, AlphanautReportForm, AppPlatform } from '~/types/alphanaut'
import { useAlphanautStore } from '~/stores/alphanautStore'
import { useSerialMonitorStore } from '~/stores/serialMonitorStore'
import { useToastStore } from '~/stores/toastStore'

const { t } = useI18n()
const store = useAlphanautStore()
const serialMonitorStore = useSerialMonitorStore()
const toastStore = useToastStore()

const appPlatforms: AppPlatform[] = ['Android', 'iOS', 'macOS', 'Linux', 'Windows', 'Web', 'N/A']

// Pass/fail/observation verdict, replacing the old star rating. activeClass is
// applied only to the selected option.
const outcomeOptions: { value: AlphanautOutcome, label: string, icon: Component, activeClass: string }[] = [
  { value: 'pass', label: 'alphanaut.outcome_pass', icon: CircleCheck, activeClass: 'border-meshtastic bg-meshtastic/15 text-meshtastic' },
  { value: 'fail', label: 'alphanaut.outcome_fail', icon: CircleX, activeClass: 'border-red-500 bg-red-500/15 text-red-400' },
  { value: 'observation', label: 'alphanaut.outcome_observation', icon: Eye, activeClass: 'border-amber-500 bg-amber-500/15 text-amber-400' },
]

const inputClass = 'mt-1 w-full px-3 py-2 text-sm rounded-lg bg-surface-primary border border-theme text-theme focus:outline-none focus:ring-2 focus:ring-meshtastic/60 focus:border-meshtastic'
const textareaClass = `${inputClass} resize-y`

const open = ref(false)
const badgeButton = ref<HTMLButtonElement | null>(null)
const handleInput = ref<HTMLInputElement | null>(null)
type Status = 'idle' | 'submitting' | 'sent' | 'queued' | 'rejected'
const status = ref<Status>('idle')
const statusError = ref('')

function blankForm(): AlphanautReportForm {
  return {
    handle: '',
    contact: '',
    outcome: '',
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

// Hardware selector: defaults to the auto-detected target (re-captured each time
// the panel opens) but the tester can pick a different board. Writing back through
// the store's snapshot.device is all the submitted payload reads.
const hardwareOptions = computed(() => store.hardwareOptions)
const selectedHardware = computed<string>({
  get: () => store.snapshot.device?.platformioTarget ?? '',
  set: (target) => {
    store.setDevice(hardwareOptions.value.find(o => o.platformioTarget === target) ?? null)
  },
})

const canSubmit = computed(() =>
  form.handle.trim().length > 0
  && form.outcome !== ''
  && form.whatHappened.trim().length > 0
  && form.expectedBehavior.trim().length > 0,
)

// ARIA radiogroup keyboard support: only the selected option (or the first, when
// none is chosen) stays in the tab order; arrow keys move selection with wrapping.
function outcomeTabindex(i: number): number {
  const selected = outcomeOptions.findIndex(o => o.value === form.outcome)
  return i === (selected >= 0 ? selected : 0) ? 0 : -1
}

function onOutcomeKeydown(e: KeyboardEvent, i: number) {
  const n = outcomeOptions.length
  let next = i
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      next = (i + 1) % n
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      next = (i - 1 + n) % n
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = n - 1
      break
    default:
      return
  }
  e.preventDefault()
  form.outcome = outcomeOptions[next].value
  const group = (e.currentTarget as HTMLElement).parentElement
  group?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus()
}

const statusMessage = computed(() => {
  switch (status.value) {
    case 'submitting': return t('alphanaut.status_submitting')
    case 'sent': return t('alphanaut.status_sent')
    case 'queued': return t('alphanaut.status_queued')
    case 'rejected': return t('alphanaut.status_rejected', { error: statusError.value })
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
  nextTick(() => handleInput.value?.focus())
}

function close() {
  open.value = false
  nextTick(() => badgeButton.value?.focus())
}

onKeyStroke('Escape', () => {
  if (open.value) close()
})

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
    toastStore.success(t('alphanaut.toast_synced_title'), t('alphanaut.toast_synced_body', { n: sent }))
  }
  else if (sent > 0) {
    toastStore.warning(t('alphanaut.toast_partial_title'), t('alphanaut.toast_partial_body', { sent, pending: store.pendingCount }))
  }
  else if (failed > 0) {
    toastStore.warning(t('alphanaut.toast_offline_title'), t('alphanaut.toast_offline_body'))
  }
}

onMounted(() => {
  const config = useRuntimeConfig()
  store.configure(config.public.feedbackWebhookUrl as string, config.public.feedbackToken as string)

  // Drain any reports queued while offline in a previous session.
  if (store.enabled) {
    void store.flushQueue()
    useEventListener(window, 'online', () => store.flushQueue())
  }
})
</script>
