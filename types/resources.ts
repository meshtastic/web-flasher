import type { FirmwareResource } from './api';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const markdownContent = `
## 🚀  What's Changed
* Add support for new ESP32 DIY variant 9m2ibr_aprs_lora_tracker by @ndoo in https://github.com/meshtastic/firmware/pull/7828
* T-Lora Pager: Fix keyboard and improve rotary wheel haptic by @mverch67 in https://github.com/meshtastic/firmware/pull/7869
* Fix esptool detection and baud rate issues in Windows batch scripts by @jeremiah-k in https://github.com/meshtastic/firmware/pull/7856
* Upon receiving ACK/reply directly, only update next-hop if we’re the *sole* relayer by @GUVWAF in https://github.com/meshtastic/firmware/pull/7859
* Fix merge conflict with test changes by @fifieldt in https://github.com/meshtastic/firmware/pull/7902
* Fix: RotaryEncoder uninitialized kbchar by @mverch67 in https://github.com/meshtastic/firmware/pull/7889
* Chore(deps): update meshtastic/device-ui digest to 233d18e by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7890
* Reorganize 8MB partition for MUI devices by @mverch67 in https://github.com/meshtastic/firmware/pull/7860
* Chore(deps): update meshtastic/device-ui digest to 3677476 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7925
* Disable ATAK Plugin module for non-TAK roles by @thebentern in https://github.com/meshtastic/firmware/pull/7928
* Use char buffer for probeResponse by @thebentern in https://github.com/meshtastic/firmware/pull/7870
* Make phone queues use a static pointer queue by @thebentern in https://github.com/meshtastic/firmware/pull/7919
* Add LOG_HEAP log type, and more heap debug messages by @jp-bennett in https://github.com/meshtastic/firmware/pull/7937
* Unify build epoch to add flag in platformio-custom.py by @thebentern in https://github.com/meshtastic/firmware/pull/7917
* Put guards in place around debug heap operations by @thebentern in https://github.com/meshtastic/firmware/pull/7955
* Static memory pool allocation by @thebentern in https://github.com/meshtastic/firmware/pull/7966
* Update meshtastic-esp8266-oled-ssd1306 digest to 0cbc26b by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7977
* Fix json report crashes on esp32 by @thebentern in https://github.com/meshtastic/firmware/pull/7978
* Scale probe buffer size based on current baud rate by @thebentern in https://github.com/meshtastic/firmware/pull/7975
* Fix overflow of time value by @thebentern in https://github.com/meshtastic/firmware/pull/7984
`;

const currentPrereleaseId = '2.7.9.70724be';

export const showPrerelease = true;

export const currentPrerelease = <FirmwareResource>{
  id: `v${currentPrereleaseId}`,
  title: `Meshtastic Firmware ${currentPrereleaseId} Pre-release`,
  zip_url: `https://github.com/meshtastic/firmware/releases/download/v${currentPrereleaseId}/firmware-${currentPrereleaseId}.zip`,
  release_notes: markdownContent,
};

export const vendorCobrandingTag = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow"];
