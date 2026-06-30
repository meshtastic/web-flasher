import { reactive } from 'vue';
import type { FirmwareResource } from './api';
import type { EventFirmwareTheme } from './eventFirmware';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const currentPrereleaseId = '2.7.23.b246bcd';

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
  pathPrefix: string;
  domain: string;
  firmware: FirmwareResource;
  // Branding pulled from the manifest edition (optional — set in event mode).
  theme?: EventFirmwareTheme;
  tagline?: string;
  iconUrl?: string;
}

const eventFirmwareId = '2.7.23.07741e6';

const hamcationReleaseNotes = `
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

const hamcationEventMode: EventModeConfig = {
  enabled: false,
  eventName: 'Orlando Hamcation 2026',
  eventTag: 'Hamcation',
  pathPrefix: 'hamcation2026',
  domain: 'hamcation.meshtastic.org',
  firmware: {
    id: `v${eventFirmwareId}`,
    title: `Meshtastic Firmware ${eventFirmwareId}`,
    zip_url: `https://github.com/meshtastic/meshtastic.github.io/raw/master/event/hamcation2026/firmware-${eventFirmwareId}.zip`,
    release_notes: hamcationReleaseNotes,
  },
};

// Static event configs kept as an offline fallback for events with NO entry in
// the api event-firmware manifest (Hamcation has no FirmwareEdition enum, so it
// never appears there). Manifest-backed events (Hamvention, DEFCON, …) resolve
// dynamically and take precedence; see plugins/eventMode.client.ts.
export const staticEventModes: EventModeConfig[] = [hamcationEventMode];

// Active event mode. Disabled until plugins/eventMode.client.ts resolves the
// current host against the manifest (or the static fallback above). Reactive so
// components re-render when it resolves; a plain object so the firmware store and
// firmwareUrl util can read it synchronously.
export const eventMode = reactive<EventModeConfig>({
  enabled: false,
  eventName: '',
  eventTag: '',
  pathPrefix: '',
  domain: '',
  firmware: { id: '', title: '' },
});

/** Replace the active event mode in place, preserving the shared reference. */
export function setActiveEventMode(config: EventModeConfig): void {
  Object.assign(eventMode, config);
}

export const vendorCobrandingTag = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow", "M5Stack", "NomadStar", "muzi"];
