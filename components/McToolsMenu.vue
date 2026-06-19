<template>
  <div class="relative inline-block text-left">
    <button
      id="mpwrdToolsButton"
      data-dropdown-toggle="mpwrdToolsDropdown"
      type="button"
      class="btn-secondary"
    >
      mPWRD-OS Tools
      <ChevronDown class="w-2.5 h-2.5 ml-1 shrink-0" />
    </button>

    <!-- Dropdown menu -->
    <div
      id="mpwrdToolsDropdown"
      class="z-10 hidden rounded-lg shadow w-60 dropdown-menu"
    >
      <ul
        class="py-2 text-sm text-theme-muted"
        aria-labelledby="mpwrdToolsButton"
      >
        <li v-if="bleStore.isWebBluetoothSupported">
          <button
            type="button"
            class="w-full text-left flex items-center gap-2 px-4 py-2 hover:text-meshtastic hover:bg-surface-secondary transition-colors"
            data-modal-target="ble-provisioning-modal"
            data-modal-toggle="ble-provisioning-modal"
            @click="closeDropdown"
          >
            <Bluetooth class="h-4 w-4 shrink-0" />
            BLE WiFi Provisioning
          </button>
        </li>
        <li>
          <button
            type="button"
            class="w-full text-left flex items-center gap-2 px-4 py-2 hover:text-meshtastic hover:bg-surface-secondary transition-colors"
            data-modal-target="rockchip-erase-modal"
            data-modal-toggle="rockchip-erase-modal"
            @click="closeDropdown"
          >
            <HardDrive class="h-4 w-4 shrink-0" />
            Rockchip Flash Tool
          </button>
        </li>
      </ul>
    </div>

    <!-- Tool modals (teleported to body) -->
    <BleProvisioning />
    <RockchipEraseModal />
  </div>
</template>

<script lang="ts" setup>
import { Bluetooth, ChevronDown, HardDrive } from 'lucide-vue-next'
import { useBleProvisioningStore } from '~/stores/bleProvisioningStore'

const bleStore = useBleProvisioningStore()

// Flowbite leaves the menu open after an item click; hide it like LanguagePicker does.
const closeDropdown = () => {
  document.getElementById('mpwrdToolsDropdown')?.classList.add('hidden')
}
</script>
