import type { FirmwareResource } from './api';

// Remove the OfflineHardwareList since it's now in /public/data/hardware-list.json

const markdownContent = `
## 🛠️ Enhancements

* Add new hardware: Heltec MeshPocket by @Heltec-Aaron-Lee in https://github.com/meshtastic/firmware/pull/6533
* Switch to actually maintained thingsboard pubsubclient by @thebentern in https://github.com/meshtastic/firmware/pull/5204
* Make startup screen show the short ID by @Heltec-Aaron-Lee in https://github.com/meshtastic/firmware/pull/6591
* Update platformio.ini to exclude unused modules from t1000-e by @benkyd in https://github.com/meshtastic/firmware/pull/6584
* Debian: use native-tft compile target by @vidplace7 in https://github.com/meshtastic/firmware/pull/6580
* Create lora-piggystick-lr1121.yaml by @markbirss in https://github.com/meshtastic/firmware/pull/6600
* Add TFT docker builds (for CI) by @vidplace7 in https://github.com/meshtastic/firmware/pull/6614

## 🐛 Bug fixes and enhancements
* Fix Ublox GPS for Heltec T114 by @todd-herbert in https://github.com/meshtastic/firmware/pull/6497
* Portduino: Set C standard to 17 by @vidplace7 in https://github.com/meshtastic/firmware/pull/6561
* Fix: Correct underlying cause of T-Watch not functioning when set to a 16MB filesystem by @Kealper in https://github.com/meshtastic/firmware/pull/6563
* Trunk fixes for heltec mesh pocket. by @fifieldt in https://github.com/meshtastic/firmware/pull/6588
* Fix T-Echo display light blink on LoRa TX by @todd-herbert in https://github.com/meshtastic/firmware/pull/6590

## 👥 New Contributors
* @benkyd made their first contribution in https://github.com/meshtastic/firmware/pull/6584
* @Nivek-domo made their first contribution in https://github.com/meshtastic/firmware/pull/6622

`;

const currentPrereleaseId = '2.6.6.54c1423';

export const showPrerelease = false;

export const currentPrerelease = <FirmwareResource>{
  id: `v${currentPrereleaseId}`,
  title: `Meshtastic Firmware ${currentPrereleaseId} Pre-release`,
  zip_url: `https://github.com/meshtastic/firmware/releases/download/v${currentPrereleaseId}/firmware-${currentPrereleaseId}.zip`,
  release_notes: markdownContent,
};

export const vendorCobrandingTag = "";
export const supportedVendorDeviceTags = ["RAK", "B&Q", "LilyGo", "Seeed", "Heltec", "DIY", "Elecrow"];
