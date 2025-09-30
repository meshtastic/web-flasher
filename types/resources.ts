import type { FirmwareResource } from './api';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const markdownContent = `

## 🚀  What's Changed
* On screen keyboard by @thebentern in https://github.com/meshtastic/firmware/pull/7705
* Update meshtastic/device-ui digest to 0f32b64 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7723
* Update caveman99-stm32-Crypto digest to 1aa30eb by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7725
* Add more text message test cases for meshpacket serializer by @TN666 in https://github.com/meshtastic/firmware/pull/7709
* Reduce power of EU433 to 10dBm by @fifieldt in https://github.com/meshtastic/firmware/pull/7733
* Backmerge to develop by @thebentern in https://github.com/meshtastic/firmware/pull/7744
* Log more information about ignored packet by @notmasteryet in https://github.com/meshtastic/firmware/pull/7718
* Setup ESP32 PM-specific capability flags by @m1nl in https://github.com/meshtastic/firmware/pull/7747
* Add more test case for encrypted packet test by @TN666 in https://github.com/meshtastic/firmware/pull/7745
* Backmerge by @thebentern in https://github.com/meshtastic/firmware/pull/7773
* Bump release version by @github-actions[bot] in https://github.com/meshtastic/firmware/pull/7777
* BaseUI Show/Hide Frame Functionality by @Xaositek in https://github.com/meshtastic/firmware/pull/7382
* We don't gotTime if time is 2019. by @fifieldt in https://github.com/meshtastic/firmware/pull/7772
* Add On-Screen Keyboard for UpDown Encoder and Rotary Encoder. by @whywilson in https://github.com/meshtastic/firmware/pull/7762
* Fix InputEvent variable usage with out initialization (random key events while using rotery encoder) by @Links2004 in https://github.com/meshtastic/firmware/pull/8015
* Allow Left / Right Events for selection and improve encoder responsives by @Links2004 in https://github.com/meshtastic/firmware/pull/8016
* Fix build fail on develop branch by @WillyJL in https://github.com/meshtastic/firmware/pull/8043
* Fix more build failures by @WillyJL in https://github.com/meshtastic/firmware/pull/8044
* Fix build with HAS_TELEMETRY 0 by @Links2004 in https://github.com/meshtastic/firmware/pull/8051
* Move HTTP contentTypes to Flash - saves 768 Bytes of RAM by @Links2004 in https://github.com/meshtastic/firmware/pull/8055
* Fix: use lora.use_preset config to get name by @GUVWAF in https://github.com/meshtastic/firmware/pull/8057
* Resolve many warnings for BaseUI during builds by @Xaositek in https://github.com/meshtastic/firmware/pull/8063
* Fix Rotary Encoder Button by @Links2004 in https://github.com/meshtastic/firmware/pull/8001
* Add another seeed_xiao_nrf52840_kit build environment for I2C pinout by @NomDeTom in https://github.com/meshtastic/firmware/pull/8036
* Add heltec_v4 board. by @Quency-D in https://github.com/meshtastic/firmware/pull/7845
* Fix build errors by @Xaositek in https://github.com/meshtastic/firmware/pull/8067
* Introduce Radio Preset elections through BaseUI by @Xaositek in https://github.com/meshtastic/firmware/pull/8071
* Allow label enforcement job to run on self-hosted runners by @fifieldt in https://github.com/meshtastic/firmware/pull/7909
* Bump release version by @github-actions[bot] in https://github.com/meshtastic/firmware/pull/8100
* Upgrade trunk by @github-actions[bot] in https://github.com/meshtastic/firmware/pull/8094
* Add three expansion screens for heltec mesh solar. by @Quency-D in https://github.com/meshtastic/firmware/pull/7995
* Update Adafruit BusIO to v1.17.4 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8098
* Fix 2.4GHz reconfiguration on LR11xx by @Stary2001 in https://github.com/meshtastic/firmware/pull/8102
* Feat/0-cost hops for favorite routers by @h3lix1 in https://github.com/meshtastic/firmware/pull/7992
* If a packet is heard multiple times, rebroadcast using the highest hop limit by @erayd in https://github.com/meshtastic/firmware/pull/5534
* Make sure next-hop is only set when they received us directly by @GUVWAF in https://github.com/meshtastic/firmware/pull/8053
* Reduce cpu load by optimizing OSThread runOnce calls by @Links2004 in https://github.com/meshtastic/firmware/pull/8101
* Correct inverted mute icon by @Xaositek in https://github.com/meshtastic/firmware/pull/8111
* BaseUI - Saving GPS Format changes are required by @Xaositek in https://github.com/meshtastic/firmware/pull/8122
* Properly output the TCXO Voltage in yaml by @jp-bennett in https://github.com/meshtastic/firmware/pull/8128
* I2S: Fix silent RTTTL regression by @WillyJL in https://github.com/meshtastic/firmware/pull/8129
* Revert cross-preset default-key bridging with UDP and disable UDP by default by @thebentern in https://github.com/meshtastic/firmware/pull/8130
* Develop --> Master by @fifieldt in https://github.com/meshtastic/firmware/pull/8110
* Range-test: Clean on reboot by @ford-jones in https://github.com/meshtastic/firmware/pull/7703
* UIRenderer: display "No GPS present" only on the first line to avoid duplication  by @plashchynski in https://github.com/meshtastic/firmware/pull/8136
* Remove memcpy by @dfsx1 in https://github.com/meshtastic/firmware/pull/8079
* Correct altitudeLine getting clobbered in the great merge by @Xaositek in https://github.com/meshtastic/firmware/pull/8138
* Update protobufs and classes by @github-actions[bot] in https://github.com/meshtastic/firmware/pull/8142
* Bug / Send upgraded (duplicate) packets to phone if the queue removal failed. by @h3lix1 in https://github.com/meshtastic/firmware/pull/8148
* Finish deprecating the Repeater role behavior by @thebentern in https://github.com/meshtastic/firmware/pull/8144
* Fix Heltec V3 missed button presses by @thebentern in https://github.com/meshtastic/firmware/pull/8167

## New Contributors
* @h3lix1 made their first contribution in https://github.com/meshtastic/firmware/pull/7992

**Full Changelog**: https://github.com/meshtastic/firmware/compare/v2.7.10.94d4bdf...v2.7.11.ee68575`;

const currentPrereleaseId = '2.7.11.ee68575';

export const showPrerelease = true;

export const currentPrerelease = <FirmwareResource>{
  id: `v${currentPrereleaseId}`,
  title: `Meshtastic Firmware ${currentPrereleaseId} Pre-release`,
  zip_url: `https://github.com/meshtastic/firmware/releases/download/v${currentPrereleaseId}/firmware-${currentPrereleaseId}.zip`,
  release_notes: markdownContent,
};

export const vendorCobrandingTag = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow", "M5Stack", "NomadStar"];
