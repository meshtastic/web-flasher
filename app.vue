<template>
  <div>
    <Head>
      <Title>Meshtastic Flasher</Title>
      <Meta name="description" :content="title" />
    </Head>
    <section class="text-gray-400 bg-2C2D3C body-font">
      <div class="container px-5 py-1 mx-auto">
        <div class="flex flex-col content-center justify-center">
          <div class="flex flex-wrap sm:flex-row flex-col py-2 mb-2">
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
      <footer class="footer bg-2C2D3C text-white py-4">
      <div class="container mx-auto px-5 py-4 text-center">
        <p>
          Powered by
          <a href="https://vercel.com/?utm_source=meshtastic&utm_campaign=oss" class="text-blue-500 hover:text-blue-700">▲ Vercel</a>
          | Meshtastic® is a registered trademark of Meshtastic LLC. |
          <a href="https://meshtastic.org/docs/legal" class="text-blue-500 hover:text-blue-700">Legal Information</a>.
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import 'flowbite';

import {
  initDropdowns,
  initModals,
  initTooltips,
} from 'flowbite';

import { BoltIcon } from '@heroicons/vue/24/solid';

onMounted(() => {
  initDropdowns();
  initModals();
  initTooltips();
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
  .bg-meshtastic {
    background-color: #67EA94;
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
</style>