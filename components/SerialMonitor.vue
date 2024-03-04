<template>
  <div class="w-full mt-2" v-if="serialMonitorStore.isOpen">
    <div class="">
      <!-- <span class="mb-3 text-xs font-medium me-2 px-2.5 py-0.5 rounded bg-gray-700 text-gray-300">
        {{ serialMonitorStore.isConnected ? 'Connected' : 'Disconnected'}}
      </span> -->
      <div class="rounded-md shadow-sm flex justify-center" role="group">
        <button type="button" title="Clear logs" @click="clearTerminal" class="px-4 py-2 text-sm font-medium text-white border border-gray-200 rounded-s-lg hover:bg-gray-100 hover:text-black focus:z-10 focus:ring-2 focus:ring-blue-700">
          <TrashIcon class="h-4 w-4 inline" />
        </button>
        <button type="button" title="Copy logs to clipboard" @click="copyToClipboard" class="px-4 py-2 text-sm font-medium text-white border-t border-b border-gray-200 hover:bg-gray-100 hover:text-black focus:z-10 focus:ring-2 focus:ring-blue-700">
          <ClipboardIcon class="h-4 w-4 inline" />
        </button>
        <button type="button" title="Save logs to file" @click="saveToFile" class="px-4 py-2 text-sm font-medium text-white border border-gray-200 rounded-e-lg hover:bg-gray-100 hover:text-black focus:z-10 focus:ring-2 focus:ring-blue-700">
          <ArrowDownTrayIcon class="h-4 w-4 inline" />
        </button>
      </div>
    </div>
    <div class="inverse-toggle px-5 shadow-lg text-gray-100 text-sm font-mono subpixel-antialiased bg-gray-800 pb-6 pt-4 rounded-lg leading-normal overflow-hidden">
      <div class="top mb-2 flex">
        <div class="h-3 w-3 bg-red-500 rounded-full"></div>
        <div class="ml-2 h-3 w-3 bg-orange-300 rounded-full"></div>
        <div class="ml-2 h-3 w-3 bg-green-500 rounded-full"></div>
      </div>
      <div class="mt-4">
        <p v-for="line in serialMonitorStore.terminalBuffer" :class="logLevelClass(line)" class="typing">
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