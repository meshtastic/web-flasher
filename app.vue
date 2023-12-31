<template>
  <div>
    <section class="text-gray-400 bg-gray-800 body-font">
      <div class="container px-5 py-4 mx-auto">
        <div class="flex flex-col content-center justify-center">
          <div class="flex flex-wrap sm:flex-row flex-col py-2 mb-6">
            <div class="mx-auto">
              <img src="@/assets/img/logo.svg" class="h-32 w-32" alt="Meshtastic Logo" />
              <h1 class="text-white mb-4 text-4xl font-extrabold">
                Flasher
              </h1>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap sm:-m-4 -mx-4 -mb-10 -mt-4">
          <div class="p-4 md:w-1/3 sm:mb-0 mb-6">
            <div class="rounded-lg h-72 overflow-hidden flex flex-col items-center">
              <img src="@/assets/img/hydra-pcb.svg" class="h-60 mb-2 invert mx-auto" alt="Device" />
              <Device />
            </div>
            <h2 class="text-xl font-medium title-font text-white mt-5">Device</h2>
            <p class="text-base leading-relaxed mt-2">
              Plug in your device via USB. Please ensure the cable is not a power-only version. 
              If your device is ESP32-S3 based, you may need to press and hold the boot button while plugging in the USB cable.
            </p>
          </div>
          <div class="p-4 md:w-1/3 sm:mb-0 mb-6">
            <div class="rounded-lg h-72 flex flex-col items-center">
              <img src="@/assets/img/github-mark-white.svg" class="h-60 w-60 p-5 mb-2 mx-auto" alt="Github Logo" />
              <Firmware />
            </div>
            <h2 class="text-xl font-medium title-font text-white mt-5">Firmware</h2>
            <p class="text-base leading-relaxed mt-2">
              Choose from the release options or test an experimental firmware from a pull-request on Github
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
    </section>
  </div>
</template>

<script setup>
import 'flowbite';

import { BoltIcon } from '@heroicons/vue/24/solid';

// // Always dark mode
//   document.documentElement.classList.add('dark');
</script>

<style>
body {
    background-color: #1F2937;
}
.invert { 
    -webkit-filter: invert(1);
    filter: invert(1);
}
.meshtastic-bg {
    background-color: #67EA94;
}
</style>