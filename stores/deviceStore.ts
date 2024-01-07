import { mande } from 'mande';
import { defineStore } from 'pinia';

import { Client } from '@meshtastic/js';

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
    },
    actions: {
        async fetchList() {
            firmwareApi.get<DeviceHardware[]>()
                .then((response: DeviceHardware[]) => {
                    this.targets = response.filter((target: DeviceHardware) => target.activelySupported);
                })
        },
        setSelectedTarget(target: DeviceHardware) {
            this.selectedTarget = target;
        },
        async enterDfuMode() {
            this.client = new Client();
            const port: SerialPort = await navigator.serial.requestPort();
            const connection = this.client.createSerialConnection();
            await connection
                .connect({
                    port,
                    baudRate: undefined,
                    concurrentLogOutput: true,
                });
            connection.events.onFromRadio.subscribe((packet: any) => {
                if (packet?.payloadVariant?.case === "configCompleteId") {
                    console.log('Attempting to enter DFU mode');
                    connection.enterDfuMode();
                }
            });
        },
        async autoSelectHardware() {
            this.client = new Client();
            const port: SerialPort = await navigator.serial.requestPort();
            const connection = this.client.createSerialConnection();
            await connection
                .connect({
                    port,
                    baudRate: 115200,
                    concurrentLogOutput: true,
                });
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