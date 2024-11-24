<template>
  <div>
    <!-- Warning for browsers that do not support WebSerial API -->
    <div v-if="!isWebSerialSupported" class="unsupported-browser-warning">
      <p>Your browser does not support the WebSerial API. Please switch to a compatible browser, such as Chrome or Edge, for full functionality.</p>
    </div>
    <Head>
      <Title>Meshtastic Web Flasher</Title>
      <Meta name="description" content="Meshtastic Flasher" />
    </Head>

    <section id="main" class="text-gray-400 body-font">
      <transition name="flash" mode="out-in">
        <div class="container px-5 py-1 mx-auto transition duration-900 ease-in-out" v-show="!serialMonitorStore.isConnected">
          <div class="flex flex-col content-center justify-center">
            <div class="flex flex-wrap sm:flex-row flex-col py-1">
              <LogoHeader />
            </div>
            <hr class="w-full mx-auto mb-4 border-gray-600" />
          </div>
          <div class="flex flex-wrap sm:-m-4 -mx-4 -mb-10 -mt-4">
            <div class="p-4 md:w-1/3 sm:mb-0 mb-6">
              <div class="rounded-lg h-80 overflow-hidden flex flex-col items-center display-inline">
                <img :src="selectedDeviceImage" class="h-64 mb-6 mx-auto" alt="Device" />
                <Device />
              </div>
              <h2 class="text-xl font-medium title-font text-white mt-5">Device</h2>
              <p class="text-base leading-relaxed mt-2">
                Plug in your device via USB. Please ensure the cable is not a power-only one. 
              </p>
            </div>
            <div class="p-4 md:w-1/3 sm:mb-0 mb-6">
              <div class="rounded-lg h-80 flex flex-col items-center">
                <FolderArrowDownIcon class="h-60 w-60 p-5 mt-10 mb-10 mx-auto text-white" alt="Firmware" />
                <Firmware />
              </div>
              <h2 class="text-xl font-medium title-font text-white mt-5">Firmware</h2>
              <p class="text-base leading-relaxed mt-2">
                Choose from the release options or upload a release zip downloaded from Github. 
              </p>
            </div>
            <div class="p-4 md:w-1/3 sm:mb-0 mb-6">
              <div class="rounded-lg h-80 overflow-hidden flex flex-col items-center">
                <BoltIcon class="h-60 w-60 p-5 mt-10 mb-10 mx-auto text-white" />
                <Flash />
              </div>
              <h2 class="text-xl font-medium title-font text-white mt-5">Flash</h2>
              <p class="text-base leading-relaxed mt-2">
                Flash your device. Choose whether you wish to update your device or wipe the flash and install from scratch.
              </p>
            </div>
          </div>
        </div>
      </transition>
      <div class="text-center mt-4 flex justify-center gap-4">
        <button type="button" v-if="!serialMonitorStore.isConnected" @click="monitorSerial" class="inline border border-meshtastic text-meshtastic focus:ring-4 focus:outline-none font-medium rounded-lg text-xs px-4 py-1 text-center me-2 mb-2 text-gray-300 hover:text-black hover:bg-white hover:border-transparent hover:shadow transition duration-300 ease-in-out">
          Open Serial Monitor <CommandLineIcon class="h-4 w-4 inline mb-1" />
        </button>
        <a href="https://meshtastic.org/docs" v-if="!serialMonitorStore.isConnected" class="inline-flex items-center border border-meshtastic text-meshtastic focus:ring-4 focus:outline-none font-medium rounded-lg text-xs px-4 py-1 text-center me-2 mb-2 text-gray-300 hover:text-black hover:bg-white hover:border-transparent hover:shadow transition duration-300 ease-in-out">
          <span class="inline-flex items-center">
            Meshtastic Docs <BookOpenIcon class="h-4 w-4 inline ml-1" />
          </span>
        </a>
        <a href="https://github.com/meshtastic/web-flasher" v-if="!serialMonitorStore.isConnected" class="inline border border-meshtastic text-meshtastic focus:ring-4 focus:outline-none font-medium rounded-lg text-xs px-4 py-1 text-center me-2 mb-2 text-gray-300 hover:text-black hover:bg-white hover:border-transparent hover:shadow transition duration-300 ease-in-out">
          Contribute on GitHub
          <span class="inline-block">
            <svg width="20" height="20" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg" class="inline mb-1 fill-current">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
            </svg>
          </span>
        </a>
      </div>
    </section>

    <SerialMonitor />

    <footer id="footer" class="halloween-theme footer text-white mt-4 py-4">
      <div class="container mx-auto px-5 py-4 text-center">
        <p>
          Powered by
          <a href="https://vercel.com/?utm_source=meshtastic&utm_campaign=oss">▲ Vercel</a>
          | Meshtastic® is a registered trademark of Meshtastic LLC. |
          <a href="https://meshtastic.org/docs/legal">Legal Information</a>.
        </p>
      </div>
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

import { onMounted } from 'vue';

import {
  initAccordions,
  initDrawers,
  initDropdowns,
  initModals,
  initTooltips,
} from 'flowbite';

import {
  BoltIcon,
  BookOpenIcon,
  CommandLineIcon,
  FolderArrowDownIcon,
} from '@heroicons/vue/24/solid';

import { useDeviceStore } from './stores/deviceStore';
import { useFirmwareStore } from './stores/firmwareStore';
import { useSerialMonitorStore } from './stores/serialMonitorStore';

const serialMonitorStore = useSerialMonitorStore();
const firmwareStore = useFirmwareStore();
const deviceStore = useDeviceStore();

const monitorSerial = () => {
  serialMonitorStore.monitorSerial();
};

const selectedDeviceImage = computed(() => {
  if (deviceStore.selectedTarget?.images?.length) {
    return `/img/devices/${deviceStore.selectedTarget.images[0]}`;
  }
  return '/img/devices/unknown.svg';
});

const connectionButtonLabel = computed(() => {
  if (firmwareStore.isFlashing) {
    return 'Flashing';
  }
  if ((serialMonitorStore.isConnected && !serialMonitorStore.isReaderLocked) || (firmwareStore.isConnected && !firmwareStore.isReaderLocked)) {
    return 'Disconnecting';
  }
  return isConnected.value ? 'Connected' : 'Not connected';
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
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..1000&display=swap');
  body {
    font-family: 'Inter', sans-serif;
    background-color: #2C2D3C;
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
    color: #67EA94;
  }
  .bg-meshtastic {
    background-color: #67EA94;
  }
  .border-meshtastic {
    border-color: #67EA94;
  }
  .footer {
    background-color: #2C2D3C;
  }
  h1 {
    font-size: 2em;
    color: #FFFFFF;
  }
  h2 {
    font-size: 1.5em;
    color: #FFFFFF;
  }
  .footer a:hover {
    text-decoration: underline;
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
