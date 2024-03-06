<template>
  <div>
  <a href="https://github.com/meshtastic/web-flasher" class="github-corner" aria-label="View source on GitHub">
  <svg width="80" height="80" viewBox="0 0 250 250" style="fill:#fff; color:#2C2D3C; position: absolute; top: 0; border: 0; right: 0;" aria-hidden="true">
    <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>
    <path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" style="transform-origin: 130px 106px;" class="octo-arm"></path>
    <path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" class="octo-body"></path>
  </svg>
</a>
    <!-- Warning for browsers that do not support WebSerial API -->
    <div v-if="!isWebSerialSupported" class="unsupported-browser-warning">
      <p>Your browser does not support the WebSerial API. Please switch to a compatible browser, such as Chrome or Edge, for full functionality.</p>
    </div>
    <Head>
      <Title>Meshtastic Flasher</Title>
      <Meta name="description" content="Meshtastic Flasher" />
    </Head>

    <section class="text-gray-400 bg-2C2D3C body-font">
      <transition name="flash" mode="out-in">
        <div class="container px-5 py-1 mx-auto transition duration-900 ease-in-out" v-show="!serialMonitorStore.isConnected">
          <div class="flex flex-col content-center justify-center">
            <div class="flex flex-wrap sm:flex-row flex-col py-1">
              <div class="mx-auto">
                <img src="@/assets/img/logo.svg" class="h-32 w-32 inline-block pt-0 mt-0" alt="Meshtastic Logo" />
                <h1 class="text-white text-6xl font-bold inline-block ml-4 mt-8 align-top">
                  Flasher
                </h1>
              </div>
            </div>
          </div>
          <div class="flex flex-wrap sm:-m-4 -mx-4 -mb-10 -mt-4">
            <div class="p-4 md:w-1/3 sm:mb-0 mb-6">
              <div class="rounded-lg h-72 overflow-hidden flex flex-col items-center display-inline">
                <img src="@/assets/img/hydra-pcb.svg" class="h-60 mb-2 invert mx-auto" alt="Device" />
                <Device />
              </div>
              <h2 class="text-xl font-medium title-font text-white mt-5">Device</h2>
              <p class="text-base leading-relaxed mt-2">
                Plug in your device via USB. Please ensure the cable is not a power-only one. 
              </p>
            </div>
            <div class="p-4 md:w-1/3 sm:mb-0 mb-6">
              <div class="rounded-lg h-72 flex flex-col items-center">
                <FolderArrowDownIcon class="h-60 w-60 p-5 mb-2 mx-auto text-white" alt="Firmware" />
                <Firmware />
              </div>
              <h2 class="text-xl font-medium title-font text-white mt-5">Firmware</h2>
              <p class="text-base leading-relaxed mt-2">
                Choose from the release options or upload a release zip downloaded from Github. 
              </p>
            </div>
            <div class="p-4 md:w-1/3 sm:mb-0 mb-6">
              <div class="rounded-lg h-72 overflow-hidden flex flex-col items-center">
                <BoltIcon class="h-60 w-60 p-5 mb-2 mx-auto text-white" />
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
      <div class="container px-2 py-5 mx-auto" >
        <div class="flex flex-col content-center justify-center">
          <div class="text-center" v-if="!isConnected">
            <button class="inline border border-meshtastic focus:ring-4 focus:outline-none font-medium rounded-lg text-xs px-4 py-1 text-center me-2 mb-2 text-meshtastic hover:text-black hover:bg-white hover:border-transparent hover:shadow transition duration-300 ease-in-out"
              type="button" @click="monitorSerial()">
              Open Serial Monitor <CommandLineIcon class="h-4 w-4 inline mb-1" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <SerialMonitor />

    <footer class="footer bg-2C2D3C text-white mt-4 py-4">
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
  initDrawers,
  initDropdowns,
  initModals,
  initTooltips,
} from 'flowbite';

import {
  FolderArrowDownIcon,
  BoltIcon,
  CommandLineIcon,
} from '@heroicons/vue/24/solid';

import { useFirmwareStore } from './stores/firmwareStore';
import { useSerialMonitorStore } from './stores/serialMonitorStore';

const serialMonitorStore = useSerialMonitorStore();
const firmwareStore = useFirmwareStore();

const monitorSerial = () => {
  serialMonitorStore.monitorSerial();
};

const connectionButtonLabel = computed(() => {
  if (firmwareStore.isFlashing) {
    return 'Flashing';
  } else if ((serialMonitorStore.isConnected && !serialMonitorStore.isReaderLocked) || (firmwareStore.isConnected && !firmwareStore.isReaderLocked)) {
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

onMounted(() => {
  initDropdowns();
  initModals();
  initTooltips();
  initDrawers();
});
</script>

<style>
  body {
    background-color: #2C2D3C;
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
  .footer a {
    color: #67EA94;
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
    transition: all 0.5s ease-in-out;
  }

  .flash-enter-from,
  .flash-leave-to {
    transition: all 0.5s ease-out;
    opacity: 0;
  }

@media (max-width: 768px) { /* Adjust the breakpoint as needed */
    .github-corner {
      display: none;
    }
  }
  .github-corner:hover .octo-arm {
    animation: octocat-wave 560ms ease-in-out;
  }

  @keyframes octocat-wave {
    0%, 100% {
      transform: rotate(0);
    }
    20%, 60% {
      transform: rotate(-25deg);
    }
    40%, 80% {
      transform: rotate(10deg);
    }
  }

  @media (max-width: 500px) {
    .github-corner:hover .octo-arm {
      animation: none;
    }
    .github-corner .octo-arm {
      animation: octocat-wave 560ms ease-in-out;
    }
  }
</style>