import { describe, expect, it } from 'vitest'

import { byteArrayToBase64, eventUserPrefsRawUrl, eventUserPrefsSourceUrl, parseEventUserPrefs, parseJsonc, prettyEnumValue } from './eventUserPrefs'

// Trimmed copy of the real event/defcon34 userPrefs.jsonc shape.
const FIXTURE = `{
  // "USERPREFS_BUTTON_PIN": "36",
  "USERPREFS_CHANNELS_TO_WRITE": "2",
  "USERPREFS_CHANNEL_0_NAME": "DEFCONnect",
  "USERPREFS_CHANNEL_0_PRECISION": "14",
  "USERPREFS_CHANNEL_0_PSK": "{ 0x38, 0x4b, 0xbc, 0xc0, 0x1d, 0xc0, 0x22, 0xd1, 0x81, 0xbf, 0x36, 0xb8, 0x61, 0x21, 0xe1, 0xfb, 0x96, 0xb7, 0x2e, 0x55, 0xbf, 0x74, 0x22, 0x7e, 0x9d, 0x6a, 0xfb, 0x48, 0xd6, 0x4c, 0xb1, 0xa1 }",
  "USERPREFS_CHANNEL_0_UPLINK_ENABLED": "true",
  "USERPREFS_CHANNEL_1_NAME": "HackerComms",
  "USERPREFS_CHANNEL_1_PSK": "{ 0xe8, 0x8c, 0xec, 0x6a, 0x85, 0x61, 0xc7, 0x51, 0x13, 0x59, 0xe5, 0xae, 0xbb, 0x47, 0x54, 0x58, 0xc2, 0xea, 0x22, 0xdb, 0xd8, 0x24, 0xb6, 0xd1, 0xcf, 0x08, 0x13, 0x00, 0xa0, 0x9f, 0xbe, 0xd6 }",
  "USERPREFS_CONFIG_LORA_IGNORE_MQTT": "true",
  "USERPREFS_CONFIG_LORA_REGION": "meshtastic_Config_LoRaConfig_RegionCode_US",
  "USERPREFS_EVENT_MODE": "1",
  "USERPREFS_EVENT_MODE_HOP_LIMIT": "4", // Event-mode default hop cap (0-7; default 3)
  "USERPREFS_LORACONFIG_CHANNEL_NUM": "31",
  "USERPREFS_LORACONFIG_MODEM_PRESET": "meshtastic_Config_LoRaConfig_ModemPreset_SHORT_TURBO",
  "USERPREFS_MQTT_ADDRESS": "'mqtt.defcon.org'",
  "USERPREFS_MQTT_USERNAME": "public",
  "USERPREFS_MQTT_TLS_ENABLED": "true",
  "USERPREFS_MQTT_ROOT_TOPIC": "event/defcon34"
}`

describe('parseJsonc', () => {
  it('strips line comments, keeps active entries', () => {
    const raw = parseJsonc(FIXTURE)
    expect(raw.USERPREFS_BUTTON_PIN).toBeUndefined()
    expect(raw.USERPREFS_CHANNEL_0_NAME).toBe('DEFCONnect')
  })

  it('ignores inline comments after values but not slashes inside strings', () => {
    const raw = parseJsonc(FIXTURE)
    expect(raw.USERPREFS_EVENT_MODE_HOP_LIMIT).toBe('4')
    expect(raw.USERPREFS_MQTT_ROOT_TOPIC).toBe('event/defcon34')
  })

  it('handles block comments and trailing commas', () => {
    const raw = parseJsonc('{ /* note */ "A": "1", }')
    expect(raw).toEqual({ A: '1' })
  })
})

describe('byteArrayToBase64', () => {
  it('converts a C byte-array initializer to base64', () => {
    expect(byteArrayToBase64('{ 0x38, 0x4b }')).toBe('OEs=')
  })

  it('returns undefined for empty or invalid input', () => {
    expect(byteArrayToBase64('{}')).toBeUndefined()
    expect(byteArrayToBase64('')).toBeUndefined()
    expect(byteArrayToBase64('not bytes')).toBeUndefined()
    expect(byteArrayToBase64('{ 0x100 }')).toBeUndefined()
  })
})

describe('prettyEnumValue', () => {
  it('extracts and title-cases the enum constant', () => {
    expect(prettyEnumValue('meshtastic_Config_LoRaConfig_ModemPreset_SHORT_TURBO')).toBe('Short Turbo')
  })

  it('keeps short and numeric words uppercase', () => {
    expect(prettyEnumValue('meshtastic_Config_LoRaConfig_RegionCode_US')).toBe('US')
    expect(prettyEnumValue('meshtastic_Config_LoRaConfig_RegionCode_EU_868')).toBe('EU 868')
  })

  it('passes through non-enum values', () => {
    expect(prettyEnumValue('plain')).toBe('plain')
    expect(prettyEnumValue(undefined)).toBeUndefined()
  })
})

describe('parseEventUserPrefs', () => {
  const prefs = parseEventUserPrefs(FIXTURE)

  it('extracts LoRa settings', () => {
    expect(prefs.region).toBe('US')
    expect(prefs.modemPreset).toBe('Short Turbo')
    expect(prefs.frequencySlot).toBe('31')
    expect(prefs.hopLimit).toBe('4')
    expect(prefs.ignoreMqtt).toBe(true)
  })

  it('extracts the declared channels with base64 PSKs', () => {
    expect(prefs.channels).toHaveLength(2)
    expect(prefs.channels[0]).toEqual({
      index: 0,
      name: 'DEFCONnect',
      psk: 'OEu8wB3AItGBvza4YSHh+5a3LlW/dCJ+nWr7SNZMsaE=',
      uplinkEnabled: true,
      positionPrecision: '14',
    })
    expect(prefs.channels[1].name).toBe('HackerComms')
    expect(prefs.channels[1].psk).toBe('6IzsaoVhx1ETWeWuu0dUWMLqItvYJLbRzwgTAKCfvtY=')
    expect(prefs.channels[1].uplinkEnabled).toBeUndefined()
  })

  it('extracts MQTT settings, unquoting C string literals', () => {
    expect(prefs.mqtt.address).toBe('mqtt.defcon.org')
    expect(prefs.mqtt.username).toBe('public')
    expect(prefs.mqtt.password).toBeUndefined()
    expect(prefs.mqtt.rootTopic).toBe('event/defcon34')
    expect(prefs.mqtt.tlsEnabled).toBe(true)
    expect(prefs.mqtt.encryptionEnabled).toBeUndefined()
  })

  it('returns no channels when the count is absent', () => {
    expect(parseEventUserPrefs('{}').channels).toEqual([])
  })
})

describe('url builders', () => {
  it('builds the raw and source URLs from the firmware slug', () => {
    expect(eventUserPrefsRawUrl('defcon34')).toBe('https://raw.githubusercontent.com/meshtastic/firmware/event/defcon34/userPrefs.jsonc')
    expect(eventUserPrefsSourceUrl('defcon34')).toBe('https://github.com/meshtastic/firmware/blob/event/defcon34/userPrefs.jsonc')
  })
})
