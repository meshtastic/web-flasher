import type { FirmwareResource } from './api';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const markdownContent = `
##  🚀 Enhancements
* Add onboard message for devices with screens by @jp-bennett in https://github.com/meshtastic/firmware/pull/7655
* Only gate PKC behind the simradio CLI flag by @jp-bennett in https://github.com/meshtastic/firmware/pull/7681
* Add SDL option to BaseUI on Native by @jp-bennett in https://github.com/meshtastic/firmware/pull/7568
* Initial stab at rak6421 autoconf by @jp-bennett in https://github.com/meshtastic/firmware/pull/7691
* Update meshtastic/device-ui digest to 3dc7cf3 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7698
* Support for T-Echo Lite, credits to @Szetya for doing all the heavy lifting! by @caveman99 in https://github.com/meshtastic/firmware/pull/7636
* Add more text message test cases for meshpacket serializer by @TN666 in https://github.com/meshtastic/firmware/pull/7709
* Initial attempt to get rfswitch working on Portduino by @jp-bennett in https://github.com/meshtastic/firmware/pull/7663
* Don't update the NodeDB if the nodeinfo has a mismatching public key by @jp-bennett in https://github.com/meshtastic/firmware/pull/7652

## 🐛  Bug fixes and maintenance
* Fix 'buildroot' compiles (OpenWRT) by @vidplace7 in https://github.com/meshtastic/firmware/pull/7620
* Fix: apply 180 degree hw rotation for Indicator BaseUI by @mverch67 in https://github.com/meshtastic/firmware/pull/7660
* Update platform-native digest to cd32f4e by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7662
* Move heartbeat response before !available guard. by @jake-b in https://github.com/meshtastic/firmware/pull/7672
* Docker: fix web assets location by @vidplace7 in https://github.com/meshtastic/firmware/pull/7683
* Update meshtastic-esp8266-oled-ssd1306 diges
* Docker: Update Debian images to trixie by @vidplace7 in https://github.com/meshtastic/firmware/pull/7621
* Fix Tracerouter warnings by @thebentern in https://github.com/meshtastic/firmware/pull/7637
* Don't include OLED fonts for international character sets by default by @thebentern in https://github.com/meshtastic/firmware/pull/7639
* Fix marking LoRa transport mechanism by @GUVWAF in https://github.com/meshtastic/firmware/pull/7634
* Thinknode button and backlight fixes by @jp-bennett in https://github.com/meshtastic/firmware/pull/7641
* Update protobufs and classes by @github-actions[bot] in https://github.com/meshtastic/firmware/pull/7647
* Remove JSON serialization from most NRF52 targets by @thebentern in https://github.com/meshtastic/firmware/pull/7640
* Wait for lead up before enable longlong action by @jp-bennett in https://github.com/meshtastic/firmware/pull/7648
t to 9573abb by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7686
* Update meshtastic/device-ui digest to 8f5094b by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7633
* Update caveman99-stm32-Crypto digest to 1aa30eb by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7725
* Renovate: Always use master as the base. by @vidplace7 in https://github.com/meshtastic/firmware/pull/7726
`;

const currentPrereleaseId = '2.7.6.3d825c5';

export const showPrerelease = false;

export const currentPrerelease = <FirmwareResource>{
  id: `v${currentPrereleaseId}`,
  title: `Meshtastic Firmware ${currentPrereleaseId} Pre-release`,
  zip_url: `https://github.com/meshtastic/firmware/releases/download/v${currentPrereleaseId}/firmware-${currentPrereleaseId}.zip`,
  release_notes: markdownContent,
};

export const vendorCobrandingTag = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow"];
