<template>
  <div v-if="bleStore.isWebBluetoothSupported">
    <button
      type="button"
      class="btn-secondary"
      data-modal-target="ble-provisioning-modal"
      data-modal-toggle="ble-provisioning-modal"
    >
      {{ $t('ble.provision_wifi') }} <Bluetooth class="h-4 w-4 shrink-0" />
    </button>

    <Teleport to="body">
      <div
        id="ble-provisioning-modal"
        tabindex="-1"
        aria-hidden="true"
        class="hidden fixed inset-0 z-[50] modal-backdrop backdrop-blur-sm px-4 sm:px-6 md:px-8 py-8 md:py-12"
      >
        <div class="flex h-full w-full items-start justify-center">
          <div class="relative w-full max-w-lg">
            <div class="modal-content relative flex flex-col max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl text-theme">
              <!-- Header -->
              <div class="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
                <h3 class="text-lg font-semibold text-theme flex items-center gap-2">
                  <Bluetooth class="h-5 w-5 text-meshtastic" />
                  {{ $t('ble.provision_wifi') }}
                </h3>
                <button
                  type="button"
                  class="btn-icon"
                  data-modal-hide="ble-provisioning-modal"
                  @click="handleClose"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>

              <!-- Body -->
              <div class="flex-1 overflow-y-auto p-4 space-y-4">
                <p class="text-sm text-theme-muted">
                  {{ $t('ble.description') }}
                </p>

                <!-- Step 1: Connect -->
                <div v-if="!bleStore.isConnected">
                  <button
                    type="button"
                    class="btn-primary w-full"
                    :disabled="bleStore.isConnecting"
                    @click="bleStore.connect(t)"
                  >
                    <Loader2 v-if="bleStore.isConnecting" class="h-4 w-4 animate-spin" />
                    <Bluetooth v-else class="h-4 w-4" />
                    {{ bleStore.isConnecting ? $t('ble.connecting') : $t('ble.connect_device') }}
                  </button>
                </div>

                <!-- Step 2: Configure WiFi -->
                <template v-if="bleStore.isConnected">
                  <!-- Network Scan -->
                  <div class="space-y-2">
                    <button
                      type="button"
                      class="btn-secondary w-full"
                      :disabled="bleStore.isScanning"
                      @click="bleStore.scanNetworks(t)"
                    >
                      <Loader2 v-if="bleStore.isScanning" class="h-4 w-4 animate-spin" />
                      <Wifi v-else class="h-4 w-4" />
                      {{ bleStore.isScanning ? $t('ble.scanning') : $t('ble.scan_networks') }}
                    </button>

                    <!-- Network List -->
                    <div
                      v-if="bleStore.availableNetworks.length > 0"
                      class="space-y-1"
                    >
                      <label class="text-xs font-medium text-theme-muted uppercase tracking-wider">
                        {{ $t('ble.available_networks') }}
                      </label>
                      <div class="max-h-32 overflow-y-auto rounded-lg border border-[var(--border-default)]">
                        <button
                          v-for="network in bleStore.availableNetworks"
                          :key="network"
                          type="button"
                          class="w-full text-left px-3 py-2 text-sm text-theme hover:bg-[var(--accent-glow)] transition-colors border-b border-[var(--border-default)] last:border-b-0 flex items-center gap-2"
                          :class="{ 'bg-[var(--accent-glow)]': bleStore.ssid === network }"
                          @click="bleStore.ssid = network"
                        >
                          <Wifi class="h-3 w-3 text-theme-muted shrink-0" />
                          {{ network }}
                        </button>
                      </div>
                    </div>

                    <div
                      v-if="!bleStore.isScanning && bleStore.availableNetworks.length === 0 && hasScanned"
                      class="text-sm text-theme-muted text-center py-2"
                    >
                      {{ $t('ble.no_networks_found') }}
                    </div>
                  </div>

                  <!-- SSID Input -->
                  <div class="space-y-1">
                    <label class="text-xs font-medium text-theme-muted uppercase tracking-wider">
                      {{ $t('ble.ssid_label') }}
                    </label>
                    <input
                      v-model="bleStore.ssid"
                      type="text"
                      :placeholder="$t('ble.ssid_placeholder')"
                      class="w-full px-3 py-2 rounded-lg text-sm bg-[var(--surface-secondary)] border border-[var(--border-default)] text-theme placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                    >
                  </div>

                  <!-- Password Input -->
                  <div class="space-y-1">
                    <label class="text-xs font-medium text-theme-muted uppercase tracking-wider">
                      {{ $t('ble.psk_label') }}
                    </label>
                    <div class="relative">
                      <input
                        v-model="bleStore.psk"
                        :type="showPassword ? 'text' : 'password'"
                        :placeholder="$t('ble.psk_placeholder')"
                        class="w-full px-3 py-2 pr-10 rounded-lg text-sm bg-[var(--surface-secondary)] border border-[var(--border-default)] text-theme placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                      >
                      <button
                        type="button"
                        class="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme transition-colors"
                        :aria-label="showPassword ? $t('ble.hide_password') : $t('ble.show_password')"
                        @click="showPassword = !showPassword"
                      >
                        <EyeOff v-if="showPassword" class="h-4 w-4" />
                        <Eye v-else class="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <!-- Status Display -->
                  <div
                    v-if="bleStore.status !== 'idle'"
                    class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                    :class="statusClass"
                  >
                    <Loader2 v-if="bleStore.status === 'applying'" class="h-4 w-4 animate-spin" />
                    <CheckCircle v-else-if="bleStore.status === 'applied'" class="h-4 w-4" />
                    <XCircle v-else class="h-4 w-4" />
                    {{ statusText }}
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="btn-primary flex-1"
                      :disabled="!bleStore.canProvision"
                      @click="bleStore.provisionWifi(t)"
                    >
                      <Loader2 v-if="bleStore.isProvisioning" class="h-4 w-4 animate-spin" />
                      <Wifi v-else class="h-4 w-4" />
                      {{ bleStore.isProvisioning ? $t('ble.provisioning') : $t('ble.apply') }}
                    </button>
                    <button
                      type="button"
                      class="btn-secondary"
                      @click="bleStore.disconnect()"
                    >
                      {{ $t('ble.disconnect') }}
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import {
  Bluetooth,
  Wifi,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  X,
} from 'lucide-vue-next'

import { useBleProvisioningStore } from '../stores/bleProvisioningStore'

const { t } = useI18n()
const bleStore = useBleProvisioningStore()

const showPassword = ref(false)
const hasScanned = ref(false)

watch(() => bleStore.isScanning, (scanning, waScanning) => {
  if (waScanning && !scanning) {
    hasScanned.value = true
  }
})

const statusClass = computed(() => {
  switch (bleStore.status) {
    case 'applying':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
    case 'applied':
      return 'bg-green-500/10 text-green-400 border border-green-500/20'
    case 'apply-failed':
    case 'missing-ssid-or-psk':
      return 'bg-red-500/10 text-red-400 border border-red-500/20'
    default:
      return 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
  }
})

const statusText = computed(() => {
  switch (bleStore.status) {
    case 'applying':
      return t('ble.status_applying')
    case 'applied':
      return t('ble.status_applied')
    case 'apply-failed':
      return t('ble.status_apply_failed')
    case 'missing-ssid-or-psk':
      return t('ble.status_missing_credentials')
    default:
      return t('ble.status_idle')
  }
})

const handleClose = () => {
  hasScanned.value = false
  showPassword.value = false
}
</script>
