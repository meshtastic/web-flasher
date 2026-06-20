<template>
  <div :class="embedded ? 'space-y-6' : 'max-w-2xl mx-auto p-4 space-y-6'">
    <div v-if="!embedded">
      <h2 class="flex items-center gap-2 text-2xl font-bold text-theme">
        <Terminal class="w-6 h-6" />
        U-Boot / Fastboot
      </h2>
      <p class="mt-1 text-sm text-theme-muted">
        Talk to a device's <strong>fastboot</strong> USB gadget over WebUSB: read its variables,
        flash or erase partitions, boot an image from RAM, and reboot.
      </p>
    </div>

    <!-- Scope note -->
    <div
      class="flex p-3 text-sm rounded-lg alert-box"
      role="note"
    >
      <Info class="flex-shrink-0 inline w-5 h-5 me-3 mt-0.5" />
      <div class="space-y-1">
        <p class="text-theme-muted">
          Works with any device that exposes a USB <strong>fastboot</strong> gadget &mdash; U-Boot built
          with <code class="text-theme-accent">CONFIG_USB_FUNCTION_FASTBOOT</code>, or an Android device
          in bootloader mode. A board "supporting U-Boot" is not enough on its own: it must bring up
          fastboot in <strong>USB device mode</strong> (many routers flash over TFTP/serial instead, which
          the browser cannot reach).
        </p>
      </div>
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
      <ol class="relative ms-3.5 border-theme-left">
        <!-- Step 1: Connect -->
        <li class="mb-8 ms-8">
          <span class="absolute -start-4 step-badge">1</span>
          <div class="p-4 rounded-lg shadow-sm step-card">
            <h3 class="mb-3 text-lg font-semibold text-theme">
              Connect device
            </h3>
            <div
              v-if="!isConnected"
              class="flex p-3 mb-4 text-sm rounded-lg alert-box"
              role="note"
            >
              <Info class="flex-shrink-0 inline w-5 h-5 me-3 mt-0.5" />
              <div class="space-y-1 text-theme-muted">
                <p class="font-medium text-theme">
                  Put the device into fastboot mode first:
                </p>
                <ul class="ms-5 space-y-0.5 list-disc">
                  <li>U-Boot: stop at the prompt and run <code class="text-theme-accent">fastboot usb 0</code> (or your board's fastboot command).</li>
                  <li>Android: power off, then hold the bootloader key combo, or <code class="text-theme-accent">adb reboot bootloader</code>.</li>
                </ul>
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
                Connect fastboot device
              </button>
              <template v-else>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-theme bg-surface-primary border border-theme rounded-lg hover:bg-surface-secondary disabled:opacity-50 transition-colors"
                  :disabled="isBusy"
                  @click="disconnect"
                >
                  <Unplug class="w-4 h-4" />
                  Disconnect
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-theme bg-surface-primary border border-theme rounded-lg hover:bg-surface-secondary disabled:opacity-50 transition-colors"
                  :disabled="isBusy"
                  @click="refreshVars"
                >
                  <RefreshCw class="w-4 h-4" />
                  Refresh info
                </button>
              </template>
            </div>

            <!-- Device info + vars -->
            <div
              v-if="isConnected && deviceInfo"
              class="mt-4 p-3 text-sm rounded-lg bg-surface-primary border border-theme space-y-2"
            >
              <div class="font-medium text-theme">
                {{ deviceInfo.productName || 'Fastboot device' }}
                <span class="text-theme-muted font-normal">
                  ({{ hex(deviceInfo.vendorId) }}:{{ hex(deviceInfo.productId) }})
                </span>
              </div>
              <dl
                v-if="varEntries.length"
                class="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-theme-muted"
              >
                <template
                  v-for="[key, value] in varEntries"
                  :key="key"
                >
                  <dt class="font-mono text-theme-accent">
                    {{ key }}
                  </dt>
                  <dd class="font-mono break-all">
                    {{ value }}
                  </dd>
                </template>
              </dl>
            </div>
          </div>
        </li>

        <!-- Step 2: Flash / erase -->
        <li class="mb-8 ms-8">
          <span class="absolute -start-4 step-badge">2</span>
          <div class="p-4 rounded-lg shadow-sm step-card">
            <h3 class="mb-3 text-lg font-semibold text-theme">
              Flash a partition
            </h3>
            <div class="space-y-3">
              <label class="block">
                <span class="text-sm text-theme-muted">Partition</span>
                <input
                  v-model="partition"
                  type="text"
                  placeholder="e.g. boot, system, idbloader, uboot"
                  :disabled="!isConnected || isBusy"
                  class="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-surface-primary border border-theme text-theme disabled:opacity-50"
                >
              </label>
              <label class="block">
                <span class="text-sm text-theme-muted">Image file</span>
                <input
                  type="file"
                  :disabled="!isConnected || isBusy"
                  class="mt-1 block w-full text-sm text-theme-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-surface-secondary file:text-theme hover:file:bg-surface-primary disabled:opacity-50"
                  @change="onFlashFile"
                >
              </label>
              <div class="flex flex-wrap gap-3">
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-meshtastic rounded-lg hover:bg-green-300 disabled:opacity-50 transition-colors"
                  :disabled="!isConnected || isBusy || !flashFile || !partition.trim()"
                  @click="flashPartition(partition, flashFile)"
                >
                  <Zap class="w-4 h-4" />
                  Flash
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-theme bg-surface-primary border border-theme rounded-lg hover:bg-surface-secondary disabled:opacity-50 transition-colors"
                  :disabled="!isConnected || isBusy || !partition.trim()"
                  @click="confirmErase"
                >
                  <Trash2 class="w-4 h-4" />
                  Erase
                </button>
              </div>

              <!-- Progress -->
              <div
                v-if="isFlashing || progress > 0"
                class="w-full h-2 rounded-full bg-surface-secondary overflow-hidden"
              >
                <div
                  class="h-full bg-meshtastic transition-all"
                  :style="{ width: `${progress}%` }"
                />
              </div>
            </div>
          </div>
        </li>

        <!-- Step 3: Boot / reboot -->
        <li class="ms-8">
          <span class="absolute -start-4 step-badge">3</span>
          <div class="p-4 rounded-lg shadow-sm step-card">
            <h3 class="mb-3 text-lg font-semibold text-theme">
              Boot &amp; reboot
            </h3>
            <div class="space-y-3">
              <label class="block">
                <span class="text-sm text-theme-muted">Boot an image from RAM (optional)</span>
                <input
                  type="file"
                  :disabled="!isConnected || isBusy"
                  class="mt-1 block w-full text-sm text-theme-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-surface-secondary file:text-theme hover:file:bg-surface-primary disabled:opacity-50"
                  @change="onBootFile"
                >
              </label>
              <div class="flex flex-wrap gap-3">
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-theme bg-surface-primary border border-theme rounded-lg hover:bg-surface-secondary disabled:opacity-50 transition-colors"
                  :disabled="!isConnected || isBusy || !bootFile"
                  @click="bootImage(bootFile)"
                >
                  <Rocket class="w-4 h-4" />
                  Boot image
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-theme bg-surface-primary border border-theme rounded-lg hover:bg-surface-secondary disabled:opacity-50 transition-colors"
                  :disabled="!isConnected || isBusy"
                  @click="reboot('')"
                >
                  <RotateCcw class="w-4 h-4" />
                  Reboot
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-theme bg-surface-primary border border-theme rounded-lg hover:bg-surface-secondary disabled:opacity-50 transition-colors"
                  :disabled="!isConnected || isBusy"
                  @click="reboot('bootloader')"
                >
                  Reboot to bootloader
                </button>
              </div>
            </div>
          </div>
        </li>
      </ol>

      <!-- Advanced: raw command -->
      <details class="rounded-lg step-card p-4">
        <summary class="cursor-pointer text-sm font-medium text-theme">
          Advanced: run a fastboot command
        </summary>
        <div class="mt-3 flex flex-wrap gap-3">
          <input
            v-model="rawCommand"
            type="text"
            placeholder="getvar:all, oem …"
            :disabled="!isConnected || isBusy"
            class="flex-1 min-w-[12rem] px-3 py-2 text-sm rounded-lg bg-surface-primary border border-theme text-theme font-mono disabled:opacity-50"
            @keyup.enter="runRaw"
          >
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-theme bg-surface-primary border border-theme rounded-lg hover:bg-surface-secondary disabled:opacity-50 transition-colors"
            :disabled="!isConnected || isBusy || !rawCommand.trim()"
            @click="runRaw"
          >
            Run
          </button>
        </div>
      </details>

      <!-- Error -->
      <div
        v-if="error"
        class="flex p-3 text-sm rounded-lg alert-box"
        role="alert"
      >
        <TriangleAlert class="flex-shrink-0 inline w-5 h-5 me-3 mt-0.5" />
        <div>{{ error }}</div>
      </div>

      <!-- Status + log -->
      <div class="text-sm text-theme-muted">
        Status: <span class="text-theme">{{ status }}</span>
      </div>
      <pre
        v-if="log.length"
        class="max-h-48 overflow-y-auto p-3 text-xs rounded-lg bg-surface-primary border border-theme text-theme-muted font-mono whitespace-pre-wrap"
      >{{ log.join('\n') }}</pre>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {
  Info,
  RefreshCw,
  Rocket,
  RotateCcw,
  Terminal,
  Trash2,
  TriangleAlert,
  Unplug,
  Usb,
  Zap,
} from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useFastboot } from '~/composables/useFastboot'

defineProps<{ embedded?: boolean }>()

const {
  isSupported,
  isConnected,
  isBusy,
  isFlashing,
  status,
  deviceInfo,
  vars,
  progress,
  error,
  log,
  connect,
  disconnect,
  refreshVars,
  flashPartition,
  erasePartition,
  bootImage,
  reboot,
  runCommand,
} = useFastboot()

const partition = ref('')
const flashFile = ref<File | null>(null)
const bootFile = ref<File | null>(null)
const rawCommand = ref('')

const varEntries = computed(() => Object.entries(vars.value))

// Drop stale selections when the device goes away (disconnect / reboot), so a
// reconnected device does not inherit the previous session's file/partition.
watch(isConnected, (connected) => {
  if (!connected) {
    flashFile.value = null
    bootFile.value = null
    partition.value = ''
    rawCommand.value = ''
  }
})

function hex(value: number): string {
  return `0x${value.toString(16).padStart(4, '0')}`
}

function onFlashFile(event: Event) {
  flashFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

function onBootFile(event: Event) {
  bootFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

// Erase wipes a partition immediately; confirm first.
async function confirmErase() {
  const part = partition.value.trim()
  if (!part) return
  if (typeof window !== 'undefined' && !window.confirm(`Erase the "${part}" partition? This cannot be undone.`)) {
    return
  }
  await erasePartition(part)
}

async function runRaw() {
  await runCommand(rawCommand.value)
}
</script>
