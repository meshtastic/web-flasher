import type { FirmwareResource } from './api';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const currentPrereleaseId = '2.7.19.e9d4485';

export const showPrerelease = true;

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

export const eventMode: EventModeConfig = {
  enabled: false,
  eventName: 'Orlando Hamcation 2026',
  eventTag: 'Hamcation',
  firmware: {
    id: `v${eventFirmwareId}`,
    title: `Meshtastic Firmware ${eventFirmwareId}`,
    zip_url: `https://github.com/meshtastic/meshtastic.github.io/raw/master/event/hamcation2026/firmware-${eventFirmwareId}.zip`,
  },
};

export const vendorCobrandingTag = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow", "M5Stack", "NomadStar", "muzi"];
