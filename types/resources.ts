import type { FirmwareResource } from './api';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const markdownContent = `

## 🚀 Enhancements
* Fast fix, remove saving tx power inside limitPower() by @mrekin in https://github.com/meshtastic/firmware/pull/7255
* Show user which Clock Face option is currently elected by @Xaositek in https://github.com/meshtastic/firmware/pull/7271
* Heltec Wireless Paper, VM-E213 Hardware Revisions by @todd-herbert in https://github.com/meshtastic/firmware/pull/7258

## 🐛 Bug fixes and maintenance
* Add HWIDs for T1000-E in DFU mode by @thebentern in https://github.com/meshtastic/firmware/pull/7235
* chore(deps): update meshtastic/device-ui digest to 8c7092c by @renovate in https://github.com/meshtastic/firmware/pull/7238
* Automatically bail user out of displaymode_color when not HAS_TFT by @jp-bennett in https://github.com/meshtastic/firmware/pull/7248
* Don't run bluetooth gerFromRadio() unless the phone has requested a packet by @jp-bennett in https://github.com/meshtastic/firmware/pull/7231
* Try-fix: L76K spamming bad times can crash nodes by @thebentern in https://github.com/meshtastic/firmware/pull/7261
* Fix install script by @Pitel in https://github.com/meshtastic/firmware/pull/7259
* Modules and favorite screen fix by @HarukiToreda in https://github.com/meshtastic/firmware/pull/7264
* TFT_MESH Fixes Across Various Devices by @Xaositek in https://github.com/meshtastic/firmware/pull/7247
* Update Bluetooth Toggle to match other variants by @Xaositek in https://github.com/meshtastic/firmware/pull/7269
* Make PacketHistory logging less chatty by @thebentern in https://github.com/meshtastic/firmware/pull/7272
* GitHub Actions faster!! (again) by @vidplace7 in https://github.com/meshtastic/firmware/pull/7268
`;

const currentPrereleaseId = '2.7.2.f6d3782';

export const showPrerelease = false;

export const currentPrerelease = <FirmwareResource>{
  id: `v${currentPrereleaseId}`,
  title: `Meshtastic Firmware ${currentPrereleaseId} Pre-release`,
  zip_url: `https://github.com/meshtastic/firmware/releases/download/v${currentPrereleaseId}/firmware-${currentPrereleaseId}.zip`,
  release_notes: markdownContent,
};

export const vendorCobrandingTag = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow"];
