import type { FirmwareResource } from './api';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const markdownContent = `
> [!IMPORTANT]
> This release disables device telemetry broadcasts over the mesh by default. If you want to opt back in, you will need to re-enable this in the apps.

## 🚀 What's Changed
* Bug / Send upgraded (duplicate) packets to phone if the queue removal failed. by @h3lix1 in https://github.com/meshtastic/firmware/pull/8148
* Introduce non-linear TX_GAIN_LORA by @fifieldt in https://github.com/meshtastic/firmware/pull/8107
* Reliable ACKs for DMs by @compumike in https://github.com/meshtastic/firmware/pull/8165
* Add DIRECT_MSG_ONLY buzzer mode by @nexpspace in https://github.com/meshtastic/firmware/pull/8158
* Add support for the manually_verified bool in SharedContact by @jp-bennett in https://github.com/meshtastic/firmware/pull/8180
* Mute: channels by @ford-jones in https://github.com/meshtastic/firmware/pull/7957
* T-Lora Pager: Fully fix rotary encoder and speaker fuzzing/popping by @WillyJL in https://github.com/meshtastic/firmware/pull/7986
* Add FACTORY_INSTALL option to do a filesystem reset on first boot by @jp-bennett in https://github.com/meshtastic/firmware/pull/8185
* Master backmerge by @thebentern in https://github.com/meshtastic/firmware/pull/8192
* Update MQTT root on lora region change by @ford-jones in https://github.com/meshtastic/firmware/pull/8166
* add heltec tracker v2 board. by @Quency-D in https://github.com/meshtastic/firmware/pull/8160
* Don't use IS_ONE_OF when loading Modules by @vidplace7 in https://github.com/meshtastic/firmware/pull/8197
* Update meshtastic/device-ui digest to 505ffad by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8195
* GAT562: Use PRIVATE_HW (fix build) by @vidplace7 in https://github.com/meshtastic/firmware/pull/8198
* Fix: ESP32s2 doesn't implement HWCDC by @vidplace7 in https://github.com/meshtastic/firmware/pull/8199
* Fix build script failure under certain conditions for devices that use UF2 binaries  by @Kealper in https://github.com/meshtastic/firmware/pull/8150
* Calculate airtime of transmitted and received packets separately by @GUVWAF in https://github.com/meshtastic/firmware/pull/8205
* Correcting T-Echo Lite GPS PINs by @Szetya in https://github.com/meshtastic/firmware/pull/8087
* Update protobufs and classes by @github-actions[bot] in https://github.com/meshtastic/firmware/pull/8206
* Clear out user.id except for sending to phone by @thebentern in https://github.com/meshtastic/firmware/pull/8202
* Add dropped packet count to LocalStats by @GUVWAF in https://github.com/meshtastic/firmware/pull/8207
* Sdl work by @jp-bennett in https://github.com/meshtastic/firmware/pull/7930
* Reprocess repeated packets and deduplicate logic by @GUVWAF in https://github.com/meshtastic/firmware/pull/8216
* Update next-hops based on traceroute result by @GUVWAF in https://github.com/meshtastic/firmware/pull/8219
* Upgrade trunk by @github-actions[bot] in https://github.com/meshtastic/firmware/pull/8229
* Add Adaptive Polling Intervals to WebServer by @capricornusx in https://github.com/meshtastic/firmware/pull/7864
* Centralize getNodeId and fix references to owner.id by @thebentern in https://github.com/meshtastic/firmware/pull/8230
* Update meshtastic-ArduinoThread digest to b841b04 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8233
* Update meshtastic/device-ui digest to f920b12 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8234
* Run Integration test in simulator mode by @jp-bennett in https://github.com/meshtastic/firmware/pull/8232
* Actions: Simplify matrices, cleanup build_one_* by @vidplace7 in https://github.com/meshtastic/firmware/pull/8218
* Actions: Simplify matrices, cleanup build_one_* (#8218) by @fifieldt in https://github.com/meshtastic/firmware/pull/8239
* Cherry Pick: Run Integration test in simulator mode by @fifieldt in https://github.com/meshtastic/firmware/pull/8242
* Update meshtastic/web to v2.6.6 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7583
* Log antispam by @jp-bennett in https://github.com/meshtastic/firmware/pull/8241
* Update meshtastic/device-ui digest to e564d78 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8235
* Do slightly better at threading the search for GPS hardware by @jp-bennett in https://github.com/meshtastic/firmware/pull/8240
* Fix serial pins for Ebyte E77 MBL board by @Stary2001 in https://github.com/meshtastic/firmware/pull/8246
* Wait until after GPS lock hold before updating position, if we can. by @fifieldt in https://github.com/meshtastic/firmware/pull/8064
* Add SHT4x serial number for detection by @szlifier in https://github.com/meshtastic/firmware/pull/8222
* Force coverage tests to run in simulation mode by @vidplace7 in https://github.com/meshtastic/firmware/pull/8251
* NimBLE speedup by @thebentern in https://github.com/meshtastic/firmware/pull/8281
* Fix Station G2 Lora Power Settings by @fifieldt in https://github.com/meshtastic/firmware/pull/8273

## New Contributors
* @nexpspace made their first contribution in https://github.com/meshtastic/firmware/pull/8158
* @szlifier made their first contribution in https://github.com/meshtastic/firmware/pull/8222

**Full Changelog**: https://github.com/meshtastic/firmware/compare/v2.7.11.ee68575...v2.7.12.05edcc5`;

const currentPrereleaseId = '2.7.12.05edcc5';

export const showPrerelease = true;

export const currentPrerelease = <FirmwareResource>{
  id: `v${currentPrereleaseId}`,
  title: `Meshtastic Firmware ${currentPrereleaseId} Pre-release`,
  zip_url: `https://github.com/meshtastic/firmware/releases/download/v${currentPrereleaseId}/firmware-${currentPrereleaseId}.zip`,
  release_notes: markdownContent,
};

export const vendorCobrandingTag = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow", "M5Stack", "NomadStar", "muzi"];
