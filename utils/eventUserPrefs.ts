// Event firmware builds are compiled from a userPrefs.jsonc on the matching
// `event/<slug>` branch of meshtastic/firmware (e.g. event/defcon34). That
// file is the source of truth for the radio settings baked into the build —
// LoRa region/preset, channels and their PSKs, MQTT, etc. — so the Event
// Details sheet fetches and parses it to show flashers what they'll get.

export interface EventChannelPrefs {
  index: number
  name?: string
  // PSK rendered as base64, matching how the Meshtastic apps display keys.
  psk?: string
  uplinkEnabled?: boolean
  positionPrecision?: string
}

export interface EventMqttPrefs {
  address?: string
  username?: string
  password?: string
  rootTopic?: string
  encryptionEnabled?: boolean
  tlsEnabled?: boolean
}

export interface EventUserPrefs {
  region?: string
  modemPreset?: string
  frequencySlot?: string
  hopLimit?: string
  ignoreMqtt?: boolean
  channels: EventChannelPrefs[]
  mqtt: EventMqttPrefs
}

export function eventUserPrefsRawUrl(slug: string): string {
  return `https://raw.githubusercontent.com/meshtastic/firmware/event/${encodeURIComponent(slug)}/userPrefs.jsonc`
}

export function eventUserPrefsSourceUrl(slug: string): string {
  return `https://github.com/meshtastic/firmware/blob/event/${encodeURIComponent(slug)}/userPrefs.jsonc`
}

// Strip // and /* */ comments (string-aware) plus trailing commas, so the
// .jsonc file can go through JSON.parse. Commented-out prefs are inactive in
// the build, so dropping them here is exactly right.
export function parseJsonc(text: string): Record<string, string> {
  let out = ''
  let inString = false
  let inLineComment = false
  let inBlockComment = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]
    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false
        out += ch
      }
      continue
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false
        i++
      }
      continue
    }
    if (inString) {
      out += ch
      if (ch === '\\') {
        out += next ?? ''
        i++
      }
      else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
      out += ch
      continue
    }
    if (ch === '/' && next === '/') {
      inLineComment = true
      i++
      continue
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true
      i++
      continue
    }
    out += ch
  }
  const parsed = JSON.parse(out.replace(/,(\s*[}\]])/g, '$1')) as Record<string, unknown>
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string') result[key] = value
  }
  return result
}

// "{ 0x38, 0x4b, ... }" (a C byte-array initializer) -> base64, the format the
// Meshtastic apps use for keys. Returns undefined for empty/invalid arrays.
export function byteArrayToBase64(value?: string): string | undefined {
  if (!value) return undefined
  const match = /^\s*\{([\s\S]*)\}\s*$/.exec(value)
  if (!match) return undefined
  const parts = match[1].split(',').map(p => p.trim()).filter(Boolean)
  if (!parts.length) return undefined
  const bytes: number[] = []
  for (const part of parts) {
    const byte = Number(part)
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) return undefined
    bytes.push(byte)
  }
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

// "meshtastic_Config_LoRaConfig_ModemPreset_SHORT_TURBO" -> "Short Turbo",
// "meshtastic_Config_LoRaConfig_RegionCode_US" -> "US". The enum constant is
// the trailing ALL_CAPS run; short/numeric words (US, EU, 868) stay uppercase.
export function prettyEnumValue(value?: string): string | undefined {
  if (!value) return undefined
  const match = /^meshtastic_\w*?_([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*)$/.exec(value)
  const constant = match ? match[1] : value
  return constant
    .split('_')
    .map(word => word.length > 3 && !/\d/.test(word)
      ? word.charAt(0) + word.slice(1).toLowerCase()
      : word)
    .join(' ')
}

// C string values sometimes carry their single quotes ("'mqtt.defcon.org'").
function unquote(value?: string): string | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed.startsWith('\'') && trimmed.endsWith('\'') && trimmed.length >= 2
    ? trimmed.slice(1, -1)
    : trimmed
}

function toBool(value?: string): boolean | undefined {
  if (value === undefined) return undefined
  return value === 'true' || value === '1'
}

export function parseEventUserPrefs(text: string): EventUserPrefs {
  const raw = parseJsonc(text)
  const channels: EventChannelPrefs[] = []
  const count = Number(raw.USERPREFS_CHANNELS_TO_WRITE) || 0
  for (let i = 0; i < count; i++) {
    channels.push({
      index: i,
      name: raw[`USERPREFS_CHANNEL_${i}_NAME`],
      psk: byteArrayToBase64(raw[`USERPREFS_CHANNEL_${i}_PSK`]),
      uplinkEnabled: toBool(raw[`USERPREFS_CHANNEL_${i}_UPLINK_ENABLED`]),
      positionPrecision: raw[`USERPREFS_CHANNEL_${i}_PRECISION`],
    })
  }
  return {
    region: prettyEnumValue(raw.USERPREFS_CONFIG_LORA_REGION),
    modemPreset: prettyEnumValue(raw.USERPREFS_LORACONFIG_MODEM_PRESET),
    frequencySlot: raw.USERPREFS_LORACONFIG_CHANNEL_NUM,
    hopLimit: raw.USERPREFS_EVENT_MODE_HOP_LIMIT,
    ignoreMqtt: toBool(raw.USERPREFS_CONFIG_LORA_IGNORE_MQTT),
    channels,
    mqtt: {
      address: unquote(raw.USERPREFS_MQTT_ADDRESS),
      username: unquote(raw.USERPREFS_MQTT_USERNAME),
      password: unquote(raw.USERPREFS_MQTT_PASSWORD),
      rootTopic: unquote(raw.USERPREFS_MQTT_ROOT_TOPIC),
      encryptionEnabled: toBool(raw.USERPREFS_MQTT_ENCRYPTION_ENABLED),
      tlsEnabled: toBool(raw.USERPREFS_MQTT_TLS_ENABLED),
    },
  }
}

export async function fetchEventUserPrefs(slug: string): Promise<EventUserPrefs | null> {
  try {
    const response = await fetch(eventUserPrefsRawUrl(slug), { signal: AbortSignal.timeout(5000) })
    if (!response.ok) return null
    return parseEventUserPrefs(await response.text())
  }
  catch {
    return null
  }
}
