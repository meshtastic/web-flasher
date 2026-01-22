<template>
  <div
    v-if="serialMonitorStore.isConnected || serialMonitorStore.terminalBuffer.length > 0"
    class="w-full mt-2 px-0 sm:px-0 h-[calc(100vh-140px)] flex flex-col gap-3"
  >
    <!-- Top toolbar -->
    <div class="relative overflow-hidden rounded-xl serial-toolbar">
      <div class="absolute inset-0 serial-toolbar-inner backdrop-blur-md" />
      <div class="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_20%_50%,rgba(103,234,148,0.1),transparent_50%)]" />
      <div class="relative flex items-center justify-between gap-6 px-4 py-3">
        <!-- Connection Status -->
        <div class="flex items-center gap-3 min-w-0">
          <div class="relative flex-shrink-0">
            <div class="w-3 h-3 rounded-full" :class="serialMonitorStore.isConnected ? 'bg-green-500' : 'bg-gray-500'" />
            <div v-if="serialMonitorStore.isConnected" class="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-xs font-semibold uppercase tracking-wide leading-none" :class="serialMonitorStore.isConnected ? 'text-meshtastic-dark' : 'text-theme-muted'">
              {{ serialMonitorStore.isConnected ? 'Connected' : 'Disconnected' }}
            </span>
            <span class="text-xs text-theme-muted font-medium leading-none">Serial Monitor</span>
          </div>
        </div>
        
        <!-- Center Spacer -->
        <div class="flex-1" />
        
        <!-- Action buttons and Disconnect -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <div class="flex items-center gap-1 serial-action-buttons backdrop-blur-sm rounded-lg p-1.5 transition-colors">
            <button
              type="button"
              title="Clear logs"
              class="group relative p-2 serial-action-btn rounded-md transition-all duration-200"
              @click="clearTerminal"
            >
              <Trash class="h-4 w-4 transition-transform group-hover:scale-110" />
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface-modal text-theme text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">Clear</div>
            </button>
            <button
              type="button"
              title="Copy logs to clipboard"
              class="group relative p-2 serial-action-btn rounded-md transition-all duration-200"
              @click="copyToClipboard"
            >
              <Clipboard class="h-4 w-4 transition-transform group-hover:scale-110" />
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface-modal text-theme text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">Copy</div>
            </button>
            <button
              type="button"
              title="Save logs to file"
              class="group relative p-2 serial-action-btn rounded-md transition-all duration-200"
              @click="saveToFile"
            >
              <Download class="h-4 w-4 transition-transform group-hover:scale-110" />
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface-modal text-theme text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">Save</div>
            </button>
          </div>
          
          <!-- Disconnect button -->
          <button
            v-if="serialMonitorStore.isConnected"
            class="group relative flex items-center gap-2 px-4 py-2 text-sm font-medium serial-disconnect-btn rounded-lg transition-all duration-200 overflow-hidden"
            @click="disconnect()"
          >
            <X class="h-4 w-4 relative transition-transform group-hover:rotate-90 duration-200" />
            <span class="relative">{{ $t('serial.disconnect') }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 min-h-0 shadow-lg rounded-xl serial-terminal-container overflow-hidden flex items-center justify-center relative">
      <div ref="terminalContainer" class="h-full w-full" />
      <div v-if="serialMonitorStore.isConnected && serialMonitorStore.rawBuffer.length === 0" class="absolute inset-0 flex flex-col items-center justify-center serial-loading-overlay backdrop-blur-sm pointer-events-none">
        <div class="loader mb-4" />
        <p class="text-theme-muted text-sm">{{ $t('serial.waiting_for_data') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

import {
  Download,
  Clipboard,
  Trash,
  X,
} from 'lucide-vue-next'

import { useSerialMonitorStore } from '../stores/serialMonitorStore'

const serialMonitorStore = useSerialMonitorStore()
const terminalContainer = ref(null)
const terminal = ref(null)
const fitAddon = ref(null)
const lastRawLength = ref(0)

const initTerminal = () => {
  if (terminalContainer.value && !terminal.value) {
    terminal.value = new Terminal({
      theme: {
        background: '#111827',
        foreground: '#f3f4f6',
      },
      fontFamily: 'monospace',
      fontSize: 14,
    })
    fitAddon.value = new FitAddon()
    terminal.value.loadAddon(fitAddon.value)
    terminal.value.open(terminalContainer.value)
    
    nextTick(() => {
      fitAddon.value?.fit()
    })
    
    // Write existing raw buffer content
    lastRawLength.value = 0
    if (serialMonitorStore.rawBuffer) {
      terminal.value.write(serialMonitorStore.rawBuffer)
      lastRawLength.value = serialMonitorStore.rawBuffer.length
    }
  }
}

const handleResize = () => {
  fitAddon.value?.fit()
}

onMounted(() => {
  initTerminal()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  terminal.value?.dispose()
  terminal.value = null
  fitAddon.value = null
})

// Watch raw buffer for new data and write directly to xterm
watch(
  () => serialMonitorStore.rawBuffer,
  (newRawBuffer) => {
    if (!terminal.value) {
      initTerminal()
      return
    }
    
    const newLength = newRawBuffer.length
    
    // If buffer was reset, clear terminal and re-render
    if (newLength < lastRawLength.value) {
      terminal.value.clear()
      lastRawLength.value = 0
      if (newRawBuffer) {
        terminal.value.write(newRawBuffer)
        lastRawLength.value = newLength
      }
      return
    }
    
    // Write only new data
    if (newLength > lastRawLength.value) {
      const newData = newRawBuffer.slice(lastRawLength.value)
      terminal.value.write(newData)
      lastRawLength.value = newLength
    }
  }
)

const disconnect = () => {
  if (serialMonitorStore.isConnected) {
    serialMonitorStore.disconnect()
  }
}

const clearTerminal = () => {
  serialMonitorStore.terminalBuffer = []
  serialMonitorStore.rawBuffer = ''
  lastRawLength.value = 0
  if (terminal.value) {
    terminal.value.clear()
  }
}

const copyToClipboard = () => {
  navigator.clipboard.writeText(serialMonitorStore.terminalBuffer.join('\n'))
}

const saveToFile = () => {
  const blob = new Blob([serialMonitorStore.terminalBuffer.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `meshtastic-log-${new Date().toISOString().replace(/:/g, '-')}.log`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.loader {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(103, 234, 148, 0.2);
  border-top-color: #67EA94;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
