import { mande } from 'mande';
import { defineStore } from 'pinia';
import {
  vendorCobrandingTag,
} from '~/types/resources';

import {
  Client,
  type SerialConnection,
} from '@meshtastic/js';

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
      const sd73Devices = ["WIO_WM1110", "TRACKER_T1000_E", "XIAO_NRF52_KIT"];
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
      // connection.events.onFromRadio.subscribe((packet: any) => {
      //   console.log("Packet", packet);
      // });
      // biome-ignore lint/suspicious/noExplicitAny: FUGGEDABOUTIT
      connection.events.onDeviceMetadataPacket.subscribe((packet: any) => {
        // Try to find the device by pio env name first, then hw model if that fails
        let device = <undefined | DeviceHardware> undefined;
        if (packet?.data?.platformioTarget?.length > 0) {
          device = this.targets.find(
            (target: DeviceHardware) => target.platformioTarget === packet?.data?.platformioTarget,
          );
        }
        if (!device) {
          device = this.targets.find(
            (target: DeviceHardware) => target.hwModel === packet?.data?.hwModel,
          );
        }
        if (device) {
          console.log("Found device onDeviceMetadataPacket", device);
          this.setSelectedTarget(device);
        }
      });
      await new Promise((_) => setTimeout(_, 5000));
      await connection.disconnect();
      return -1;
    },
  },
});
