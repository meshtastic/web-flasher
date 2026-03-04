import type { FirmwareResource } from './api';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const currentPrereleaseId = '2.7.19.bb3d6d5';

export const showPrerelease = false;

export const currentPrerelease = <FirmwareResource>{
  id: `v${currentPrereleaseId}`,
  title: `Meshtastic Firmware ${currentPrereleaseId} Pre-release`,
  zip_url: `https://github.com/meshtastic/firmware/releases/download/v${currentPrereleaseId}/firmware-${currentPrereleaseId}.zip`,
};

// Event Mode Configuration
// Set enabled to true to lock the flasher to a specific firmware for events
export interface EventModeConfig {
  enabled: boolean;
  eventName: string;
  eventTag: string;
  firmware: FirmwareResource;
}

const eventFirmwareId = '2.7.18.7e03cae';

const eventReleaseNotes = `
## Welcome to Orlando Hamcation 2026!

This firmware has been customized for Hamcation with factory default configurations.

### ⚠️ Important: Backup Before Flashing

If your device has existing settings or encryption keys, **backup your keys / configurations** before proceeding. Flashing will reset your device to factory settings for the event.

### Quick Start

1. Ensure a **data-capable USB cable** is connected
2. Select your device type
3. Choose "Full Erase and Install"
4. After flashing, download the Meshtastic app and pair via Bluetooth
5. If you updated from a previous version or installed a UF2 on an NRF52 device, you will need to perform a factory reset on the device to activate the Hamcation mode.

**73 and happy meshing!**
`;

export const eventMode: EventModeConfig = {
  enabled: false,
  eventName: 'Orlando Hamcation 2026',
  eventTag: 'Hamcation',
  firmware: {
    id: `v${eventFirmwareId}`,
    title: `Meshtastic Firmware ${eventFirmwareId}`,
    zip_url: `https://github.com/meshtastic/meshtastic.github.io/raw/master/event/hamcation2026/firmware-${eventFirmwareId}.zip`,
    release_notes: eventReleaseNotes,
  },
};

export const vendorCobrandingTag: string = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow", "M5Stack", "NomadStar", "muzi"];
