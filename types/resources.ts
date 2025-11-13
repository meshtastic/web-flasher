import type { FirmwareResource } from './api';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const markdownContent = `

## 🚀 What's Changed
* Add the identification code for the DA217 triaxial accelerometer. by @Quency-D in https://github.com/meshtastic/firmware/pull/8526
* fix strlcpy compile error in Ubuntu 22.04 by @mverch67 in https://github.com/meshtastic/firmware/pull/8520
* Packaging: Add libbsd where needed by @vidplace7 in https://github.com/meshtastic/firmware/pull/8533
* Add support for RAK_WISMESH_TAP_V2 and RAK3401 hardware models by @DanielCao0 in https://github.com/meshtastic/firmware/pull/8537
* Fix: missing T-Deck Pro key '0' by @mverch67 in https://github.com/meshtastic/firmware/pull/8564
* Store hop/mqtt/transport mechanism info in S&F by @weebl2000 in https://github.com/meshtastic/firmware/pull/8560
* Reject legacy text message DMs by @jp-bennett in https://github.com/meshtastic/firmware/pull/8562
* AddFromContact: Don't auto-favorite when CLIENT_BASE; don't update last_heard unless CLIENT_BASE by @compumike in https://github.com/meshtastic/firmware/pull/8495
* Persist favourites on NodeDB reset by @ford-jones in https://github.com/meshtastic/firmware/pull/8292
* Don't ack messages when mqtt client proxy is on but only uplink by @RCGV1 in https://github.com/meshtastic/firmware/pull/8578
* Add API types, state, and log message in Debug screen. Added persistent "Connected" icon by @jp-bennett in https://github.com/meshtastic/firmware/pull/8576
* Drop PKI acks if there is no downlink on MQTTClientProxy by @RCGV1 in https://github.com/meshtastic/firmware/pull/8580
* Add the Heltec v4 expansion box. by @Quency-D in https://github.com/meshtastic/firmware/pull/8539
* Update platform-native for WIFi lib fix by @jp-bennett in https://github.com/meshtastic/firmware/pull/8544
* Reject legacy text message DMs by @jp-bennett in https://github.com/meshtastic/firmware/pull/8562
* Bugfix: Don't toggle BLE when choosing active state by @jp-bennett in https://github.com/meshtastic/firmware/pull/8579
* Try-fix traceroute panic by @thebentern in https://github.com/meshtastic/firmware/pull/8568
* chore(deps): update meshtastic/device-ui digest to 28167c6 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8583

**Full Changelog**: https://github.com/meshtastic/firmware/compare/v2.7.12.45f15b8...v2.7.14.1c0c6b2
`;

const currentPrereleaseId = '2.7.14.e959000';

export const showPrerelease = false;

export const currentPrerelease = <FirmwareResource>{
  id: `v${currentPrereleaseId}`,
  title: `Meshtastic Firmware ${currentPrereleaseId} Pre-release`,
  zip_url: `https://github.com/meshtastic/firmware/releases/download/v${currentPrereleaseId}/firmware-${currentPrereleaseId}.zip`,
  release_notes: markdownContent,
};

export const vendorCobrandingTag = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow", "M5Stack", "NomadStar", "muzi"];
