import type { FirmwareResource } from './api';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const markdownContent = `

## 🚀 What's Changed
* Bugfix: Don't toggle BLE when choosing active state by @jp-bennett in https://github.com/meshtastic/firmware/pull/8579
* chore(deps): update meshtastic/device-ui digest to 28167c6 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8583
* Only call stopNow if we're nagging by @thebentern in https://github.com/meshtastic/firmware/pull/8601
* Upgrade trunk by @github-actions[bot] in https://github.com/meshtastic/firmware/pull/8606
* Clean up GPS toggle logging by @jp-bennett in https://github.com/meshtastic/firmware/pull/8629
* Reset the calibration data back to 0 when doing a compass calibration by @jp-bennett in https://github.com/meshtastic/firmware/pull/8648
* chore(deps): update dorny/test-reporter action to v2.2.0 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8637
* Fix RPM builds by @vidplace7 in https://github.com/meshtastic/firmware/pull/8659
* Linux: Fix silly EPEL9 mistake by @vidplace7 in https://github.com/meshtastic/firmware/pull/8660
* Fix ble rssi crash by @thebentern in https://github.com/meshtastic/firmware/pull/8661
* Unify uptime formatting by @jasonbcox in https://github.com/meshtastic/firmware/pull/8677
* CI: Submit Bump Version PR against master by @vidplace7 in https://github.com/meshtastic/firmware/pull/8668
* chore(deps): update meshtastic-esp8266-oled-ssd1306 digest to 2887bf4 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8688
* Actually respect wake_on_motion setting by @jp-bennett in https://github.com/meshtastic/firmware/pull/8690
* Add a reset pulse signal to the OLED. by @Quency-D in https://github.com/meshtastic/firmware/pull/8691
* Missed one by @thebentern in https://github.com/meshtastic/firmware/pull/8694
* nrf52 watchdog (attempt #2) by @SebKuzminsky in https://github.com/meshtastic/firmware/pull/8670
* Fix build when MESHTASTIC_EXCLUDE_PKI is defined by @jasonbcox in https://github.com/meshtastic/firmware/pull/8698
* Fix MenuHandler when MESHTASTIC_EXCLUDE_PKI is defined by @jasonbcox in https://github.com/meshtastic/firmware/pull/8701
* Update protobufs and classes by @github-actions[bot] in https://github.com/meshtastic/firmware/pull/8707
* Add Thinknode M6 by @caveman99 in https://github.com/meshtastic/firmware/pull/8705
* Develop to master by @thebentern in https://github.com/meshtastic/firmware/pull/8713
* Update Kongduino-Adafruit_nRFCrypto digest to 8cde718 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8708
* Update actions/checkout action to v6 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8695
* Add WisMesh Tag OCV array by @Avi0n in https://github.com/meshtastic/firmware/pull/8646
* R1 Neo - Added OCV_ARRAY from measured discharge curve testing + update ADC multiplier by @simon-muzi in https://github.com/meshtastic/firmware/pull/8716
* Log error if startReceive fails in LR11x0Interface by @jp-bennett in https://github.com/meshtastic/firmware/pull/8718
* Tweak OCV_ARRAY 100% voltage to take into account charger hysteresis and voltage sag after charge by @simon-muzi in https://github.com/meshtastic/firmware/pull/8720
* Thinknode M3 support against master by @jp-bennett in https://github.com/meshtastic/firmware/pull/8630
* M6 leds by @jp-bennett in https://github.com/meshtastic/firmware/pull/8742
* Further fix compass calibration by @jp-bennett in https://github.com/meshtastic/firmware/pull/8740
* More quickly hide "Shutting Down" to prevent it showing on Eink sleep screen by @Xaositek in https://github.com/meshtastic/firmware/pull/8749
* Prevent double-registering of Rotary Encoder on TLora Pager by @thebentern in https://github.com/meshtastic/firmware/pull/8746
* 3401 fix by @caveman99 in https://github.com/meshtastic/firmware/pull/8755
* Add support for muzi-base by @jp-bennett in https://github.com/meshtastic/firmware/pull/8753
* Add requestFocus() in CannedMessages by @jp-bennett in https://github.com/meshtastic/firmware/pull/8770
* Update Sensirion Core to v0.7.2 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8551
* Update INA226 to v0.6.5 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8645
* Update NonBlockingRTTTL to v1.4.0 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8541
* Update platformio/ststm32 to v19.4.0 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8433
* adding support for the ST7796 + creating a new variant of the T-beam by @Nasimovy in https://github.com/meshtastic/firmware/pull/6575
* Correct vertical alignment for Muzi_Base on On Screen Keyboard by @Xaositek in https://github.com/meshtastic/firmware/pull/8774

## New Contributors
* @Avi0n made their first contribution in https://github.com/meshtastic/firmware/pull/8646
* @simon-muzi made their first contribution in https://github.com/meshtastic/firmware/pull/8716

**Full Changelog**: https://github.com/meshtastic/firmware/compare/v2.7.15.567b8ea...v2.7.16.a597230`;

const currentPrereleaseId = '2.7.16.a597230';

export const showPrerelease = false;

export const currentPrerelease = <FirmwareResource>{
  id: `v${currentPrereleaseId}`,
  title: `Meshtastic Firmware ${currentPrereleaseId} Pre-release`,
  zip_url: `https://github.com/meshtastic/firmware/releases/download/v${currentPrereleaseId}/firmware-${currentPrereleaseId}.zip`,
  release_notes: markdownContent,
};

export const vendorCobrandingTag = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow", "M5Stack", "NomadStar", "muzi"];
