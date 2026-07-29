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

              <!-- LoRa (from the event branch's userPrefs.jsonc) -->
              <div
                v-if="hasLora"
                class="rounded-lg border border-theme bg-surface-primary p-3 text-sm"
              >
                <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-theme-muted">
                  {{ $t('event.section_lora') }}
                </p>
                <dl class="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                  <template v-if="prefs?.region">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_region') }}
                    </dt>
                    <dd>{{ prefs.region }}</dd>
                  </template>
                  <template v-if="prefs?.modemPreset">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_modem_preset') }}
                    </dt>
                    <dd>{{ prefs.modemPreset }}</dd>
                  </template>
                  <template v-if="prefs?.frequencySlot">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_frequency_slot') }}
                    </dt>
                    <dd>{{ prefs.frequencySlot }}</dd>
                  </template>
                  <template v-if="prefs?.hopLimit">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_hop_limit') }}
                    </dt>
                    <dd>{{ prefs.hopLimit }}</dd>
                  </template>
                  <template v-if="prefs?.ignoreMqtt !== undefined">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_ignore_mqtt') }}
                    </dt>
                    <dd>{{ $t(prefs?.ignoreMqtt ? 'event.value_yes' : 'event.value_no') }}</dd>
                  </template>
                </dl>
              </div>

              <!-- Channels -->
              <div
                v-if="prefs?.channels.length"
                class="rounded-lg border border-theme bg-surface-primary p-3 text-sm"
              >
                <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-theme-muted">
                  {{ $t('event.section_channels') }}
                </p>
                <div
                  v-for="channel in prefs.channels"
                  :key="channel.index"
                  :class="channel.index > 0 ? 'mt-2 border-t border-[var(--border-default)] pt-2' : ''"
                >
                  <p class="mb-1 font-medium text-theme">
                    {{ channel.name || '#' + channel.index }}
                  </p>
                  <dl class="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                    <template v-if="channel.psk">
                      <dt class="text-theme-muted">
                        {{ $t('event.label_psk') }}
                      </dt>
                      <dd class="break-all font-mono text-theme-accent">
                        {{ channel.psk }}
                      </dd>
                    </template>
                    <template v-if="channel.uplinkEnabled !== undefined">
                      <dt class="text-theme-muted">
                        {{ $t('event.label_uplink') }}
                      </dt>
                      <dd>{{ $t(channel.uplinkEnabled ? 'event.value_yes' : 'event.value_no') }}</dd>
                    </template>
                    <template v-if="channel.positionPrecision">
                      <dt class="text-theme-muted">
                        {{ $t('event.label_precision') }}
                      </dt>
                      <dd>{{ channel.positionPrecision }}</dd>
                    </template>
                  </dl>
                </div>
              </div>

              <!-- MQTT -->
              <div
                v-if="hasMqtt"
                class="rounded-lg border border-theme bg-surface-primary p-3 text-sm"
              >
                <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-theme-muted">
                  {{ $t('event.section_mqtt') }}
                </p>
                <dl class="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                  <template v-if="prefs?.mqtt.address">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_mqtt_address') }}
                    </dt>
                    <dd class="break-all">
                      {{ prefs.mqtt.address }}
                    </dd>
                  </template>
                  <template v-if="prefs?.mqtt.username">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_mqtt_username') }}
                    </dt>
                    <dd>{{ prefs.mqtt.username }}</dd>
                  </template>
                  <template v-if="prefs?.mqtt.password">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_mqtt_password') }}
                    </dt>
                    <dd class="break-all font-mono">
                      {{ prefs.mqtt.password }}
                    </dd>
                  </template>
                  <template v-if="prefs?.mqtt.rootTopic">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_mqtt_root_topic') }}
                    </dt>
                    <dd class="break-all">
                      {{ prefs.mqtt.rootTopic }}
                    </dd>
                  </template>
                  <template v-if="prefs?.mqtt.encryptionEnabled !== undefined">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_mqtt_encryption') }}
                    </dt>
                    <dd>{{ $t(prefs?.mqtt.encryptionEnabled ? 'event.value_yes' : 'event.value_no') }}</dd>
                  </template>
                  <template v-if="prefs?.mqtt.tlsEnabled !== undefined">
                    <dt class="text-theme-muted">
                      {{ $t('event.label_mqtt_tls') }}
                    </dt>
                    <dd>{{ $t(prefs?.mqtt.tlsEnabled ? 'event.value_yes' : 'event.value_no') }}</dd>
                  </template>
                </dl>
              </div>

              <!-- Settings fetch status + source link -->
              <p
                v-if="prefsState === 'loading'"
                class="text-sm text-theme-muted"
              >
                {{ $t('event.settings_loading') }}
              </p>
              <p
                v-else-if="prefsState === 'error'"
                class="text-sm text-theme-muted"
              >
                {{ $t('event.settings_unavailable') }}
              </p>
              <a
                v-if="prefsSourceUrl"
                :href="prefsSourceUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-sm text-meshtastic underline underline-offset-2"
              >
                {{ $t('event.view_userprefs') }}
                <ExternalLink class="h-3.5 w-3.5 shrink-0" />
              </a>

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
import type { EventUserPrefs } from '~/utils/eventUserPrefs'
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

// Radio settings from the event branch's userPrefs.jsonc, fetched lazily on
// first open so non-event visitors and closed sheets cost nothing.
const prefs = ref<EventUserPrefs | null>(null)
const prefsState = ref<'idle' | 'loading' | 'loaded' | 'error'>('idle')
const firmwareSlug = computed(() => edition.value?.firmware?.slug)
const prefsSourceUrl = computed(() => firmwareSlug.value ? eventUserPrefsSourceUrl(firmwareSlug.value) : undefined)
const hasLora = computed(() => !!prefs.value && (
  prefs.value.region !== undefined
  || prefs.value.modemPreset !== undefined
  || prefs.value.frequencySlot !== undefined
  || prefs.value.hopLimit !== undefined
  || prefs.value.ignoreMqtt !== undefined
))
const hasMqtt = computed(() => !!prefs.value && Object.values(prefs.value.mqtt).some(v => v !== undefined))

async function loadPrefs() {
  const slug = firmwareSlug.value
  if (prefsState.value !== 'idle' || !slug) return
  prefsState.value = 'loading'
  const result = await fetchEventUserPrefs(slug)
  prefs.value = result
  prefsState.value = result ? 'loaded' : 'error'
}

function openPanel() {
  open.value = true
  loadPrefs()
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
