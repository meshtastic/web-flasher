// Shape of the api.meshtastic.org `GET resource/eventFirmware` manifest.
// Mirrors meshtastic/api src/lib/eventFirmware.ts (and the offline snapshot in
// public/data/event_firmware.json). The manifest is the single source of truth
// for event editions; the web-flasher resolves the active edition by hostname
// and maps it into an EventModeConfig (see utils/eventManifest.ts).

export interface EventFirmwareLink {
  label: string
  url: string
}

export interface EventFirmwareTheme {
  name?: string | null // theme title, e.g. "Agency"
  tagline?: string | null
  colors?: {
    primary?: string | null
    secondary?: string | null
    accent?: string | null
  } | null
  palette?: string[] | null
  fonts?: { heading?: string | null, body?: string | null } | null
}

export interface EventFirmwareBuild {
  slug: string // meshtastic.github.io event path segment, e.g. "defcon2026"
  version?: string | null
  id?: string | null
  title?: string | null
  zipUrl?: string | null
  releaseNotes?: string | null
}

export interface EventFirmwareEdition {
  edition: string // FirmwareEdition proto enum name, e.g. "DEFCON"
  displayName: string
  welcomeMessage: string
  tag?: string | null
  eventStart?: string | null
  eventEnd?: string | null
  timeZone?: string | null
  location?: string | null
  iconUrl?: string | null
  accentColor?: string | null
  domain?: string | null
  links?: EventFirmwareLink[]
  theme?: EventFirmwareTheme | null
  firmware?: EventFirmwareBuild | null
}

export interface EventFirmwareResponse {
  version: number
  generatedAt?: string
  source?: string
  editions: EventFirmwareEdition[]
}
