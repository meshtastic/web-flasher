<template>
  <div class="w-full mt-2" v-if="serialMonitorStore.isOpen">
    <div class="grid grid-cols-3">
      <!-- <span class="mb-2 text-xs font-medium me-2 px-2.5 py-0.5 rounded bg-gray-700 text-gray-300">
        {{ serialMonitorStore.isConnected ? 'Connected' : 'Disconnected'}}
      </span> -->
      <div class="col"> 
        <div class="flex items-center justify-start px-2">
          <button type="button" @click="logLevel = 'all'" class="border focus:ring-4 focus:outline-none rounded-full text-xs font-medium px-5 py-1.5 text-center me-2 mb-2 border-blue-500 text-blue-500 hover:text-white hover:bg-blue-500 bg-gray-900 focus:ring-blue-800">All Levels</button>
          <button type="button" @click="logLevel = 'INFO  |'" class="border :outline-none rounded-full text-xs font-medium px-5 py-1.5 text-center me-2 mb-2 focus:ring-gray-800 text-white hover:bg-blue-500">Info</button>
          <button type="button" @click="logLevel = 'DEBUG |'" class="border :outline-none rounded-full text-xs font-medium px-5 py-1.5 text-center me-2 mb-2 focus:ring-gray-800 border-blue-300 text-blue-300 hover:bg-blue-500 hover:text-white">Debug</button>
          <button type="button" @click="logLevel = 'WARN  |'" class="border :outline-none rounded-full text-xs font-medium px-5 py-1.5 text-center me-2 mb-2 focus:ring-gray-800 border-orange-300 text-orange-300 hover:bg-orange-300 hover:text-white">Warn</button>
          <button type="button" @click="logLevel = 'ERROR |'" class="border :outline-none rounded-full text-xs font-medium px-5 py-1.5 text-center me-2 mb-2 focus:ring-gray-800 border-red-500 text-red-500 hover:bg-red-500 hover:text-white">Error</button>
        </div>
      </div>
      <div class="col">
        <!-- Auto scroll -->
      </div>
      <div class="col">
        <div class="rounded-md shadow-sm flex justify-end px-2" role="group">
          <button type="button" title="Clear logs" @click="clearTerminal" class="px-4 py-1.5 text-sm font-medium text-white border border-gray-200 rounded-s-lg hover:bg-gray-100 hover:text-black focus:z-10 focus:ring-2 focus:ring-blue-700">
            <TrashIcon class="h-4 w-4 inline" />
          </button>
          <button type="button" title="Copy logs to clipboard" @click="copyToClipboard" class="px-4 py-1.5 text-sm font-medium text-white border-t border-b border-gray-200 hover:bg-gray-100 hover:text-black focus:z-10 focus:ring-2 focus:ring-blue-700">
            <ClipboardIcon class="h-4 w-4 inline" />
          </button>
          <button type="button" title="Save logs to file" @click="saveToFile" class="px-4 py-1.5 text-sm font-medium text-white border border-gray-200 rounded-e-lg hover:bg-gray-100 hover:text-black focus:z-10 focus:ring-2 focus:ring-blue-700">
            <ArrowDownTrayIcon class="h-4 w-4 inline" />
          </button>
        </div>
      </div>
    </div>
    <div class="inverse-toggle px-5 shadow-lg text-gray-100 text-sm font-mono subpixel-antialiased bg-gray-900 pb-6 pt-4 rounded-lg leading-normal overflow-hidden">
      <div class="top mb-2 flex">
        <div class="h-3 w-3 bg-red-500 rounded-full"></div>
        <div class="ml-2 h-3 w-3 bg-orange-300 rounded-full"></div>
        <div class="ml-2 h-3 w-3 bg-green-500 rounded-full"></div>
      </div>
      <div class="mt-4">
        <p v-for="line in filteredTerminalBuffer" :class="logLevelClass(line)">
          {{ line }}<br />
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

import {
  ArrowDownTrayIcon,
  ClipboardIcon,
  TrashIcon,
} from '@heroicons/vue/24/solid';

import { useSerialMonitorStore } from '../stores/serialMonitorStore';

const serialMonitorStore = useSerialMonitorStore();

const logLevel = ref('all');

const filteredTerminalBuffer = computed(() => {
  if (logLevel.value === 'all') {
    return serialMonitorStore.terminalBuffer;
  }
  return serialMonitorStore.terminalBuffer.filter((line) => line.includes(logLevel.value.toUpperCase()));
});

const clearTerminal = () => {
  serialMonitorStore.terminalBuffer = [];
}

const copyToClipboard = () => {
  navigator.clipboard.writeText(serialMonitorStore.terminalBuffer.join('\n'));
}

const saveToFile = () => {
  const blob = new Blob([serialMonitorStore.terminalBuffer.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meshtastic-log-${new Date().toISOString().replace(/:/g, '-')}.log`;
  a.click();
  URL.revokeObjectURL(url);
}

const logLevelClass = (line) => {
  if (line.includes('ERROR |')) {
    return 'text-red-500';
  } else if (line.includes('WARN  |')) {
    return 'text-orange-300';
  } else if (line.includes('DEBUG |')) {
    return 'text-blue-300';
  }
  return '';
}
</script>