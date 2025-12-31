import type { FirmwareResource } from './api';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const markdownContent = `
> [!WARNING]
> If you experience immediate a boot-loop or bluetooth pairing failures after updating, this likely indicates that you need to forget the bluetooth pairing and/or perform a full erase and flash.

## 🚀 What's Changed
* Support overriding GPS serial pins on all architectures by @Stary2001 in https://github.com/meshtastic/firmware/pull/8486
* Swap GPS pins for GPS TX/RX only for T114/T-Echo by @Xaositek in https://github.com/meshtastic/firmware/pull/8751
* Remove native from the build, and remove the required permissions by @NomDeTom in https://github.com/meshtastic/firmware/pull/8685
* Swap the GPS serial port pins. by @Quency-D in https://github.com/meshtastic/firmware/pull/8756
* More GPS pin flips for devices by @Xaositek in https://github.com/meshtastic/firmware/pull/8760
* Remove screen activation in powerExit function by @jp-bennett in https://github.com/meshtastic/firmware/pull/8779
* Add LOG_POWERFSM and LOG_INPUT debug macros by @jp-bennett in https://github.com/meshtastic/firmware/pull/8791
* Fix ifdef statement after ST7796 merge to resolve screen color issues by @Xaositek in https://github.com/meshtastic/firmware/pull/8796
* Update dorny/test-reporter action to v2.3.0 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8809
* InkHUD: Replace assert in UTF8 decoder to prevent unexpected reboot by @HarukiToreda in https://github.com/meshtastic/firmware/pull/8807
* Update meshtastic/device-ui digest to 3bf3322 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8814
* tryfix screen.cpp ifdefs by @jp-bennett in https://github.com/meshtastic/firmware/pull/8816
* Add WiFi Toggle to System frame to re-enable by @Xaositek in https://github.com/meshtastic/firmware/pull/8802
* #if defined conditions for WiFi by @jp-bennett in https://github.com/meshtastic/firmware/pull/8815
* Add initial support for Hackaday Communicator by @jp-bennett in https://github.com/meshtastic/firmware/pull/8771
* M5Stack UnitC6L - Enabled MQTT and WEBSERVER by default by @RikerZhu in https://github.com/meshtastic/firmware/pull/8679
* Initial Chatter 2.0 fix for baseUI by @HarukiToreda in https://github.com/meshtastic/firmware/pull/8615
* Make GPS_TX_PIN the serial TX and GPS_RX_PIN the serial RX for all NRF variants by @Stary2001 in https://github.com/meshtastic/firmware/pull/8772
* Update XPowersLib to v0.3.2 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8823
* RPM: Fix broken builds (bad backmerge) by @vidplace7 in https://github.com/meshtastic/firmware/pull/8787
* Flags and scripts for size reduction on NRF52 -> Currently targeting … by @thebentern in https://github.com/meshtastic/firmware/pull/8825
* Plain RAK4631 should not compile EInk and TFT display code by @thebentern in https://github.com/meshtastic/firmware/pull/8811
* Fix for high power drain after shutdown on Heltec T114.  by @rbomze in https://github.com/meshtastic/firmware/pull/8800
* Bump release version by @github-actions[bot] in https://github.com/meshtastic/firmware/pull/8786
* Move everything from /arch to /variant by @jp-bennett in https://github.com/meshtastic/firmware/pull/8831
* Move device specific OCV curves to their respective device.h by @jp-bennett in https://github.com/meshtastic/firmware/pull/8834
* Add 'cleanup' to required PR labels by @jp-bennett in https://github.com/meshtastic/firmware/pull/8835
* Don't scale up the frequency of telemetry sending by @RCGV1 in https://github.com/meshtastic/firmware/pull/8664
* Update actions/stale action to v10.1.1 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8848
* Update alpine Docker tag to v3.23 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8853
* Promicro documentation update by @NomDeTom in https://github.com/meshtastic/firmware/pull/8864
* Optimization flags for all NRF52 targets to reduce code size by @Donix212 in https://github.com/meshtastic/firmware/pull/8854
* Update meshtastic/device-ui digest to 4fb5f24 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8862
* Update protobufs and classes by @github-actions[bot] in https://github.com/meshtastic/firmware/pull/8871
* promicro doesn't need limiting by @NomDeTom in https://github.com/meshtastic/firmware/pull/8873
* Enable USB_MODE to acknowledge RTS/DTR reset signal from esptool for heltec-v4 by @h3lix1 in https://github.com/meshtastic/firmware/pull/8881
* Fix #8883 (lora-Pager fter playing the notification, voltage does not disappear from the speaker) by @polarikus in https://github.com/meshtastic/firmware/pull/8884
* Resolve #8887 (T-LoRaPager Vibration on New Message Delivery) by @polarikus in https://github.com/meshtastic/firmware/pull/8888
* OnScreenKeyboard Improvement with Joystick and UpDown Encoder by @whywilson in https://github.com/meshtastic/firmware/pull/8379
* [T-LoraPager]Disable vibration if needed by @polarikus in https://github.com/meshtastic/firmware/pull/8895
* Tryfix: T3S3 ePaper eInk updates by @mverch67 in https://github.com/meshtastic/firmware/pull/8898
* Improved R1 Neo & muzi-base buzzer beeps for GPS on/off by @simon-muzi in https://github.com/meshtastic/firmware/pull/8870
* Meshtastic build manifest by @vidplace7 in https://github.com/meshtastic/firmware/pull/8248
* Fix backwards buttons on Thinknode-M1 by @jp-bennett in https://github.com/meshtastic/firmware/pull/8901
* Update protobuf name of FRIED_CHICKEN by @jp-bennett in https://github.com/meshtastic/firmware/pull/8903
* Guard 2M PHY mode for NimBLE by @thebentern in https://github.com/meshtastic/firmware/pull/8890
* Renovate: fix BH1750_WE by @vidplace7 in https://github.com/meshtastic/firmware/pull/8767
* Fixed the issue where T-Echo did not completely shut down peripherals… by @lewisxhe in https://github.com/meshtastic/firmware/pull/8524
* Fix apply device-install permissions by @vidplace7 in https://github.com/meshtastic/firmware/pull/8911
* Update platformio/espressif32 to v6.12.0 by @vidplace7 in https://github.com/meshtastic/firmware/pull/7697
* Fix #8915 [Bug]: Exception Decoder does not recognize the backtrace by @polarikus in https://github.com/meshtastic/firmware/pull/8917
* Actions: Fix release manifest formating by @vidplace7 in https://github.com/meshtastic/firmware/pull/8918
* ARCtastic runners by @vidplace7 in https://github.com/meshtastic/firmware/pull/8904
* Update peter-evans/create-pull-request action to v8 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8919
* PIO: Fix closedcube lib reference by @vidplace7 in https://github.com/meshtastic/firmware/pull/8920
* Use PSRAM to reduce heap usage percentage on ESP32 with PSRAM by @samm-git in https://github.com/meshtastic/firmware/pull/8891
* Create new screen colors for BaseUI by @Xaositek in https://github.com/meshtastic/firmware/pull/8921
* Enable Muzi-base LED notification by @jp-bennett in https://github.com/meshtastic/firmware/pull/8925
* Update System Frame for improved rendering on devices by @Xaositek in https://github.com/meshtastic/firmware/pull/8923
* Add I2C device check for seesaw device on native by @jp-bennett in https://github.com/meshtastic/firmware/pull/8927
* Use truncated position for smart position by @RCGV1 in https://github.com/meshtastic/firmware/pull/8906
* Properly turn off power pins at shutdown for m3 by @jp-bennett in https://github.com/meshtastic/firmware/pull/8935
* Update meshtastic/device-ui digest to 2746a1c by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8936
* Use 'gh-action-runner' action for "Check" jobs. by @vidplace7 in https://github.com/meshtastic/firmware/pull/8938
* Optimize builds to reduce duplicate dependency checks by @vidplace7 in https://github.com/meshtastic/firmware/pull/8943
* Update actions/cache action to v5 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8944
* Fix #8899 [Bug]: [TloraPager] RotaryEncoder crash by @polarikus in https://github.com/meshtastic/firmware/pull/8933
* Mark implicit ACK for MQTT as MQTT transport by @GUVWAF in https://github.com/meshtastic/firmware/pull/8939
* Fix GPS Buffer full issue on NRF52480 (Seeed T1000E) by @fifieldt in https://github.com/meshtastic/firmware/pull/8956
* Actions: Compact manifest job output summary by @vidplace7 in https://github.com/meshtastic/firmware/pull/8957
* Add JSON packet recording option to native by @jp-bennett in https://github.com/meshtastic/firmware/pull/8930
* Implement Long Turbo preset by @thebentern in https://github.com/meshtastic/firmware/pull/8985
* Upgrade all esp32 targets to NimBLE 2.X by @thebentern in https://github.com/meshtastic/firmware/pull/9003
* Be more judicious about responding to want_response in existing meshes by @thebentern in https://github.com/meshtastic/firmware/pull/9014
* First position send validation by @thebentern in https://github.com/meshtastic/firmware/pull/9023
* Calculate hops correctly even when hop_start==0 by @esev in https://github.com/meshtastic/firmware/pull/9120
* Revert NimBLE 2.X upgrade by @thebentern in https://github.com/meshtastic/firmware/pull/9125

## New Contributors
* @RikerZhu made their first contribution in https://github.com/meshtastic/firmware/pull/8679
* @rbomze made their first contribution in https://github.com/meshtastic/firmware/pull/8800
* @Donix212 made their first contribution in https://github.com/meshtastic/firmware/pull/8854
* @polarikus made their first contribution in https://github.com/meshtastic/firmware/pull/8884
* @phaseloop made their first contribution in https://github.com/meshtastic/firmware/pull/8858
* @samm-git made their first contribution in https://github.com/meshtastic/firmware/pull/8891

**Full Changelog**: https://github.com/meshtastic/firmware/compare/v2.7.16.a597230...v2.7.17.9058cce`;

const currentPrereleaseId = '2.7.17.9058cce';

export const showPrerelease = false;

export const currentPrerelease = <FirmwareResource>{
  id: `v${currentPrereleaseId}`,
  title: `Meshtastic Firmware ${currentPrereleaseId} Pre-release`,
  zip_url: `https://github.com/meshtastic/firmware/releases/download/v${currentPrereleaseId}/firmware-${currentPrereleaseId}.zip`,
  release_notes: markdownContent,
};

export const vendorCobrandingTag = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow", "M5Stack", "NomadStar", "muzi"];
