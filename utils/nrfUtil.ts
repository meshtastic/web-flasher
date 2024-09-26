import {
  BlobReader,
  BlobWriter,
  type Entry,
  TextWriter,
  ZipReader,
} from '@zip.js/zip.js';

import { waitForMs } from './promiseUtils';
import {
  crc16,
  createSlipHeader,
  int16ToBytes,
  int32ToBytes,
  slipEncodeEscChars,
} from './slipEncoding';

const Nrf52Constants = {
    DFU_TOUCH_BAUD: 1200,
    SERIAL_PORT_OPEN_WAIT_TIME: 0.1,
    TOUCH_RESET_WAIT_TIME: 1.5,

    HEX_TYPE_SOFTDEVICE: 1,
    HEX_TYPE_BOOTLOADER: 2,
    HEX_TYPE_SOFTDEVICE_BOOTLOADER: 3,
    HEX_TYPE_APPLICATION: 4,

    DFU_initPacket: 1,
    DFU_START_PACKET: 3,
    DFU_DATA_PACKET: 4,
    DFU_STOP_DATA_PACKET: 5,

    DATA_INTEGRITY_CHECK_PRESENT: 1,
    RELIABLE_PACKET: 1,
    HCI_PACKET_TYPE: 14,

    FLASH_PAGE_SIZE: 4096,
    FLASH_PAGE_ERASE_TIME: 0.0897,
    FLASH_WORD_WRITE_TIME: 0.000100,
    FLASH_PAGE_WRITE_TIME: (4096 / 4) * 0.000100,

    DFU_PACKET_MAX_SIZE: 512,
}

// This is a port of the following Python from Adafruit NRFUtil: https://github.com/adafruit/Adafruit_nRF52_nrfutil/blob/master/nordicsemi/dfu/dfu_transport_serial.py
// Adapted from the following JS into TypeScript: https://github.com/liamcottle/rnode-flasher/blob/master/js/nrf52_dfu_flasher.js

export class Nrf52DfuFlasher {
    constructor(serialPort: SerialPort, progressCallback: (progressPercent: number) => void) {
        this.serialPort = serialPort;
        this.progressCallback = progressCallback;
    }
    progressCallback: (progressPercent: number) => void;
    serialPort: SerialPort
    sequenceNumber: number = 0;
    softDeviceSize: number = 0;
    applicationSize: number = 0;
    bootloaderSize: number = 0;
    totalSize: number = 0;

    async sendPacket(data: Uint8Array) {
        const writer = this.serialPort.writable!.getWriter();
        try {
            await writer.write(data);
        } finally {
            writer.releaseLock();
        }
    }

    async enterDfuMode() {
        console.log("Entering DFU mode w/ 1200bps touch reset");
        await this.serialPort.open({
            baudRate: Nrf52Constants.DFU_TOUCH_BAUD,
        });
        await waitForMs(Nrf52Constants.SERIAL_PORT_OPEN_WAIT_TIME * 1000);
        await this.serialPort.close();
        await waitForMs(Nrf52Constants.TOUCH_RESET_WAIT_TIME * 1000);
    }

    async flash(firmwareZipBlob: Blob) {
        const blobReader = new BlobReader(firmwareZipBlob);
        const zipReader = new ZipReader(blobReader);
        const zipEntries = await zipReader.getEntries();

        // find manifest file
        const manifestFile = zipEntries.find(zipEntry => zipEntry.filename === "manifest.json");
        if (!manifestFile){
            throw "manifest.json not found in ota zip!";
        }

        const json = JSON.parse(await manifestFile.getData!(new TextWriter()));
        const manifest = json.manifest;

        // TODO: Bootloader as well
        if (manifest.bootloader) {
            console.log("Flashing bootloader");
            //await this.dfuSendBinary(Nrf52Constants.HEX_TYPE_BOOTLOADER, zipEntries, manifest.bootloader);
        }

        if (manifest.application){
            console.log("Flashing application");
            await this.dfuSendBinary(Nrf52Constants.HEX_TYPE_APPLICATION, zipEntries, manifest.application);
        }
    }
  
    private async dfuSendBinary(programMode: number, zipEntries: Entry[], firmwareManifest: any) {
        await waitForMs(Nrf52Constants.SERIAL_PORT_OPEN_WAIT_TIME * 1000);

        const binFile = zipEntries.find(entry => entry.filename === firmwareManifest.bin_file);
        const firmwareBlob = await binFile!.getData!(new BlobWriter());
        const firmware = new Uint8Array(await firmwareBlob.arrayBuffer());

        const datFile = zipEntries.find(entry => entry.filename === firmwareManifest.dat_file);
        const datBlob = await datFile!.getData!(new BlobWriter());
        const initPacket = new Uint8Array(await datBlob.arrayBuffer());

        // determine application size
        if (programMode === Nrf52Constants.HEX_TYPE_APPLICATION){
            this.applicationSize = firmware.length;
        }

        console.log("Sending DFU start packet");
        await this.sendDfuStartPacket(programMode);
        console.log("Sending init packet");
        await this.sendInitPacket(initPacket);
        console.log("Sending firmware");
        await this.sendFirmware(firmware);
        console.log("Sending DFU stop packet");
        await this.sendDfuStopPacket();
    }

    private createHciPacketFromFrame(frame: Uint8Array) : Uint8Array {
        // Iterate sequence number, but wrap-around at 8
        this.sequenceNumber = (this.sequenceNumber + 1) % 8;

        const slipHeaderBytes = createSlipHeader(
            this.sequenceNumber,
            Nrf52Constants.DATA_INTEGRITY_CHECK_PRESENT,
            Nrf52Constants.RELIABLE_PACKET,
            Nrf52Constants.HCI_PACKET_TYPE,
            frame.length,
        );

        const crc = crc16(new Uint8Array([
                ...slipHeaderBytes,
                ...frame,
            ]), 0xffff);

        const packet = [
            ...slipHeaderBytes,
            ...frame,
            crc & 0xFF,
            (crc & 0xFF00) >> 8,
        ];

        return new Uint8Array([
            0xc0,
            ...slipEncodeEscChars(packet),
            0xc0,
        ]);
    }

    private getEraseWaitTime() {
        return Math.max(0.5, ((this.totalSize / Nrf52Constants.FLASH_PAGE_SIZE) + 1) * Nrf52Constants.FLASH_PAGE_ERASE_TIME);
    }

    private createImageSizePacket(): number[] {
        return [
            ...int32ToBytes(this.softDeviceSize),
            ...int32ToBytes(this.bootloaderSize),
            ...int32ToBytes(this.applicationSize),
        ];
    }

    private async sendInitPacket(initPacket: Uint8Array) {
        const frame = new Uint8Array([
            ...int32ToBytes(Nrf52Constants.DFU_initPacket),
            ...initPacket,
            ...int16ToBytes(0x0000), // padding required
        ]);

        await this.sendPacket(this.createHciPacketFromFrame(frame));
    }

    private async sendFirmware(firmware: Uint8Array) {
        let packetsSent = 0;

        const packets = Array.from({ length: Math.ceil(firmware.length / Nrf52Constants.DFU_PACKET_MAX_SIZE) }, (_, i) => {
            const chunk = new Uint8Array([
            ...int32ToBytes(Nrf52Constants.DFU_DATA_PACKET),
            ...firmware.slice(i * Nrf52Constants.DFU_PACKET_MAX_SIZE, (i + 1) * Nrf52Constants.DFU_PACKET_MAX_SIZE),
            ]);
            return this.createHciPacketFromFrame(chunk);
        });

        if (this.progressCallback){
            this.progressCallback(0);
        }
        for (let index = 0; index < packets.length; index++) {
            await this.sendPacket(packets[index]);
            await waitForMs(5);
            //await waitForMs(Nrf52Constants.FLASH_PAGE_WRITE_TIME * 1000);
            packetsSent++;
            if (this.progressCallback) {
                // console.log("Progress: ", packetsSent, packets.length);
                const progress = Math.floor(((index + 1) / packets.length) * 100);
                this.progressCallback(progress);
            }
        }
    }

    private async sendDfuStartPacket(mode: number){
        const frame = new Uint8Array([
            ...int32ToBytes(Nrf52Constants.DFU_START_PACKET),
            ...int32ToBytes(mode),
            ...this.createImageSizePacket(),
        ]);
        await this.sendPacket(this.createHciPacketFromFrame(frame));

        this.softDeviceSize = this.softDeviceSize;
        this.totalSize = this.softDeviceSize + this.bootloaderSize + this.applicationSize;

        await waitForMs(this.getEraseWaitTime() * 1000);
    }

    private async sendDfuStopPacket() {
        await this.sendPacket(this.createHciPacketFromFrame(int32ToBytes(Nrf52Constants.DFU_STOP_DATA_PACKET)));
    }
}