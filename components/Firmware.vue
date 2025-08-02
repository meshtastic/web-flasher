<template>
    <div>
        <button id="dropdownFirmwareButton" data-dropdown-toggle="dropdownFirmware"
            class="content-center text-black bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center bg-blue-600 hover:bg-blue-700 focus:ring-blue-800 disabled:bg-gray-500"
            :class="{ 'animate-bounce': store.prereleaseUnlocked && !store.$state.selectedFirmware?.id }" type="button"
            :disabled="!canSelectFirmware">
            {{ selectedVersion.replace('Meshtastic Firmware ', '').replace('Technical ', '') }}
            <ChevronDown class="w-2.5 h-2.5 ms-3" />
        </button>
        <div id="dropdownFirmware" class="z-10 hidden bg-gray-200 divide-y divide-gray-600 rounded-lg shadow w-44">
            <div v-if="store.prereleaseUnlocked && store.$state.previews.length > 0"
                class="px-4 py-2 text-sm text-gray-900">
                <strong>{{ $t('firmware.prerelease') }}</strong>
            </div>
            <ul v-if="store.prereleaseUnlocked && store.$state.previews.length > 0" class="py-2 text-sm text-gray-800"
                aria-labelledby="dropdownInformationButton">
                <li v-for="release in store.$state.previews">
                    <a href="#" class="block px-4 py-1 hover:bg-gray-400 cursor-pointer"
                        @click="setSelectedFirmware(release)">
                        {{ release.title.replace('Meshtastic Firmware ', '').replace('Pre-release ', '') }}
                    </a>
                </li>
            </ul>
            <div class="px-4 py-2 text-sm text-gray-900" v-if="!store.couldntFetchFirmwareApi">
                <strong>{{ $t('firmware.unstable') }}</strong>
            </div>
            <ul class="py-2 text-sm text-gray-800" aria-labelledby="dropdownInformationButton"
                v-if="!store.couldntFetchFirmwareApi">
                <li v-for="release in store.$state.alpha">
                    <a href="#" class="block px-4 py-1 hover:bg-gray-400 cursor-pointer"
                        @click="setSelectedFirmware(release)">
                        {{ release.title.replace('Meshtastic Firmware ', '') }}
                    </a>
                </li>
            </ul>
            <div class="px-4 py-2 text-sm text-gray-900" v-if="!store.couldntFetchFirmwareApi">
                <strong>{{ $t('firmware.stable') }}</strong>
            </div>
            <ul class="py-2 text-sm text-gray-800" aria-labelledby="dropdownInformationButton"
                v-if="!store.couldntFetchFirmwareApi">
                <li v-for="release in store.$state.stable">
                    <span class="block px-4 py-1 hover:bg-gray-400 cursor-pointer"
                        @click="setSelectedFirmware(release)">
                        {{ release.title.replace('Meshtastic Firmware ', '') }}
                    </span>
                </li>
            </ul>
            <div class="px-4 py-2 w-96 rounded-lg text-sm text-gray-900 bg-yellow-100"
                v-if="store.couldntFetchFirmwareApi">
                <strong>{{ $t('firmware.error_fetching') }}</strong>
                <br />
                {{ $t('firmware.refresh_later') }}
                {{ $t('firmware.upload_alternative') }}
                <FolderOpen class="h-3 w-3 inline" /> {{ $t('firmware.icon') }}
            </div>
        </div>
        <button data-tooltip-target="tooltip-file"
            class="mx-2 display-inline content-center px-3 py-2 text-xs font-medium text-center hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg inline-flex items-center text-white hover:text-black"
            type="button" for="file-upload" accept=".zip,.bin" @click="openFile()">
            <FolderOpen class="h-4 w-4 "
                :class="{ 'animate-bounce': (store.couldntFetchFirmwareApi && canSelectFirmware) }" />
        </button>
        <div id="tooltip-file" role="tooltip"
            class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300  rounded-lg shadow-sm opacity-0 tooltip bg-zinc-700">
            {{ $t('firmware.upload_tooltip') }}
            <div class="tooltip-arrow" data-popper-arrow></div>
        </div>
        <input id="file_upload" type="file" class="hidden" @change="setFirmwareFile" />
    </div>
</template>

<script lang="ts" setup>
import type { FirmwareResource } from '~/types/api';

import { FolderOpen, ChevronDown } from 'lucide-vue-next';

import { useDeviceStore } from '../stores/deviceStore';
import { useFirmwareStore } from '../stores/firmwareStore';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const store = useFirmwareStore();
const deviceStore = useDeviceStore();
store.fetchList();

const selectedVersion = computed(() => {
    if (store.$state.selectedFirmware?.id) {
        return store.$state.selectedFirmware.title;
    } else if (store.$state.selectedFile?.name) {
        return store.$state.selectedFile?.name;
    }
    return t('firmware.select_firmware');
});

const canSelectFirmware = computed(() => {
    return deviceStore.selectedTarget?.hwModel > 0;
});

const openFile = () => {
    document.getElementById('file_upload')?.click();
}

const setFirmwareFile = (event: any) => {
    store.setFirmwareFile(event.target.files[0]);
}

const setSelectedFirmware = (release: FirmwareResource) => {
    store.setSelectedFirmware(release);
    document.getElementById('dropdownFirmware')?.classList.toggle('hidden'); // Flowbite bug
}

// Credit: https://codepen.io/yaclive/pen/EayLYO
function doAnimation() {
    console.log('doAnimation');
  // Initialising the canvas
  var canvas = document.querySelector('canvas');
  var ctx = canvas?.getContext('2d');

  if (!canvas || !ctx) {
    return;
  }

  // Setting the width and height of the canvas
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Setting up the letters
  let letters = '/\\'.split('');;

  // Setting up the columns
  const fontSize = 10;
  const columns = canvas.width / fontSize;

  // Setting up the drops
  let drops = new Array<number>();
  for (var i = 0; i < columns; i++) {
    drops[i] = 1;
  }

  // Setting up the draw function
  function draw() {
    if (!canvas || !ctx) {
      return;
    }
    ctx.fillStyle = 'rgba(0, 0, 0, .1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < drops.length; i++) {
      var text = letters[Math.floor(Math.random() * letters.length)];
      ctx.fillStyle = '#0f0';
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);
      drops[i]++;
      if (drops[i] * fontSize > canvas.height && Math.random() > .95) {
        drops[i] = 0;
      }
    }
  }

  // Loop the animation
  setInterval(draw, 33);
}

watch(() => store.$state.selectedFirmware, (value) => {
  if (value?.id) {
    // doAnimation();
  }
});
</script>