import { mande } from 'mande';
import { defineStore } from 'pinia';
import {
  vendorCobrandingTag,
} from '~/types/resources';

import { MeshDevice } from '@meshtastic/core';
import { TransportWebSerial } from '@meshtastic/transport-web-serial';

// biome-ignore lint/style/useImportType: WUT?
import { type DeviceHardware } from '../types/api';
import { createUrl } from './store';
import { useFirmwareStore } from './firmwareStore';
import { useI18n } from 'vue-i18n';

const firmwareApi = mande(createUrl("api/resource/deviceHardware"));

export const useDeviceStore = defineStore("device", {
  state: () => {
    return {
      targets: new Array<DeviceHardware>(),
      selectedTarget: <DeviceHardware>{},
      meshDevice: null as MeshDevice | null,
      tag: undefined as string | undefined,
    };
  },
  getters: {
    filteredDevices(): DeviceHardware[] {
      if (this.tag) {
        return this.targets.filter(t => t.tags?.includes(this.tag ?? '') || t.architecture === this.tag);
      }
      return this.targets
    },
    sortedDevices(): DeviceHardware[] {
      return this.filteredDevices
        .filter(t => t.supportLevel === 1).sort((a, b) => {
            const hwModelComparison = a.hwModel - b.hwModel;
            if (hwModelComparison !== 0) return hwModelComparison;
            return (a.images?.length ?? 0) - (b.images?.length ?? 0);
          })
        .concat(this.filteredDevices.filter(t => t.supportLevel === 2)
          .sort((a, b) => {
            const hwModelComparison = a.hwModel - b.hwModel;
            if (hwModelComparison !== 0) return hwModelComparison;
            return (a.images?.length ?? 0) - (b.images?.length ?? 0);
          }))
        .concat(this.filteredDevices.filter(t => (t.supportLevel ?? 3) === 3)
          .sort((a, b) => a.hwModel - b.hwModel));
    },
    allTags(): string[] {
      return this.targets.flatMap(t => t.tags ?? []).filter((v, i, a) => a.indexOf(v) === i);
    },
    allArchs(): string[] {
      return this.targets.map(t => t.architecture).filter((v, i, a) => a.indexOf(v) === i);
    },
    selectedArchitecture: (state) => state.selectedTarget?.architecture || "",
    isSelectedNrf(): boolean {
      return this.selectedArchitecture.startsWith("nrf52");
    },
    isSoftDevice7point3(): boolean {
      const sd73Devices = ["WIO_WM1110", "TRACKER_T1000_E", "XIAO_NRF52_KIT", "SEEED_SOLAR_NODE", "SEEED_WIO_TRACKER_L1"];
      return sd73Devices.includes(this.selectedTarget?.hwModelSlug);
    },
    enterDfuVersion(): string {
      if (this.isSelectedNrf) {
        return "2.2.17";
      }
      return "2.2.18";
    },
    dfuStepAction(): string {
      const { t } = useI18n();

      if (this.isSelectedNrf) {
        return t('flash.dfu_action_doubleclick');
      }
      return t('flash.dfu_action_bootsel');
    },
  },
  actions: {
    async fetchList() {
      try {
        // First try to fetch from the API
        const targets = await firmwareApi.get<DeviceHardware[]>();
        this.setTargetsList(targets);
      } catch (ex) {
        console.error(ex);
        // Fallback to offline list from the JSON file
        try {
          const response = await fetch('/data/hardware-list.json');
          if (response.ok) {
            const offlineHardwareList = await response.json();
            this.setTargetsList(offlineHardwareList);
          } else {
            console.error('Failed to load hardware list from JSON file');
          }
        } catch (error) {
          console.error('Error loading hardware list from JSON file:', error);
        }
      }
    },
    setTargetsList(targets: DeviceHardware[]) {
      if (vendorCobrandingTag.length > 0) {
        this.targets = targets.filter(
          (t: DeviceHardware) => t.activelySupported && t.tags?.includes(vendorCobrandingTag)
        );
      }
      else {
        this.targets = targets.filter(
          (t: DeviceHardware) => t.activelySupported
        );
      }
    },
    async setSelectedTarget(target: DeviceHardware) {
      this.selectedTarget = target;
      document.getElementById('device-modal')?.click();
      const firmwareStore = useFirmwareStore();

      await new Promise((_) => setTimeout(_, 250));
      if (!firmwareStore.hasFirmwareFile && !firmwareStore.hasOnlineFirmware && firmwareStore.stable.length > 0) {
        firmwareStore.setSelectedFirmware(firmwareStore.stable[0]);
      }

      // Auto-select MUI for devices that support it
      if (target.hasMui === true) {
        firmwareStore.$state.shouldInstallMui = true;
      }
    },
    setSelectedTag(tag: string) {
      if (tag === "all") {
        this.tag = undefined;
        return;
      }
      if (tag === this.tag) {
        this.tag = undefined;
      } else {
        this.tag = tag;
      }
    },
    async openDeviceConnection(shouldConfigure: boolean = true): Promise<MeshDevice> {
      // Request serial port from user
      const port: SerialPort = await navigator.serial.requestPort();

      // Create transport and device using the new API
      const transport = await TransportWebSerial.createFromPort(port, 115200);
      const id = Math.floor(Math.random() * 1e9);
      const device = new MeshDevice(transport, id);

      // Configure the device connection
      if (shouldConfigure) {
        await device.configure();
      }
      // Store the device reference
      this.meshDevice = device;

      return device;
    },
    async enterDfuMode() {
      const device = await this.openDeviceConnection(false);

      device.events.onMyNodeInfo.subscribe(async(packet: any) => {
        console.log("Received MyNodeInfo packet:", packet);
        await device.enterDfuMode();
      });
      await device.configure();

      // Wait for device metadata, then clean up
      await new Promise((resolve) => setTimeout(resolve, 5000));
      // Try one last time to enter DFU mode
      await device.enterDfuMode();
    },
    async baud1200() {
      const port: SerialPort = await navigator.serial.requestPort();
      await port.open({ baudRate: 1200 });
    },
    async autoSelectHardware() {
      const device = await this.openDeviceConnection(false);

      // Subscribe to device metadata packets
      const subscription = device.events.onDeviceMetadataPacket.subscribe(async (packet: any) => {
        console.log("Received device metadata packet:", packet);
        // Try to find the device by pio env name first, then hw model if that fails
        let targetDevice: DeviceHardware | undefined = undefined;
        if (packet?.data?.platformioTarget?.length > 0) {
          targetDevice = this.targets.find(
            (target: DeviceHardware) => target.platformioTarget === packet?.data?.platformioTarget,
          );
        }
        if (!targetDevice) {
          targetDevice = this.targets.find(
            (target: DeviceHardware) => target.hwModel === packet?.data?.hwModel,
          );
        }
        if (targetDevice) {
          console.log("Found device onDeviceMetadataPacket", targetDevice);
          this.setSelectedTarget(targetDevice);
          await device.transport.fromDevice.cancel();
          await device.transport.toDevice.close();
        }
      });
      await device.configure();

      // Wait for device metadata, then clean up
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Clean up subscription
      if (subscription) {
        device.events.onDeviceMetadataPacket.unsub(subscription);
      }
      await device.transport.fromDevice.cancel();
      await device.transport.toDevice.close();
      // Clean up device connection
      this.meshDevice = null;

      return -1;
    },
  },
});
