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
import { timezones } from '~/types/resources';

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

const previews = new Array<FirmwareResource>()// new Array<FirmwareResource>(currentPrerelease)
const firmwareApi = mande(createUrl('api/github/firmware/list'))
const TZ_PLACEHOLDER = 'tzplaceholder                                         '

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
    isFactoryBin: (state) => state.selectedFile?.name.endsWith('.factory.bin'),
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
    },
    async updateEspFlash(fileName: string, selectedTarget: DeviceHardware) {
      const terminal = await openTerminal();
      this.port = await navigator.serial.requestPort({});
      this.isConnected = true;
      this.port.ondisconnect = () => {
        this.isConnected = false;
      };
      const transport = new Transport(this.port, true);
      const espLoader = await this.connectEsp32(transport, terminal);
      let content = await this.fetchBinaryContent(fileName, true);
      let originalAppContent = await this.fetchBinaryContent(fileName);

      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // get posix timezone string based on browser locale
      const posixTz = timezones[tz as keyof typeof timezones] + "\0";
      if (posixTz)
        content = content.replace(TZ_PLACEHOLDER, posixTz.padEnd(TZ_PLACEHOLDER.length, ' '));

      // The file is padded with zeros until its size is one byte less than a multiple of 16 bytes. A last byte (thus making the file size a multiple of 16) is the checksum of the data of all segments. The checksum is defined as the xor-sum of all bytes and the byte 0xEF.
      // Do all of our devices have 8 segments? Can get that from the 2nd byte of the header
      const calculateChecksum = calcChecksum(convertToUint8Array(content), 8);
      const appDataWithChecksum = new Uint8Array([...convertToUint8Array(content), ...new Uint8Array([calculateChecksum])]);
      console.log(appDataWithChecksum.length)
      // esp32 checksum
      const sha256sum = await crypto.subtle.digest('SHA-256', appDataWithChecksum);
      console.log(appDataWithChecksum.length)
      content = convertToBinaryString(new Uint8Array([...appDataWithChecksum, ...new Uint8Array(sha256sum)]));
      console.log(originalAppContent === content);
      console.log('Length:', content.length);
      console.log('Original length:', originalAppContent.length);

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
      this.port = await navigator.serial.requestPort({});
      this.isConnected = true;
      this.port.ondisconnect = () => {
        this.isConnected = false;
      };
      const transport = new Transport(this.port, true);
      const espLoader = await this.connectEsp32(transport, terminal);
      let appContent = await this.fetchBinaryContent(fileName, true);
      const originalAppContent = await this.fetchBinaryContent(fileName);
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // get posix timezone string based on browser locale
      const posixTz = timezones[tz as keyof typeof timezones] + "\0";
      if (posixTz)
        appContent = appContent.replace(TZ_PLACEHOLDER, posixTz.padEnd(TZ_PLACEHOLDER.length, ' '));

      // The file is padded with zeros until its size is one byte less than a multiple of 16 bytes. A last byte (thus making the file size a multiple of 16) is the checksum of the data of all segments. The checksum is defined as the xor-sum of all bytes and the byte 0xEF.
      // Do all of our devices have 8 segments? Can get that from the 2nd byte of the header
      const calculateChecksum = calcChecksum(convertToUint8Array(appContent).slice(65536), 8);
      const appDataWithChecksum = new Uint8Array([...convertToUint8Array(appContent), ...new Uint8Array([calculateChecksum])]);
      // esp32 checksum
      const sha256sum = await crypto.subtle.digest('SHA-256', appDataWithChecksum.slice(65536));
      appContent = convertToBinaryString(new Uint8Array([...appDataWithChecksum, ...new Uint8Array(sha256sum)]));
      console.log(originalAppContent === appContent);
      console.log('Length:', appContent.length);
      console.log('Original length:', originalAppContent.length);
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
          if (written === total && fileIndex > 1) {
            this.isFlashing = false;
            console.log('Done flashing!');
            this.trackDownload(selectedTarget, true);
          }
        },
      };
      await this.startWrite(terminal, espLoader, transport, flashOptions);
    },
    async fetchBinaryContent(fileName: string, truncateChecksum = false): Promise<string> {
      if (this.selectedFirmware?.zip_url) {
        const baseUrl = getCorsFriendyReleaseUrl(this.selectedFirmware.zip_url);
        const response = await fetch(`${baseUrl}/${fileName}`);
        const blob = await response.blob();
        let data = await blob.arrayBuffer();
        if (truncateChecksum)
          data = data.slice(0, data.byteLength - 33);

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
            let arrayBuffer = await blob.arrayBuffer();
            if (truncateChecksum)
              arrayBuffer = arrayBuffer.slice(0, arrayBuffer.byteLength - 33);
            return convertToBinaryString(new Uint8Array(arrayBuffer));
          }
          throw new Error(`Could not find file with pattern ${fileName} in zip`);
        }
      } else if (this.selectedFile && !this.isZipFile) {
        let buffer = await this.selectedFile.arrayBuffer();
        if (truncateChecksum)
          buffer = buffer.slice(0, buffer.byteLength - 33);
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
        const { value } = await reader.read();
        if (value) {
          terminal.write(value);
        }
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    },
  },
})
