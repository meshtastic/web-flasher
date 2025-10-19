import type { FirmwareResource } from './api';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const markdownContent = `
> [!IMPORTANT]
> This release disables device telemetry broadcasts over the mesh by default. If you want to opt back in, you will need to re-enable this in the apps.

##  🚀 What's Changed
* Update python Docker tag to v3.14 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8255
* Fix: Move #include "variant.h" to top of file (fixes #8276) by @ndoo in https://github.com/meshtastic/firmware/pull/8278
* Update meshtastic/device-ui digest to 6d8cc22 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8275
* NimBLE speedup by @thebentern in https://github.com/meshtastic/firmware/pull/8281
* Fix Station G2 Lora Power Settings by @fifieldt in https://github.com/meshtastic/firmware/pull/8273
* Chore(deps): update github/codeql-action action to v4 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8250
* Fix BLE stateful issues by @thebentern in https://github.com/meshtastic/firmware/pull/8287
* Attach an interrupt to EXT_PWR_DETECT if present, and force a screen … by @jp-bennett in https://github.com/meshtastic/firmware/pull/8284
* Update XPowersLib to v0.3.1 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8303
* Double the number of bluetooth bonds NimBLE will store (from 3 to 6) by @thebentern in https://github.com/meshtastic/firmware/pull/8296
* mDNS: Advertise pio_env (for OTA scripts) by @vidplace7 in https://github.com/meshtastic/firmware/pull/8298
* Master to develop by @jp-bennett in https://github.com/meshtastic/firmware/pull/8306
* Actions: CI docker with a fancy matrix by @vidplace7 in https://github.com/meshtastic/firmware/pull/8253
* GPS_POWER_TOGGLE no longer has a function, so purge by @jp-bennett in https://github.com/meshtastic/firmware/pull/8312
* Update protobufs and classes by @github-actions[bot] in https://github.com/meshtastic/firmware/pull/8305
* Remove T1000E GPS startup delay sequence by @fifieldt in https://github.com/meshtastic/firmware/pull/8236
* Increase bluetooth 5.0 PHY speed and MTU on esp32_s3 by @h3lix1 in https://github.com/meshtastic/firmware/pull/8261
* More BaseUI Frame Visibility Toggles by @Xaositek in https://github.com/meshtastic/firmware/pull/8252
* Device Telemetry opt in by @thebentern in https://github.com/meshtastic/firmware/pull/8059
* Fix muted protobuf compile errors by @thebentern in https://github.com/meshtastic/firmware/pull/8316
* Master backmerge by @thebentern in https://github.com/meshtastic/firmware/pull/8317
* chore(deps): update meshtastic/device-ui digest to 3fb7c0e by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8291
* Nodelist: choice of long or short name by @l0g-lab in https://github.com/meshtastic/firmware/pull/7926
* Ble reconnect prefetch bug fix, plus some speed enhancements by @h3lix1 in https://github.com/meshtastic/firmware/pull/8324
* Avoid exceeding allocated buffers when doing MQTT proxying by @dirkmueller in https://github.com/meshtastic/firmware/pull/8320
* Fix erroneous limiting of power in Ham Mode by @fifieldt in https://github.com/meshtastic/firmware/pull/8322
* Fix bug: can not detect battery status while using INA226 by @steven52880 in https://github.com/meshtastic/firmware/pull/8330
* rework sensor instantiation to saves memory by removing the static allocation by @Links2004 in https://github.com/meshtastic/firmware/pull/8054
* Fix multitude of warnings during builds on MeshTiny by @Xaositek in https://github.com/meshtastic/firmware/pull/8331
* Fix multitude of warnings during builds on MeshTiny by @Xaositek in https://github.com/meshtastic/firmware/pull/8331
* Revert "Fix Station G2 Lora Power Settings" by @thebentern in https://github.com/meshtastic/firmware/pull/8332
* Develop to master merge by @thebentern in https://github.com/meshtastic/firmware/pull/8337
* Update stale_bot.yml by @NomDeTom in https://github.com/meshtastic/firmware/pull/8333
* Update meshtastic/device-ui digest to 19b7855 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8346
* Add a general-purpose packet cache by @erayd in https://github.com/meshtastic/firmware/pull/8341
* Guarding PhoneAPI node-info staging with mutex to prevent BLE future foot-gun by @h3lix1 in https://github.com/meshtastic/firmware/pull/8354
* Fix portduino native builds by @miketweaver in https://github.com/meshtastic/firmware/pull/8355
* Log the lora frequency error when receiving a packet. by @jp-bennett in https://github.com/meshtastic/firmware/pull/8343
* Bind python version to 3.13 by @Paplewski in https://github.com/meshtastic/firmware/pull/8362
* Update actions/setup-node action to v6 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8339
* Upgrade trunk by @github-actions[bot] in https://github.com/meshtastic/firmware/pull/8340
* Ignore MQTT Client Proxy messages while not in sendpackets state by @thebentern in https://github.com/meshtastic/firmware/pull/8358
* Force CannedMessages to another node to be a PKI DM by @jp-bennett in https://github.com/meshtastic/firmware/pull/8373
* Update meshtastic/web to v2.6.7 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8381
* Update DFRobot_RTU to v1.0.6 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8387
* Update mcr.microsoft.com/devcontainers/cpp Docker tag to v2 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8375
* Board support:  RAK3401+RAK13302 1-watt  by @DanielCao0 in https://github.com/meshtastic/firmware/pull/8140
* Fixed battery voltage to show missing decimals by @HarukiToreda in https://github.com/meshtastic/firmware/pull/8386
* Gating off BaseUI code for Screenless nodes and InkHUD by @HarukiToreda in https://github.com/meshtastic/firmware/pull/8384
* Added support for SugarCube device by @igorka48 in https://github.com/meshtastic/firmware/pull/8187
* Fix NimbleBluetooth reliability and performance by @compumike in https://github.com/meshtastic/firmware/pull/8385
* Update protobufs and classes by @github-actions[bot] in https://github.com/meshtastic/firmware/pull/8398

## New Contributors
* @l0g-lab made their first contribution in https://github.com/meshtastic/firmware/pull/7926
* @dirkmueller made their first contribution in https://github.com/meshtastic/firmware/pull/8320
* @steven52880 made their first contribution in https://github.com/meshtastic/firmware/pull/8330
* @miketweaver made their first contribution in https://github.com/meshtastic/firmware/pull/8355
* @Paplewski made their first contribution in https://github.com/meshtastic/firmware/pull/8362
* @igorka48 made their first contribution in https://github.com/meshtastic/firmware/pull/8187

**Full Changelog**: https://github.com/meshtastic/firmware/compare/v2.7.12.45f15b8...v2.7.13.ffb168b`;

const currentPrereleaseId = '2.7.13.ffb168b';

export const showPrerelease = true;

export const currentPrerelease = <FirmwareResource>{
  id: `v${currentPrereleaseId}`,
  title: `Meshtastic Firmware ${currentPrereleaseId} Pre-release`,
  zip_url: `https://github.com/meshtastic/firmware/releases/download/v${currentPrereleaseId}/firmware-${currentPrereleaseId}.zip`,
  release_notes: markdownContent,
};

export const vendorCobrandingTag = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow", "M5Stack", "NomadStar", "muzi"];
