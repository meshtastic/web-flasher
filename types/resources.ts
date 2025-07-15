import type { FirmwareResource } from './api';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const markdownContent = `
## 🚀 Enhancements
* Update Screen Wake Default Behavior by @Xaositek in https://github.com/meshtastic/firmware/pull/7282
* Make the shouldWake function always available, and remove the bool by @jp-bennett in https://github.com/meshtastic/firmware/pull/7300
* Shorter audio feedback for InkHUD buttons by @todd-herbert in https://github.com/meshtastic/firmware/pull/7301
* Support native configuration Waveshare Pico LoRa module on Orange Pi Zero3 by @Mictronics in https://github.com/meshtastic/firmware/pull/7295
* Load ringtone from userPrefs by @vidplace7 in https://github.com/meshtastic/firmware/pull/7298
* Seesaw Rotary by @jp-bennett in https://github.com/meshtastic/firmware/pull/7310
* GPS for STM32WL by @Stary2001 in https://github.com/meshtastic/firmware/pull/7297
* Feat: add support for RAK Wismesh Tag hardware platform by @DanielCao0 in https://github.com/meshtastic/firmware/pull/6853
* Message frame New Message Options and Clock / TDeck / Brightness Refinements by @Xaositek in https://github.com/meshtastic/firmware/pull/7344

## 🐛 Bug fixes and maintenance
* Update RadioLib to v7.2.1 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7287
* Update platformio.ini by @Kongduino in https://github.com/meshtastic/firmware/pull/7289
* Update Adafruit BusIO to v1.17.2 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7277
* Update dorny/test-reporter action to v2.1.1 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7284
* Update meshtastic/device-ui digest to 404c6e0 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7302
* Add first config override for Native by @jp-bennett in https://github.com/meshtastic/firmware/pull/7306
* Update meshtastic/device-ui digest to 86a09a7 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7308
* STM32: Properly ignore OneButton by @vidplace7 in https://github.com/meshtastic/firmware/pull/7311
* Build: Update platformio with pkg install by @vidplace7 in https://github.com/meshtastic/firmware/pull/7315
* Bump Framework-native and set version string. by @jp-bennett in https://github.com/meshtastic/firmware/pull/7317
* userPrefs: Set default ringtone nag time by @vidplace7 in https://github.com/meshtastic/firmware/pull/7314
* Remove Ubuntu oracular by @vidplace7 in https://github.com/meshtastic/firmware/pull/7322
* feat: DIY Seeed XIAO nRF52840 + EBYTE E22 variants, pin-compatible with Wio-SX1262 kit by @ndoo in https://github.com/meshtastic/firmware/pull/7105
* feat: New variant esp32c3_super_mini by @ndoo in https://github.com/meshtastic/firmware/pull/7133
* xiao_ble README.md updates by @ndoo in https://github.com/meshtastic/firmware/pull/7283
* fix(device-update.sh): safely filter args without breaking parsing by @NeilHanlon in https://github.com/meshtastic/firmware/pull/7305
* NodeDB.cpp: Fix iOS bluetooth crash by ensuring UINT32_MAX is not used by @Styne13 in https://github.com/meshtastic/firmware/pull/7312
* Improve OLED UI Responsiveness and Force Redraws for Canned message module by @csrutil in https://github.com/meshtastic/firmware/pull/7324
* add pioenv to version string in debug log by @caveman99 in https://github.com/meshtastic/firmware/pull/7328
* PPA: Add Ubuntu Questing (25.10) to daily builds by @vidplace7 in https://github.com/meshtastic/firmware/pull/7329
* get git url part from local repo by @caveman99 in https://github.com/meshtastic/firmware/pull/7331
* Add heap info via standard mallinfo() function for STM32 by @Stary2001 in https://github.com/meshtastic/firmware/pull/7327
* The screen display of the heltec wireless tracker is abnormal. by @Quency-D in https://github.com/meshtastic/firmware/pull/7337
* STM32 PlatformIO cleanup by @vidplace7 in https://github.com/meshtastic/firmware/pull/7339
* Map report should work over devices which do not have network hardware (with client proxy) by @thebentern in https://github.com/meshtastic/firmware/pull/7341
* Fix L1 EInk HWModel by @thebentern in https://github.com/meshtastic/firmware/pull/7346
`;

const currentPrereleaseId = '2.7.3.39716ed';

export const showPrerelease = true;

export const currentPrerelease = <FirmwareResource>{
  id: `v${currentPrereleaseId}`,
  title: `Meshtastic Firmware ${currentPrereleaseId} Pre-release`,
  zip_url: `https://github.com/meshtastic/firmware/releases/download/v${currentPrereleaseId}/firmware-${currentPrereleaseId}.zip`,
  release_notes: markdownContent,
};

export const vendorCobrandingTag = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow"];
