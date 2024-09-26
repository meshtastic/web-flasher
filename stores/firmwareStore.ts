import {
  ESPLoader,
  type FlashOptions,
  type LoaderOptions,
  Transport,
} from 'esptool-js';
import { saveAs } from 'file-saver';
import { mande } from 'mande';
import { defineStore } from 'pinia';
import { Terminal } from 'xterm';

import { Nrf52DfuFlasher } from '@/utils/nrfUtil';
import { track } from '@vercel/analytics';
import { useSessionStorage } from '@vueuse/core';
import {
  BlobReader,
  BlobWriter,
  ZipReader,
} from '@zip.js/zip.js';

import {
  type DeviceHardware,
  type FirmwareReleases,
  type FirmwareResource,
  getCorsFriendyReleaseUrl,
} from '../types/api';
import { createUrl } from './store';

const previews = new Array<FirmwareResource>()// [currentPrerelease]
const firmwareApi = mande(createUrl('api/github/firmware/list'))

export const useFirmwareStore = defineStore('firmware', {
  state: () => {
    return {
      stable: new Array<FirmwareResource>(),
      alpha: new Array<FirmwareResource>(),
      previews: previews,
      pullRequests: new Array<FirmwareResource>(),
      selectedFirmware: <FirmwareResource | undefined>{},
      selectedFile: <File | undefined>{},
      baudRate: 115200,
      hasSeenReleaseNotes: false,
      shouldCleanInstall: false,
      flashPercentDone: 0,
      isFlashing: false,
      flashingIndex: 0,
      isReaderLocked: false,
      isConnected: false,
      port: <SerialPort | undefined>{},
      couldntFetchFirmwareApi: false,
      prereleaseUnlocked: useSessionStorage('prereleaseUnlocked', false),
    }
  },
  getters: {
    hasOnlineFirmware: (state) => (state.selectedFirmware?.id || '').length > 0,
    hasFirmwareFile: (state) => (state.selectedFile?.name || '').length > 0,
    percentDone: (state) => `${state.flashPercentDone}%`,
    firmwareVersion: (state) => state.selectedFirmware?.id ? state.selectedFirmware.id.replace('v', '') : '.+',
    canShowFlash: (state) => state.selectedFirmware?.id ? state.hasSeenReleaseNotes : true, 
    isZipFile: (state) => state.selectedFile?.name.endsWith('.zip'),
  },
  actions: {
    continueToFlash() {
      this.hasSeenReleaseNotes = true
    },
    async fetchList() {
      firmwareApi.get<FirmwareReleases>()
        .then((response: FirmwareReleases) => {
          // Only grab the latest 4 releases
          this.stable = response.releases.stable.slice(0, 4);
          this.alpha = response.releases.alpha.filter(f => !f.title.includes('Preview')).slice(0, 4);
          this.previews = [
            ...response.releases.alpha.filter(f => f.title.includes('Preview')).slice(0, 4), 
            ...previews
          ];
          this.pullRequests = response.pullRequests.slice(0, 4);
        })
        .catch((error) => {
          console.error('Error fetching firmware list:', error);
          this.couldntFetchFirmwareApi = true;
        });
    },
    setSelectedFirmware(firmware: FirmwareResource) {
      this.selectedFirmware = firmware;
      this.selectedFile = undefined;
      this.hasSeenReleaseNotes = false;
    },
    getReleaseFileUrl(fileName: string): string {
      if (!this.selectedFirmware?.zip_url) return '';
      const baseUrl = getCorsFriendyReleaseUrl(this.selectedFirmware.zip_url);
      return `${baseUrl}/${fileName}`;
    },
    async flashNrf52(fileName: string, selectedTarget: DeviceHardware): Promise<SerialPort> {
      this.trackDownload(selectedTarget, false);
      if (!this.port || !this.isConnected) {
        this.port = await navigator.serial.requestPort({});
        this.port.ondisconnect = () => {
          this.isConnected = false;
        };
        await this.port.open({
          baudRate: 115200,
        });
      }
      this.isConnected = true;
      this.isFlashing = true;
      this.flashPercentDone = 1;
      const nrfFlasher = new Nrf52DfuFlasher(this.port, (percent) => {
        this.flashPercentDone = percent;
        if (percent === 100) {
          this.isFlashing = false;
          console.log('Done flashing!');
        }
      });
      const firmware = await this.fetchBlob(fileName);
      await nrfFlasher.flash(firmware);
      this.isFlashing = false;
      return this.port;
    },
    async downloadUf2FileSystem(searchRegex: RegExp) {
      const reader = new BlobReader(this.selectedFile!);
      const zipReader = new ZipReader(reader);
      const entries = await zipReader.getEntries()
      console.log('Zip entries:', entries);
      const file = entries.find(entry => searchRegex.test(entry.filename))
      if (file) {
        const data = await file.getData!(new BlobWriter());
        saveAs(data, file.filename);
      }
      else {
        throw new Error(`Could not find file with pattern ${searchRegex} in zip`);
      }
      zipReader.close();
    },
    async setFirmwareFile(file: File) {
      this.selectedFile = file;
      this.selectedFirmware = undefined;
    },
    async updateEspFlash(fileName: string, selectedTarget: DeviceHardware) {
      this.trackDownload(selectedTarget, false);
      const terminal = await openTerminal();
      this.port = await navigator.serial.requestPort({});
      this.isConnected = true;
      this.port.ondisconnect = () => {
        this.isConnected = false;
      };
      const transport = new Transport(this.port, true);
      const espLoader = await this.connectEsp32(transport, terminal);
      const content = await this.fetchBinaryContent(fileName);
      this.isFlashing = true;
      const flashOptions: FlashOptions = {
        fileArray: [{ data: content, address: 0x10000 }],
        flashSize: 'keep',
        eraseAll: false,
        compress: true,
        flashMode: 'keep',
        flashFreq: 'keep',
        reportProgress: (fileIndex, written, total) => {
          this.flashPercentDone = Math.round((written / total) * 100);
          if (written == total) {
            this.isFlashing = false;
            console.log('Done flashing!');
          }
        },
      };
      await this.startWrite(terminal, espLoader, transport, flashOptions);
    },
    async startWrite(terminal: Terminal, espLoader: ESPLoader, transport: Transport, flashOptions: FlashOptions) {
      await espLoader.writeFlash(flashOptions);
      await this.resetEsp32(transport);
      await this.readSerial(this.port!, terminal);
    },
    async resetEsp32(transport: Transport) {
      await transport.setRTS(true);
      await waitForMs(100);
      await transport.setRTS(false);
    },
    trackDownload(selectedTarget: DeviceHardware, isCleanInstall: boolean) { 
      if (selectedTarget.hwModelSlug?.length > 0) {
        track('Download', { 
          hardwareModel: selectedTarget.hwModelSlug, 
          arch: selectedTarget.architecture, 
          cleanInstall: isCleanInstall,
          version: this.selectedFirmware?.id || '',
          count: 1 
        });
      }
    },
    async cleanInstallEspFlash(fileName: string, otaFileName: string, littleFsFileName: string, selectedTarget: DeviceHardware) {
      this.trackDownload(selectedTarget, true);
      const terminal = await openTerminal();
      this.port = await navigator.serial.requestPort({});
      this.isConnected = true;
      this.port.ondisconnect = () => {
        this.isConnected = false;
      };
      const transport = new Transport(this.port, true);
      const espLoader = await this.connectEsp32(transport, terminal);
      const appContent = await this.fetchBinaryContent(fileName);
      const otaContent = await this.fetchBinaryContent(otaFileName);
      const littleFsContent = await this.fetchBinaryContent(littleFsFileName);
      this.isFlashing = true;
      const flashOptions: FlashOptions = {
        fileArray: [{ data: appContent, address: 0x00 }, { data: otaContent, address: 0x260000 }, { data: littleFsContent, address: 0x300000 }],
        flashSize: 'keep',
        eraseAll: true,
        compress: true,
        flashMode: 'keep',
        flashFreq: 'keep',
        reportProgress: (fileIndex, written, total) => {
          this.flashingIndex = fileIndex;
          this.flashPercentDone = Math.round((written / total) * 100);
          if (written == total && fileIndex > 1) {
            this.isFlashing = false;
            console.log('Done flashing!');
          }
        },
      };
      await this.startWrite(terminal, espLoader, transport, flashOptions);
    },
    async fetchBlob(fileName: string): Promise<Blob> {
      if (this.selectedFirmware?.zip_url) {
        const baseUrl = getCorsFriendyReleaseUrl(this.selectedFirmware!.zip_url!);
        const response = await fetch(`${baseUrl}/${fileName}`);
        return await response.blob();
      } else if (this.selectedFile && this.isZipFile) {
        const reader = new BlobReader(this.selectedFile!);
        const zipReader = new ZipReader(reader);
        const entries = await zipReader.getEntries()
        console.log('Zip entries:', entries);
        console.log('Looking for file matching pattern:', fileName);
        const file = entries.find(entry => new RegExp(fileName).test(entry.filename))
        if (file) {
          console.log('Found file:', file.filename);
          return await file.getData!(new BlobWriter());
        }
      } else if (this.selectedFile && !this.isZipFile) {
        return this.selectedFile;
      }
      throw new Error('Cannot fetch blob without a file or firmware selected');
    },
    async fetchBinaryContent(fileName: string): Promise<string> {
      if (this.selectedFirmware?.zip_url) {
        const baseUrl = getCorsFriendyReleaseUrl(this.selectedFirmware!.zip_url!);
        const response = await fetch(`${baseUrl}/${fileName}`);
        const blob = await response.blob();
        const data = await blob.arrayBuffer();
        return convertToBinaryString(new Uint8Array(data));
      } else if (this.selectedFile && this.isZipFile) {
        const reader = new BlobReader(this.selectedFile!);
        const zipReader = new ZipReader(reader);
        const entries = await zipReader.getEntries()
        console.log('Zip entries:', entries);
        console.log('Looking for file matching pattern:', fileName);
        const file = entries.find(entry => 
          {
            if (fileName.startsWith('firmware-tbeam-.'))
              return !entry.filename.includes('s3') && new RegExp(fileName).test(entry.filename) && (fileName.endsWith('update.bin') == entry.filename.endsWith('update.bin'))
            else 
              return new RegExp(fileName).test(entry.filename) && (fileName.endsWith('update.bin') == entry.filename.endsWith('update.bin'))
          })
        if (file) {
          console.log('Found file:', file.filename);
          const blob = await file.getData!(new BlobWriter());
          const arrayBuffer = await blob.arrayBuffer();
          return convertToBinaryString(new Uint8Array(arrayBuffer));
        }
      } else if (this.selectedFile && !this.isZipFile) {
        const buffer = await this.selectedFile.arrayBuffer();
        return convertToBinaryString(new Uint8Array(buffer));
      }
      throw new Error('Cannot fetch binary content without a file or firmware selected');
    },
    async connectEsp32(transport: Transport, terminal: Terminal): Promise<ESPLoader> {
      const loaderOptions = <LoaderOptions>{
        transport,
        baudrate: this.baudRate,
        enableTracing: false,
        terminal: {
          clean() {
            terminal.clear();
          },
          writeLine(data) {
            terminal.writeln(data);
          },
          write(data) {
            terminal.write(data);
          }
        }
      };
      const espLoader = new ESPLoader(loaderOptions);
      const chip = await espLoader.main();
      console.log("Detected chip:", chip);
      return espLoader;
    },
    async readSerial(port: SerialPort, terminal: Terminal): Promise<void> {
      const decoder = new TextDecoderStream();
      port.readable!.pipeTo(decoder.writable);
      const inputStream = decoder.readable;
      const reader = inputStream.getReader();

      while (true) {
        const{ value } = await reader.read();
        if (value) {
          terminal.write(value);
        }
        await waitForMs(5);
      }
    },
  },
})