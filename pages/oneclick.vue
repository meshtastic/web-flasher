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
  
      <section class="text-gray-400 body-font">
        <transition name="flash" mode="out-in">
          <div class="container px-5 py-1 mx-auto transition duration-900 ease-in-out" v-show="!serialMonitorStore.isConnected">
            <div class="flex flex-col content-center justify-center">
              <div class="flex flex-wrap sm:flex-row flex-col py-1">
                <div class="mx-auto">
                  <img src="@/assets/img/logo.svg" class="h-32 w-32 inline-block pt-0 mt-0" alt="Meshtastic Logo" />
                  <h1 class="text-white text-6xl font-bold inline-block ml-4 mt-8 align-top">
                    Simple Flasher
                  </h1>
                </div>
              </div>
            </div>
            <div class="flex flex-wrap sm:-m-4 -mx-4 -mb-10 -mt-4 pb-2">
              <div class="p-4 md:w-full sm:mb-0 mb-6">
                <div class="rounded-lg overflow-hidden flex flex-col items-center display-inline">
                  <img src="@/assets/img/hydra-pcb.svg" class="h-60 mb-2 invert mx-auto" alt="Device" />
                  <div class="py-1">
                    <label class="relative inline-flex items-center me-5 cursor-pointer">
                        <input type="checkbox" value="" class="sr-only peer" v-model="firmwareStore.$state.shouldCleanInstall">
                        <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4  dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                        <span class="ms-3 text-sm font-medium text-gray-300 dark:text-gray-300">Erase device?</span>
                    </label>
                  </div>
                  <span class="text-sm mb-2 text-center"><i>Erasing your device may be required when upgrading from older firmware (ie. 2.4.2 -> 2.5+).</i></span>
                  <div>
                    <button id="flashButton"
                        class="content-center text-black bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:bg-gray-500" 
                        :class="{ 'animate-bounce': firmwareStore.prereleaseUnlocked && !firmwareStore.$state.selectedFirmware?.id}"
                        type="button" @click="toggleFlashProcess" :disabled="disableFlashButton">
                        {{connectionButtonLabel}}
                    </button>
                    <button data-tooltip-target="tooltip-file" class="mx-2 display-inline content-center px-3 py-2 text-xs font-medium text-center hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg inline-flex items-center text-white hover:text-black"
                        type="button"
                        for="file-upload"
                        accept=".zip,.bin"
                        @click="openFile()">
                        <FolderOpenIcon class="h-4 w-4 " :class="animate-bounce" />
                    </button>
                    <div id="tooltip-file" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300  rounded-lg shadow-sm opacity-0 tooltip bg-gray-700">
                        Upload your own firmware file (zip or bin).
                        <div class="tooltip-arrow" data-popper-arrow></div>
                    </div>
                    <input id="file_upload" type="file" class="hidden" @change="setFirmwareFile" />
                  </div>
                  <span class="text-white inline-flex items-center pt-4">{{firmwareStore.autoFlashMessage}}</span>
                </div>
              </div>
            </div>
          </div>
        </transition>
        <div id="terminal" class="h-0 overflow-hidden"></div>
        <div class="text-center mt-4 flex justify-center gap-4 pt-2">
          <a href="https://meshtastic.org/docs" v-if="!serialMonitorStore.isConnected" class="inline-flex items-center border border-meshtastic focus:ring-4 focus:outline-none font-medium rounded-lg text-xs px-4 py-1 text-center me-2 mb-2 text-meshtastic hover:text-black hover:bg-white hover:border-transparent hover:shadow transition duration-300 ease-in-out">
            <span class="inline-flex items-center">
              Meshtastic Docs <BookOpenIcon class="h-4 w-4 inline ml-1" />
            </span>
          </a>
          <a href="https://github.com/meshtastic/web-flasher" v-if="!serialMonitorStore.isConnected" class="inline border border-meshtastic focus:ring-4 focus:outline-none font-medium rounded-lg text-xs px-4 py-1 text-center me-2 mb-2 text-meshtastic hover:text-black hover:bg-white hover:border-transparent hover:shadow transition duration-300 ease-in-out">
            Contribute on GitHub
            <span class="inline-block">
              <svg width="20" height="20" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg" class="inline mb-1 fill-current">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
              </svg>
            </span>
          </a>
        </div>
      </section>
  
      <footer id="footer" class="footer text-white mt-4 py-4">
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
    BookOpenIcon,
    FolderOpenIcon
  } from '@heroicons/vue/24/solid';
  
  import { useDeviceStore } from '@/stores/deviceStore';
  import { useFirmwareStore } from '@/stores/firmwareStore';
  import { useSerialMonitorStore } from '@/stores/serialMonitorStore';
  import { sleeper } from '@/utils/promiseUtils';
  
  const deviceStore = useDeviceStore();
  const serialMonitorStore = useSerialMonitorStore();
  const firmwareStore = useFirmwareStore();
  
  const disableFlashButton = computed(() => {
    return firmwareStore.isRunningAutoFlash && !firmwareStore.needsInteractiveContinue;
  });

  const toggleFlashProcess = () => {
    if (!firmwareStore.needsInteractiveContinue) {
      startFlashProcess();
    } else {
      continueFlashProcess();
    }
  };

  const openFile = () => {
    document.getElementById('file_upload')?.click();
  };

  const setFirmwareFile = (event) => {
    firmwareStore.setFirmwareFile(event.target.files[0]);
    firmwareStore.setAutoFlashMessage(`Using custom firmware file: ${firmwareStore.selectedFile.name}`);
  };

  const catchConnectionStatus = computed(() => {
    if (firmwareStore.isConnected) {
      firmwareStore.setAutoFlashMessage("Updating (this could take a minute)...");
    }
  });

  const startFlashProcess = () => {
    firmwareStore.setIsRunningAutoFlash(true);
    firmwareStore.setAutoFlashMessage("Getting device list...");
    deviceStore.fetchList().then(() => {
      firmwareStore.setAutoFlashMessage("Choose your device for auto detection...");
      deviceStore.autoSelectHardware().then(() => {
        if (!deviceStore.selectedTarget?.hwModel) {
          firmwareStore.setAutoFlashMessage("Unable to auto detect device. Try rebooting your device and starting over.");
          firmwareStore.setIsRunningAutoFlash(false);
          return;
        }

        firmwareStore.setAutoFlashMessage(`Found ${deviceStore.selectedTarget?.displayName}. Getting firmware...`);
        firmwareStore.fetchList().then(sleeper(2000)).then(() => {
          // Pick latest firmware unless flashing a custom file
          if (!firmwareStore.selectedFile?.name) {
            firmwareStore.setAutoFlashMessage("Selecting latest firmware...");
            firmwareStore.setSelectedFirmware(firmwareStore.$state.alpha[0]);
          }

          if (deviceStore.isUf2) {
            window.location.href = downloadUf2EraseFile();
            window.location.href = downloadUf2FirmwareFile();
            firmwareStore.setAutoFlashMessage("Your device does not support simple flash, however, the files you'll need have been downloaded for you.");
            firmwareStore.setIsRunningAutoFlash(false);
            return;
          }
          
          firmwareStore.setAutoFlashMessage(`Selected ${firmwareStore.selectedFile?.name || firmwareStore.selectedFirmware?.title}. Click to continue.`);
          firmwareStore.setNeedsInteractiveContinue(true);
        });
      });
    });
  }

  const continueFlashProcess = () => {
    firmwareStore.setNeedsInteractiveContinue(false);
    if (deviceStore.isEsp32) {
      if (!deviceStore.hasBaud1200) {
        firmwareStore.setAutoFlashMessage("Select device to place it in update mode...");
        deviceStore.baud1200().then(sleeper(3000)).then(() => {
          firmwareStore.setNeedsInteractiveContinue(true);
          firmwareStore.setAutoFlashMessage("Device in update mode. Click to flash device.");
        });
      } else {
        firmwareStore.setAutoFlashMessage("Select device to apply update. Hint: look for something with 'JTAG' in the name.");
        setTimeout(() => {
          onUpdateComplete();
        }, 25000);
        esp32Flash().then(() => {
          onUpdateComplete();
        });
      }
    }
  }

  const flashPercentProgress = computed(() => {
    if (firmwareStore.isFlashing && firmwareStore.$state.flashPercentDone < 1){
      firmwareStore.setAutoFlashMessage(`${firmwareStore.$state.flashPercentDone} Updating...`);
    }
  });

  const onUpdateComplete = () => {
    firmwareStore.setAutoFlashMessage("Update complete! Reboot your device.");
    firmwareStore.setIsRunningAutoFlash(false);
  }
  
  const connectionButtonLabel = computed(() => {
    if (firmwareStore.needsInteractiveContinue) {
      return "Apply Update";
    }
    if (firmwareStore.isRunningAutoFlash) {
      return 'Running...';
    }
    if (firmwareStore.isFlashing) {
      return 'Flashing';
    }
    if ((serialMonitorStore.isConnected && !serialMonitorStore.isReaderLocked) || (firmwareStore.isConnected && !firmwareStore.isReaderLocked)) {
      return 'Disconnecting';
    }
    return isConnected.value ? 'Connected' : 'Start Update Process';
  });
  
  const isConnected = computed(() => {
    return serialMonitorStore.isConnected || firmwareStore.isConnected;
  });

  const downloadUf2EraseFile = () => {
    if (!deviceStore.isSelectedNrf) {
        return '/uf2/pico_erase.uf2';
    }

    return deviceStore.isSoftDevice7point3 ? '/uf2/nrf_erase_sd7_3.uf2' : '/uf2/nrf_erase2.uf2';
  }

  const downloadUf2FirmwareFile = () => {
    const firmwareVersion = firmwareStore.selectedFirmware.id.replace('v', '');
    console.log(firmwareVersion);
    const firmwareFile = `firmware-${deviceStore.$state.selectedTarget.platformioTarget}-${firmwareVersion}.uf2`;
    firmwareStore.trackDownload(deviceStore.$state.selectedTarget, false);
    return firmwareStore.getReleaseFileUrl(firmwareFile);
  }

  const esp32Flash = () => {
    if (firmwareStore.shouldCleanInstall) {
      return flashEsp32CleanInstall();
    }
    return updateEsp32();
  }

  const flashEsp32CleanInstall = () => {
    const firmwareFile = `firmware-${deviceStore.$state.selectedTarget.platformioTarget}-${firmwareStore.firmwareVersion}.bin`;
    const otaFile = deviceStore.$state.selectedTarget.architecture == 'esp32-s3' ? 'bleota-s3.bin' : 'bleota.bin';
    const littleFsFile = `littlefs-${firmwareStore.firmwareVersion}.bin`;
    return firmwareStore.cleanInstallEspFlash(firmwareFile, otaFile, littleFsFile, deviceStore.$state.selectedTarget);
  }
  
  const updateEsp32 = () => {
    // Get firmware version from selectedFirmware or use regex wildcard to match otherwise
    const firmwareFile = `firmware-${deviceStore.$state.selectedTarget.platformioTarget}-${firmwareStore.firmwareVersion}-update.bin`
    return firmwareStore.updateEspFlash(firmwareFile, deviceStore.$state.selectedTarget);
  }

  // WebSerial API support check
  const isWebSerialSupported = computed(() => {
    return 'serial' in navigator;
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
  
    body {
      background-color: #2C2D3C;
      /* background-color: var(themeBackground); */
    }
    .konami-code {
      background-color: #000000;
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
    footer {
      background-color: #2C2D3C;
    }
    footer a {
      color: #67EA94;
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
  