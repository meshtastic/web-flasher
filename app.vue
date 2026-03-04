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
              <div class="header-accent-line" />
            </div>
          </div>
          <div class="flex flex-wrap sm:-m-4 -mx-2 sm:-mx-4 -mb-10 -mt-4">
            <div class="p-2 sm:p-4 md:w-1/3 sm:mb-0 mb-6 animate-fade-in-up">
              <div
                class="card-modern p-6 h-80 flex flex-col items-center relative"
                @mouseenter="isDeviceCardHovered = true"
                @mouseleave="isDeviceCardHovered = false"
              >
                <div class="absolute top-3 left-3 w-8 h-8 rounded-full step-badge-circle flex items-center justify-center">
                  <span class="step-number">1</span>
                </div>
                <img
                  :src="selectedDeviceImage"
                  class="h-40 w-40 mb-4 mx-auto object-contain drop-shadow-lg"
                  :alt="$t('device.title')"
                >
                <Device :card-hovered="isDeviceCardHovered" />
              </div>
              <h2 class="text-xl sm:text-xl font-semibold title-doto text-theme mt-5 tracking-wide">
                {{ $t('device.title') }}
              </h2>
              <p class="text-sm sm:text-base leading-relaxed mt-2 text-theme-muted">
                {{ $t('device.instructions') }}
              </p>
            </div>
            <div class="p-2 sm:p-4 md:w-1/3 sm:mb-0 mb-6 animate-fade-in-up-delayed">
              <div class="card-modern p-6 h-80 flex flex-col items-center z-20 relative">
                <div
                  class="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300"
                  :class="isStep2Enabled ? 'step-badge-circle' : 'border step-disabled'"
                >
                  <span
                    class="font-bold text-sm transition-colors duration-300"
                    :class="isStep2Enabled ? 'step-number' : 'text-theme-muted'"
                  >2</span>
                </div>
                <FolderDown
                  class="h-40 w-40 p-4 mb-4 mx-auto card-icon opacity-90"
                  :alt="$t('firmware.title')"
                />
                <Firmware />
              </div>
              <h2 class="text-xl sm:text-xl font-semibold title-doto text-theme mt-5 tracking-wide">
                {{ $t('firmware.title') }}
              </h2>
              <p class="text-sm sm:text-base leading-relaxed mt-2 text-theme-muted">
                {{ $t('firmware.instructions') }}
              </p>
            </div>
            <div class="p-2 sm:p-4 md:w-1/3 sm:mb-0 mb-6 animate-fade-in-up-delayed-2">
              <div class="card-modern p-6 h-80 flex flex-col items-center relative">
                <div
                  class="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300"
                  :class="isStep3Enabled ? 'step-badge-circle' : 'border step-disabled'"
                >
                  <span
                    class="font-bold text-sm transition-colors duration-300"
                    :class="isStep3Enabled ? 'step-number' : 'text-theme-muted'"
                  >3</span>
                </div>
                <Zap class="h-40 w-40 p-4 mb-4 mx-auto card-icon opacity-90" />
                <Flash />
              </div>
              <h2 class="text-xl sm:text-xl font-semibold title-doto text-theme mt-5 tracking-wide">
                Flash
              </h2>
              <p class="text-sm sm:text-base leading-relaxed mt-2 text-theme-muted">
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
        <ThemeSwitcher v-if="!serialMonitorStore.isConnected" />
      </div>
    </section>

    <SerialMonitor />

    <ToastNotifications />

    <footer
      id="footer"
      class="footer-modern text-theme mt-8 py-6"
    >
      <div class="container mx-auto px-3 sm:px-5 py-2 sm:py-4 text-center">
        <p class="text-xs sm:text-sm text-theme-muted">
          Powered by
          <a
            href="https://vercel.com/?utm_source=meshtastic&utm_campaign=oss"
            class="link-theme"
          >▲ Vercel</a>
          <span class="mx-2 text-theme-muted/50">•</span>
          Meshtastic® is a registered trademark of Meshtastic LLC.
          <span class="mx-2 text-theme-muted/50">•</span>
          <a
            href="https://meshtastic.org/docs/legal"
            class="link-theme"
          >Legal Information</a>
        </p>
      </div>
    </footer>
    <!-- Konami Code Visual Feedback -->
    <div class="fixed inset-x-0 bottom-0 h-32 pointer-events-none z-40">
      <transition-group
        name="key-fly"
        tag="div"
        class="relative w-full h-full"
      >
        <div
          v-for="keyEntry in activeKonamiKeys"
          :key="keyEntry.id"
          class="key-animation"
        >
          <div
            class="key-display"
            :class="{ 'key-failed': keyEntry.failed }"
          >
            {{ getKeyDisplay(keyEntry.key) }}
          </div>
        </div>
      </transition-group>
    </div>

    <div
      v-show="isConnected"
      class="fixed right-2 sm:right-4 top-4 sm:top-6 group z-[10000]"
    >
      <button
        type="button"
        :disabled="true"
        :class="{
          'border-purple-400/50 bg-purple-500/10': serialMonitorStore.isConnected && !serialMonitorStore.isReaderLocked,
          'border-meshtastic/50 bg-meshtastic/10': (serialMonitorStore.isConnected && serialMonitorStore.isReaderLocked) || firmwareStore.isConnected,
          'connection-status-disconnected': !isConnected,
        }"
        class="inline-flex items-center gap-2 border backdrop-blur-md font-medium rounded-xl text-xs px-3 sm:px-4 py-2 text-center shadow-lg transition-all duration-300"
      >
        <span
          :class="{
            'text-purple-400': serialMonitorStore.isConnected && !serialMonitorStore.isReaderLocked,
            'text-meshtastic': (serialMonitorStore.isConnected && serialMonitorStore.isReaderLocked) || firmwareStore.isConnected,
            'connection-status-disconnected-text': !isConnected,
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
import { useThemeStore } from './stores/themeStore'

const { t } = useI18n()

const serialMonitorStore = useSerialMonitorStore()
const firmwareStore = useFirmwareStore()
const deviceStore = useDeviceStore()
const themeStore = useThemeStore()

const monitorSerial = async () => {
  await serialMonitorStore.monitorSerial()
}

const selectedDeviceImage = computed(() => {
  if (deviceStore.selectedTarget?.images?.length) {
    return `/img/devices/${deviceStore.selectedTarget.images[0]}`
  }
  return themeStore.isDark ? '/img/devices/unknown-new.svg' : '/img/devices/unknown-new-light.svg'
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

const isDeviceCardHovered = ref(false)

// WebSerial API support check
const isWebSerialSupported = computed(() => {
  return 'serial' in navigator
})

const konamiKeys = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
const konamiCodeIndex = ref(0)
const activeKonamiKeys = ref([])
let konamiKeyId = 0

const getKeyDisplay = (key) => {
  const keyMap = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    b: 'B',
    a: 'A',
  }
  return keyMap[key] || key
}

window.addEventListener('keydown', (event) => {
  if (event.key === konamiKeys[konamiCodeIndex.value]) {
    console.log('konami code key match', konamiCodeIndex.value)

    // Add key to animation queue with unique ID
    const keyToDisplay = konamiKeys[konamiCodeIndex.value]
    const keyEntry = { key: keyToDisplay, id: konamiKeyId++ }
    activeKonamiKeys.value.push(keyEntry)
    setTimeout(() => {
      const idx = activeKonamiKeys.value.findIndex(k => k.id === keyEntry.id)
      if (idx > -1) activeKonamiKeys.value.splice(idx, 1)
    }, 1000)

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
    // Only show failed key if we were already in the sequence
    if (konamiCodeIndex.value > 0) {
      const keyEntry = { key: event.key, id: konamiKeyId++, failed: true }
      activeKonamiKeys.value.push(keyEntry)
      setTimeout(() => {
        const idx = activeKonamiKeys.value.findIndex(k => k.id === keyEntry.id)
        if (idx > -1) activeKonamiKeys.value.splice(idx, 1)
      }, 1000)
    }
    konamiCodeIndex.value = 0
  }
})

onMounted(() => {
  initDropdowns()
  initModals()
  initTooltips()
  initDrawers()
  initAccordions()
  themeStore.initTheme()
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
  :root[data-theme="light"] {
    --primary-color: #1A9B4A;
    --secondary-color: #1A9B4A;
  }
  body {
    font-family: 'Atkinson Hyperlegible', 'Lato', system-ui, -apple-system, sans-serif;
    background-color: var(--bg-color);
    color: var(--text-color);
  }
  .konami-code {
    background: linear-gradient(
      -45deg,
      #000a00,
      #0a2a0a,
      #001a00,
      #0a1a0a,
      #000a0a,
      #000a00
    ) !important;
    background-size: 400% 400% !important;
    animation: konamiGradient 8s ease infinite !important;
    /* Smooth transition for background change */
    transition: background 1.5s cubic-bezier(0.4, 0, 0.2, 1),
                color 1.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }

  /* Light mode konami - use light retro background */
  :root[data-theme="light"] .konami-code {
    background: linear-gradient(
      -45deg,
      #e8f5e9,
      #f1f8f1,
      #eff7ef,
      #e6f4e6,
      #e8f2e8,
      #e8f5e9
    ) !important;
    color: #1a3a1a !important;
  }

  :root[data-theme="light"] .konami-code,
  :root[data-theme="light"] .konami-code * {
    color: #1a3a1a !important;
    text-shadow: none !important;
  }

  :root[data-theme="light"] .konami-code h2 {
    color: #0d5f0d !important;
    text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.5) !important;
  }

  @keyframes konamiGradient {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }

  /* Scanlines overlay for CRT effect - subtle */
  .konami-code::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.03),
      rgba(0, 0, 0, 0.03) 1px,
      transparent 1px,
      transparent 2px
    );
    opacity: 0;
    animation: fadeInScanlines 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  /* CRT vignette effect */
  .konami-code::after {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9998;
    background: radial-gradient(
      ellipse at center,
      transparent 0%,
      transparent 60%,
      rgba(0, 0, 0, 0.4) 100%
    );
    opacity: 0;
    animation: fadeInVignette 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes fadeInScanlines {
    to {
      opacity: 1;
    }
  }

  @keyframes fadeInVignette {
    to {
      opacity: 1;
    }
  }

  /* Neon glow effect on cards in konami mode */
  .konami-code .card-modern {
    border: 1px solid rgba(103, 234, 148, 0.5) !important;
    box-shadow:
      0 0 10px rgba(103, 234, 148, 0.3),
      0 0 20px rgba(103, 234, 148, 0.1),
      inset 0 0 20px rgba(103, 234, 148, 0.05) !important;
    animation: neonPulse 2s ease-in-out infinite !important;
  }

  @keyframes neonPulse {
    0%, 100% {
      box-shadow:
        0 0 10px rgba(103, 234, 148, 0.3),
        0 0 20px rgba(103, 234, 148, 0.1),
        inset 0 0 20px rgba(103, 234, 148, 0.05);
    }
    50% {
      box-shadow:
        0 0 15px rgba(103, 234, 148, 0.5),
        0 0 30px rgba(103, 234, 148, 0.2),
        inset 0 0 25px rgba(103, 234, 148, 0.1);
    }
  }

  /* Retro pixel-style text shadow on headings */
  .konami-code h2 {
    text-shadow:
      2px 2px 0 rgba(103, 234, 148, 0.3),
      -1px -1px 0 rgba(0, 0, 0, 0.5) !important;
  }

  /* Glowing buttons in konami mode */
  .konami-code .btn-primary,
  .konami-code .btn-secondary {
    box-shadow: 0 0 10px rgba(103, 234, 148, 0.4) !important;
  }

  .konami-code .btn-primary:hover,
  .konami-code .btn-secondary:hover {
    box-shadow: 0 0 20px rgba(103, 234, 148, 0.6) !important;
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
    text-transform: uppercase;
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
    color: var(--text-default);
  }
  h2 {
    font-size: 1.5em;
    color: var(--text-default);
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

  /* Konami Code Key Animation */
  .key-animation {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    animation: keyFly 1s ease-out forwards;
  }

  @keyframes keyFly {
    0% {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateX(-50%) translateY(-120px) scale(0.8);
    }
  }

  .key-display {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, rgba(103, 234, 148, 0.3), rgba(103, 234, 148, 0.1));
    border: 2px solid rgba(103, 234, 148, 0.6);
    border-radius: 8px;
    color: rgb(103, 234, 148);
    font-weight: bold;
    font-size: 20px;
    box-shadow: 0 0 20px rgba(103, 234, 148, 0.4), inset 0 0 10px rgba(103, 234, 148, 0.1);
    text-shadow: 0 0 10px rgba(103, 234, 148, 0.6);
  }

  .key-display.key-failed {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.1));
    border: 2px solid rgba(239, 68, 68, 0.6);
    color: rgb(239, 68, 68);
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(239, 68, 68, 0.1);
    text-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
  }

  .key-fly-enter-active,
  .key-fly-leave-active {
    transition: none;
  }

  .key-fly-enter-from,
  .key-fly-leave-to {
    opacity: 0;
  }
</style>
