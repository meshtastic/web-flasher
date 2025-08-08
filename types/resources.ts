import type { FirmwareResource } from './api';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const markdownContent = `

## 🚀 Enhancements
* Unify the shutdown proceedure by @jp-bennett in https://github.com/meshtastic/firmware/pull/7393
* T-Deck Pro support by @mverch67 in https://github.com/meshtastic/firmware/pull/6936
* Text message rate limiting should return routing error instead by @thebentern in https://github.com/meshtastic/firmware/pull/7365
* WashTastic variant by @valzzu in https://github.com/meshtastic/firmware/pull/7450
* Set canned_message.enabled to true when setting defaults by @jp-bennett in https://github.com/meshtastic/firmware/pull/7414
* Add Trace Route on BaseUI by @whywilson in https://github.com/meshtastic/firmware/pull/7386
* Add BRT3 timezone option to TZPicker menu by @barbabarros in https://github.com/meshtastic/firmware/pull/7438
* Set firmware edition (for events) from userprefs by @thebentern in https://github.com/meshtastic/firmware/pull/7488
* Heartbeat response by @thebentern in https://github.com/meshtastic/firmware/pull/7506
* Airoha GPS - ignore estimated fixes by @fifieldt in https://github.com/meshtastic/firmware/pull/7429
* [7353] Add all telemetry fields to json output by @rradillen in https://github.com/meshtastic/firmware/pull/7363
* Event mode - limit smart position updates to at most every 5m by @powersjcb in https://github.com/meshtastic/firmware/pull/7505
* Move BLE toggle menu option and add confirmation for canned messages in L1 by @thebentern in https://github.com/meshtastic/firmware/pull/7516
* Initial support for the ThinkNode M5 by @jp-bennett in https://github.com/meshtastic/firmware/pull/7502

## 🐛 Bug fixes and maintenace
* ESP32: Initial sort variants by platform by @vidplace7 in https://github.com/meshtastic/firmware/pull/7340
* ESP32c3: Migrate variants to new structure by @vidplace7 in https://github.com/meshtastic/firmware/pull/7342
* Misc cppcheck fixes by @jp-bennett in https://github.com/meshtastic/firmware/pull/7370
* RP2040/RP2350: Migrate variants to new structure by @vidplace7 in https://github.com/meshtastic/firmware/pull/7345
* STM32: Migrate variants to new structure by @vidplace7 in https://github.com/meshtastic/firmware/pull/7389
* UDP for RAK4631 Eth Gw and the t-eth-elite. Solves #7149 by @caveman99 in https://github.com/meshtastic/firmware/pull/7385
* Restore High Resolution Hour Hand by @Xaositek in https://github.com/meshtastic/firmware/pull/7392
* Fix UDP builds on nRF by @caveman99 in https://github.com/meshtastic/firmware/pull/7394
* ESP32s3: Migrate variants to new structure by @vidplace7 in https://github.com/meshtastic/firmware/pull/7343
* ARCH_STM32*WL* by @vidplace7 in https://github.com/meshtastic/firmware/pull/7397
* Actions: pull_request_target is fun by @vidplace7 in https://github.com/meshtastic/firmware/pull/7398
* Renovate: Use github-tags for XPowersLib updates by @vidplace7 in https://github.com/meshtastic/firmware/pull/7411
* nRF52840: Migrate variants to new structure by @vidplace7 in https://github.com/meshtastic/firmware/pull/7396
* Migrate remaining variants to new dir structure by @vidplace7 in https://github.com/meshtastic/firmware/pull/7412
* Moves the shutdown thread into the Power class, make shutdown and reboot private by @jp-bennett in https://github.com/meshtastic/firmware/pull/7415
* Upgrade trunk by @github-actions[bot] in https://github.com/meshtastic/firmware/pull/7420
* Add a verbose mode flag to meshtasticd by @jp-bennett in https://github.com/meshtastic/firmware/pull/7416
* Update protobufs and classes by @github-actions[bot] in https://github.com/meshtastic/firmware/pull/7422
* AG3335 GPS: Use NAVIC in India/Nepal, L1+L5 elsewhere. by @fifieldt in https://github.com/meshtastic/firmware/pull/7413
* Use platformio-core to build the matrix by @vidplace7 in https://github.com/meshtastic/firmware/pull/7424
* Deprecate disable_triple_click config by @jp-bennett in https://github.com/meshtastic/firmware/pull/7425
* Update meshtastic/device-ui digest to c75d545 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7435
* Add Nepal 865 MHz to 868 MHz by @WOD-MN in https://github.com/meshtastic/firmware/pull/7380
* Add BR_902, Brazil 902MHz-907.5MHz by @fifieldt in https://github.com/meshtastic/firmware/pull/7399
* Add NP_865 and BR_902 to region picker by @barbabarros in https://github.com/meshtastic/firmware/pull/7434
* Actions: Combine embedded builds // split by variant subdir by @vidplace7 in https://github.com/meshtastic/firmware/pull/7417
* Take control of our PRs! by @vidplace7 in https://github.com/meshtastic/firmware/pull/7445
* Fix timezone definition for UTC in TZPicker function by @barbabarros in https://github.com/meshtastic/firmware/pull/7442
* Fix MHz label by @Xaositek in https://github.com/meshtastic/firmware/pull/7455
* Build RP2350 (Pi Pico 2) by @vidplace7 in https://github.com/meshtastic/firmware/pull/7441
* Actions: Enforce PR labels by @vidplace7 in https://github.com/meshtastic/firmware/pull/7379
* Rename Platformio.ini to platformio.ini | WashTastic by @valzzu in https://github.com/meshtastic/firmware/pull/7468
* Fix MQTT config bugs by @thebentern in https://github.com/meshtastic/firmware/pull/7446
* Clear position on GPS deactivation, unless using fixed position by @fifieldt in https://github.com/meshtastic/firmware/pull/7464
* Validate Serial config console override modes by @thebentern in https://github.com/meshtastic/firmware/pull/7470
* Bugfix Add rssi and snr to the store and forward code. by @mikecarper in https://github.com/meshtastic/firmware/pull/7462
* Santa may be checking his list twice, but we only need this in the platformio.ini by @caveman99 in https://github.com/meshtastic/firmware/pull/7490
* NodeDB count on MyNodeInfo for client progress reporting by @thebentern in https://github.com/meshtastic/firmware/pull/7489
* Core portnums rebroadcast mode whitelist instead of blacklist by @thebentern in https://github.com/meshtastic/firmware/pull/7487
* DEBUG_MUTE correctness by @Stary2001 in https://github.com/meshtastic/firmware/pull/7492
* Workaround Webserver needing to stay up while Wifi is being turned off by @fifieldt in https://github.com/meshtastic/firmware/pull/7484
* Update platformio/ststm32 to v19.3.0 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7512
* Bugfix Syntax error: "(" unexpected in device-update.sh by @mikecarper in https://github.com/meshtastic/firmware/pull/7514
* Remember destination fix by @HarukiToreda in https://github.com/meshtastic/firmware/pull/7427
* 128row display by @caveman99 in https://github.com/meshtastic/firmware/pull/7511
* Rv3028 rtc fix by @tg-mw in https://github.com/meshtastic/firmware/pull/7524
* Only toggle screen wake, don't break banners by @Xaositek in https://github.com/meshtastic/firmware/pull/7545
* Improve words within logging for onscreen message scroll cache by @Xaositek in https://github.com/meshtastic/firmware/pull/7548
* Fix: ina226 was not calibrated during init by @mrab in https://github.com/meshtastic/firmware/pull/7547
* Rather than mysteriously rebooting, regenerate the keys and inform the user by @jp-bennett in https://github.com/meshtastic/firmware/pull/7558
* Avoid acquiring lock twice by @oscgonfer in https://github.com/meshtastic/firmware/pull/7555
* Chore(deps): update adafruit shtc3 to v1.0.2 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/7557
* Fix a crash on Native reboot by @jp-bennett in https://github.com/meshtastic/firmware/pull/7570`;

const currentPrereleaseId = '2.7.4.8568b56';

export const showPrerelease = true;

export const currentPrerelease = <FirmwareResource>{
  id: `v${currentPrereleaseId}`,
  title: `Meshtastic Firmware ${currentPrereleaseId} Pre-release`,
  zip_url: `https://github.com/meshtastic/firmware/releases/download/v${currentPrereleaseId}/firmware-${currentPrereleaseId}.zip`,
  release_notes: markdownContent,
};

export const vendorCobrandingTag = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow"];
