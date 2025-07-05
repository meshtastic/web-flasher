<template>
    <div class="flex gap-1 text-sm text-white">
        <button id="dropdownFirmwareButton" data-dropdown-toggle="dropdownFirmware"
            class="min-w-44 flex items-center justify-center gap-2 text-black bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg px-3 py-2.5 disabled:bg-gray-500 duration-150"
            :class="{ 'animate-bounce': store.prereleaseUnlocked && !store.selectedFirmware?.id && deviceStore.selectedTarget.hwModel }" type="button"
            :disabled="!canSelectFirmware">
            {{ selectedVersion.replace('Meshtastic Firmware ', '').replace('Technical ', '') }}
            <ChevronDownIcon class="size-4 stroke-1.5 stroke-black" />
        </button>
        <div id="dropdownFirmware" class="z-10 hidden bg-gray-200 divide-y divide-gray-600 rounded-lg shadow w-44 *:py-2 [&>div]:px-4 [&>div]:text-gray-900 [&>ul]:text-gray-800 [&_span]:cursor-pointer [&_span]:block [&_span]:px-4 [&_span]:py-1 [&_span:hover]:bg-gray-400">
            <div v-if="store.prereleaseUnlocked && store.$state.previews.length > 0">
                <strong>{{ $t('firmware.prerelease') }}</strong>
            </div>
            <ul v-if="store.prereleaseUnlocked && store.$state.previews.length > 0"
                aria-labelledby="dropdownInformationButton">
                <li v-for="release in store.$state.previews">
                    <span
                        @click="setSelectedFirmware(release)">
                        {{ release.title.replace('Meshtastic Firmware ', '').replace('Pre-release ', '') }}
                    </span>
                </li>
            </ul>
            <div v-if="!store.couldntFetchFirmwareApi">
                <strong>{{ $t('firmware.unstable') }}</strong>
            </div>
            <ul aria-labelledby="dropdownInformationButton"
                v-if="!store.couldntFetchFirmwareApi">
                <li v-for="release in store.$state.alpha">
                    <span
                        @click="setSelectedFirmware(release)">
                        {{ release.title.replace('Meshtastic Firmware ', '') }}
                    </span>
                </li>
            </ul>
            <div v-if="!store.couldntFetchFirmwareApi">
                <strong>{{ $t('firmware.stable') }}</strong>
            </div>
            <ul aria-labelledby="dropdownInformationButton"
                v-if="!store.couldntFetchFirmwareApi">
                <li v-for="release in store.$state.stable">
                    <span
                        @click="setSelectedFirmware(release)">
                        {{ release.title.replace('Meshtastic Firmware ', '') }}
                    </span>
                </li>
            </ul>
            <div class="w-96 rounded-lg bg-yellow-100"
                v-if="store.couldntFetchFirmwareApi">
                <strong>{{ $t('firmware.error_fetching') }}</strong>
                <br />
                {{ $t('firmware.refresh_later') }}
                {{ $t('firmware.upload_alternative') }}
                <FolderOpenIcon class="size-3 inline" /> {{ $t('firmware.icon') }}
            </div>
        </div>
        <button data-tooltip-target="tooltip-file"
            class="flex items-center px-3 py-2 hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg hover:text-black duration-300"
            type="button" for="file-upload" @click="openFile()">
            <FolderOpenIcon class="size-4"
                :class="{ 'animate-bounce': (store.couldntFetchFirmwareApi && canSelectFirmware) }" />
        </button>
        <div id="tooltip-file" role="tooltip"
            class="tooltip z-10 invisible px-3 py-2 rounded-lg shadow-sm bg-gray-700 transition-opacity duration-300">
            {{ $t('firmware.upload_tooltip') }}
            <div class="tooltip-arrow" data-popper-arrow></div>
        </div>
        <input id="file_upload" type="file" accept=".zip,.bin" class="hidden" @change="setFirmwareFile" />
    </div>
</template>

<script lang="ts" setup>
import type { FirmwareResource } from '~/types/api';

import { FolderOpenIcon } from '@heroicons/vue/24/solid';
import { ChevronDownIcon } from '@heroicons/vue/24/solid';

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