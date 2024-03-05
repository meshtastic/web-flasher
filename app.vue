<template>
  <div>
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
                <img src="@/assets/img/github-mark-white.svg" class="h-60 w-60 p-5 mb-2 mx-auto" alt="Github Logo" />
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
    <div data-dial-init class="fixed -end-4 bottom-6 group">
      <button type="button" :disabled="!isConnected || firmwareStore.isFlashing" @click="disconnect()"
        :title="isConnected ? 'Disconnect' : 'Not connected'"
        :class="{ 'border-meshtastic text-meshtastic hover:text-black hover:bg-red-500 hover:border-transparent animate-pulse': isConnected, 'border-gray-700 text-gray-300': !isConnected }" class="inline border focus:ring-4 focus:outline-none font-medium rounded-lg text-xs px-4 py-1 text-center me-2 mb-2  hover:shadow transition duration-300 ease-in-out">
        {{ connectionButtonLabel }} <BoltIcon class="h-4 w-4 inline mb-1" v-if="isConnected" /><BoltSlashIcon class="h-4 w-4 inline mb-1" v-if="!isConnected" />
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
  BoltIcon,
  BoltSlashIcon,
  CommandLineIcon,
} from '@heroicons/vue/24/solid';

import { useSerialMonitorStore } from './stores/serialMonitorStore';
import { useFirmwareStore } from './stores/firmwareStore';

const serialMonitorStore = useSerialMonitorStore();
const firmwareStore = useFirmwareStore();

const monitorSerial = () => {
  serialMonitorStore.monitorSerial();
};

const disconnect = () => {
  if (serialMonitorStore.isConnected) {
    serialMonitorStore.disconnect();
  } else if (firmwareStore.isConnected) {
    firmwareStore.port?.close();
  }
};

const connectionButtonLabel = computed(() => {
  if (firmwareStore.isFlashing) {
    return 'Flashing';
  } else if ((serialMonitorStore.isConnected && !serialMonitorStore.isReaderLocked) || (firmwareStore.isConnected && !firmwareStore.isReaderLocked)) {
    return 'Disconnecting';
  }
  return isConnected.value ? 'Monitoring' : 'Not connected';
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
</style>