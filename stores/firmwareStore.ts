import {
  ESPLoader,
  type FlashOptions,
  type LoaderOptions,
  Transport,
} from 'esptool-js';
import { saveAs } from 'file-saver';
import { mande } from 'mande';
import { defineStore } from 'pinia';
import type { Terminal } from 'xterm';
import {
  currentPrerelease,
  showPrerelease,
} from '~/types/resources';

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

const previews = showPrerelease ? [currentPrerelease] : [];

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
      shouldBundleWebUI: false,
      shouldInstallMui: false,
      shouldInstallInkHud: false,
      partitionScheme: <String | undefined>{},
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
    isFactoryBin: (state) => state.selectedFile?.name.endsWith('.factory.bin'),
  },
  actions: {
    clearState() {
      this.shouldCleanInstall = false;
      this.shouldBundleWebUI = false;
      this.shouldInstallMui = false;
      this.shouldInstallInkHud = false;
      this.partitionScheme = undefined;
    },
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
            ...response.releases.alpha
              .filter(f => f.title.includes('Preview') && !f.title.includes('2.6.0')) // Exclude 2.6.0 preview
              .slice(0, 4),
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
      // Store current MUI setting before clearing state
      const currentMuiSetting = this.shouldInstallMui;
      this.clearState();
      // Restore MUI setting if it was enabled (for devices that support it)
      this.shouldInstallMui = currentMuiSetting;
    },
    getReleaseFileUrl(fileName: string): string {
      if (!this.selectedFirmware?.zip_url) return '';
      const baseUrl = getCorsFriendyReleaseUrl(this.selectedFirmware.zip_url);
      return `${baseUrl}/${fileName}`;
    },
    async downloadUf2FileSystem(searchRegex: RegExp) {
      if (!this.selectedFile) return;
      const reader = new BlobReader(this.selectedFile);
      const zipReader = new ZipReader(reader);
      const entries = await zipReader.getEntries()
      console.log('Zip entries:', entries);
      const file = entries.find(entry => searchRegex.test(entry.filename))
      if (file) {
        if (file?.getData) {
          const data = await file.getData(new BlobWriter());
          saveAs(data, file.filename);
        } else {
          throw new Error(`Could not find file with pattern ${searchRegex} in zip`);
        }
      }
      else {
        throw new Error(`Could not find file with pattern ${searchRegex} in zip`);
      }
      zipReader.close();
    },
    async setFirmwareFile(file: File) {
      this.selectedFile = file;
      this.selectedFirmware = undefined;
      // Store current MUI setting before clearing state
      const currentMuiSetting = this.shouldInstallMui;
      this.clearState();
      // Restore MUI setting if it was enabled (for devices that support it)
      this.shouldInstallMui = currentMuiSetting;
    },
    async updateEspFlash(fileName: string, selectedTarget: DeviceHardware) {
      const terminal = await openTerminal();

      try {
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
            if (written === total) {
              this.isFlashing = false;
              console.log('Done flashing!');
              this.trackDownload(selectedTarget, true);
            }
          },
        };
        await this.startWrite(terminal, espLoader, transport, flashOptions);
      }
      catch (error: any) {
        this.handleError(error, terminal);
      }
    },
    handleError(error: Error, terminal: Terminal) {
      console.error('Error flashing:', error);
      terminal.writeln('');
      terminal.writeln(`\x1b[38;5;9m${error}\x1b[0m`);
    },
    async startWrite(terminal: Terminal, espLoader: ESPLoader, transport: Transport, flashOptions: FlashOptions) {
      await espLoader.writeFlash(flashOptions);
      await this.resetEsp32(transport);
      if (this.port) {
        await this.readSerial(this.port, terminal);
      } else {
        throw new Error('Serial port is not defined');
      }
    },
    async resetEsp32(transport: Transport) {
      await transport.setRTS(true);
      await new Promise((resolve) => setTimeout(resolve, 100));
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
      const terminal = await openTerminal();

      try {
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

        let otaOffset = 0x260000;
        let spiffsOffset = 0x300000;
        if (this.partitionScheme == "8MB") {
          // 8mb
          otaOffset = 0x340000;
          spiffsOffset = 0x670000;
        }
        else if (this.partitionScheme == "16MB") {
          // 16mb
          otaOffset = 0x650000;
          spiffsOffset = 0xc90000;
        }

        this.isFlashing = true;
        const flashOptions: FlashOptions = {
          fileArray: [
            { data: appContent, address: 0x00 },
            { data: otaContent, address: otaOffset },
            { data: littleFsContent, address: spiffsOffset }
          ],
          flashSize: 'keep',
          eraseAll: true,
          compress: true,
          flashMode: 'keep',
          flashFreq: 'keep',
          reportProgress: (fileIndex, written, total) => {
            this.flashingIndex = fileIndex;
            this.flashPercentDone = Math.round((written / total) * 100);
            if (written === total && fileIndex > 1) {
              this.isFlashing = false;
              console.log('Done flashing!');
              this.trackDownload(selectedTarget, true);
            }
          },
        };
        await this.startWrite(terminal, espLoader, transport, flashOptions);
      } catch (error: any) {
        this.handleError(error, terminal);
      }
    },
    async fetchBinaryContent(fileName: string): Promise<string> {
      if (this.selectedFirmware?.zip_url) {
        const baseUrl = getCorsFriendyReleaseUrl(this.selectedFirmware.zip_url);
        const response = await fetch(`${baseUrl}/${fileName}`);
        const blob = await response.blob();
        const data = await blob.arrayBuffer();
        return convertToBinaryString(new Uint8Array(data));
      }
      if (this.selectedFile && this.isZipFile) {
        const reader = new BlobReader(this.selectedFile);
        const zipReader = new ZipReader(reader);
        const entries = await zipReader.getEntries()
        console.log('Zip entries:', entries);
        console.log('Looking for file matching pattern:', fileName);
        const file = entries.find(entry => 
          {
            if (fileName.startsWith('firmware-tbeam-.'))
              return !entry.filename.includes('s3') && new RegExp(fileName).test(entry.filename) && (fileName.endsWith('update.bin') === entry.filename.endsWith('update.bin'))
            return new RegExp(fileName).test(entry.filename) && (fileName.endsWith('update.bin') === entry.filename.endsWith('update.bin'))
          })
        if (file) {
          console.log('Found file:', file.filename);
          if (file?.getData) {
            const blob = await file.getData(new BlobWriter());
            const arrayBuffer = await blob.arrayBuffer();
            return convertToBinaryString(new Uint8Array(arrayBuffer));
          }
          throw new Error(`Could not find file with pattern ${fileName} in zip`);
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
      if (port.readable) {
        port.readable.pipeTo(decoder.writable);
      } else {
        throw new Error('Serial port is not readable');
      }
      const inputStream = decoder.readable;
      const reader = inputStream.getReader();

      while (true) {
        const{ value } = await reader.read();
        if (value) {
          terminal.write(value);
        }
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    },
  },
})