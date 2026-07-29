<template>
  <button
    v-if="eventMode.enabled"
    ref="triggerButton"
    type="button"
    class="btn-secondary"
    @click="openPanel"
  >
    {{ $t('event.details_button') }} <Info class="h-4 w-4 shrink-0" />
  </button>

  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[65] modal-backdrop backdrop-blur-sm px-4 py-8 md:py-12"
      @click.self="close"
    >
      <div class="flex h-full w-full items-start justify-center">
        <div class="relative w-full max-w-lg">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-details-title"
            class="modal-content relative flex max-h-[90vh] flex-col overflow-hidden rounded-2xl text-theme shadow-2xl"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-[var(--border-default)] p-4">
              <h3
                id="event-details-title"
                class="flex items-center gap-2 text-lg font-semibold text-theme"
              >
                <Info class="h-5 w-5 text-meshtastic" />
                {{ $t('event.details_title') }}
              </h3>
              <button
                ref="closeButton"
                type="button"
                class="btn-icon focus:outline-none focus-visible:ring-2 focus-visible:ring-meshtastic"
                :aria-label="$t('actions.close_dialog')"
                @click="close"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <!-- Body -->
            <div class="flex-1 space-y-4 overflow-y-auto p-4">
              <!-- Event -->
              <div class="rounded-lg border border-theme bg-surface-primary p-3 text-sm">
                <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-theme-muted">
                  {{ $t('event.section_event') }}
                </p>
                <dl class="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                  <dt class="text-theme-muted">
                    {{ $t('event.label_name') }}
                  </dt>
                  <dd>{{ eventMode.eventName }}</dd>
                  <template v-if="dateRange">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_dates') }}
                    </dt>
                    <dd>{{ dateRange }}</dd>
                  </template>
                  <template v-if="edition?.location">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_location') }}
                    </dt>
                    <dd>{{ edition.location }}</dd>
                  </template>
                  <template v-if="edition?.timeZone">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_timezone') }}
                    </dt>
                    <dd>{{ edition.timeZone }}</dd>
                  </template>
                </dl>
                <p
                  v-if="edition?.welcomeMessage"
                  class="mt-2 text-theme-muted"
                >
                  {{ edition.welcomeMessage }}
                </p>
              </div>

              <!-- Firmware -->
              <div
                v-if="eventMode.firmware.title || firmwareVersion"
                class="rounded-lg border border-theme bg-surface-primary p-3 text-sm"
              >
                <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-theme-muted">
                  {{ $t('event.section_firmware') }}
                </p>
                <dl class="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                  <template v-if="eventMode.firmware.title">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_build') }}
                    </dt>
                    <dd>{{ eventMode.firmware.title }}</dd>
                  </template>
                  <template v-if="firmwareVersion">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_version') }}
                    </dt>
                    <dd class="break-all font-mono text-theme-accent">
                      {{ firmwareVersion }}
                    </dd>
                  </template>
                </dl>
              </div>

              <!-- Theme -->
              <div
                v-if="eventMode.theme"
                class="rounded-lg border border-theme bg-surface-primary p-3 text-sm"
              >
                <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-theme-muted">
                  {{ $t('event.section_theme') }}
                </p>
                <dl class="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                  <template v-if="eventMode.theme.name">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_theme_name') }}
                    </dt>
                    <dd>{{ eventMode.theme.name }}</dd>
                  </template>
                  <template v-if="eventMode.theme.tagline || eventMode.tagline">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_tagline') }}
                    </dt>
                    <dd>{{ eventMode.theme.tagline || eventMode.tagline }}</dd>
                  </template>
                  <template v-if="eventMode.theme.palette?.length">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_palette') }}
                    </dt>
                    <dd class="flex flex-wrap gap-1.5">
                      <span
                        v-for="color in eventMode.theme.palette"
                        :key="color"
                        class="h-5 w-5 rounded border border-theme"
                        :style="{ backgroundColor: color }"
                        :title="color"
                      />
                    </dd>
                  </template>
                </dl>
              </div>

              <!-- Links -->
              <div
                v-if="edition?.links?.length"
                class="rounded-lg border border-theme bg-surface-primary p-3 text-sm"
              >
                <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-theme-muted">
                  {{ $t('event.section_links') }}
                </p>
                <ul class="space-y-1">
                  <li
                    v-for="link in edition.links"
                    :key="link.url"
                  >
                    <a
                      :href="link.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1.5 text-meshtastic underline underline-offset-2"
                    >
                      {{ link.label }}
                      <ExternalLink class="h-3.5 w-3.5 shrink-0" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue'
import { onKeyStroke } from '@vueuse/core'
import { ExternalLink, Info, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useSerialMonitorStore } from '~/stores/serialMonitorStore'

const { eventMode } = useEventMode()
const edition = useEventEdition()
const serialMonitorStore = useSerialMonitorStore()
const { locale } = useI18n()

const open = ref(false)
const triggerButton = ref<HTMLButtonElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)

const dateRange = computed(() => formatEventDateRange(edition.value?.eventStart, edition.value?.eventEnd, locale.value))
const firmwareVersion = computed(() => edition.value?.firmware?.version || eventMode.value.firmware.id)

function openPanel() {
  open.value = true
  nextTick(() => closeButton.value?.focus())
}

function close() {
  open.value = false
  nextTick(() => triggerButton.value?.focus())
}

onKeyStroke('Escape', () => {
  if (open.value) close()
})

// The whole button row (including our trigger) hides while the serial monitor
// is connected, so drop the sheet too instead of leaving it orphaned.
watch(() => serialMonitorStore.isConnected, (connected) => {
  if (connected) open.value = false
})
</script>
