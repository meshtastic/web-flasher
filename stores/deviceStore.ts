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
import { useToastStore } from './toastStore';

// Ensure Web Serial API types are available
declare global {
  interface Navigator {
    serial: any;
  }
  interface SerialPort {
    readable: ReadableStream;
    writable: WritableStream;
    open(options: any): Promise<void>;
    close(): Promise<void>;
    forget(): Promise<void>;
  }
}

const firmwareApi = mande(createUrl("api/resource/deviceHardware"));

export const useDeviceStore = defineStore("device", {
  state: () => {
    return {
      selectedDevice: <DeviceHardware | undefined>undefined,
      selectedTarget: <DeviceHardware | undefined>undefined,
      tag: <string | undefined>undefined,
      targets: <DeviceHardware[]>[],
      isConnecting: false,
      // Store AbortController and promises for proper cleanup
      abortController: <AbortController | undefined>undefined,
      readerClosed: <Promise<any> | undefined>undefined,
      writerClosed: <Promise<any> | undefined>undefined,
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
      return sd73Devices.includes(this.selectedTarget?.hwModelSlug || '');
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
      
      // Update Datadog RUM context with hardware model and platformio target
      if (import.meta.client) {
        try {
          const { datadogRum } = await import('@datadog/browser-rum');
          datadogRum.setGlobalContextProperty('hwModel', target.hwModel);
          datadogRum.setGlobalContextProperty('platformioTarget', target.platformioTarget);
        } catch (error) {
          // Datadog RUM not available, silently continue
        }
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
    async cleanupAllPorts() {
      try {
        // Get all previously granted serial ports
        const ports = await navigator.serial.getPorts();
        
        for (const port of ports) {
          try {
            console.log('Cleaning up port:', port);
            
            // Use the proven serial monitor cleanup pattern
            if (port.readable || port.writable) {
              // First try to close normally
              try {
                await port.close();
                console.log('Port closed successfully');
              } catch (error) {
                console.warn('Port close failed, continuing with forget...', error);
              }
            }
            
            // Always try port.forget() - this is the magic method!
            try {
              await port.forget();
              console.log('Port forgotten successfully');
            } catch (error) {
              console.warn('Port forget failed:', error);
            }
            
          } catch (error) {
            console.warn('Error cleaning up port:', error);
          }
        }
        
        // Give ports time to fully close and be forgotten
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log('All ports cleanup completed with forget()');
      } catch (error) {
        console.warn('Error during port cleanup:', error);
      }
    },
    async openDeviceConnection(shouldConfigure: boolean = true): Promise<{ device: MeshDevice; port: SerialPort }> {
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

      return { device, port };
    },
    async cleanupDevice(device: MeshDevice, port?: SerialPort) {
      console.log('Starting device cleanup...');
      
        if (port && device?.transport?.fromDevice) {
          try {
            await device.transport.fromDevice.cancel(); // Cancel any ongoing reads
          } catch (error) {
            console.warn('Error cancelling fromDevice reader:', error);
          }
          try {
            await device.transport.toDevice.close(); // Close the toDevice stream
          } catch (error) {
            console.warn('Error closing toDevice writer:', error);
          }
          try {
            const reader = device.transport.fromDevice.getReader();
            
            const textEncoder = new TextEncoderStream();
            const writer = textEncoder.writable.getWriter();
            const writableStreamClosed = textEncoder.readable.pipeTo(port.writable!);
            
            await reader.cancel();
            
            await writer.close();
            await writableStreamClosed;
            
            // this is the secret sauce!
            await port.forget();
            
          } catch (error: any) {
            console.log('Disconnect failed:', error?.message || error);
            if (port) {
              await port.forget();
            }
          }
        } 
        
      // Clear any store state
      this.abortController = undefined;
      this.readerClosed = undefined;
      this.writerClosed = undefined;
    },
    async enterDfuMode(tFunc?: (key: string) => string) {
      const toastStore = useToastStore();
      let device: MeshDevice | null = null;
      let port: SerialPort | null = null;
      let dfuModeEntered = false;
      
      this.isConnecting = true;
      try {
        // Configure the device so transport streams are properly set up
        const connection = await this.openDeviceConnection(false);
        device = connection.device;
        port = connection.port;


        const myNodeInfoSub = device.events.onMyNodeInfo.subscribe((info) => {
          console.log("Received MyNodeInfo event:", info);
          // Handle the event as needed
          device?.enterDfuMode();
        });
        try {
          await device.configure();
        } catch (error) {
          console.error('Error configuring device:', error);
          const errorTitle = tFunc?.('dfu.error_title') || 'DFU Mode Failed';
          const errorMessage = tFunc?.('dfu.error_message') || 'Failed to enter DFU mode. Please disconnect and reconnect the device, then try again.';
          toastStore.error(errorTitle, errorMessage);
          throw error;
        }
        await device.enterDfuMode();
        dfuModeEntered = true;

        // Show success message
        const successTitle = tFunc?.('dfu.success_title') || 'DFU Mode';
        const successMessage = tFunc?.('dfu.success_message') || 'Device successfully entered DFU mode';
        toastStore.success(successTitle, successMessage);

      } catch (error: any) {
        console.error('Error entering DFU mode:', error);
        
        // Simple, single error message
        const errorTitle = tFunc?.('dfu.error_title') || 'DFU Mode Failed';
        const errorMessage = tFunc?.('dfu.error_message') || 'Failed to enter DFU mode. Please disconnect and reconnect the device, then try again.';

        toastStore.error(errorTitle, errorMessage);
        throw error;
      } finally {
        // Always attempt to clean up the device connection
        if (device) {
          await this.cleanupDevice(device, port || undefined);
        }
        this.isConnecting = false;
      }
    },
    async baud1200() {
      const port: SerialPort = await navigator.serial.requestPort();
      await port.open({ baudRate: 1200 });
      // Give the device a moment to recognize the 1200 baud connection
      await new Promise((resolve) => setTimeout(resolve, 500));
      await port.close();
    },
    async autoSelectHardware(tFunc?: (key: string) => string) {
      this.isConnecting = true;
      try {
        const connection = await this.openDeviceConnection(false);
        const device = connection.device;
        const port = connection.port;

        const metadataSub = device.events.onDeviceMetadataPacket.subscribe(async (packet: any) => {
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
            if (targetDevice.architecture.startsWith('nrf')) {
              await device?.enterDfuMode();
              const toastStore = useToastStore();
              toastStore.success(
                tFunc?.('dfu.success_title') || 'DFU Mode',
                tFunc?.('dfu.success_message') || 'Device successfully entered DFU mode'
              );  
            }
            await this.cleanupDevice(device, port);
          }
        });
        await device.configure();

        // Wait for device metadata, then clean up
        await new Promise((resolve) => setTimeout(resolve, 5000));

        await this.cleanupDevice(device, port);

        return -1;
      } catch (error) {
        console.error('Error in autoSelectHardware:', error);
        throw error;
      } finally {
        this.isConnecting = false;
      }
    },
  },
});
