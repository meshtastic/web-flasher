import type { FirmwareResource } from './api';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const markdownContent = `

## 🚀  What's Changed
* Clean up GPS toggle logging by @jp-bennett in https://github.com/meshtastic/firmware/pull/8629
* Reset the calibration data back to 0 when doing a compass calibration by @jp-bennett in https://github.com/meshtastic/firmware/pull/8648
* Chore(deps): update dorny/test-reporter action to v2.2.0 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8637
* Fix RPM builds by @vidplace7 in https://github.com/meshtastic/firmware/pull/8659
* Linux: Fix silly EPEL9 mistake by @vidplace7 in https://github.com/meshtastic/firmware/pull/8660
* Fix ble rssi crash by @thebentern in https://github.com/meshtastic/firmware/pull/8661
* Mqtt: do not try to send packets when it disconnected by @omgbebebe in https://github.com/meshtastic/firmware/pull/8658
* Persist favourites on NodeDB reset by @ford-jones in https://github.com/meshtastic/firmware/pull/8292
* Don't ack messages when mqtt client proxy is on but only uplink by @RCGV1 in https://github.com/meshtastic/firmware/pull/8578
* Add API types, state, and log message in Debug screen. Added persistent "Connected" icon by @jp-bennett in https://github.com/meshtastic/firmware/pull/8576
* Drop PKI acks if there is no downlink on MQTTClientProxy by @RCGV1 in https://github.com/meshtastic/firmware/pull/8580
* Add the Heltec v4 expansion box. by @Quency-D in https://github.com/meshtastic/firmware/pull/8539
* Update to Pro-micro variants by @NomDeTom in https://github.com/meshtastic/firmware/pull/8600
* Cleanup unnecessary global dereferencing in CryptoEngine by @jasonbcox in https://github.com/meshtastic/firmware/pull/8611
* Fix null pointer dereference in radio chip region check by @Andrik45719 in https://github.com/meshtastic/firmware/pull/8613
* Feat/6704 neighbor info on demand by @DaneEvans in https://github.com/meshtastic/firmware/pull/8523
* Remove fixed scaling in Digital Clock by @Xaositek in https://github.com/meshtastic/firmware/pull/8620
* Allow Preserving Favorites in BaseUI menus by @Xaositek in https://github.com/meshtastic/firmware/pull/8647
* native: Try to look for a config file based on Raspberry Pi HAT vendor by @Stary2001 in https://github.com/meshtastic/firmware/pull/8608
* Remove gating for Display Options by @Xaositek in https://github.com/meshtastic/firmware/pull/8651
* mqtt: do not try to send packets when it disconnected by @omgbebebe in https://github.com/meshtastic/firmware/pull/8658

## New Contributors
* @weebl2000 made their first contribution in https://github.com/meshtastic/firmware/pull/8560
* @omgbebebe made their first contribution in https://github.com/meshtastic/firmware/pull/8658
* @viric made their first contribution in https://github.com/meshtastic/firmware/pull/7882

**Full Changelog**: https://github.com/meshtastic/firmware/compare/v2.7.13.597fa0b...v2.7.15.567b8ea`;

const currentPrereleaseId = '2.7.15.567b8ea';

export const showPrerelease = false;

export const currentPrerelease = <FirmwareResource>{
  id: `v${currentPrereleaseId}`,
  title: `Meshtastic Firmware ${currentPrereleaseId} Pre-release`,
  zip_url: `https://github.com/meshtastic/firmware/releases/download/v${currentPrereleaseId}/firmware-${currentPrereleaseId}.zip`,
  release_notes: markdownContent,
};

export const vendorCobrandingTag = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow", "M5Stack", "NomadStar", "muzi"];
