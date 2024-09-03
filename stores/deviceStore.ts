import { mande } from 'mande';
import { defineStore } from 'pinia';
import { OfflineHardwareList } from '~/types/resources';

import {
  Client,
  SerialConnection,
} from '@meshtastic/js';

import { type DeviceHardware } from '../types/api';
import { createUrl } from './store';

const firmwareApi = mande(createUrl('api/resource/deviceHardware'))

export const useDeviceStore = defineStore('device', {
    state: () => {
        return {
            targets: new Array<DeviceHardware>(),
            selectedTarget: <DeviceHardware>{},
            client: <Client>{},
        }
    },
    getters: {
        selectedArchitecture: (state) => state.selectedTarget?.architecture || '',
        isSelectedNrf(): boolean {
            return this.selectedArchitecture.startsWith('nrf52');
        },
        isSoftDevice7point3(): boolean {
            const sd73Devices = ['WIO_WM1110', 'TRACKER_T1000_E']
            return sd73Devices.includes(this.selectedTarget?.hwModelSlug)
        },
        enterDfuVersion(): string {
            if (this.isSelectedNrf) {
                return '2.2.17';
            } else {
                return '2.2.18';
            }
        },
        dfuStepAction(): string {
            if (this.isSelectedNrf) {
                return 'double-clicking RST button.';
            } else {
                return 'pressing and holding BOOTSEL button while plugging in USB cable.';
            }
        },
    },
    actions: {
        async fetchList() {
            try {
                const targets = await firmwareApi.get<DeviceHardware[]>()
                this.targets = targets.filter((t: DeviceHardware) => t.activelySupported);
            }
            catch (ex) {
                console.error(ex);
                // Fallback to offline list
                this.targets = OfflineHardwareList.filter((t: DeviceHardware) => t.activelySupported);
            }
        },
        setSelectedTarget(target: DeviceHardware) {
            this.selectedTarget = target;
        },
        async openDeviceConnection(): Promise<SerialConnection> {
            this.client = new Client();
            const port: SerialPort = await navigator.serial.requestPort();
            const connection = this.client.createSerialConnection();
            await connection
                .connect({
                    port,
                    baudRate: 115200,
                    concurrentLogOutput: true,
                });
            return connection;
        },
        async enterDfuMode() {
            const connection = await this.openDeviceConnection();
            connection.events.onFromRadio.subscribe((packet: any) => {
                if (packet?.payloadVariant?.case === "configCompleteId") {
                    console.log('Attempting to enter DFU mode');
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
            connection.events.onDeviceMetadataPacket.subscribe((packet: any) => {   
                const device = this.targets.find((target: DeviceHardware) => target.hwModel === packet?.data?.hwModel);
                if (device) {
                    this.setSelectedTarget(device);
                }
                return connection.disconnect();
            });
            await new Promise(_ => setTimeout(_, 4000));
            await connection.disconnect();
        }
    },
})