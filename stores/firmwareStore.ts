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

import {
  BlobReader,
  BlobWriter,
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
      selectedFirmware: <FirmwareResource | undefined>{},
      selectedFile: <File | undefined>{},
      baudRate: 115200,
      shouldCleanInstall: false,
      flashPercentDone: 0,
      isFlashing: false,
      flashingIndex: 0,
      isReaderLocked: false,
      isConnected: false,
      port: <SerialPort | undefined>{},
    }
  },
  getters: {
    percentDone: (state) => `${state.flashPercentDone}%`,
    firmwareVersion: (state) => state.selectedFirmware?.id ? state.selectedFirmware.id.replace('v', '') : '.+',
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
      this.selectedFile = undefined;
    },
    getReleaseFileUrl(fileName: string): string {
      if (!this.selectedFirmware?.zip_url) return '';
      const baseUrl = getCorsFriendyReleaseUrl(this.selectedFirmware.zip_url);
      return `${baseUrl}/${fileName}`;
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
    async updateEspFlash(fileName: string) {
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
      await espLoader.writeFlash(flashOptions);
      await this.resetEsp32(transport);
      await this.readSerial(this.port!, terminal);
    },
    async resetEsp32(transport: Transport) {
      await transport.setRTS(true);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await transport.setRTS(false);
    },
    async cleanInstallEspFlash(fileName: string, otaFileName: string, littleFsFileName: string) {
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
        fileArray: [
          { data: appContent, address: 0x00 },
          { data: otaContent, address: 0x260000 },
          { data: littleFsContent, address: 0x300000 }
        ],
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
      await espLoader.writeFlash(flashOptions);
      await this.resetEsp32(transport);
      await this.readSerial(this.port!, terminal);
    },
    async fetchBinaryContent(fileName: string): Promise<string> {
      if (this.selectedFirmware?.zip_url) {
        const baseUrl = getCorsFriendyReleaseUrl(this.selectedFirmware!.zip_url!);
        const response = await fetch(`${baseUrl}/${fileName}`);
        const blob = await response.blob();
        const data = await blob.arrayBuffer();
        return convertToBinaryString(new Uint8Array(data));
      } else if (this.selectedFile) {
        const reader = new BlobReader(this.selectedFile!);
        const zipReader = new ZipReader(reader);
        const entries = await zipReader.getEntries()
        console.log('Zip entries:', entries);
        console.log('Looking for file matching pattern:', fileName);
        const file = entries.find(entry => new RegExp(fileName).test(entry.filename) && (fileName.endsWith('update.bin') == entry.filename.endsWith('update.bin')))
        if (file) {
          console.log('Found file:', file.filename);
          const blob = await file.getData!(new BlobWriter());
          const arrayBuffer = await blob.arrayBuffer();
          return convertToBinaryString(new Uint8Array(arrayBuffer));
        }
      }
      throw new Error('Cannot fetch binary content without a file or firmware selected');
    },
    disconnect() {
      this.isReaderLocked = false;
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
        if (!this.isReaderLocked) {
          await this.unlockPort(port, reader);
          this.isConnected = false;
          return;
        }
        let { value } = await reader.read();
        if (value) {
          terminal.write(value);
        }
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    },
    async unlockPort(port: SerialPort, reader: ReadableStreamDefaultReader<string>) {
      try {
        const textEncoder = new TextEncoderStream();
        const writer = textEncoder.writable.getWriter();
        const writableStreamClosed = textEncoder.readable.pipeTo(port.writable!);
        reader.cancel();
        writer.close();
        await writableStreamClosed;
    
        await port.close();
      }
      catch (e) {
        console.log(e);
      }
    },
  },
})