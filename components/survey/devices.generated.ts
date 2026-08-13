/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Source:     public/data/hardware-list.json
 * Regenerate: node scripts/gen-device-options.ts
 *
 * Codes are hwModelSlug values, which are permanent Meshtastic hardware
 * identifiers — safe to use as sheet column keys and to join against the
 * flasher's own data later.
 */

export interface DeviceOption {
  /** platformioTarget — unique, and what the flasher matches on. */
  code: string
  label: string
  /** hwModelSlug. Not unique: several boards share one slug. */
  slug: string
  vendor: string
  /** Filename under /img/devices/, or null when no artwork exists. */
  image: string | null
  /** True for hardware no longer actively supported by the flasher. */
  legacy: boolean
}

export const DEVICE_VENDORS: string[] = [
  "B&Q",
  "Canary",
  "DIY",
  "EByte",
  "Elecrow",
  "Heltec",
  "LilyGo",
  "M5Stack",
  "muzi",
  "NomadStar",
  "Other",
  "RadioMaster",
  "RAK",
  "RPi",
  "Seeed",
  "Waveshare"
]

export const DEVICE_OPTIONS: DeviceOption[] = [
  {
    "code": "rak4631",
    "label": "RAK WisBlock 4631",
    "slug": "RAK4631",
    "vendor": "RAK",
    "image": "rak4631.svg",
    "legacy": false
  },
  {
    "code": "heltec-v3",
    "label": "Heltec V3",
    "slug": "HELTEC_V3",
    "vendor": "Heltec",
    "image": "heltec-v3.svg",
    "legacy": false
  },
  {
    "code": "tracker-t1000-e",
    "label": "Seeed Card Tracker T1000-E",
    "slug": "TRACKER_T1000_E",
    "vendor": "Seeed",
    "image": "tracker-t1000-e.svg",
    "legacy": false
  },
  {
    "code": "seeed_wio_tracker_L1",
    "label": "Seeed Wio Tracker L1",
    "slug": "SEEED_WIO_TRACKER_L1",
    "vendor": "Seeed",
    "image": "wio_tracker_l1_case.svg",
    "legacy": false
  },
  {
    "code": "heltec-v4",
    "label": "Heltec V4",
    "slug": "HELTEC_V4",
    "vendor": "Heltec",
    "image": "heltec_v4.svg",
    "legacy": false
  },
  {
    "code": "t-deck",
    "label": "LILYGO T-Deck",
    "slug": "T_DECK",
    "vendor": "LilyGo",
    "image": "t-deck.svg",
    "legacy": false
  },
  {
    "code": "heltec-mesh-node-t114",
    "label": "Heltec Mesh Node T114",
    "slug": "HELTEC_MESH_NODE_T114",
    "vendor": "Heltec",
    "image": "heltec-mesh-node-t114.svg",
    "legacy": false
  },
  {
    "code": "rak_wismeshtag",
    "label": "RAK WisMesh Tag",
    "slug": "WISMESH_TAG",
    "vendor": "RAK",
    "image": "rak_wismesh_tag.svg",
    "legacy": false
  },
  {
    "code": "t-echo",
    "label": "LILYGO T-Echo",
    "slug": "T_ECHO",
    "vendor": "LilyGo",
    "image": "t-echo.svg",
    "legacy": false
  },
  {
    "code": "nano-g2-ultra",
    "label": "Nano G2 Ultra",
    "slug": "NANO_G2_ULTRA",
    "vendor": "B&Q",
    "image": "nano-g2-ultra.svg",
    "legacy": false
  },
  {
    "code": "station-g2",
    "label": "Station G2",
    "slug": "STATION_G2",
    "vendor": "B&Q",
    "image": "station-g2.svg",
    "legacy": false
  },
  {
    "code": "station-g3",
    "label": "Station G3",
    "slug": "STATION_G3",
    "vendor": "B&Q",
    "image": null,
    "legacy": true
  },
  {
    "code": "meshtastic-diy-v1",
    "label": "DIY V1",
    "slug": "DIY_V1",
    "vendor": "DIY",
    "image": "diy.svg",
    "legacy": false
  },
  {
    "code": "nrf52_promicro_diy_tcxo",
    "label": "NRF52 Pro-micro DIY",
    "slug": "NRF52_PROMICRO_DIY",
    "vendor": "DIY",
    "image": "promicro.svg",
    "legacy": false
  },
  {
    "code": "thinknode_m1",
    "label": "ThinkNode M1",
    "slug": "THINKNODE_M1",
    "vendor": "Elecrow",
    "image": "thinknode_m1.svg",
    "legacy": false
  },
  {
    "code": "thinknode_m2",
    "label": "ThinkNode M2",
    "slug": "THINKNODE_M2",
    "vendor": "Elecrow",
    "image": "thinknode_m2.svg",
    "legacy": false
  },
  {
    "code": "elecrow-adv1-43-50-70-tft",
    "label": "Crowpanel Adv 4.3/5.0/7.0 TFT",
    "slug": "CROWPANEL",
    "vendor": "Elecrow",
    "image": "crowpanel_5_0.svg",
    "legacy": false
  },
  {
    "code": "elecrow-adv-24-28-tft",
    "label": "Crowpanel Adv 2.4/2.8 TFT",
    "slug": "CROWPANEL",
    "vendor": "Elecrow",
    "image": "crowpanel_2_4.svg",
    "legacy": false
  },
  {
    "code": "elecrow-adv-35-tft",
    "label": "Crowpanel Adv 3.5 TFT",
    "slug": "CROWPANEL",
    "vendor": "Elecrow",
    "image": "crowpanel_3_5.svg",
    "legacy": false
  },
  {
    "code": "thinknode_m5",
    "label": "ThinkNode M5",
    "slug": "THINKNODE_M5",
    "vendor": "Elecrow",
    "image": "thinknode_m1.svg",
    "legacy": false
  },
  {
    "code": "thinknode_m3",
    "label": "ThinkNode M3",
    "slug": "THINKNODE_M3",
    "vendor": "Elecrow",
    "image": "thinknode_m3.svg",
    "legacy": false
  },
  {
    "code": "thinknode_m4",
    "label": "ThinkNode M4",
    "slug": "THINKNODE_M4",
    "vendor": "Elecrow",
    "image": "thinknode_m4.svg",
    "legacy": false
  },
  {
    "code": "thinknode_m6",
    "label": "ThinkNode M6",
    "slug": "THINKNODE_M6",
    "vendor": "Elecrow",
    "image": "thinknode_m6.svg",
    "legacy": false
  },
  {
    "code": "native-meshstick-1262",
    "label": "Elecrow Meshstick 1262",
    "slug": "MESHSTICK_1262",
    "vendor": "Elecrow",
    "image": "meshtasticd_tux.svg",
    "legacy": false
  },
  {
    "code": "thinknode_m7",
    "label": "ThinkNode M7",
    "slug": "THINKNODE_M7",
    "vendor": "Elecrow",
    "image": "thinknode_m7.svg",
    "legacy": false
  },
  {
    "code": "thinknode_m8",
    "label": "Elecrow ThinkNode M8",
    "slug": "THINKNODE_M8",
    "vendor": "Elecrow",
    "image": null,
    "legacy": true
  },
  {
    "code": "heltec-wsl-v3",
    "label": "Heltec Wireless Stick Lite V3",
    "slug": "HELTEC_WSL_V3",
    "vendor": "Heltec",
    "image": "heltec-wsl-v3.svg",
    "legacy": false
  },
  {
    "code": "heltec-wireless-tracker",
    "label": "Heltec Wireless Tracker V1.1",
    "slug": "HELTEC_WIRELESS_TRACKER",
    "vendor": "Heltec",
    "image": "heltec-wireless-tracker.svg",
    "legacy": false
  },
  {
    "code": "heltec-wireless-paper",
    "label": "Heltec Wireless Paper",
    "slug": "HELTEC_WIRELESS_PAPER",
    "vendor": "Heltec",
    "image": "heltec-wireless-paper.svg",
    "legacy": false
  },
  {
    "code": "heltec-ht62-esp32c3-sx1262",
    "label": "Heltec HT62",
    "slug": "HELTEC_HT62",
    "vendor": "Heltec",
    "image": "heltec-ht62-esp32c3-sx1262.svg",
    "legacy": false
  },
  {
    "code": "heltec-wireless-paper-v1_0",
    "label": "Heltec Wireless Paper V1.0",
    "slug": "HELTEC_WIRELESS_PAPER_V1_0",
    "vendor": "Heltec",
    "image": "heltec-wireless-paper-v1_0.svg",
    "legacy": true
  },
  {
    "code": "heltec-vision-master-t190",
    "label": "Heltec Vision Master T190",
    "slug": "HELTEC_VISION_MASTER_T190",
    "vendor": "Heltec",
    "image": "heltec-vision-master-t190.svg",
    "legacy": false
  },
  {
    "code": "heltec-vision-master-e213",
    "label": "Heltec Vision Master E213",
    "slug": "HELTEC_VISION_MASTER_E213",
    "vendor": "Heltec",
    "image": "heltec-vision-master-e213.svg",
    "legacy": false
  },
  {
    "code": "heltec-vision-master-e290",
    "label": "Heltec Vision Master E290",
    "slug": "HELTEC_VISION_MASTER_E290",
    "vendor": "Heltec",
    "image": "heltec-vision-master-e290.svg",
    "legacy": false
  },
  {
    "code": "heltec-mesh-pocket-10000",
    "label": "Heltec MeshPocket",
    "slug": "HELTEC_MESH_POCKET",
    "vendor": "Heltec",
    "image": "heltec_mesh_pocket.svg",
    "legacy": false
  },
  {
    "code": "heltec-mesh-pocket-5000",
    "label": "Heltec MeshPocket",
    "slug": "HELTEC_MESH_POCKET",
    "vendor": "Heltec",
    "image": "heltec_mesh_pocket.svg",
    "legacy": false
  },
  {
    "code": "heltec-mesh-solar",
    "label": "Heltec MeshSolar",
    "slug": "HELTEC_MESH_SOLAR",
    "vendor": "Heltec",
    "image": "heltec-mesh-solar.svg",
    "legacy": true
  },
  {
    "code": "heltec-wireless-tracker-v2",
    "label": "Heltec Wireless Tracker V2",
    "slug": "HELTEC_WIRELESS_TRACKER_V2",
    "vendor": "Heltec",
    "image": "heltec_wireless_tracker_v2.svg",
    "legacy": false
  },
  {
    "code": "heltec-mesh-node-t096",
    "label": "Heltec Mesh Node T096",
    "slug": "HELTEC_MESH_NODE_T096",
    "vendor": "Heltec",
    "image": "heltec-t096.svg",
    "legacy": false
  },
  {
    "code": "heltec-mesh-node-t1",
    "label": "Heltec Mesh Node T1",
    "slug": "HELTEC_MESH_NODE_T1",
    "vendor": "Heltec",
    "image": "heltec-meshnode-t1.svg",
    "legacy": false
  },
  {
    "code": "tlora-v2-1-1_6",
    "label": "LILYGO T-LoRa V2.1-1.6",
    "slug": "TLORA_V2_1_1P6",
    "vendor": "LilyGo",
    "image": "tlora-v2-1-1_6.svg",
    "legacy": false
  },
  {
    "code": "tbeam",
    "label": "LILYGO T-Beam",
    "slug": "TBEAM",
    "vendor": "LilyGo",
    "image": "tbeam.svg",
    "legacy": false
  },
  {
    "code": "tbeam-s3-core",
    "label": "LILYGO T-Beam Supreme",
    "slug": "LILYGO_TBEAM_S3_CORE",
    "vendor": "LilyGo",
    "image": "tbeam-s3-core.svg",
    "legacy": false
  },
  {
    "code": "tlora-v2-1-1_8",
    "label": "LILYGO T-LoRa V2.1-1.8",
    "slug": "TLORA_V2_1_1P8",
    "vendor": "LilyGo",
    "image": "tlora-v2-1-1_8.svg",
    "legacy": false
  },
  {
    "code": "tlora-t3s3-v1",
    "label": "LILYGO T-LoRa T3-S3",
    "slug": "TLORA_T3_S3",
    "vendor": "LilyGo",
    "image": "tlora-t3s3-v1.svg",
    "legacy": false
  },
  {
    "code": "tlora-t3s3-epaper",
    "label": "LILYGO T-LoRa T3-S3 E-Ink",
    "slug": "TLORA_T3_S3",
    "vendor": "LilyGo",
    "image": "tlora-t3s3-epaper.svg",
    "legacy": false
  },
  {
    "code": "t-echo-plus",
    "label": "LILYGO T-Echo Plus",
    "slug": "T_ECHO_PLUS",
    "vendor": "LilyGo",
    "image": "t-echo_plus.svg",
    "legacy": false
  },
  {
    "code": "t-watch-s3",
    "label": "LILYGO T-Watch S3",
    "slug": "T_WATCH_S3",
    "vendor": "LilyGo",
    "image": "t-watch-s3.svg",
    "legacy": false
  },
  {
    "code": "tlora-c6",
    "label": "LilyGo T-Lora C6",
    "slug": "TLORA_C6",
    "vendor": "LilyGo",
    "image": "tlora-c6.svg",
    "legacy": true
  },
  {
    "code": "t-deck-pro",
    "label": "LILYGO T-Deck Pro",
    "slug": "T_DECK_PRO",
    "vendor": "LilyGo",
    "image": "tdeck_pro.svg",
    "legacy": false
  },
  {
    "code": "tlora-pager",
    "label": "LILYGO T-LoRa Pager",
    "slug": "T_LORA_PAGER",
    "vendor": "LilyGo",
    "image": "lilygo-tlora-pager.svg",
    "legacy": false
  },
  {
    "code": "t-echo-lite",
    "label": "LILYGO T-Echo Lite",
    "slug": "T_ECHO_LITE",
    "vendor": "LilyGo",
    "image": "techo_lite.svg",
    "legacy": true
  },
  {
    "code": "t-beam-1w",
    "label": "LilyGo T-Beam 1W",
    "slug": "TBEAM_1_WATT",
    "vendor": "LilyGo",
    "image": "tbeam-1w.svg",
    "legacy": false
  },
  {
    "code": "t5-epaper-s3",
    "label": "LilyGo T5 E-paper S3 Pro",
    "slug": "T5_S3_EPAPER_PRO",
    "vendor": "LilyGo",
    "image": "t5s3_epaper.svg",
    "legacy": true
  },
  {
    "code": "t-beam-bpf",
    "label": "LilyGo T-Beam BPF",
    "slug": "TBEAM_BPF",
    "vendor": "LilyGo",
    "image": "tbeam-bpf.svg",
    "legacy": false
  },
  {
    "code": "mini-epaper-s3",
    "label": "LilyGo Mini E-paper S3",
    "slug": "MINI_EPAPER_S3",
    "vendor": "LilyGo",
    "image": null,
    "legacy": true
  },
  {
    "code": "m5stack-unitc6l",
    "label": "M5Stack Unit C6L",
    "slug": "M5STACK_C6L",
    "vendor": "M5Stack",
    "image": "m5_c6l.svg",
    "legacy": false
  },
  {
    "code": "m5stack-cardputer-adv",
    "label": "Cardputer Mesh Kit",
    "slug": "M5STACK_CARDPUTER_ADV",
    "vendor": "M5Stack",
    "image": "m5stack_cardputer.svg",
    "legacy": false
  },
  {
    "code": "muzi-base",
    "label": "muzi BASE DUO/UNO",
    "slug": "MUZI_BASE",
    "vendor": "muzi",
    "image": "muzi_base.svg",
    "legacy": false
  },
  {
    "code": "r1-neo",
    "label": "muzi R1 Neo",
    "slug": "MUZI_R1_NEO",
    "vendor": "muzi",
    "image": "muzi_r1_neo.svg",
    "legacy": false
  },
  {
    "code": "rak4631_nomadstar_meteor_pro",
    "label": "NomadStar Meteor Pro",
    "slug": "NOMADSTAR_METEOR_PRO",
    "vendor": "NomadStar",
    "image": "meteor_pro.svg",
    "legacy": false
  },
  {
    "code": "rak11200",
    "label": "RAK WisBlock 11200",
    "slug": "RAK11200",
    "vendor": "RAK",
    "image": "rak11200.svg",
    "legacy": false
  },
  {
    "code": "rak2560",
    "label": "RAK WisMesh Repeater",
    "slug": "WISMESH_HUB",
    "vendor": "RAK",
    "image": "rak2560.svg",
    "legacy": false
  },
  {
    "code": "rak11310",
    "label": "RAK WisBlock 11310",
    "slug": "RAK11310",
    "vendor": "RAK",
    "image": "rak11310.svg",
    "legacy": false
  },
  {
    "code": "rak_wismeshtap",
    "label": "RAK WisMesh Tap",
    "slug": "WISMESH_TAP",
    "vendor": "RAK",
    "image": "rak-wismeshtap.svg",
    "legacy": false
  },
  {
    "code": "rak3312",
    "label": "RAK3312",
    "slug": "RAK3312",
    "vendor": "RAK",
    "image": "rak_3312.svg",
    "legacy": false
  },
  {
    "code": "rak_wismesh_tap_v2",
    "label": "RAK WisMesh Tap V2",
    "slug": "WISMESH_TAP_V2",
    "vendor": "RAK",
    "image": "rak-wismesh-tap-v2.svg",
    "legacy": false
  },
  {
    "code": "rak3401-1watt",
    "label": "RAK3401 1W",
    "slug": "RAK3401",
    "vendor": "RAK",
    "image": "rak3401.svg",
    "legacy": false
  },
  {
    "code": "native-rak6421",
    "label": "RAK6421 Hat+",
    "slug": "RAK6421",
    "vendor": "RAK",
    "image": "rak6421.svg",
    "legacy": false
  },
  {
    "code": "pico",
    "label": "Raspberry Pi Pico",
    "slug": "RPI_PICO",
    "vendor": "RPi",
    "image": "pico.svg",
    "legacy": false
  },
  {
    "code": "picow",
    "label": "Raspberry Pi Pico W",
    "slug": "RPI_PICO",
    "vendor": "RPi",
    "image": "rpipicow.svg",
    "legacy": false
  },
  {
    "code": "wio-tracker-wm1110",
    "label": "Seeed Wio WM1110 Tracker",
    "slug": "WIO_WM1110",
    "vendor": "Seeed",
    "image": "wio-tracker-wm1110.svg",
    "legacy": false
  },
  {
    "code": "seeed-sensecap-indicator",
    "label": "Seeed SenseCAP Indicator",
    "slug": "SENSECAP_INDICATOR",
    "vendor": "Seeed",
    "image": "seeed-sensecap-indicator.svg",
    "legacy": false
  },
  {
    "code": "seeed-xiao-s3",
    "label": "Seeed Xiao ESP32-S3",
    "slug": "SEEED_XIAO_S3",
    "vendor": "Seeed",
    "image": "seeed-xiao-s3.svg",
    "legacy": false
  },
  {
    "code": "seeed_xiao_nrf52840_kit",
    "label": "Seeed Xiao NRF52840 Kit",
    "slug": "XIAO_NRF52_KIT",
    "vendor": "Seeed",
    "image": "seeed_xiao_nrf52_kit.svg",
    "legacy": false
  },
  {
    "code": "seeed_solar_node",
    "label": "Seeed SenseCAP Solar Node",
    "slug": "SEEED_SOLAR_NODE",
    "vendor": "Seeed",
    "image": "seeed_solar.svg",
    "legacy": false
  },
  {
    "code": "seeed_wio_tracker_L1_eink",
    "label": "Seeed Wio Tracker L1 E-Ink",
    "slug": "SEEED_WIO_TRACKER_L1_EINK",
    "vendor": "Seeed",
    "image": "wio_tracker_l1_eink.svg",
    "legacy": false
  },
  {
    "code": "heltec-wireless-tracker-V1-0",
    "label": "Heltec Wireless Tracker V1.0",
    "slug": "HELTEC_WIRELESS_TRACKER_V1_0",
    "vendor": "Other",
    "image": "heltec-wireless-tracker.svg",
    "legacy": true
  },
  {
    "code": "nano-g1",
    "label": "Nano G1",
    "slug": "NANO_G1",
    "vendor": "B&Q",
    "image": null,
    "legacy": false
  },
  {
    "code": "nano-g1-explorer",
    "label": "Nano G1 Explorer",
    "slug": "NANO_G1_EXPLORER",
    "vendor": "B&Q",
    "image": null,
    "legacy": false
  },
  {
    "code": "station-g1",
    "label": "Station G1",
    "slug": "STATION_G1",
    "vendor": "B&Q",
    "image": null,
    "legacy": false
  },
  {
    "code": "canaryone",
    "label": "Canary One",
    "slug": "CANARYONE",
    "vendor": "Canary",
    "image": null,
    "legacy": false
  },
  {
    "code": "hydra",
    "label": "Hydra",
    "slug": "HYDRA",
    "vendor": "DIY",
    "image": null,
    "legacy": false
  },
  {
    "code": "meshtastic-dr-dev",
    "label": "DR-DEV",
    "slug": "DR_DEV",
    "vendor": "DIY",
    "image": null,
    "legacy": true
  },
  {
    "code": "CDEBYTE_EoRa-S3",
    "label": "EBYTE EoRa-S3",
    "slug": "CDEBYTE_EORA_S3",
    "vendor": "EByte",
    "image": null,
    "legacy": false
  },
  {
    "code": "heltec-v2_0",
    "label": "Heltec V2.0",
    "slug": "HELTEC_V2_0",
    "vendor": "Heltec",
    "image": null,
    "legacy": true
  },
  {
    "code": "heltec-v2_1",
    "label": "Heltec V2.1",
    "slug": "HELTEC_V2_1",
    "vendor": "Heltec",
    "image": null,
    "legacy": true
  },
  {
    "code": "heltec-v1",
    "label": "Heltec V1",
    "slug": "HELTEC_V1",
    "vendor": "Heltec",
    "image": null,
    "legacy": true
  },
  {
    "code": "tlora-v2",
    "label": "LILYGO T-LoRa V2",
    "slug": "TLORA_V2",
    "vendor": "LilyGo",
    "image": null,
    "legacy": true
  },
  {
    "code": "tlora-v1",
    "label": "LILYGO T-LoRa V1",
    "slug": "TLORA_V1",
    "vendor": "LilyGo",
    "image": null,
    "legacy": true
  },
  {
    "code": "tbeam0_7",
    "label": "LILYGO T-Beam V0.7",
    "slug": "TBEAM_V0P7",
    "vendor": "LilyGo",
    "image": null,
    "legacy": true
  },
  {
    "code": "tlora-v1_3",
    "label": "LILYGO T-LoRa V1.1-1.3",
    "slug": "TLORA_V1_1P3",
    "vendor": "LilyGo",
    "image": null,
    "legacy": true
  },
  {
    "code": "m5stack-core",
    "label": "M5 Stack",
    "slug": "M5STACK",
    "vendor": "M5Stack",
    "image": null,
    "legacy": false
  },
  {
    "code": "radiomaster_900_bandit_nano",
    "label": "RadioMaster 900 Bandit Nano",
    "slug": "RADIOMASTER_900_BANDIT_NANO",
    "vendor": "RadioMaster",
    "image": null,
    "legacy": false
  },
  {
    "code": "seeed_mesh_tracker_X1",
    "label": "Seeed MeshTracker X1",
    "slug": "MESH_TRACKER_X1",
    "vendor": "Seeed",
    "image": null,
    "legacy": true
  },
  {
    "code": "rp2040-lora",
    "label": "RP2040 LoRa",
    "slug": "RP2040_LORA",
    "vendor": "Waveshare",
    "image": null,
    "legacy": false
  },
  {
    "code": "tracksenger",
    "label": "TrackSenger (small TFT)",
    "slug": "HELTEC_WIRELESS_TRACKER",
    "vendor": "Other",
    "image": null,
    "legacy": false
  },
  {
    "code": "tracksenger-lcd",
    "label": "TrackSenger (big TFT)",
    "slug": "HELTEC_WIRELESS_TRACKER",
    "vendor": "Other",
    "image": null,
    "legacy": true
  },
  {
    "code": "tracksenger-oled",
    "label": "TrackSenger (big OLED)",
    "slug": "HELTEC_WIRELESS_TRACKER",
    "vendor": "Other",
    "image": null,
    "legacy": false
  },
  {
    "code": "picomputer-s3",
    "label": "Pi Computer S3",
    "slug": "PICOMPUTER_S3",
    "vendor": "Other",
    "image": null,
    "legacy": false
  },
  {
    "code": "unphone",
    "label": "unPhone",
    "slug": "UNPHONE",
    "vendor": "Other",
    "image": null,
    "legacy": false
  }
]
