<template>
  <Teleport to="body">
    <div
      id="fastboot-tool-modal"
      tabindex="-1"
      aria-hidden="true"
      class="hidden fixed inset-0 z-[50] modal-backdrop backdrop-blur-sm px-4 sm:px-6 md:px-8 py-8 md:py-12"
    >
      <div class="flex h-full w-full items-start justify-center">
        <div class="relative w-full max-w-2xl">
          <div class="modal-content relative flex flex-col max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl text-theme">
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
              <h3 class="text-lg font-semibold text-theme flex items-center gap-2">
                <Terminal class="h-5 w-5 text-meshtastic" />
                U-Boot / Fastboot
              </h3>
              <button
                type="button"
                class="btn-icon"
                data-modal-hide="fastboot-tool-modal"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto p-4">
              <FastbootTool embedded />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { Terminal, X } from 'lucide-vue-next'
</script>
