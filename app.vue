<template>
  <div class="flex flex-col min-h-screen">
    <!-- Warning for browsers that do not support WebSerial API -->
    <div
      v-if="!isWebSerialSupported"
      class="unsupported-browser-warning"
    >
      <p>{{ $t('browser_warning') }}</p>
    </div>
    <Head>
      <Title>{{ $t('title') }}</Title>
      <Meta
        name="description"
        :content="$t('description')"
      />
    </Head>

    <section
      id="main"
      class="flex-1 text-gray-400 body-font px-3 sm:px-5"
    >
      <transition
        name="flash"
        mode="out-in"
      >
        <div
          v-show="!serialMonitorStore.isConnected"
          class="container py-1 mx-auto transition duration-900 ease-in-out max-w-7xl"
        >
          <div class="flex flex-col content-center justify-center">
            <div class="flex flex-wrap sm:flex-row flex-col py-1">
              <LogoHeader />
            </div>
            <div class="header-accent-container">
              <div class="header-accent-line"></div>
            </div>
          </div>
          <div class="flex flex-wrap sm:-m-4 -mx-2 sm:-mx-4 -mb-10 -mt-4">
            <div class="p-2 sm:p-4 md:w-1/3 sm:mb-0 mb-6 animate-fade-in-up">
              <div class="card-modern p-6 h-80 flex flex-col items-center relative">
                <div class="absolute top-3 left-3 w-8 h-8 rounded-full bg-meshtastic/20 border border-meshtastic/50 flex items-center justify-center">
                  <span class="text-meshtastic font-bold text-sm">1</span>
                </div>
                <img
                  :src="selectedDeviceImage"
                  class="h-40 w-40 mb-4 mx-auto object-contain drop-shadow-lg"
                  :alt="$t('device.title')"
                >
                <Device />
              </div>
              <h2 class="text-xl sm:text-xl font-semibold title-doto text-white mt-5 tracking-wide">
                {{ $t('device.title') }}
              </h2>
              <p class="text-sm sm:text-base leading-relaxed mt-2 text-gray-400">
                {{ $t('device.instructions') }}
              </p>
            </div>
            <div class="p-2 sm:p-4 md:w-1/3 sm:mb-0 mb-6 animate-fade-in-up-delayed">
              <div class="card-modern p-6 h-80 flex flex-col items-center z-20 relative">
                <div
                  class="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300"
                  :class="isStep2Enabled ? 'bg-meshtastic/20 border border-meshtastic/50' : 'bg-zinc-700/50 border border-zinc-600/50'"
                >
                  <span
                    class="font-bold text-sm transition-colors duration-300"
                    :class="isStep2Enabled ? 'text-meshtastic' : 'text-zinc-500'"
                  >2</span>
                </div>
                <FolderDown
                  class="h-40 w-40 p-4 mb-4 mx-auto text-meshtastic opacity-80"
                  :alt="$t('firmware.title')"
                />
                <Firmware />
              </div>
              <h2 class="text-xl sm:text-xl font-semibold title-doto text-white mt-5 tracking-wide">
                {{ $t('firmware.title') }}
              </h2>
              <p class="text-sm sm:text-base leading-relaxed mt-2 text-gray-400">
                {{ $t('firmware.instructions') }}
              </p>
            </div>
            <div class="p-2 sm:p-4 md:w-1/3 sm:mb-0 mb-6 animate-fade-in-up-delayed-2">
              <div class="card-modern p-6 h-80 flex flex-col items-center relative">
                <div
                  class="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300"
                  :class="isStep3Enabled ? 'bg-meshtastic/20 border border-meshtastic/50' : 'bg-zinc-700/50 border border-zinc-600/50'"
                >
                  <span
                    class="font-bold text-sm transition-colors duration-300"
                    :class="isStep3Enabled ? 'text-meshtastic' : 'text-zinc-500'"
                  >3</span>
                </div>
                <Zap class="h-40 w-40 p-4 mb-4 mx-auto text-meshtastic opacity-80" />
                <Flash />
              </div>
              <h2 class="text-xl sm:text-xl font-semibold title-doto text-white mt-5 tracking-wide">
                Flash
              </h2>
              <p class="text-sm sm:text-base leading-relaxed mt-2 text-gray-400">
                {{ $t('flash.instructions') }}
              </p>
            </div>
          </div>
        </div>
      </transition>
      <div class="flex flex-wrap justify-center gap-2 mt-8">
        <button
          v-if="!serialMonitorStore.isConnected"
          type="button"
          class="btn-secondary"
          @click="monitorSerial"
        >
          {{ $t('buttons.serial_monitor') }} <Terminal class="h-4 w-4 shrink-0" />
        </button>
        <a
          v-if="!serialMonitorStore.isConnected"
          href="https://meshtastic.org/docs"
          class="btn-secondary"
        >
          {{ $t('buttons.meshtastic_docs') }} <BookOpen class="h-4 w-4 shrink-0" />
        </a>
        <a
          v-if="!serialMonitorStore.isConnected"
          href="https://github.com/meshtastic/web-flasher"
          class="btn-secondary"
        >
          {{ $t('buttons.contribute') }}
          <Github class="w-4 h-4 shrink-0" />
        </a>
        <LanguagePicker v-if="!serialMonitorStore.isConnected" />
      </div>
    </section>

    <SerialMonitor />

    <ToastNotifications />

    <footer
      id="footer"
      class="footer-modern text-white mt-8 py-6"
    >
      <div class="container mx-auto px-3 sm:px-5 py-2 sm:py-4 text-center">
        <p class="text-xs sm:text-sm text-gray-400">
          Powered by
          <a href="https://vercel.com/?utm_source=meshtastic&utm_campaign=oss" class="text-white hover:text-meshtastic transition-colors">▲ Vercel</a>
          <span class="mx-2 text-gray-600">•</span>
          Meshtastic® is a registered trademark of Meshtastic LLC.
          <span class="mx-2 text-gray-600">•</span>
          <a href="https://meshtastic.org/docs/legal" class="text-white hover:text-meshtastic transition-colors">Legal Information</a>
        </p>
      </div>
    </footer>
    <div class="fixed right-2 sm:right-4 bottom-4 sm:bottom-6 group z-50">
      <button
        type="button"
        :disabled="true"
        :class="{
          'border-purple-400/50 bg-purple-500/10': serialMonitorStore.isConnected && !serialMonitorStore.isReaderLocked,
          'border-meshtastic/50 bg-meshtastic/10': (serialMonitorStore.isConnected && serialMonitorStore.isReaderLocked) || firmwareStore.isConnected,
          'border-zinc-700 bg-zinc-800/50': !isConnected,
        }"
        class="inline-flex items-center gap-2 border backdrop-blur-md font-medium rounded-xl text-xs px-3 sm:px-4 py-2 text-center shadow-lg transition-all duration-300"
      >
        <span
          :class="{
            'text-purple-400': serialMonitorStore.isConnected && !serialMonitorStore.isReaderLocked,
            'text-meshtastic': (serialMonitorStore.isConnected && serialMonitorStore.isReaderLocked) || firmwareStore.isConnected,
            'text-gray-400': !isConnected,
          }"
        >
          {{ connectionButtonLabel }}
        </span>
        <span
          v-if="serialMonitorStore.isConnected && !serialMonitorStore.isReaderLocked"
          class="status-dot bg-purple-400"
          style="box-shadow: 0 0 10px rgba(192, 132, 252, 0.6);"
        />
        <span
          v-else-if="isConnected"
          class="status-dot status-dot-connected"
        />
        <span
          v-else
          class="status-dot status-dot-disconnected"
        />
      </button>
    </div>
  </div>
</template>

<script setup>
import {
  initAccordions,
  initDrawers,
  initDropdowns,
  initModals,
  initTooltips } from 'flowbite'
import { useI18n } from 'vue-i18n'
import { onMounted } from 'vue'

import {
  Zap,
  BookOpen,
  Terminal,
  FolderDown,
  Github,
} from 'lucide-vue-next'

import { useDeviceStore } from './stores/deviceStore'
import { useFirmwareStore } from './stores/firmwareStore'
import { useSerialMonitorStore } from './stores/serialMonitorStore'

const { t } = useI18n()

const serialMonitorStore = useSerialMonitorStore()
const firmwareStore = useFirmwareStore()
const deviceStore = useDeviceStore()

const monitorSerial = async () => {
  await serialMonitorStore.monitorSerial()
}

const selectedDeviceImage = computed(() => {
  if (deviceStore.selectedTarget?.images?.length) {
    return `/img/devices/${deviceStore.selectedTarget.images[0]}`
  }
  return '/img/devices/unknown-new.svg'
})

const connectionButtonLabel = computed(() => {
  if (firmwareStore.isFlashing) {
    return t('state.flashing')
  }
  if ((serialMonitorStore.isConnected && !serialMonitorStore.isReaderLocked) || (firmwareStore.isConnected && !firmwareStore.isReaderLocked)) {
    return t('state.disconnecting')
  }
  return isConnected.value ? t('state.connected') : t('state.disconnected')
})

const isConnected = computed(() => {
  return serialMonitorStore.isConnected || firmwareStore.isConnected
})

// Step enabled states for visual feedback
const isStep2Enabled = computed(() => {
  return (deviceStore.selectedTarget?.hwModel ?? 0) > 0
})

const isStep3Enabled = computed(() => {
  const hasDevice = (deviceStore.selectedTarget?.hwModel ?? 0) > 0
  const hasFirmware = firmwareStore.hasFirmwareFile || firmwareStore.hasOnlineFirmware
  return hasDevice && hasFirmware
})

// WebSerial API support check
const isWebSerialSupported = computed(() => {
  return 'serial' in navigator
})
const konamiKeys = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
const konamiCodeIndex = ref(0)
window.addEventListener('keydown', (event) => {
  if (event.key === konamiKeys[konamiCodeIndex.value]) {
    console.log('konami code key match', konamiCodeIndex.value)
    konamiCodeIndex.value++
    if (konamiCodeIndex.value === konamiKeys.length) {
      console.log('Unlocking pre-release section')
      document.body.classList.add('konami-code')
      document.getElementById('main').classList.add('konami-code')
      document.getElementById('footer').classList.add('konami-code')
      firmwareStore.$state.prereleaseUnlocked = true
      konamiCodeIndex.value = 0
    }
  }
  else {
    konamiCodeIndex.value = 0
  }
})

onMounted(() => {
  initDropdowns()
  initModals()
  initTooltips()
  initDrawers()
  initAccordions()
})
</script>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Doto:wght@600;700&display=swap');
  /* Additional Atkinson Hyperlegible fallback */
  @font-face {
    font-family: 'Atkinson Hyperlegible';
    src: url('https://fonts.gstatic.com/s/atkinsonhyperlegible/v11/9Bt23C1KxNDXMspQ1lPyU89-1h6ONRlW45GE.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Atkinson Hyperlegible';
    src: url('https://fonts.gstatic.com/s/atkinsonhyperlegible/v11/9Bt43C1KxNDXMspQ1lPyU89-1h6ONRlW45G055LkgA.woff2') format('woff2');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
  }
  :root {
    --bg-color: #1e1f2a;
    --text-color: #FFFFFF;
    --primary-color: #67EA94;
    --secondary-color: #67EA94;
  }
  body {
    font-family: 'Atkinson Hyperlegible', 'Lato', system-ui, -apple-system, sans-serif;
    background-color: var(--bg-color);
    color: var(--text-color);
  }
  .konami-code {
    background-color: #000000 !important;
    /* Firefox */
    -moz-transition: all 1s ease-in;
    /* WebKit */
    -webkit-transition: all 1s ease-in;
    /* Opera */
    -o-transition: all 1s ease-in;
    /* Standard */
    transition: all 1s ease-in;
  }
  .invert {
    -webkit-filter: invert(1);
    filter: invert(1);
  }
  .text-meshtastic {
    color: var(--primary-color);
  }
  .bg-meshtastic {
    background-color: var(--primary-color);
  }
  .border-meshtastic {
    border-color: var(--primary-color);
  }
  .title-doto {
    font-family: 'Doto', sans-serif;
  }
  .bottom-button {
    @apply inline-flex items-center justify-center gap-2 px-5 py-2.5;
    @apply text-sm font-semibold text-center rounded-lg border border-meshtastic text-meshtastic;
    @apply hover:text-black hover:bg-white hover:border-transparent hover:shadow transition duration-300 ease-in-out;
    @apply focus:ring-4 focus:outline-none focus:ring-gray-300;
  }
  .footer {
    background-color: var(--bg-color);
  }
  .footer a:hover {
    text-decoration: underline;
  }
  h1 {
    font-size: 2em;
    color: #FFFFFF;
  }
  h2 {
    font-size: 1.5em;
    color: #FFFFFF;
  }
  .unsupported-browser-warning {
    background-color: #ffcc00;
    color: black;
    padding: 10px;
    text-align: center;
  }

  .flash-enter-active ,
  .flash-leave-active {
    transition: all 1s ease-in-out;
  }

  .flash-enter-from,
  .flash-leave-to {
    transition: all 1s ease-out;
    opacity: 0;
  }
</style>
