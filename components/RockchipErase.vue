<template>
  <div :class="embedded ? 'space-y-6' : 'max-w-2xl mx-auto p-4 space-y-6'">
    <div v-if="!embedded">
      <h2 class="flex items-center gap-2 text-2xl font-bold text-theme">
        <HardDrive class="w-6 h-6" />
        Rockchip Flash Eraser
      </h2>
      <p class="mt-1 text-sm text-theme-muted">
        Erase the on-board flash of a Rockchip device over WebUSB, a browser port of
        <code class="text-theme-accent">rkdeveloptool ef</code>. The device must be in
        <strong>Loader</strong> mode (held in Maskrom needs a loader downloaded first, which this tool does not do).
      </p>
    </div>

    <!-- WebUSB unsupported -->
    <div
      v-if="!isSupported"
      class="flex p-4 text-sm rounded-lg alert-box"
      role="alert"
    >
      <TriangleAlert class="flex-shrink-0 inline w-5 h-5 me-3 mt-0.5" />
      <div>
        WebUSB is not available in this browser. Use Chrome, Edge, or another Chromium-based browser over HTTPS or localhost.
      </div>
    </div>

    <template v-else>
      <!-- Pre-erase warning (from the mPWRD-OS wiki) -->
      <div
        class="flex p-4 text-sm text-yellow-400 border border-yellow-700 rounded-lg bg-surface-primary"
        role="alert"
      >
        <TriangleAlert class="flex-shrink-0 inline w-5 h-5 me-3 mt-0.5" />
        <div>
          <strong>Remove the microSD card before erasing.</strong>
          On boards that ship pre-flashed from the factory, leaving it in can target the wrong
          storage or let the board keep booting from the card.
        </div>
      </div>

      <!-- Step 1: Connect -->
      <ol class="relative ms-3.5 border-theme-left">
        <li class="mb-8 ms-8">
          <span class="absolute -start-4 step-badge">1</span>
          <div class="p-4 rounded-lg shadow-sm step-card">
            <h3 class="mb-3 text-lg font-semibold text-theme">
              Connect device
            </h3>
            <!-- How to enter download mode -->
            <div
              v-if="!isConnected"
              class="flex p-3 mb-4 text-sm rounded-lg alert-box"
              role="note"
            >
              <Info class="flex-shrink-0 inline w-5 h-5 me-3 mt-0.5" />
              <div class="space-y-1">
                <p class="font-medium text-theme">
                  Put the board into download mode first:
                </p>
                <ol class="ms-5 space-y-0.5 list-decimal text-theme-muted">
                  <li>Remove the microSD card.</li>
                  <li>
                    Hold the board's <strong>Maskrom / BOOT</strong> button (~5&nbsp;s) while connecting USB.
                    The exact button varies by board; check its manual or the
                    <a
                      href="https://github.com/mPWRD-OS/mPWRD-OS/wiki/Rockchip-Flashing"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="underline text-theme-accent"
                    >mPWRD-OS wiki</a>.
                  </li>
                  <li>
                    Connect below. A <strong>Loader</strong> badge means the flash is accessible;
                    <strong>Maskrom</strong> means a loader must be downloaded first (not supported here).
                  </li>
                </ol>
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <button
                v-if="!isConnected"
                type="button"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-meshtastic rounded-lg hover:bg-green-300 disabled:opacity-50 transition-colors"
                :disabled="isBusy"
                @click="connect"
              >
                <Usb class="w-4 h-4" />
                Connect Rockchip device
              </button>
              <button
                v-else
                type="button"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-theme bg-surface-primary border border-theme rounded-lg hover:bg-surface-secondary disabled:opacity-50 transition-colors"
                :disabled="isBusy"
                @click="disconnect"
              >
                <Unplug class="w-4 h-4" />
                Disconnect
              </button>
            </div>

            <!-- Device info -->
            <div
              v-if="isConnected && deviceInfo"
              class="mt-4 p-3 text-sm rounded-lg bg-surface-primary border border-theme"
            >
              <div class="flex items-center gap-2 mb-2">
                <span class="font-medium text-theme">
                  {{ deviceInfo.productName || 'Rockchip device' }}
                </span>
                <span
                  class="px-2 py-0.5 text-xs font-semibold rounded-full"
                  :class="isMaskrom ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'"
                >
                  {{ isMaskrom ? 'Maskrom' : 'Loader' }}
                </span>
              </div>
              <dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-theme-muted">
                <dt>USB ID</dt>
                <dd class="text-theme">
                  {{ usbId }}
                </dd>
                <template v-if="flashInfo">
                  <dt>Storage</dt>
                  <dd class="text-theme">
                    {{ storageType }}
                  </dd>
                  <dt>Capacity</dt>
                  <dd class="text-theme">
                    {{ formatBytes(flashInfo.sizeBytes) }}
                  </dd>
                  <dt>Sectors</dt>
                  <dd class="text-theme">
                    {{ flashInfo.totalSectors.toLocaleString() }} × 512 B
                  </dd>
                </template>
              </dl>
            </div>

            <!-- Maskrom warning -->
            <div
              v-if="isConnected && isMaskrom"
              class="flex mt-4 p-4 text-sm text-yellow-400 border border-yellow-700 rounded-lg bg-surface-primary"
              role="alert"
            >
              <TriangleAlert class="flex-shrink-0 inline w-5 h-5 me-3 mt-0.5" />
              <div>
                This device is in <strong>Maskrom</strong> mode. The flash can't be read or erased until a
                loader is downloaded to it (the <code>db</code> step), which this tool doesn't perform. Put the
                board into Loader mode and reconnect.
              </div>
            </div>
          </div>
        </li>

        <!-- Step 2: Erase -->
        <li class="ms-8">
          <span class="absolute -start-4 step-badge">2</span>
          <div class="p-4 rounded-lg shadow-sm step-card">
            <h3 class="mb-3 text-lg font-semibold text-theme">
              Erase flash
            </h3>

            <div
              class="flex flex-col p-4 mb-4 text-sm text-red-400 border border-red-800 rounded-lg bg-surface-primary"
              role="alert"
            >
              <div class="flex items-center">
                <TriangleAlert class="flex-shrink-0 inline w-5 h-5 me-3" />
                <span>This permanently erases the entire flash. There is no undo. Back up anything you need first.</span>
              </div>
            </div>

            <label class="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                v-model="confirmed"
                type="checkbox"
                :disabled="!canErase"
                class="w-4 h-4 rounded accent-red-600"
              >
              <span class="text-sm text-theme-muted">I understand this will erase all data on the device.</span>
            </label>

            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :disabled="!canErase || !confirmed"
              @click="erase"
            >
              <LoaderCircle
                v-if="isErasing"
                class="w-4 h-4 animate-spin"
              />
              <Trash2
                v-else
                class="w-4 h-4"
              />
              {{ isErasing ? 'Erasing…' : 'Erase flash' }}
            </button>

            <!-- Progress -->
            <div
              v-if="isErasing || progress > 0"
              class="mt-4"
            >
              <div class="flex justify-between mb-1">
                <span class="text-sm font-medium text-theme">{{ status }}</span>
                <span class="text-sm font-medium text-theme-accent">{{ progress }}%</span>
              </div>
              <div class="w-full rounded-full h-2.5 progress-track">
                <div
                  class="bg-gradient-to-r from-red-400 to-red-600 h-2.5 rounded-full transition-all duration-300"
                  :style="{ width: `${progress}%` }"
                />
              </div>
            </div>

            <div
              v-if="isConnected && !isMaskrom"
              class="mt-4"
            >
              <button
                type="button"
                class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-theme bg-surface-primary border border-theme rounded-lg hover:bg-surface-secondary disabled:opacity-50 transition-colors"
                :disabled="isBusy"
                @click="reset"
              >
                <RotateCcw class="w-3.5 h-3.5" />
                Reset device
              </button>
            </div>
          </div>
        </li>
      </ol>

      <!-- Error -->
      <div
        v-if="error"
        class="flex p-4 text-sm text-red-400 border border-red-800 rounded-lg bg-surface-primary"
        role="alert"
      >
        <TriangleAlert class="flex-shrink-0 inline w-5 h-5 me-3 mt-0.5" />
        <div>{{ error }}</div>
      </div>

      <!-- Log -->
      <div v-if="log.length">
        <h3 class="mb-2 text-sm font-semibold text-theme-muted">
          Log
        </h3>
        <div
          ref="logEl"
          class="p-3 h-48 overflow-y-auto text-xs font-mono rounded-lg bg-black/40 text-theme-muted whitespace-pre-wrap"
        >
          <div
            v-for="(line, i) in log"
            :key="i"
          >
            {{ line }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue'
import {
  HardDrive,
  Info,
  LoaderCircle,
  RotateCcw,
  Trash2,
  TriangleAlert,
  Unplug,
  Usb,
} from 'lucide-vue-next'
import { formatBytes, useRockchipErase } from '~/composables/useRockchipErase'

defineProps<{ embedded?: boolean }>()

const {
  isSupported,
  isConnected,
  isBusy,
  isErasing,
  canErase,
  isMaskrom,
  status,
  deviceInfo,
  flashInfo,
  progress,
  error,
  log,
  connect,
  erase,
  reset,
  disconnect,
} = useRockchipErase()

const confirmed = ref(false)
const logEl = ref<HTMLElement | null>(null)

const usbId = computed(() => {
  if (!deviceInfo.value) return ''
  const pad = (n: number) => n.toString(16).padStart(4, '0')
  return `0x${pad(deviceInfo.value.vendorId)}:0x${pad(deviceInfo.value.productId)}`
})

const storageType = computed(() => {
  if (!flashInfo.value) return ''
  if (flashInfo.value.isEmmc) return 'eMMC'
  if (flashInfo.value.directLba) return 'Direct LBA'
  return 'Raw NAND'
})

// Auto-scroll the log to the newest line.
watch(() => log.value.length, async () => {
  await nextTick()
  if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
})

// Reset the confirmation guard whenever a device disconnects.
watch(isConnected, (connected) => {
  if (!connected) confirmed.value = false
})
</script>
