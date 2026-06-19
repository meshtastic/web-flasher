<template>
  <div :class="embedded ? 'space-y-6' : 'max-w-2xl mx-auto p-4 space-y-6'">
    <div v-if="!embedded">
      <h2 class="flex items-center gap-2 text-2xl font-bold text-theme">
        <HardDrive class="w-6 h-6" />
        Rockchip Flash Tool
      </h2>
      <p class="mt-1 text-sm text-theme-muted">
        Write an image to, or erase, a Rockchip device's storage over WebUSB; a browser port of
        <code class="text-theme-accent">rkdeveloptool</code>. The device must be in
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
      <ol class="relative ms-3.5 border-theme-left">
        <!-- Step 1: Connect -->
        <li class="mb-8 ms-8">
          <span class="absolute -start-4 step-badge">1</span>
          <div class="p-4 rounded-lg shadow-sm step-card">
            <h3 class="mb-3 text-lg font-semibold text-theme">
              Connect device
            </h3>
            <!-- How to enter download mode -->
            <div
              v-if="!isConnected && !needsReconnect"
              class="flex p-3 mb-4 text-sm rounded-lg alert-box"
              role="note"
            >
              <Info class="flex-shrink-0 inline w-5 h-5 me-3 mt-0.5" />
              <div class="space-y-1">
                <p class="font-medium text-theme">
                  Put the board into download mode first:
                </p>
                <ol class="ms-5 space-y-0.5 list-decimal text-theme-muted">
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
                    To write the microSD, leave the card inserted. To erase onboard flash, remove the card first.
                  </li>
                  <li>
                    Connect below. A <strong>Loader</strong> badge means storage is accessible;
                    <strong>Maskrom</strong> means you download a loader (below) first.
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
                  v-if="storageReady"
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-theme bg-surface-primary border border-theme rounded-lg hover:bg-surface-secondary disabled:opacity-50 transition-colors"
                  :disabled="isBusy"
                  @click="reset"
                >
                  <RotateCcw class="w-4 h-4" />
                  Reset device
                </button>
              </template>
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
                  :class="storageReady ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'"
                >
                  {{ storageReady ? 'Loader' : 'Maskrom' }}
                </span>
              </div>
              <dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-theme-muted">
                <dt>USB ID</dt>
                <dd class="text-theme">
                  {{ usbId }}
                </dd>
                <template v-if="currentStorage !== null">
                  <dt>Active storage</dt>
                  <dd class="text-theme">
                    {{ storageName(currentStorage) }}
                  </dd>
                </template>
                <template v-if="flashInfo">
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

            <!-- Storage not reachable: download a loader (db) -->
            <div
              v-if="isConnected && !storageReady"
              class="mt-4 p-4 text-sm border border-yellow-700 rounded-lg bg-surface-primary"
            >
              <div class="flex text-yellow-400">
                <TriangleAlert class="flex-shrink-0 inline w-5 h-5 me-3 mt-0.5" />
                <div>
                  This device is in <strong>Maskrom</strong> mode. Download a USB loader to make its storage
                  accessible (the <code>db</code> step). Use a bundled RK3506 loader below, or supply your own
                  (these are built from the official Rockchip
                  <a
                    href="https://github.com/rockchip-linux/rkbin"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="underline text-theme-accent"
                  >rkbin</a>).
                </div>
              </div>

              <!-- Quick option: bundled loader -->
              <label
                for="rk-bundled-loader"
                class="block mt-3 mb-1 text-xs font-medium text-theme"
              >Bundled loader (recommended)</label>
              <div class="flex flex-wrap gap-2">
                <select
                  id="rk-bundled-loader"
                  v-model="bundledLoader"
                  :disabled="isBusy"
                  class="flex-1 min-w-[12rem] p-2.5 text-sm rounded-lg border text-theme bg-surface-primary border-theme disabled:opacity-50"
                >
                  <option
                    v-for="opt in bundledOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-meshtastic rounded-lg hover:bg-green-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  :disabled="isBusy"
                  @click="fetchAndDownloadLoader(bundledLoader)"
                >
                  <LoaderCircle
                    v-if="isDownloadingBoot"
                    class="w-4 h-4 animate-spin"
                  />
                  <FolderDown
                    v-else
                    class="w-4 h-4"
                  />
                  Use bundled loader
                </button>
              </div>

              <p class="mt-3 text-xs text-theme-muted">
                or supply your own loader file:
              </p>
              <label
                for="rk-loader-file"
                class="block mt-1 mb-1 text-xs font-medium text-theme"
              >Loader file (.bin)</label>
              <input
                id="rk-loader-file"
                type="file"
                accept=".bin"
                :disabled="isBusy"
                class="block w-full mb-3 text-sm rounded-lg border cursor-pointer text-theme bg-surface-primary border-theme file:mr-3 file:py-2 file:px-3 file:border-0 file:text-sm file:font-medium file:bg-surface-secondary file:text-theme disabled:opacity-50"
                @change="onLoaderChange"
              >
              <button
                type="button"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-meshtastic rounded-lg hover:bg-green-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                :disabled="isBusy || !loaderFile"
                @click="downloadLoader(loaderFile)"
              >
                <LoaderCircle
                  v-if="isDownloadingBoot"
                  class="w-4 h-4 animate-spin"
                />
                <FolderDown
                  v-else
                  class="w-4 h-4"
                />
                {{ isDownloadingBoot ? 'Downloading loader…' : 'Download loader' }}
              </button>

              <div
                v-if="isDownloadingBoot || bootProgress > 0"
                class="mt-3"
              >
                <div class="flex justify-between mb-1">
                  <span class="text-sm font-medium text-theme">{{ status }}</span>
                  <span class="text-sm font-medium text-theme-accent">{{ bootProgress }}%</span>
                </div>
                <div class="w-full rounded-full h-2.5 progress-track">
                  <div
                    class="bg-gradient-to-r from-green-400 to-green-600 h-2.5 rounded-full transition-all duration-300"
                    :style="{ width: `${bootProgress}%` }"
                  />
                </div>
              </div>
            </div>

            <!-- Re-select prompt after a loader download -->
            <div
              v-if="needsReconnect && !isConnected"
              class="flex mt-4 p-3 text-sm rounded-lg alert-box"
              role="note"
            >
              <Info class="flex-shrink-0 inline w-5 h-5 me-3 mt-0.5" />
              <div>
                The loader is running. Click <strong>Connect Rockchip device</strong> again and pick the device
                (now in Loader mode) to continue.
              </div>
            </div>
          </div>
        </li>

        <!-- Step 2: Write image -->
        <li class="mb-8 ms-8">
          <span class="absolute -start-4 step-badge">2</span>
          <div class="p-4 rounded-lg shadow-sm step-card">
            <h3 class="mb-3 text-lg font-semibold text-theme">
              Write image
            </h3>

            <!-- Target storage -->
            <label
              for="rk-target-storage"
              class="block mb-1 text-sm font-medium text-theme"
            >Target storage</label>
            <select
              id="rk-target-storage"
              v-model.number="targetStorage"
              :disabled="!canFlash"
              class="block w-full p-2.5 mb-3 text-sm rounded-lg border text-theme bg-surface-primary border-theme focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
            >
              <option
                v-for="opt in storageOptions"
                :key="opt.id"
                :value="opt.id"
              >
                {{ opt.name }}
              </option>
            </select>

            <p
              v-if="isSdTarget"
              class="mb-3 text-xs text-theme-muted"
            >
              Insert the target microSD card before flashing. It will be completely overwritten.
            </p>

            <!-- Image file -->
            <label
              for="rk-image-file"
              class="block mb-1 text-sm font-medium text-theme"
            >Image file (.img, .img.gz, or .img.xz)</label>
            <input
              id="rk-image-file"
              type="file"
              accept=".img,.img.gz,.gz,.img.xz,.xz"
              :disabled="!canFlash"
              class="block w-full mb-1 text-sm rounded-lg border cursor-pointer text-theme bg-surface-primary border-theme file:mr-3 file:py-2 file:px-3 file:border-0 file:text-sm file:font-medium file:bg-surface-secondary file:text-theme disabled:opacity-50"
              @change="onFileChange"
            >
            <p
              v-if="imageFile"
              class="mb-3 text-xs text-theme-muted"
            >
              {{ imageFile.name }} ({{ formatBytes(imageFile.size) }}{{ isCompressedImage ? ', compressed' : '' }})
            </p>
            <div
              v-else
              class="mb-3"
            />

            <!-- Destructive warning -->
            <div
              class="flex p-4 mb-4 text-sm text-red-400 border border-red-800 rounded-lg bg-surface-primary"
              role="alert"
            >
              <TriangleAlert class="flex-shrink-0 inline w-5 h-5 me-3" />
              <span>Writing overwrites everything on the selected storage, including the partition table. There is no undo.</span>
            </div>

            <label class="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                v-model="flashConfirmed"
                type="checkbox"
                :disabled="!canFlash"
                class="w-4 h-4 rounded accent-red-600"
              >
              <span class="text-sm text-theme-muted">I understand this overwrites the selected storage.</span>
            </label>

            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-meshtastic rounded-lg hover:bg-green-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :disabled="!canFlashNow"
              @click="flash(imageFile)"
            >
              <LoaderCircle
                v-if="isFlashing"
                class="w-4 h-4 animate-spin"
              />
              <Upload
                v-else
                class="w-4 h-4"
              />
              {{ isFlashing ? 'Writing…' : 'Write image' }}
            </button>

            <!-- Flash progress -->
            <div
              v-if="isFlashing || flashProgress > 0"
              class="mt-4"
            >
              <div class="flex justify-between mb-1">
                <span class="text-sm font-medium text-theme">{{ status }}</span>
                <span class="text-sm font-medium text-theme-accent">{{ flashProgress }}%</span>
              </div>
              <div class="w-full rounded-full h-2.5 progress-track">
                <div
                  class="bg-gradient-to-r from-green-400 to-green-600 h-2.5 rounded-full transition-all duration-300"
                  :style="{ width: `${flashProgress}%` }"
                />
              </div>
            </div>
          </div>
        </li>

        <!-- Step 3: Erase -->
        <li class="ms-8">
          <span class="absolute -start-4 step-badge">3</span>
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
                <span>This permanently erases the entire active storage. There is no undo. Back up anything you need first.</span>
              </div>
            </div>

            <p class="mb-4 text-xs text-theme-muted">
              To erase onboard flash, remove the microSD card first so the board targets the right storage.
            </p>

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

            <!-- Erase progress -->
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
  FolderDown,
  HardDrive,
  Info,
  LoaderCircle,
  RotateCcw,
  Trash2,
  TriangleAlert,
  Unplug,
  Upload,
  Usb,
} from 'lucide-vue-next'
import { formatBytes, useRockchipErase } from '~/composables/useRockchipErase'
import { Storage, STORAGE_NAMES } from '~/utils/rockchip/rkusb'

defineProps<{ embedded?: boolean }>()

const {
  isSupported,
  isConnected,
  isBusy,
  isErasing,
  isFlashing,
  canErase,
  canFlash,
  storageReady,
  status,
  deviceInfo,
  flashInfo,
  currentStorage,
  targetStorage,
  progress,
  flashProgress,
  isDownloadingBoot,
  bootProgress,
  needsReconnect,
  error,
  log,
  connect,
  erase,
  flash,
  downloadLoader,
  fetchAndDownloadLoader,
  reset,
  disconnect,
} = useRockchipErase()

const confirmed = ref(false)
const flashConfirmed = ref(false)
const imageFile = ref<File | null>(null)
const loaderFile = ref<File | null>(null)
const bundledLoader = ref('/rockchip/rk3506_spl_loader.bin')
const bundledOptions = [
  { value: '/rockchip/rk3506_spl_loader.bin', label: 'RK3506G2 (Lyra, Lyra W, Lyra Plus)' },
  { value: '/rockchip/rk3506b_spl_loader.bin', label: 'RK3506B (Lyra Zero W, Lyra Ultra)' },
]
const logEl = ref<HTMLElement | null>(null)

const storageOptions = computed(() => {
  const ids = [Storage.EMMC, Storage.SD, Storage.SPINOR]
  // Surface the device's active/onboard storage (e.g. SPI NAND) even when it
  // isn't one of the standard targets, so it can be written in the browser.
  const active = currentStorage.value
  if (active != null && active > 0 && !ids.includes(active)) {
    ids.unshift(active)
  }
  return ids.map(id => ({ id, name: STORAGE_NAMES[id] ?? `Onboard storage (id ${id})` }))
})

const storageName = (id: number) => STORAGE_NAMES[id] ?? `id ${id}`
const isSdTarget = computed(() => targetStorage.value === Storage.SD)
const isCompressedImage = computed(() => !!imageFile.value && /\.(gz|xz)$/i.test(imageFile.value.name))
const canFlashNow = computed(() => canFlash.value && !!imageFile.value && flashConfirmed.value)

const usbId = computed(() => {
  if (!deviceInfo.value) return ''
  const pad = (n: number) => n.toString(16).padStart(4, '0')
  return `0x${pad(deviceInfo.value.vendorId)}:0x${pad(deviceInfo.value.productId)}`
})

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  imageFile.value = input.files?.[0] ?? null
}

function onLoaderChange(event: Event) {
  const input = event.target as HTMLInputElement
  loaderFile.value = input.files?.[0] ?? null
}

// Auto-scroll the log to the newest line.
watch(() => log.value.length, async () => {
  await nextTick()
  if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
})

// Reset the confirmation guards whenever a device disconnects.
watch(isConnected, (connected) => {
  if (!connected) {
    confirmed.value = false
    flashConfirmed.value = false
    imageFile.value = null
    loaderFile.value = null
  }
})
</script>
