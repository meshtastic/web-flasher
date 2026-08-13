/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Source:    components/survey/schema.ts
 * Regenerate: node scripts/gen-appsscript-schema.ts
 *
 * Paste the whole file into the Apps Script project as Schema.gs whenever the
 * survey schema changes, and bump SCHEMA_VERSION in the source first so stale
 * cached clients are rejected instead of writing mismatched columns.
 */

var SCHEMA_VERSION = 3;
var MIN_FILL_MS = 20000;

var SECTIONS = [
  {
    "id": "s0",
    "title": "Getting started",
    "blurb": "Two quick questions so we know which parts of the survey to show you."
  },
  {
    "id": "s1",
    "title": "How your node was set up",
    "blurb": "This is the single most important thing we are trying to learn.",
    "visibleIf": {
      "q": "q_powered",
      "in": [
        "whole_event",
        "most_days",
        "one_day_or_less"
      ]
    }
  },
  {
    "id": "s1a",
    "title": "Flashing the event firmware",
    "visibleIf": {
      "all": [
        {
          "q": "q_powered",
          "in": [
            "whole_event",
            "most_days",
            "one_day_or_less"
          ]
        },
        {
          "q": "q_cohort",
          "eq": "event_fw"
        }
      ]
    }
  },
  {
    "id": "s1b",
    "title": "Configuring it yourself",
    "visibleIf": {
      "all": [
        {
          "q": "q_powered",
          "in": [
            "whole_event",
            "most_days",
            "one_day_or_less"
          ]
        },
        {
          "q": "q_cohort",
          "in": [
            "manual_full",
            "manual_chan",
            "manual_lora"
          ]
        }
      ]
    }
  },
  {
    "id": "s1c",
    "title": "Running the defaults",
    "visibleIf": {
      "all": [
        {
          "q": "q_powered",
          "in": [
            "whole_event",
            "most_days",
            "one_day_or_less"
          ]
        },
        {
          "q": "q_cohort",
          "in": [
            "default_longfast",
            "unsure"
          ]
        }
      ]
    }
  },
  {
    "id": "s2",
    "title": "Your hardware and apps",
    "visibleIf": {
      "q": "q_powered",
      "in": [
        "whole_event",
        "most_days",
        "one_day_or_less"
      ]
    }
  },
  {
    "id": "s3",
    "title": "How it actually went",
    "visibleIf": {
      "q": "q_powered",
      "in": [
        "whole_event",
        "most_days",
        "one_day_or_less"
      ]
    }
  },
  {
    "id": "s5",
    "title": "Reach and next year"
  }
];

var QUESTIONS = [
  {
    "id": "q_attend",
    "section": "s0",
    "type": "single",
    "required": true,
    "prompt": "Did you attend DEF CON 34 in person?",
    "options": [
      {
        "code": "venue",
        "label": "Yes, I was at the conference"
      },
      {
        "code": "vegas",
        "label": "I was in Las Vegas for DEF CON but mostly off-site"
      },
      {
        "code": "no",
        "label": "No",
        "terminal": "screened_out"
      }
    ]
  },
  {
    "id": "q_powered",
    "section": "s0",
    "type": "single",
    "required": true,
    "prompt": "Roughly how much of the event did you have a Meshtastic node powered on and with you?",
    "options": [
      {
        "code": "whole_event",
        "label": "The whole event"
      },
      {
        "code": "most_days",
        "label": "Most days"
      },
      {
        "code": "one_day_or_less",
        "label": "A day or less"
      },
      {
        "code": "never",
        "label": "I never powered one on"
      }
    ]
  },
  {
    "id": "q_never_why",
    "section": "s0",
    "type": "multi",
    "prompt": "What stopped you from running a node?",
    "visibleIf": {
      "q": "q_powered",
      "eq": "never"
    },
    "options": [
      {
        "code": "no_hardware",
        "label": "Didn't bring hardware"
      },
      {
        "code": "hw_failed",
        "label": "My hardware failed"
      },
      {
        "code": "config_failed",
        "label": "Couldn't get it configured"
      },
      {
        "code": "chose_not_to",
        "label": "Decided not to"
      },
      {
        "code": "other",
        "label": "Something else"
      }
    ]
  },
  {
    "id": "q_cohort",
    "section": "s1",
    "type": "single",
    "required": true,
    "visibleIf": {
      "q": "q_powered",
      "in": [
        "whole_event",
        "most_days",
        "one_day_or_less"
      ]
    },
    "prompt": "Which best describes how your main node was set up during DEF CON 34?",
    "help": "If you ran several nodes, answer for the one you carried around most.",
    "options": [
      {
        "code": "event_fw",
        "label": "I flashed the official DEF CON event firmware from defcon.meshtastic.org"
      },
      {
        "code": "manual_full",
        "label": "Stock firmware, but I applied the event LoRa settings AND added the event channel(s)"
      },
      {
        "code": "manual_chan",
        "label": "Stock firmware with the event channel(s) added, but I did not change LoRa settings"
      },
      {
        "code": "manual_lora",
        "label": "Stock firmware with the event LoRa settings, but I did not add the event channel(s)"
      },
      {
        "code": "default_longfast",
        "label": "Default LongFast — no event firmware, settings, or channels"
      },
      {
        "code": "unsure",
        "label": "Not sure, or something else"
      }
    ]
  },
  {
    "id": "q_cohort_changed",
    "section": "s1",
    "type": "single",
    "visibleIf": {
      "q": "q_powered",
      "in": [
        "whole_event",
        "most_days",
        "one_day_or_less"
      ]
    },
    "prompt": "Did your setup change during the event?",
    "options": [
      {
        "code": "no_change",
        "label": "No, it was the same all week"
      },
      {
        "code": "to_event_fw",
        "label": "I switched to the event firmware partway through"
      },
      {
        "code": "to_manual",
        "label": "I switched to manual event settings partway through"
      },
      {
        "code": "away_from_event",
        "label": "I switched away from the event config"
      },
      {
        "code": "other",
        "label": "It changed some other way"
      }
    ]
  },
  {
    "id": "q_cohort_change_why",
    "section": "s1",
    "type": "multi",
    "prompt": "What prompted the change?",
    "visibleIf": {
      "all": [
        {
          "q": "q_powered",
          "in": [
            "whole_event",
            "most_days",
            "one_day_or_less"
          ]
        },
        {
          "not": {
            "q": "q_cohort_changed",
            "eq": "no_change"
          }
        },
        {
          "q": "q_cohort_changed",
          "answered": true
        }
      ]
    },
    "options": [
      {
        "code": "unusable",
        "label": "The mesh was unusable on my old setup"
      },
      {
        "code": "told_by_someone",
        "label": "Someone at the event told me to"
      },
      {
        "code": "found_out_late",
        "label": "I only found out about the event config later"
      },
      {
        "code": "hit_bug",
        "label": "I hit a bug"
      },
      {
        "code": "wanted_own_channels",
        "label": "I wanted my own channels back"
      },
      {
        "code": "other",
        "label": "Something else"
      }
    ]
  },
  {
    "id": "q_fw_method",
    "section": "s1a",
    "type": "single",
    "visibleIf": {
      "all": [
        {
          "q": "q_powered",
          "in": [
            "whole_event",
            "most_days",
            "one_day_or_less"
          ]
        },
        {
          "q": "q_cohort",
          "eq": "event_fw"
        }
      ]
    },
    "prompt": "How did you flash the event firmware?",
    "options": [
      {
        "code": "web_flasher",
        "label": "The defcon.meshtastic.org web flasher"
      },
      {
        "code": "cli",
        "label": "Meshtastic CLI / Python"
      },
      {
        "code": "esptool",
        "label": "esptool manually"
      },
      {
        "code": "someone_else",
        "label": "Someone else flashed it for me"
      },
      {
        "code": "other",
        "label": "Some other way"
      }
    ]
  },
  {
    "id": "q_fw_first_try",
    "section": "s1a",
    "type": "single",
    "visibleIf": {
      "all": [
        {
          "q": "q_powered",
          "in": [
            "whole_event",
            "most_days",
            "one_day_or_less"
          ]
        },
        {
          "q": "q_cohort",
          "eq": "event_fw"
        }
      ]
    },
    "prompt": "Did flashing work on the first attempt?",
    "options": [
      {
        "code": "yes_first_try",
        "label": "Yes, worked first time"
      },
      {
        "code": "yes_after_retries",
        "label": "Yes, but it took a few tries"
      },
      {
        "code": "failed_got_help",
        "label": "It failed and I needed help"
      },
      {
        "code": "failed_gave_up",
        "label": "It failed and I gave up"
      }
    ]
  },
  {
    "id": "q_fw_problems",
    "section": "s1a",
    "type": "multi",
    "prompt": "What went wrong?",
    "visibleIf": {
      "all": [
        {
          "all": [
            {
              "q": "q_powered",
              "in": [
                "whole_event",
                "most_days",
                "one_day_or_less"
              ]
            },
            {
              "q": "q_cohort",
              "eq": "event_fw"
            }
          ]
        },
        {
          "q": "q_fw_first_try",
          "answered": true
        },
        {
          "not": {
            "q": "q_fw_first_try",
            "eq": "yes_first_try"
          }
        }
      ]
    },
    "options": [
      {
        "code": "no_webserial",
        "label": "My browser couldn't connect to the device"
      },
      {
        "code": "driver_port",
        "label": "Driver or serial port problem"
      },
      {
        "code": "device_missing",
        "label": "My device model wasn't offered"
      },
      {
        "code": "no_bootloader",
        "label": "Device wouldn't enter bootloader mode"
      },
      {
        "code": "no_boot",
        "label": "It flashed but the device wouldn't boot"
      },
      {
        "code": "lost_config",
        "label": "I lost my previous config and did not expect to"
      },
      {
        "code": "no_laptop",
        "label": "I didn't have a laptop with me"
      },
      {
        "code": "other",
        "label": "Something else"
      }
    ]
  },
  {
    "id": "q_fw_browser",
    "section": "s1a",
    "type": "single",
    "prompt": "Which browser did you flash from?",
    "help": "Browser support for the underlying WebSerial API varies a lot, so this is genuinely useful to us.",
    "visibleIf": {
      "all": [
        {
          "all": [
            {
              "q": "q_powered",
              "in": [
                "whole_event",
                "most_days",
                "one_day_or_less"
              ]
            },
            {
              "q": "q_cohort",
              "eq": "event_fw"
            }
          ]
        },
        {
          "q": "q_fw_method",
          "eq": "web_flasher"
        }
      ]
    },
    "options": [
      {
        "code": "chrome",
        "label": "Chrome"
      },
      {
        "code": "edge",
        "label": "Edge"
      },
      {
        "code": "brave",
        "label": "Brave"
      },
      {
        "code": "arc",
        "label": "Arc"
      },
      {
        "code": "safari",
        "label": "Safari"
      },
      {
        "code": "firefox",
        "label": "Firefox"
      },
      {
        "code": "other",
        "label": "Other or don't remember"
      }
    ]
  },
  {
    "id": "q_fw_kept",
    "section": "s1a",
    "type": "single",
    "visibleIf": {
      "all": [
        {
          "q": "q_powered",
          "in": [
            "whole_event",
            "most_days",
            "one_day_or_less"
          ]
        },
        {
          "q": "q_cohort",
          "eq": "event_fw"
        }
      ]
    },
    "prompt": "Is your device still running the event firmware?",
    "options": [
      {
        "code": "still_on_it",
        "label": "Yes, it's still on there"
      },
      {
        "code": "reverted_after",
        "label": "I reverted after the event"
      },
      {
        "code": "reverted_during",
        "label": "I reverted during the event"
      },
      {
        "code": "not_sure",
        "label": "Not sure"
      }
    ]
  },
  {
    "id": "q_manual_why_not_fw",
    "section": "s1b",
    "type": "multi",
    "visibleIf": {
      "all": [
        {
          "q": "q_powered",
          "in": [
            "whole_event",
            "most_days",
            "one_day_or_less"
          ]
        },
        {
          "q": "q_cohort",
          "in": [
            "manual_full",
            "manual_chan",
            "manual_lora"
          ]
        }
      ]
    },
    "prompt": "Why did you configure it yourself instead of flashing the event firmware?",
    "help": "Pick everything that applied. There are no wrong answers here — we want to know what got in the way.",
    "options": [
      {
        "code": "didnt_know",
        "label": "I didn't know the event firmware existed"
      },
      {
        "code": "too_late",
        "label": "I found out about it too late"
      },
      {
        "code": "keep_config",
        "label": "I didn't want to lose my existing config or channels"
      },
      {
        "code": "device_unsupported",
        "label": "My device isn't supported by the flasher"
      },
      {
        "code": "no_computer",
        "label": "I didn't have a computer with me"
      },
      {
        "code": "non_stock",
        "label": "I didn't want to run non-stock firmware"
      },
      {
        "code": "too_complicated",
        "label": "It seemed too complicated"
      },
      {
        "code": "tried_failed",
        "label": "I tried and it failed"
      },
      {
        "code": "prefer_control",
        "label": "I prefer to control my own settings"
      },
      {
        "code": "other",
        "label": "Something else"
      }
    ]
  },
  {
    "id": "q_manual_settings",
    "section": "s1b",
    "type": "multi",
    "visibleIf": {
      "all": [
        {
          "q": "q_powered",
          "in": [
            "whole_event",
            "most_days",
            "one_day_or_less"
          ]
        },
        {
          "q": "q_cohort",
          "in": [
            "manual_full",
            "manual_chan",
            "manual_lora"
          ]
        }
      ]
    },
    "prompt": "Which settings did you actually change?",
    "options": [
      {
        "code": "modem_preset",
        "label": "Modem preset"
      },
      {
        "code": "region",
        "label": "Region"
      },
      {
        "code": "freq_slot",
        "label": "Frequency slot"
      },
      {
        "code": "hop_limit",
        "label": "Hop limit"
      },
      {
        "code": "role",
        "label": "Node role"
      },
      {
        "code": "mqtt",
        "label": "MQTT on/off"
      },
      {
        "code": "position_interval",
        "label": "Position broadcast interval"
      },
      {
        "code": "telemetry_interval",
        "label": "Telemetry intervals"
      },
      {
        "code": "channels",
        "label": "Added channel(s)"
      },
      {
        "code": "node_name",
        "label": "Node name"
      },
      {
        "code": "none",
        "label": "None of these, or not sure",
        "exclusive": true
      }
    ]
  },
  {
    "id": "q_manual_source",
    "section": "s1b",
    "type": "multi",
    "visibleIf": {
      "all": [
        {
          "q": "q_powered",
          "in": [
            "whole_event",
            "most_days",
            "one_day_or_less"
          ]
        },
        {
          "q": "q_cohort",
          "in": [
            "manual_full",
            "manual_chan",
            "manual_lora"
          ]
        }
      ]
    },
    "prompt": "Where did you get the event settings from?",
    "options": [
      {
        "code": "qr_at_event",
        "label": "A QR code at the event"
      },
      {
        "code": "defcon_site",
        "label": "defcon.meshtastic.org"
      },
      {
        "code": "docs",
        "label": "meshtastic.org documentation"
      },
      {
        "code": "discord",
        "label": "Meshtastic Discord"
      },
      {
        "code": "dc_forums",
        "label": "DEF CON forums"
      },
      {
        "code": "friend",
        "label": "A friend"
      },
      {
        "code": "signage",
        "label": "Village or booth signage"
      },
      {
        "code": "defcon_run",
        "label": "defcon.run"
      },
      {
        "code": "social",
        "label": "Social media"
      },
      {
        "code": "other",
        "label": "Somewhere else"
      }
    ]
  },
  {
    "id": "q_default_aware",
    "section": "s1c",
    "type": "single",
    "visibleIf": {
      "all": [
        {
          "q": "q_powered",
          "in": [
            "whole_event",
            "most_days",
            "one_day_or_less"
          ]
        },
        {
          "q": "q_cohort",
          "in": [
            "default_longfast",
            "unsure"
          ]
        }
      ]
    },
    "prompt": "Did you know there was event firmware and a set of event settings?",
    "options": [
      {
        "code": "knew_before",
        "label": "Yes, before the event"
      },
      {
        "code": "learned_during",
        "label": "I learned about it during the event"
      },
      {
        "code": "learned_after",
        "label": "I learned about it after the event"
      },
      {
        "code": "never_knew",
        "label": "No, this survey is the first I'm hearing of it"
      }
    ]
  },
  {
    "id": "q_default_why",
    "section": "s1c",
    "type": "multi",
    "prompt": "What made you stick with the defaults?",
    "visibleIf": {
      "all": [
        {
          "all": [
            {
              "q": "q_powered",
              "in": [
                "whole_event",
                "most_days",
                "one_day_or_less"
              ]
            },
            {
              "q": "q_cohort",
              "in": [
                "default_longfast",
                "unsure"
              ]
            }
          ]
        },
        {
          "q": "q_default_aware",
          "in": [
            "knew_before",
            "learned_during"
          ]
        }
      ]
    },
    "options": [
      {
        "code": "not_necessary",
        "label": "It didn't seem necessary"
      },
      {
        "code": "working_fine",
        "label": "LongFast was working fine for me"
      },
      {
        "code": "no_change",
        "label": "I didn't want to change my setup"
      },
      {
        "code": "too_complicated",
        "label": "It looked too complicated"
      },
      {
        "code": "no_time",
        "label": "I didn't have time"
      },
      {
        "code": "didnt_trust",
        "label": "I didn't trust it"
      },
      {
        "code": "device_cant",
        "label": "My device couldn't run it"
      },
      {
        "code": "other",
        "label": "Something else"
      }
    ]
  },
  {
    "id": "q_default_would_change",
    "section": "s1c",
    "type": "multi",
    "visibleIf": {
      "all": [
        {
          "q": "q_powered",
          "in": [
            "whole_event",
            "most_days",
            "one_day_or_less"
          ]
        },
        {
          "q": "q_cohort",
          "in": [
            "default_longfast",
            "unsure"
          ]
        }
      ]
    },
    "prompt": "What would have made you use the event config?",
    "options": [
      {
        "code": "clearer_instructions",
        "label": "Clearer instructions"
      },
      {
        "code": "phone_qr",
        "label": "A QR code I could scan with my phone"
      },
      {
        "code": "in_person",
        "label": "Someone showing me in person"
      },
      {
        "code": "earlier_notice",
        "label": "Knowing about it earlier"
      },
      {
        "code": "no_flash_needed",
        "label": "A way to apply the settings without flashing"
      },
      {
        "code": "nothing",
        "label": "Nothing — I'd still run LongFast",
        "exclusive": true
      },
      {
        "code": "other",
        "label": "Something else"
      }
    ]
  },
  {
    "id": "q_devices",
    "section": "s2",
    "type": "multi",
    "picker": "device",
    "visibleIf": {
      "q": "q_powered",
      "in": [
        "whole_event",
        "most_days",
        "one_day_or_less"
      ]
    },
    "prompt": "Which device(s) did you run at the event?",
    "help": "Search or filter by manufacturer. Older hardware is listed too.",
    "options": [
      {
        "code": "rak4631",
        "label": "RAK WisBlock 4631"
      },
      {
        "code": "heltec-v3",
        "label": "Heltec V3"
      },
      {
        "code": "tracker-t1000-e",
        "label": "Seeed Card Tracker T1000-E"
      },
      {
        "code": "seeed_wio_tracker_L1",
        "label": "Seeed Wio Tracker L1"
      },
      {
        "code": "heltec-v4",
        "label": "Heltec V4"
      },
      {
        "code": "t-deck",
        "label": "LILYGO T-Deck"
      },
      {
        "code": "heltec-mesh-node-t114",
        "label": "Heltec Mesh Node T114"
      },
      {
        "code": "rak_wismeshtag",
        "label": "RAK WisMesh Tag"
      },
      {
        "code": "t-echo",
        "label": "LILYGO T-Echo"
      },
      {
        "code": "nano-g2-ultra",
        "label": "Nano G2 Ultra"
      },
      {
        "code": "station-g2",
        "label": "Station G2"
      },
      {
        "code": "station-g3",
        "label": "Station G3"
      },
      {
        "code": "meshtastic-diy-v1",
        "label": "DIY V1"
      },
      {
        "code": "nrf52_promicro_diy_tcxo",
        "label": "NRF52 Pro-micro DIY"
      },
      {
        "code": "thinknode_m1",
        "label": "ThinkNode M1"
      },
      {
        "code": "thinknode_m2",
        "label": "ThinkNode M2"
      },
      {
        "code": "elecrow-adv1-43-50-70-tft",
        "label": "Crowpanel Adv 4.3/5.0/7.0 TFT"
      },
      {
        "code": "elecrow-adv-24-28-tft",
        "label": "Crowpanel Adv 2.4/2.8 TFT"
      },
      {
        "code": "elecrow-adv-35-tft",
        "label": "Crowpanel Adv 3.5 TFT"
      },
      {
        "code": "thinknode_m5",
        "label": "ThinkNode M5"
      },
      {
        "code": "thinknode_m3",
        "label": "ThinkNode M3"
      },
      {
        "code": "thinknode_m4",
        "label": "ThinkNode M4"
      },
      {
        "code": "thinknode_m6",
        "label": "ThinkNode M6"
      },
      {
        "code": "native-meshstick-1262",
        "label": "Elecrow Meshstick 1262"
      },
      {
        "code": "thinknode_m7",
        "label": "ThinkNode M7"
      },
      {
        "code": "thinknode_m8",
        "label": "Elecrow ThinkNode M8"
      },
      {
        "code": "heltec-wsl-v3",
        "label": "Heltec Wireless Stick Lite V3"
      },
      {
        "code": "heltec-wireless-tracker",
        "label": "Heltec Wireless Tracker V1.1"
      },
      {
        "code": "heltec-wireless-paper",
        "label": "Heltec Wireless Paper"
      },
      {
        "code": "heltec-ht62-esp32c3-sx1262",
        "label": "Heltec HT62"
      },
      {
        "code": "heltec-wireless-paper-v1_0",
        "label": "Heltec Wireless Paper V1.0"
      },
      {
        "code": "heltec-vision-master-t190",
        "label": "Heltec Vision Master T190"
      },
      {
        "code": "heltec-vision-master-e213",
        "label": "Heltec Vision Master E213"
      },
      {
        "code": "heltec-vision-master-e290",
        "label": "Heltec Vision Master E290"
      },
      {
        "code": "heltec-mesh-pocket-10000",
        "label": "Heltec MeshPocket (heltec-mesh-pocket-10000)"
      },
      {
        "code": "heltec-mesh-pocket-5000",
        "label": "Heltec MeshPocket (heltec-mesh-pocket-5000)"
      },
      {
        "code": "heltec-mesh-solar",
        "label": "Heltec MeshSolar"
      },
      {
        "code": "heltec-wireless-tracker-v2",
        "label": "Heltec Wireless Tracker V2"
      },
      {
        "code": "heltec-mesh-node-t096",
        "label": "Heltec Mesh Node T096"
      },
      {
        "code": "heltec-mesh-node-t1",
        "label": "Heltec Mesh Node T1"
      },
      {
        "code": "tlora-v2-1-1_6",
        "label": "LILYGO T-LoRa V2.1-1.6"
      },
      {
        "code": "tbeam",
        "label": "LILYGO T-Beam"
      },
      {
        "code": "tbeam-s3-core",
        "label": "LILYGO T-Beam Supreme"
      },
      {
        "code": "tlora-v2-1-1_8",
        "label": "LILYGO T-LoRa V2.1-1.8"
      },
      {
        "code": "tlora-t3s3-v1",
        "label": "LILYGO T-LoRa T3-S3"
      },
      {
        "code": "tlora-t3s3-epaper",
        "label": "LILYGO T-LoRa T3-S3 E-Ink"
      },
      {
        "code": "t-echo-plus",
        "label": "LILYGO T-Echo Plus"
      },
      {
        "code": "t-watch-s3",
        "label": "LILYGO T-Watch S3"
      },
      {
        "code": "tlora-c6",
        "label": "LilyGo T-Lora C6"
      },
      {
        "code": "t-deck-pro",
        "label": "LILYGO T-Deck Pro"
      },
      {
        "code": "tlora-pager",
        "label": "LILYGO T-LoRa Pager"
      },
      {
        "code": "t-echo-lite",
        "label": "LILYGO T-Echo Lite"
      },
      {
        "code": "t-beam-1w",
        "label": "LilyGo T-Beam 1W"
      },
      {
        "code": "t5-epaper-s3",
        "label": "LilyGo T5 E-paper S3 Pro"
      },
      {
        "code": "t-beam-bpf",
        "label": "LilyGo T-Beam BPF"
      },
      {
        "code": "mini-epaper-s3",
        "label": "LilyGo Mini E-paper S3"
      },
      {
        "code": "m5stack-unitc6l",
        "label": "M5Stack Unit C6L"
      },
      {
        "code": "m5stack-cardputer-adv",
        "label": "Cardputer Mesh Kit"
      },
      {
        "code": "muzi-base",
        "label": "muzi BASE DUO/UNO"
      },
      {
        "code": "r1-neo",
        "label": "muzi R1 Neo"
      },
      {
        "code": "rak4631_nomadstar_meteor_pro",
        "label": "NomadStar Meteor Pro"
      },
      {
        "code": "rak11200",
        "label": "RAK WisBlock 11200"
      },
      {
        "code": "rak2560",
        "label": "RAK WisMesh Repeater"
      },
      {
        "code": "rak11310",
        "label": "RAK WisBlock 11310"
      },
      {
        "code": "rak_wismeshtap",
        "label": "RAK WisMesh Tap"
      },
      {
        "code": "rak3312",
        "label": "RAK3312"
      },
      {
        "code": "rak_wismesh_tap_v2",
        "label": "RAK WisMesh Tap V2"
      },
      {
        "code": "rak3401-1watt",
        "label": "RAK3401 1W"
      },
      {
        "code": "native-rak6421",
        "label": "RAK6421 Hat+"
      },
      {
        "code": "pico",
        "label": "Raspberry Pi Pico"
      },
      {
        "code": "picow",
        "label": "Raspberry Pi Pico W"
      },
      {
        "code": "wio-tracker-wm1110",
        "label": "Seeed Wio WM1110 Tracker"
      },
      {
        "code": "seeed-sensecap-indicator",
        "label": "Seeed SenseCAP Indicator"
      },
      {
        "code": "seeed-xiao-s3",
        "label": "Seeed Xiao ESP32-S3"
      },
      {
        "code": "seeed_xiao_nrf52840_kit",
        "label": "Seeed Xiao NRF52840 Kit"
      },
      {
        "code": "seeed_solar_node",
        "label": "Seeed SenseCAP Solar Node"
      },
      {
        "code": "seeed_wio_tracker_L1_eink",
        "label": "Seeed Wio Tracker L1 E-Ink"
      },
      {
        "code": "heltec-wireless-tracker-V1-0",
        "label": "Heltec Wireless Tracker V1.0"
      },
      {
        "code": "nano-g1",
        "label": "Nano G1"
      },
      {
        "code": "nano-g1-explorer",
        "label": "Nano G1 Explorer"
      },
      {
        "code": "station-g1",
        "label": "Station G1"
      },
      {
        "code": "canaryone",
        "label": "Canary One"
      },
      {
        "code": "hydra",
        "label": "Hydra"
      },
      {
        "code": "meshtastic-dr-dev",
        "label": "DR-DEV"
      },
      {
        "code": "CDEBYTE_EoRa-S3",
        "label": "EBYTE EoRa-S3"
      },
      {
        "code": "heltec-v2_0",
        "label": "Heltec V2.0"
      },
      {
        "code": "heltec-v2_1",
        "label": "Heltec V2.1"
      },
      {
        "code": "heltec-v1",
        "label": "Heltec V1"
      },
      {
        "code": "tlora-v2",
        "label": "LILYGO T-LoRa V2"
      },
      {
        "code": "tlora-v1",
        "label": "LILYGO T-LoRa V1"
      },
      {
        "code": "tbeam0_7",
        "label": "LILYGO T-Beam V0.7"
      },
      {
        "code": "tlora-v1_3",
        "label": "LILYGO T-LoRa V1.1-1.3"
      },
      {
        "code": "m5stack-core",
        "label": "M5 Stack"
      },
      {
        "code": "radiomaster_900_bandit_nano",
        "label": "RadioMaster 900 Bandit Nano"
      },
      {
        "code": "seeed_mesh_tracker_X1",
        "label": "Seeed MeshTracker X1"
      },
      {
        "code": "rp2040-lora",
        "label": "RP2040 LoRa"
      },
      {
        "code": "tracksenger",
        "label": "TrackSenger (small TFT)"
      },
      {
        "code": "tracksenger-lcd",
        "label": "TrackSenger (big TFT)"
      },
      {
        "code": "tracksenger-oled",
        "label": "TrackSenger (big OLED)"
      },
      {
        "code": "picomputer-s3",
        "label": "Pi Computer S3"
      },
      {
        "code": "unphone",
        "label": "unPhone"
      },
      {
        "code": "other",
        "label": "Something else, or I'm not sure"
      }
    ]
  },
  {
    "id": "q_role",
    "section": "s2",
    "type": "single",
    "visibleIf": {
      "q": "q_powered",
      "in": [
        "whole_event",
        "most_days",
        "one_day_or_less"
      ]
    },
    "prompt": "What role was your main node set to?",
    "help": "If you never changed it, it was almost certainly CLIENT. \"Don't know\" is a perfectly good answer.",
    "options": [
      {
        "code": "client",
        "label": "CLIENT"
      },
      {
        "code": "client_mute",
        "label": "CLIENT_MUTE"
      },
      {
        "code": "router",
        "label": "ROUTER"
      },
      {
        "code": "router_client",
        "label": "ROUTER_CLIENT"
      },
      {
        "code": "repeater",
        "label": "REPEATER"
      },
      {
        "code": "tracker",
        "label": "TRACKER"
      },
      {
        "code": "sensor",
        "label": "SENSOR"
      },
      {
        "code": "dont_know",
        "label": "Don't know"
      }
    ]
  },
  {
    "id": "q_interaction",
    "section": "s2",
    "type": "single",
    "visibleIf": {
      "q": "q_powered",
      "in": [
        "whole_event",
        "most_days",
        "one_day_or_less"
      ]
    },
    "prompt": "How did you mainly interact with your node?",
    "options": [
      {
        "code": "standalone",
        "label": "Standalone device only — its own keyboard and screen, no phone"
      },
      {
        "code": "phone_app",
        "label": "Paired to a phone app"
      },
      {
        "code": "both",
        "label": "Both, roughly equally"
      },
      {
        "code": "web_client",
        "label": "Web client over USB or Bluetooth"
      },
      {
        "code": "cli",
        "label": "Command line"
      }
    ]
  },
  {
    "id": "q_clients",
    "section": "s2",
    "type": "multi",
    "prompt": "Which client app(s) did you use?",
    "visibleIf": {
      "all": [
        {
          "q": "q_powered",
          "in": [
            "whole_event",
            "most_days",
            "one_day_or_less"
          ]
        },
        {
          "q": "q_interaction",
          "answered": true
        },
        {
          "not": {
            "q": "q_interaction",
            "eq": "standalone"
          }
        }
      ]
    },
    "options": [
      {
        "code": "ios",
        "label": "iOS / iPadOS app"
      },
      {
        "code": "android_play",
        "label": "Android app (Play Store)"
      },
      {
        "code": "android_sideload",
        "label": "Android app (F-Droid or sideloaded APK)"
      },
      {
        "code": "web",
        "label": "Web client (client.meshtastic.org)"
      },
      {
        "code": "watch",
        "label": "Apple Watch"
      },
      {
        "code": "cli",
        "label": "CLI / Python"
      },
      {
        "code": "other",
        "label": "Something else"
      }
    ]
  },
  {
    "id": "q_client_version",
    "section": "s2",
    "type": "text",
    "maxLength": 40,
    "prompt": "What version was the app, if you know it?",
    "help": "Optional. Even a rough answer helps us line up bug reports.",
    "visibleIf": {
      "all": [
        {
          "q": "q_powered",
          "in": [
            "whole_event",
            "most_days",
            "one_day_or_less"
          ]
        },
        {
          "q": "q_interaction",
          "answered": true
        },
        {
          "not": {
            "q": "q_interaction",
            "eq": "standalone"
          }
        }
      ]
    }
  },
  {
    "id": "q_overall",
    "section": "s3",
    "type": "scale",
    "visibleIf": {
      "q": "q_powered",
      "in": [
        "whole_event",
        "most_days",
        "one_day_or_less"
      ]
    },
    "prompt": "Overall, how well did Meshtastic work for you at DEF CON 34?",
    "scale": {
      "min": 1,
      "max": 5,
      "minLabel": "Badly",
      "maxLabel": "Great"
    }
  },
  {
    "id": "q_issues",
    "section": "s3",
    "type": "multi",
    "visibleIf": {
      "q": "q_powered",
      "in": [
        "whole_event",
        "most_days",
        "one_day_or_less"
      ]
    },
    "prompt": "Which of these did you run into?",
    "help": "Pick everything you experienced, even briefly.",
    "options": [
      {
        "code": "no_delivery",
        "label": "Messages I sent never arrived"
      },
      {
        "code": "long_delays",
        "label": "Long delays before messages arrived"
      },
      {
        "code": "duplicates",
        "label": "Duplicate or repeated messages"
      },
      {
        "code": "too_busy",
        "label": "Channel so busy I couldn't follow the conversation"
      },
      {
        "code": "nodedb_churn",
        "label": "Node list filled up, or nodes constantly appearing and disappearing"
      },
      {
        "code": "no_nodes",
        "label": "Couldn't see any nodes at all"
      },
      {
        "code": "ble_drops",
        "label": "Bluetooth pairing kept dropping"
      },
      {
        "code": "app_crash",
        "label": "App crashed or froze"
      },
      {
        "code": "app_reconnect",
        "label": "App wouldn't reconnect after going out of range"
      },
      {
        "code": "device_reboot",
        "label": "Device rebooted or crashed on its own"
      },
      {
        "code": "battery",
        "label": "Battery drained faster than expected"
      },
      {
        "code": "position",
        "label": "Position or map not updating, or wrong"
      },
      {
        "code": "decrypt",
        "label": "Couldn't see or decrypt event channel messages"
      },
      {
        "code": "outside_traffic",
        "label": "Traffic from outside the event leaking in"
      },
      {
        "code": "none",
        "label": "None of these",
        "exclusive": true
      }
    ]
  },
  {
    "id": "q_worst_issue",
    "section": "s3",
    "type": "single",
    "pipeFrom": "q_issues",
    "visibleIf": {
      "all": [
        {
          "q": "q_powered",
          "in": [
            "whole_event",
            "most_days",
            "one_day_or_less"
          ]
        },
        {
          "all": [
            {
              "q": "q_issues",
              "answered": true
            },
            {
              "not": {
                "q": "q_issues",
                "includes": "none"
              }
            }
          ]
        }
      ]
    },
    "prompt": "Of those, which was the biggest problem?"
  },
  {
    "id": "q_where_worst",
    "section": "s3",
    "type": "multi",
    "visibleIf": {
      "all": [
        {
          "q": "q_powered",
          "in": [
            "whole_event",
            "most_days",
            "one_day_or_less"
          ]
        },
        {
          "all": [
            {
              "q": "q_issues",
              "answered": true
            },
            {
              "not": {
                "q": "q_issues",
                "includes": "none"
              }
            }
          ]
        }
      ]
    },
    "prompt": "Where was it worst?",
    "options": [
      {
        "code": "contest",
        "label": "Contest and CTF areas"
      },
      {
        "code": "halls",
        "label": "Main conference halls"
      },
      {
        "code": "villages",
        "label": "Villages"
      },
      {
        "code": "hotel",
        "label": "Hotel room"
      },
      {
        "code": "casino",
        "label": "Casino floor"
      },
      {
        "code": "outdoors",
        "label": "Outdoors, between venues"
      },
      {
        "code": "transit",
        "label": "In transit"
      },
      {
        "code": "everywhere",
        "label": "It was about the same everywhere",
        "exclusive": true
      },
      {
        "code": "dont_know",
        "label": "Don't know",
        "exclusive": true
      }
    ]
  },
  {
    "id": "q_dm",
    "section": "s3",
    "type": "single",
    "visibleIf": {
      "q": "q_powered",
      "in": [
        "whole_event",
        "most_days",
        "one_day_or_less"
      ]
    },
    "prompt": "Did you use direct messages?",
    "options": [
      {
        "code": "worked_well",
        "label": "Yes, and they worked well"
      },
      {
        "code": "unreliable",
        "label": "Yes, but they were unreliable"
      },
      {
        "code": "never_worked",
        "label": "Yes, and they never worked"
      },
      {
        "code": "didnt_try",
        "label": "I didn't try"
      }
    ]
  },
  {
    "id": "q_channel_used",
    "section": "s3",
    "type": "multi",
    "visibleIf": {
      "q": "q_powered",
      "in": [
        "whole_event",
        "most_days",
        "one_day_or_less"
      ]
    },
    "prompt": "Which channel(s) did you actually spend time on?",
    "options": [
      {
        "code": "defconnect",
        "label": "DEFCONnect"
      },
      {
        "code": "hackercomms",
        "label": "HackerComms"
      },
      {
        "code": "nodechat",
        "label": "NodeChat"
      },
      {
        "code": "private",
        "label": "My own private channel"
      },
      {
        "code": "longfast",
        "label": "The default LongFast channel"
      },
      {
        "code": "dont_know",
        "label": "Don't know",
        "exclusive": true
      }
    ]
  },
  {
    "id": "q_heard",
    "section": "s5",
    "type": "multi",
    "prompt": "How did you first hear about the event firmware or settings?",
    "options": [
      {
        "code": "defcon_site",
        "label": "defcon.meshtastic.org"
      },
      {
        "code": "social",
        "label": "Meshtastic social media"
      },
      {
        "code": "discord",
        "label": "Meshtastic Discord"
      },
      {
        "code": "dc_forums",
        "label": "DEF CON forums or Discord"
      },
      {
        "code": "friend",
        "label": "A friend or someone at the event"
      },
      {
        "code": "signage",
        "label": "Signage or a QR code at the venue"
      },
      {
        "code": "village",
        "label": "A village or booth"
      },
      {
        "code": "defcon_run",
        "label": "defcon.run"
      },
      {
        "code": "press",
        "label": "A news or press article"
      },
      {
        "code": "never",
        "label": "I didn't hear about it until this survey",
        "exclusive": true
      }
    ]
  },
  {
    "id": "q_next_year",
    "section": "s5",
    "type": "single",
    "prompt": "If we ship event firmware again for DEF CON 35, would you flash it?",
    "options": [
      {
        "code": "definitely",
        "label": "Definitely"
      },
      {
        "code": "probably",
        "label": "Probably"
      },
      {
        "code": "if_keeps_config",
        "label": "Only if it preserved my existing config"
      },
      {
        "code": "probably_not",
        "label": "Probably not"
      },
      {
        "code": "definitely_not",
        "label": "Definitely not"
      }
    ]
  },
  {
    "id": "q_one_change",
    "section": "s5",
    "type": "textarea",
    "maxLength": 300,
    "prompt": "What one change would most improve your Meshtastic experience at the event next year?"
  },
  {
    "id": "q_node_id",
    "section": "s5",
    "type": "text",
    "maxLength": 40,
    "visibleIf": {
      "q": "q_powered",
      "in": [
        "whole_event",
        "most_days",
        "one_day_or_less"
      ]
    },
    "prompt": "Your node short name or !hexid, if you want to share it",
    "help": "Completely optional. We only use it to cross-check reports against the mesh data we captured during the event. We are not collecting your name, email, or anything else — this survey is anonymous."
  }
];
