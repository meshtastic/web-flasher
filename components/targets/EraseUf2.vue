<template>
    <div class="relative w-full max-w-4xl max-h-full">
        <div class="relative rounded-lg shadow bg-zinc-700">
            <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-600">
                <h3 class="text-lg font-semibold text-white">
                    {{ $t('flash.erase_flash') }} {{ deviceStore.$state.selectedTarget?.displayName }}
                </h3>
                <button type="button"
                    class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm h-8 w-8 ms-auto inline-flex justify-center items-center hover:bg-gray-600 hover:text-white"
                    data-modal-toggle="flash-modal"
                    @click="closeModal">
                    <X class="w-3 h-3" />
                    <span class="sr-only">{{ $t('actions.close_dialog') }}</span>
                </button>
            </div>
            <div class="p-4 md:p-5">
                <ol class="relative border-s border-gray-200 border-gray-600 ms-3.5 mb-4 md:mb-5">
                    <li class="mb-10 ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 rounded-full -start-3 ring-8 bg-cyan-900 text-gray-100 ring-gray-900">
                            1
                        </span>
                        <h3 class="flex items-start mb-1 text-lg font-semibold text-white">
                            {{ $t('flash.uf2.enter_dfu_mode') }}
                        </h3>
                        <div class="p-4 mb-4 my-2 text-sm rounded-lg bg-blue-50 bg-gray-800 text-blue-200" role="alert">
                            <span class="font-medium">
                                <Info class="h-4 w-4 inline" />
                                {{ $t('flash.uf2.dfu_firmware_clause') }} &lt; {{ deviceStore.enterDfuVersion }}, {{ $t('flash.uf2.dfu_firmware_clause_2')}} {{ deviceStore.dfuStepAction }}
                                <br />
                                {{ $t('flash.erase_uf2.dfu_warning') }}
                            </span>
                        </div>
                        <button type="button"
                            class="inline-flex w-[250px] justify-center items-center py-2 px-3 text-sm font-medium focus:outline-none bg-meshtastic rounded-lg hover:bg-white focus:z-10 focus:ring-4 focus:ring-gray-200 text-black"
                            @click="deviceStore.enterDfuMode()">
                            <FolderDown class="h-4 w-4 text-black" />
                            {{ $t('flash.uf2.enter_dfu') }}
                        </button>
                    </li>
                    <li class="mb-10 ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 rounded-full -start-3 ring-8 bg-cyan-900 text-gray-100 ring-gray-900">
                            2
                        </span>
                        <h3 class="flex items-start mb-1 text-lg font-semibold text-white">
                            {{ $t('flash.uf2.ensure_drive_mounted') }}
                        </h3>
                        <span>
                            {{ $t('flash.uf2.drive_name_info') }}
                        </span>
                        <div>
                            <img v-if="deviceStore.isSelectedNrf" src="@/assets/img/dfu.png" :alt="$t('flash.uf2.dfu_drive')" />
                            <img v-else src="@/assets/img/uf2_rp2040.png" :alt="$t('flash.uf2.dfu_drive')" />
                        </div>
                    </li>
                    <li class="ms-8">
                        <span class="absolute flex items-center justify-center w-6 h-6 rounded-full -start-3 ring-8 bg-cyan-900 text-gray-100 ring-gray-900">
                            3
                        </span>
                        <h3 class="mb-1 text-lg font-semibold text-white">
                            {{ $t('flash.uf2.download_copy_uf2') }}
                        </h3>
                        <div class="py-2">
                            <span>
                                {{ $t('flash.uf2.copy_instructions') }}
                                {{ !deviceStore.isSelectedNrf ? $t('flash.erase_uf2.warning') : '' }}
                            </span>
                        </div>
                        <a :href="uf2File" download="" 
                            class="inline-flex w-[250px] justify-center items-center py-2 px-3 text-sm font-medium focus:outline-none bg-meshtastic rounded-lg hover:bg-white focus:z-10 focus:ring-4 focus:ring-gray-200 text-black">
                            {{ $t('flash.uf2.download_uf2') }}
                        </a>
                    </li>
                    <li class="ms-8 mt-4" v-if="deviceStore.isSelectedNrf">
                        <span class="absolute flex items-center justify-center w-6 h-6 rounded-full -start-3 ring-8 bg-cyan-900 text-gray-100 ring-gray-900">
                            4
                        </span>
                        <h3 class="mb-1 text-lg font-semibold text-white">
                            {{ $t('buttons.serial_monitor') }}
                        </h3>
                        <div class="py-2">
                            {{ $t('flash.erase_uf2.wait_for_drive') }}
                        </div>
                        <div>
                        <button v-if="deviceStore.isSelectedNrf"
                            class="text-black inline-flex w-[250px] justify-center bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center" 
                            @click="openSerial">
                            {{ $t('buttons.serial_monitor') }}
                        </button>
                        
                        </div>
                    </li>
                    <li class="ms-8 mt-4" v-if="deviceStore.isSelectedNrf">
                        <span class="absolute flex items-center justify-center w-6 h-6 rounded-full -start-3 ring-8 bg-cyan-900 text-gray-100 ring-gray-900">
                            5
                        </span>
                        <h3 class="mb-1 text-lg font-semibold text-white">
                            {{ $t('firmware.title') }}
                        </h3>
                        <div class="py-2">
                            {{ $t('flash.erase_uf2.close_instructions') }}
                        </div>
                        <div>
                            <button type="button"
                            class="inline-flex w-[250px] justify-center items-center py-2 px-3 text-sm font-medium focus:outline-none bg-meshtastic rounded-lg hover:bg-white focus:z-10 focus:ring-4 focus:ring-gray-200 text-black"
                            @click="closeModal">
                            {{ $t('actions.continue') }}
                        </button>
                        </div>
                    </li>
                </ol>
                <div id="terminal"></div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {
  FolderDown,
  Info,
  X,
} from 'lucide-vue-next';

import { useDeviceStore } from '../../stores/deviceStore';
import { useFirmwareStore } from '../../stores/firmwareStore';

const deviceStore = useDeviceStore();
const firmwareStore = useFirmwareStore();

const uf2File = computed(() => {
    if (!deviceStore.isSelectedNrf) {
        return '/uf2/pico_erase.uf2';
    }

    return deviceStore.isSoftDevice7point3 ? '/uf2/nrf_erase_sd7_3.uf2' : '/uf2/nrf_erase2.uf2';
});

const closeModal = () => {
    document.getElementById('erase-modal')?.click(); // Flowbite bug
}

const openSerial = async () => {
    const terminal = await openTerminal();
    const port = await navigator.serial.requestPort({});
    await port.open({ baudRate: 115200 });
    // read from the serial port
    const reader = port.readable!.getReader();
    const writer = port.writable!.getWriter();
    while (true) {
        const { value, done } = await reader.read();
        if (value) {
            terminal.write(value);
            writer.write(new Uint8Array([0x01, 0x01]));
        }
        if (done) {
            console.log('[readLoop] DONE', done);
            reader.releaseLock();
            break;
        }
    }
};
</script>