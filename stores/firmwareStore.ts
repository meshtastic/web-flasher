import {
  ESPLoader,
  type FlashOptions,
  type LoaderOptions,
  Transport,
} from 'esptool-js';
import { mande } from 'mande';
import { defineStore } from 'pinia';
import { Terminal } from 'xterm';

import {
  BlobReader,
  ZipReader,
} from '@zip.js/zip.js';

import {
  type FirmwareReleases,
  type FirmwareResource,
  getCorsFriendyReleaseUrl,
} from '../types/api';
import { createUrl } from './store';

const firmwareApi = mande(createUrl('api/github/firmware/list'))

export const useFirmwareStore = defineStore('firmware', {
    state: () => {
        return {
            stable: new Array<FirmwareResource>(),
            alpha: new Array<FirmwareResource>(),
            pullRequests: new Array<FirmwareResource>(),
            selectedFirmware: <FirmwareResource>{},
            baudRate: 921600,
            shouldCleanInstall: false,
            flashPercentDone: 0,
            isFlashing: false,
            flashingIndex: 0,
            terminal: <Terminal>{},
        }
    },
    getters: {
        percentDone: (state) =>`${state.flashPercentDone}%`,
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
        // TODO: Stub for uploading custom firmware
        async uploadFirmware(file: File) {
            const reader = new BlobReader(file);
            const zipReader = new ZipReader(reader);
            const entries = zipReader.getEntries()
                .then((entries) => {
                    console.log(entries);
                });
            zipReader.close();
        },
        async updateEspFlash(fileName: string) {
            const espLoader = await this.connectEsp32();
            const content = await this.fetchBinaryContent(fileName);
            this.isFlashing = true;
            const flashOptions = <FlashOptions> {
                fileArray: [{ data: content, address: 0x10000 }],
                flashSize: "keep",
                eraseAll: false,
                compress: true,
                enableTracing: false,
                reportProgress: (fileIndex, written, total) => {
                    this.flashPercentDone = Math.round((written / total) * 100);
                    if (written == total) {
                        this.isFlashing = false;
                        console.log('Done flashing!');
                    }
                },
                //calculateMD5Hash: (image) => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)),
            };
            await espLoader.writeFlash(flashOptions);
            espLoader.softReset();
        },
        async cleanInstallEspFlash(fileName: string, otaFileName: string, littleFsFileName: string) {
            const espLoader = await this.connectEsp32();
            const appContent = await this.fetchBinaryContent(fileName);
            const otaContent = await this.fetchBinaryContent(otaFileName);
            const littleFsContent = await this.fetchBinaryContent(littleFsFileName);
            this.isFlashing = true;
            // await espLoader.eraseFlash();
            const flashOptions = <FlashOptions> {
                fileArray: [{ data: appContent, address: 0x00 },
                            { data: otaContent, address: 0x260000 },
                            { data: littleFsContent, address: 0x300000 }],
                flashSize: "keep",
                eraseAll: true,
                compress: true,
                enableTracing: false,
                reportProgress: (fileIndex, written, total) => {
                    this.flashingIndex = fileIndex;
                    this.flashPercentDone = Math.round((written / total) * 100);
                    if (written == total && fileIndex > 1) {
                        this.isFlashing = false;
                        console.log('Done flashing!');
                    }
                },
                //calculateMD5Hash: (image) => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)),
            };
            await espLoader.writeFlash(flashOptions);
            espLoader.softReset();
        },
        async fetchBinaryContent(fileName: string): Promise<string> {
            const baseUrl = getCorsFriendyReleaseUrl(this.selectedFirmware.zip_url!);
            const response = await fetch(`${baseUrl}/${fileName}`);
            const blob = await response.blob();
            const data = await blob.arrayBuffer();
            return convertToBinaryString(new Uint8Array(data));
        },
        async connectEsp32(): Promise<ESPLoader> {
            const port = await navigator.serial.requestPort({});
            const transport = new Transport(port, true);
            // Dynamically import xterm.js to avoid nuxt build errors for SSR
            const { Terminal } = await import('xterm');
            const term = new Terminal({ cols: 40, rows: 40, theme: { background: "#1a202c" }});
            term.open(document.getElementById('terminal')!);
            const loaderOptions = <LoaderOptions> {
                transport, 
                baudrate: this.baudRate,
                enableTracing: false,
                terminal: {
                    clean() {
                      term.clear();
                    },
                    writeLine(data) {
                      term.writeln(data);
                    },
                    write(data) {
                      term.write(data);
                    }
                }
            };
            const espLoader = new ESPLoader(loaderOptions);
            const chip = await espLoader.main();
            console.log(chip);
            return espLoader;
        },
    }
})