<template>
  <div>
    <!-- Warning for browsers that do not support WebSerial API -->
    <div v-if="!isWebSerialSupported" class="unsupported-browser-warning">
      <p>{{ $t('browser_warning') }}</p>
    </div>
    <Head>
      <Title>{{ $t('title') }}</Title>
      <Meta name="description" :content="$t('description')" />
    </Head>

    <section id="main" class="text-gray-400 body-font px-5">
      <transition name="flash" mode="out-in">
        <div class="container py-1 mx-auto transition duration-900 ease-in-out" v-show="!serialMonitorStore.isConnected">
          <div class="flex flex-col content-center justify-center">
            <div class="flex flex-wrap sm:flex-row flex-col py-1">
              <LogoHeader />
            </div>
            <hr class="w-full mx-auto mb-4 border-gray-600" />
          </div>
          <div class="flex flex-wrap sm:-m-4 -mx-4 -mb-10 -mt-4">
            <div class="p-4 md:w-1/3 sm:mb-0 mb-6">
              <div class="rounded-lg h-80 overflow-hidden flex flex-col items-center display-inline">
                <img :src="selectedDeviceImage" class="h-64 w-64 mb-6 mx-auto" :alt="$t('device.title')" />
                <Device />
              </div>
              <h2 class="text-xl font-medium title-font text-white mt-5">{{ $t('device.title') }}</h2>
              <p class="text-base leading-relaxed mt-2">
                {{ $t('device.instructions') }}
              </p>
            </div>
            <div class="p-4 md:w-1/3 sm:mb-0 mb-6">
              <div class="rounded-lg h-80 flex flex-col items-center">
                <FolderDown class="h-60 w-60 p-5 mt-10 mb-10 mx-auto text-white" :alt="$t('firmware.title')" />
                <Firmware />
              </div>
              <h2 class="text-xl font-medium title-font text-white mt-5">{{ $t('firmware.title') }}</h2>
              <p class="text-base leading-relaxed mt-2">
                {{ $t('firmware.instructions') }}
              </p>
            </div>
            <div class="p-4 md:w-1/3 sm:mb-0 mb-6">
              <div class="rounded-lg h-80 overflow-hidden flex flex-col items-center">
                <Zap class="h-60 w-60 p-5 mt-10 mb-10 mx-auto text-white" />
                <Flash />
              </div>
              <h2 class="text-xl font-medium title-font text-white mt-5">Flash</h2>
              <p class="text-base leading-relaxed mt-2">
                {{ $t('flash.instructions') }}
              </p>
            </div>
          </div>
        </div>
      </transition>
      <div class="flex max-sm:flex-col justify-center gap-1 mt-4">
        <button type="button" v-if="!serialMonitorStore.isConnected" @click="monitorSerial" class="bottom-button border-meshtastic text-meshtastic">
          {{ $t('buttons.serial_monitor') }} <Terminal class="h-4 w-4 shrink-0" />
        </button>
        <a href="https://meshtastic.org/docs" v-if="!serialMonitorStore.isConnected" class="bottom-button border-meshtastic text-meshtastic">
          {{ $t('buttons.meshtastic_docs') }} <BookOpen class="h-4 w-4 shrink-0" />
        </a>
        <a href="https://github.com/meshtastic/web-flasher" v-if="!serialMonitorStore.isConnected" class="bottom-button border-meshtastic text-meshtastic">
          {{ $t('buttons.contribute') }}
          <Github class="w-4 h-4 shrink-0" />
        </a>
        <LanguagePicker v-if="!serialMonitorStore.isConnected" />
      </div>
    </section>

    <SerialMonitor />
    
    <ToastNotifications />

    <footer id="footer" class="halloween-theme footer text-white mt-4 py-4">
      <canvas>
        <div class="container mx-auto px-5 py-4 text-center">
          <p>
            Powered by
            <a href="https://vercel.com/?utm_source=meshtastic&utm_campaign=oss">▲ Vercel</a>
            | Meshtastic® is a registered trademark of Meshtastic LLC. |
            <a href="https://meshtastic.org/docs/legal">Legal Information</a>.
          </p>
        </div>
      </canvas>
    </footer>
    <div class="fixed -end-4 bottom-6 group">
      <button type="button" :disabled="true" 
        :class="{ 
          'text-purple-400 border-purple-400 animate-pulse': serialMonitorStore.isConnected && !serialMonitorStore.isReaderLocked,
          'border-meshtastic text-meshtastic animate-pulse': (serialMonitorStore.isConnected && serialMonitorStore.isReaderLocked) || firmwareStore.isConnected,
          'border-gray-700 text-gray-300': !isConnected
        }" 
        class="inline border focus:ring-4 focus:outline-none font-medium rounded-lg text-xs px-4 py-1 text-center me-2 mb-2 backdrop-blur-sm hover:shadow transition duration-300 ease-in-out">
        {{ connectionButtonLabel }}
        <span v-if="serialMonitorStore.isConnected && !serialMonitorStore.isReaderLocked" class="inline-flex w-2 h-2 me-2 bg-purple-400 rounded-full"></span>
        <span v-else-if="isConnected" class="inline-flex w-2 h-2 me-2 bg-green-500 rounded-full"></span>
        <span v-else class="inline-flex w-2 h-2 me-2 bg-gray-300 rounded-full"></span>
      </button>
    </div>
  </div>
</template>

<script setup>
import 'flowbite';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { onMounted } from 'vue';

import {
  initAccordions,
  initDrawers,
  initDropdowns,
  initModals,
  initTooltips,
} from 'flowbite';

import {
  Zap,
  BookOpen,
  Terminal,
  FolderDown,
  Github,
} from 'lucide-vue-next';

import { useDeviceStore } from './stores/deviceStore';
import { useFirmwareStore } from './stores/firmwareStore';
import { useSerialMonitorStore } from './stores/serialMonitorStore';

const serialMonitorStore = useSerialMonitorStore();
const firmwareStore = useFirmwareStore();
const deviceStore = useDeviceStore();

const monitorSerial = async () => {
  await serialMonitorStore.monitorSerial();
};

const selectedDeviceImage = computed(() => {
  if (deviceStore.selectedTarget?.images?.length) {
    return `/img/devices/${deviceStore.selectedTarget.images[0]}`;
  }
  return '/img/devices/unknown.svg';
});

const connectionButtonLabel = computed(() => {
  if (firmwareStore.isFlashing) {
    return t('state.flashing');
  }
  if ((serialMonitorStore.isConnected && !serialMonitorStore.isReaderLocked) || (firmwareStore.isConnected && !firmwareStore.isReaderLocked)) {
    return t('state.disconnecting');
  }
  return isConnected.value ? t('state.connected') : t('state.disconnected');
});

const isConnected = computed(() => {
  return serialMonitorStore.isConnected || firmwareStore.isConnected;
});

// WebSerial API support check
const isWebSerialSupported = computed(() => {
  return 'serial' in navigator;
});
const konamiKeys = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const konamiCodeIndex = ref(0);
window.addEventListener('keydown', (event) => {
  if (event.key === konamiKeys[konamiCodeIndex.value]) {
    console.log('konami code key match', konamiCodeIndex.value);
    konamiCodeIndex.value++;
    if (konamiCodeIndex.value === konamiKeys.length) {
      console.log('Unlocking pre-release section')
      document.body.classList.add('konami-code');
      document.getElementById('main').classList.add('konami-code');
      document.getElementById('footer').classList.add('konami-code');
      firmwareStore.$state.prereleaseUnlocked = true;
      konamiCodeIndex.value = 0;
    }
  } else {
    konamiCodeIndex.value = 0;
  }
});

onMounted(() => {
  initDropdowns();
  initModals();
  initTooltips();
  initDrawers();
  initAccordions();
});
</script>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap');
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
    font-family: 'Atkinson Hyperlegible', 'Lato', 'Inter', sans-serif;
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
  .bottom-button {
    @apply flex items-center justify-center gap-1;
    @apply font-medium text-xs text-center rounded-lg px-4 py-2 me-2 mb-2 border;
    @apply hover:text-black hover:bg-white hover:border-transparent hover:shadow transition duration-300 ease-in-out;
    @apply focus:ring-4 focus:outline-none;
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
