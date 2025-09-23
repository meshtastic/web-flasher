import type { FirmwareResource } from './api';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const markdownContent = `
## What's Changed
- BaseUI Show/Hide Frame Functionality by @Xaositek in https://github.com/meshtastic/firmware/pull/7382
- Feature: Seamless Cross-Preset Communication via UDP Multicast Bridging by @ViezeVingertjes in https://github.com/meshtastic/firmware/pull/7753
- Add CLIENT_BASE role: ROUTER for favorites, CLIENT otherwise (for attic/roof nodes!) by @compumike in https://github.com/meshtastic/firmware/pull/7873
- Added Last Coordinate counter to Position screen by @HarukiToreda in https://github.com/meshtastic/firmware/pull/7865
- Phone GPS display on Position Screen for BaseUI by @HarukiToreda in https://github.com/meshtastic/firmware/pull/7875
- Add formatting and menu picking for other GPS format options by @Xaositek in https://github.com/meshtastic/firmware/pull/7974
- Add RAK WisMesh Tap V2 (ESP32S3) Hardware Variant by @DanielCao0 in https://github.com/meshtastic/firmware/pull/7741
- Add support for the Challenger rp2040 lora by @samuel-duffield1 in https://github.com/meshtastic/firmware/pull/7826
- Add support for the RV-3028 on native Linux by @jp-bennett in https://github.com/meshtastic/firmware/pull/7802
- T-Lora Pager: Support LR1121 and SX1280 models by @WillyJL in https://github.com/meshtastic/firmware/pull/7956
- Add another seeed_xiao_nrf52840_kit build environment for I2C pinout by @NomDeTom in https://github.com/meshtastic/firmware/pull/8036
- Add heltec_v4 board. by @Quency-D in https://github.com/meshtastic/firmware/pull/7845
- C6l fixes by @jp-bennett in https://github.com/meshtastic/firmware/pull/8047
- Add TSL2561 sensor by @davide125 in https://github.com/meshtastic/firmware/pull/7675
- Add a new GPS model CM121. by @Quency-D in https://github.com/meshtastic/firmware/pull/7852
- Make ExternalNotification show up in excluded_modules, more STM32 modules by @Stary2001 in https://github.com/meshtastic/firmware/pull/7797
- Enable bmx160 on native by @jp-bennett in https://github.com/meshtastic/firmware/pull/7844
- Fix memory leak in NRF52Bluetooth: allocate BluetoothStatus on stack, not heap by @compumike in https://github.com/meshtastic/firmware/pull/7965
- Fix memory leak in NimbleBluetooth: allocate BluetoothStatus on stack, not heap by @compumike in https://github.com/meshtastic/firmware/pull/7964
- Fix GPS gm_mktime memory leak by @compumike in https://github.com/meshtastic/firmware/pull/7981
- Fix INA3221 higher current wrong readings by @macvenez in https://github.com/meshtastic/firmware/pull/7607
- Fix InputEvent variable usage with out initialization (random key events while using rotery encoder) by @Links2004 in https://github.com/meshtastic/firmware/pull/8015
- Fix Rotary Encoder Button by @Links2004 in https://github.com/meshtastic/firmware/pull/8001
- Fix date display to be upper right bound by @Xaositek in https://github.com/meshtastic/firmware/pull/7876
- Fix excluded modules configuration handling by @capricornusx in https://github.com/meshtastic/firmware/pull/7838
- Fix build error in rak_wismesh_tap_v2 by @fifieldt in https://github.com/meshtastic/firmware/pull/7905
- Fix build fail on develop branch by @WillyJL in https://github.com/meshtastic/firmware/pull/8043
- Fix more build failures by @WillyJL in https://github.com/meshtastic/firmware/pull/8044
- Fix last build issues on develop by @WillyJL in https://github.com/meshtastic/firmware/pull/8046
- Fix build errors by @Xaositek in https://github.com/meshtastic/firmware/pull/8067
- fix build with HAS_TELEMETRY 0 by @Links2004 in https://github.com/meshtastic/firmware/pull/8051
- Fix device-install.bat baud rate by @fifieldt in https://github.com/meshtastic/firmware/pull/7816
- Fix: use lora.use_preset config to get name by @GUVWAF in https://github.com/meshtastic/firmware/pull/8057
- Show GPS Date properly in drawCommonHeader by @Xaositek in https://github.com/meshtastic/firmware/pull/7887
- Make sure to ACK ACKs/replies if next-hop routing is used by @GUVWAF in https://github.com/meshtastic/firmware/pull/8052
- Only stop retransmissions when receiving implicit ACK over LoRa by @GUVWAF in https://github.com/meshtastic/firmware/pull/7872
- Allow Left / Right Events for selection and improve encoder responsives by @Links2004 in https://github.com/meshtastic/firmware/pull/8016
- If usePreset is False, show value as Custom. by @Xaositek in https://github.com/meshtastic/firmware/pull/7812
- (resubmission) Manual GitHub actions to allow building one target or arch by @NomDeTom in https://github.com/meshtastic/firmware/pull/7997
- When DEBUG_HEAP is defined, add free heap bytes to every log line in RedirectablePrint::log_to_serial by @compumike in https://github.com/meshtastic/firmware/pull/8004
- Setup ESP32 PM-specific capability flags by @m1nl in https://github.com/meshtastic/firmware/pull/7747
- move HTTP contentTypes to Flash - saves 768 Bytes of RAM by @Links2004 in https://github.com/meshtastic/firmware/pull/8055
- Portduino config refactor by @jp-bennett in https://github.com/meshtastic/firmware/pull/7796
- Add BUILD_EPOCH to latest setup step. by @fifieldt in https://github.com/meshtastic/firmware/pull/7894
- updated shebang to use a more standard path for bash in flashing scripts. by @vtrenton in https://github.com/meshtastic/firmware/pull/7922
- Update RadioLib to v7.3.0 by @renovate[bot] in https://github.com/meshtastic/firmware/pull/8065
- Update Protobuf usage, add MLS, fix clock by @Xaositek in https://github.com/meshtastic/firmware/pull/8041
- Portduino bump to fix gpiod bug by @jp-bennett in https://github.com/meshtastic/firmware/pull/8083
- Ext notification fix (handle ringtone operations even when module is not enabled) by @thebentern in https://github.com/meshtastic/firmware/pull/8089
- tlora-pager wake on button, and kb backlight toggling by @jp-bennett in https://github.com/meshtastic/firmware/pull/8090
- Try-fix: Unstick that PhoneAPI state by @thebentern in https://github.com/meshtastic/firmware/pull/8091
- Also pull a deviceID from esp32c6 devices by @jp-bennett in https://github.com/meshtastic/firmware/pull/8092
- Clear last toradio on BLE disconnect by @thebentern in https://github.com/meshtastic/firmware/pull/8095

## New Contributors
* @TN666 made their first contribution in https://github.com/meshtastic/firmware/pull/7709
* @notmasteryet made their first contribution in https://github.com/meshtastic/firmware/pull/7718
* @m1nl made their first contribution in https://github.com/meshtastic/firmware/pull/7747
* @davide125 made their first contribution in https://github.com/meshtastic/firmware/pull/7675
* @samuel-duffield1 made their first contribution in https://github.com/meshtastic/firmware/pull/7826
* @capricornusx made their first contribution in https://github.com/meshtastic/firmware/pull/7838
* @compumike made their first contribution in https://github.com/meshtastic/firmware/pull/7873
* @WillyJL made their first contribution in https://github.com/meshtastic/firmware/pull/7956
* @vtrenton made their first contribution in https://github.com/meshtastic/firmware/pull/7922
* @ViezeVingertjes made their first contribution in https://github.com/meshtastic/firmware/pull/7753
* @Links2004 made their first contribution in https://github.com/meshtastic/firmware/pull/8015`;

const currentPrereleaseId = '2.7.10.94d4bdf';

export const showPrerelease = true;

export const currentPrerelease = <FirmwareResource>{
  id: `v${currentPrereleaseId}`,
  title: `Meshtastic Firmware ${currentPrereleaseId} Pre-release`,
  zip_url: `https://github.com/meshtastic/firmware/releases/download/v${currentPrereleaseId}/firmware-${currentPrereleaseId}.zip`,
  release_notes: markdownContent,
};

export const vendorCobrandingTag = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow"];
