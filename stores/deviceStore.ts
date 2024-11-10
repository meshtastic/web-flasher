import { mande } from 'mande';
import { defineStore } from 'pinia';
import { OfflineHardwareList } from '~/types/resources';

import {
  Client,
  type SerialConnection,
} from '@meshtastic/js';

// biome-ignore lint/style/useImportType: WUT?
import { type DeviceHardware } from '../types/api';
import { createUrl } from './store';

const firmwareApi = mande(createUrl("api/resource/deviceHardware"));

export const useDeviceStore = defineStore("device", {
  state: () => {
    return {
      targets: new Array<DeviceHardware>(),
      selectedTarget: <DeviceHardware>{},
      client: <Client>{},
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
      const sd73Devices = ["WIO_WM1110", "TRACKER_T1000_E"];
      return sd73Devices.includes(this.selectedTarget?.hwModelSlug);
    },
    enterDfuVersion(): string {
      if (this.isSelectedNrf) {
        return "2.2.17";
      }
      return "2.2.18";
    },
    dfuStepAction(): string {
      if (this.isSelectedNrf) {
        return "double-clicking RST button.";
      }
      return "pressing and holding BOOTSEL button while plugging in USB cable.";
    },
  },
  actions: {
    async fetchList() {
      try {
        const targets = await firmwareApi.get<DeviceHardware[]>();
        this.targets = targets.filter(
          (t: DeviceHardware) => t.activelySupported,
        );
      } catch (ex) {
        console.error(ex);
        // Fallback to offline list
        this.targets = OfflineHardwareList.filter(
          (t: DeviceHardware) => t.activelySupported,
        );
      }
    },
    setSelectedTarget(target: DeviceHardware) {
      this.selectedTarget = target;
      document.getElementById('device-modal')?.click();
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
    async openDeviceConnection(): Promise<SerialConnection> {
      this.client = new Client();
      const port: SerialPort = await navigator.serial.requestPort();
      const connection = this.client.createSerialConnection();
      await connection.connect({
        port,
        baudRate: 115200,
        concurrentLogOutput: true,
      });
      return connection;
    },
    async enterDfuMode() {
      const connection = await this.openDeviceConnection();
      // biome-ignore lint/suspicious/noExplicitAny: FUGGEDABOUTIT
      connection.events.onFromRadio.subscribe((packet: any) => {
        if (packet?.payloadVariant?.case === "configCompleteId") {
          console.log("Attempting to enter DFU mode");
          connection.enterDfuMode();
        }
      });
    },
    async baud1200() {
      const port: SerialPort = await navigator.serial.requestPort();
      await port.open({ baudRate: 1200 });
    },
    async autoSelectHardware() {
      const connection = await this.openDeviceConnection();
      // biome-ignore lint/suspicious/noExplicitAny: FUGGEDABOUTIT
      connection.events.onDeviceMetadataPacket.subscribe((packet: any) => {
        const device = this.targets.find(
          (target: DeviceHardware) => target.hwModel === packet?.data?.hwModel,
        );
        console.log("Found device onDeviceMetadataPacket", device);
        if (device) {
          this.setSelectedTarget(device);
        }
      });
      await new Promise((_) => setTimeout(_, 5000));
      await connection.disconnect();
      return -1;
    },
  },
});
