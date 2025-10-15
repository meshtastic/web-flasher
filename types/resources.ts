import type { FirmwareResource } from './api';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const markdownContent = `
> [!IMPORTANT]
> This release disables device telemetry broadcasts over the mesh by default. If you want to opt back in, you will need to re-enable this in the apps.

##  🚀 What's Changed
* Update python Docker tag to v3.14 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8255
* Fix: Move #include "variant.h" to top of file (fixes #8276) by @ndoo in https://github.com/meshtastic/firmware/pull/8278
* Update meshtastic/device-ui digest to 6d8cc22 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8275
* Chore(deps): update github/codeql-action action to v4 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8250
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
* Chore(deps): update meshtastic/device-ui digest to 3fb7c0e by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8291
* Nodelist: choice of long or short name by @l0g-lab in https://github.com/meshtastic/firmware/pull/7926
* Ble reconnect prefetch bug fix, plus some speed enhancements by @h3lix1 in https://github.com/meshtastic/firmware/pull/8324
* Avoid exceeding allocated buffers when doing MQTT proxying by @dirkmueller in https://github.com/meshtastic/firmware/pull/8320
* Fix erroneous limiting of power in Ham Mode by @fifieldt in https://github.com/meshtastic/firmware/pull/8322
* Fix bug: can not detect battery status while using INA226 by @steven52880 in https://github.com/meshtastic/firmware/pull/8330
* Rework sensor instantiation to saves memory by removing the static allocation by @Links2004 in https://github.com/meshtastic/firmware/pull/8054
* Fix multitude of warnings during builds on MeshTiny by @Xaositek in https://github.com/meshtastic/firmware/pull/8331

## New Contributors
* @l0g-lab made their first contribution in https://github.com/meshtastic/firmware/pull/7926
* @dirkmueller made their first contribution in https://github.com/meshtastic/firmware/pull/8320
* @steven52880 made their first contribution in https://github.com/meshtastic/firmware/pull/8330

**Full Changelog**: https://github.com/meshtastic/firmware/compare/v2.7.12.45f15b8...v2.7.13.dbb439f`;

const currentPrereleaseId = '2.7.13.dbb439f';

export const showPrerelease = false;

export const currentPrerelease = <FirmwareResource>{
  id: `v${currentPrereleaseId}`,
  title: `Meshtastic Firmware ${currentPrereleaseId} Pre-release`,
  zip_url: `https://github.com/meshtastic/firmware/releases/download/v${currentPrereleaseId}/firmware-${currentPrereleaseId}.zip`,
  release_notes: markdownContent,
};

export const vendorCobrandingTag = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow", "M5Stack", "NomadStar", "muzi"];
