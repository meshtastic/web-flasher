import { mande } from 'mande';
import { defineStore } from 'pinia';

import {
  BlobReader,
  ZipReader,
} from '@zip.js/zip.js';

import {
  FirmwareReleases,
  FirmwareResource,
  getCorsFriendyReleaseUrl,
} from '../types/api';
import { createUrl } from './store';

const firmwareApi = mande(createUrl('api/github/firmware/list'))

export const useFirmwareStore = defineStore('firmware', {
    state: () => {
        return {
            stable: <FirmwareResource>[],
            alpha: <FirmwareResource>[],
            pullRequests: <FirmwareResource>[],
            selectedFirmware: <FirmwareResource>{},
        }
    },

    actions: {
        async fetchList() {
            firmwareApi.get<FirmwareReleases>()
                .then((response: FirmwareReleases) => {
                    // Only grab the latest 4 releases
                    this.stable = response.releases.stable.slice(0, 4);
                    this.alpha = response.releases.alpha.slice(0, 4);
                    this.pullRequests = response.pullRequests.slice(0, 4);
                })
        },
        setSelectedFirmware(firmware: FirmwareResource) {
            this.selectedFirmware = firmware;
        },
        async downloadUf2File(fileName: string) {
            if (!this.selectedFirmware.zip_url) return;
            const options = {
                types: [
                    {
                        suggestedName: fileName,
                        description: "UF2 File",
                        accept: {
                            "application/uf2": ".uf2",
                        },
                    },
                ],
                excludeAcceptAllOption: true,
            };
               
            const baseUrl = getCorsFriendyReleaseUrl(this.selectedFirmware.zip_url);
            const response = await fetch(`${baseUrl}/${fileName}`);
            const handle = await window.showSaveFilePicker(options);
            const writable = await handle.createWritable();
            const content = await response.blob();
            await writable.write(content);
            await writable.close();
        },
        async uploadFirmware(file: File) {
            const reader = new BlobReader(file);
            const zipReader = new ZipReader(reader);
            const entries = zipReader.getEntries()
                .then((entries) => {
                    console.log(entries);
                });
            zipReader.close();
        }
    }
})