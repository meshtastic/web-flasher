import { mande } from 'mande';
import { defineStore } from 'pinia';

import { Client } from '@meshtastic/js';

import { DeviceHardware } from '../types/api';
import { createUrl } from './store';

const firmwareApi = mande(createUrl('api/resource/deviceHardware'))

export const useDeviceStore = defineStore('device', {
    state: () => {
        return {
            targets: <DeviceHardware>[],
            selectedTarget: <DeviceHardware>{},
            client: <Client>{},
        }
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
        async connect() {
            this.client = new Client();
            const port: SerialPort  = await navigator.serial.requestPort();
            const connection = this.client.createSerialConnection();
            await connection
                .connect({
                    port,
                    baudRate: undefined,
                    concurrentLogOutput: true,
                });
            await connection.enterDfuMode();
        }
    },
})