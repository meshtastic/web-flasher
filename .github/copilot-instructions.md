# Copilot Instructions

These guidelines help keep contributions consistent in this project. 
## General
- Stack: Nuxt 3, Vue 3 SFCs, TypeScript, Pinia stores, Tailwind CSS, vue-i18n.
- Prefer composition API with `<script setup lang="ts">`. Use `defineProps`, `defineEmits`, `defineExpose` sparingly.
- Keep files ASCII-only unless the file already uses Unicode for locales.
- Keep logic small and focused; favor composables/util functions in `utils/` or store actions over in-component sprawl.
- Use playwright to test your changes and view the context and outcomes as much as possible. The app is running with `npm run dev` on localhost:3000.


## Vue patterns
- Use template refs and computed values instead of direct DOM manipulation where possible.
- Avoid global document/window listeners unless necessary; clean them up in `onUnmounted`.
- Keep dropdowns/menus simple (`position: absolute` under a relative parent) unless overflow escaping is required.
- Use existing stores: `useDeviceStore`, `useFirmwareStore`, `useSerialMonitorStore`, `useToastStore`, etc. Don’t recreate state in components.

## Styling
- Use Tailwind utility classes; avoid inline styles unless dynamic sizing demands it.
- Reuse existing semantic button classes (`btn-primary`, `btn-icon`, etc.) and text colors.
- Maintain consistent spacing (multiples of 2 or 4 px via Tailwind scales).

## Internationalization
- All user-visible text must go through `useI18n` (`$t('key')`). Do not hardcode strings in templates or scripts.
- Add new locale keys to all files in `i18n/locales/` (at minimum `en.json`) and keep keys flat and descriptive.

## Data & APIs
- Types: prefer existing interfaces in `types/`. If adding, keep them colocated or in `types/`.
- When fetching firmware/device data, use store actions; avoid duplicating fetch logic.

## Testing & quality
- Keep lint-friendly code: no unused imports/vars, consistent `async/await`, and null checks for DOM refs.
- Handle failure paths (API fetch errors, missing device selection) with graceful UI states using existing toast patterns.

## Accessibility
- Maintain keyboard/focus behavior for interactive elements; use semantic buttons/links and ARIA labels when appropriate.
- Avoid triggering animations that block focus or screen readers.

## Commits
- Keep diffs minimal and scoped; avoid reformat-only changes.

## Design Standards

All UI must comply with the [Meshtastic Client Design Standards](https://raw.githubusercontent.com/meshtastic/design/refs/heads/master/standards/meshtastic_design_standards_latest.md). Fetch and review this document before making any UI changes.

### Brand Colors

Primary/Foreground color:
- `#2C2D3C` — available as `neutral-800` in Tailwind

Secondary/Background/Accent color:
- `#67EA94` — available as `meshtastic` / `meshtastic-300` in Tailwind

### Tailwind Color Tokens

Use the project's Tailwind theme tokens (defined in `tailwind.config.js`) instead of raw hex values:

#### Green / Accent Scale (`meshtastic-*`)

| Token | Hex | Usage |
|-------|-----|-------|
| `meshtastic-50` | `#E8FCF0` | Lightest tint background |
| `meshtastic-100` | `#D1F9E1` | Success tint background |
| `meshtastic-200` | `#A3F3C3` | Light highlight |
| `meshtastic-300` | `#67EA94` | **Brand accent** (DEFAULT) |
| `meshtastic-400` | `#3DE07A` | Hover / active accent |
| `meshtastic-500` | `#22C55E` | Darker accent |
| `meshtastic-600` | `#1A9B4A` | Text on light backgrounds (meets WCAG AA) |
| `meshtastic-700` | `#137136` | Strong / dark green text |
| `meshtastic-800` | `#0C4722` | Very dark green |
| `meshtastic-900` | `#051D0E` | Darkest green |

#### Neutral Scale (`neutral-*`)

| Token | Hex | Usage |
|-------|-----|-------|
| `neutral-50` | `#F5F6FA` | Light mode background |
| `neutral-100` | `#ECEDF3` | Light mode surface / card |
| `neutral-200` | `#D5D6E0` | Dividers |
| `neutral-300` | `#B8BAC8` | Borders (light mode) |
| `neutral-400` | `#9496A6` | Disabled / tertiary |
| `neutral-500` | `#6E7082` | Placeholder text |
| `neutral-600` | `#555668` | Dark mode secondary text |
| `neutral-700` | `#3D3E50` | Dark mode elevated surface |
| `neutral-800` | `#2C2D3C` | **Primary** — dark mode surface / light mode text |
| `neutral-900` | `#1A1B26` | Dark mode background |
| `neutral-950` | `#0F1017` | Darkest background |

#### Semantic Colors (`info-*`, `warning-*`, `error-*`)

| Token | Hex | Usage |
|-------|-----|-------|
| `info` | `#5C6BC0` | Informational indicators / links |
| `info-light` | `#E8EAF6` | Info tint background |
| `warning` | `#E8A33E` | Caution / attention |
| `warning-light` | `#FFF3E0` | Warning tint background |
| `error` | `#E05252` | Errors / destructive actions |
| `error-light` | `#FDEAEA` | Error tint background |

### CSS Custom Properties

For theme-aware styling (dark/light mode), use the CSS variables defined in `assets/css/main.css`:
- `var(--accent)` / `var(--accent-dark)` — brand green (adapts per theme)
- `var(--text-default)` / `var(--text-muted)` — text colors
- `var(--surface-primary)` / `var(--surface-secondary)` / `var(--surface-card)` — backgrounds
- `var(--border-default)` / `var(--border-hover)` — borders
- Utility classes: `text-theme`, `text-theme-muted`, `text-theme-accent`, `bg-surface-primary`, `bg-surface-secondary`, `border-theme`

### Accessibility Note

All foreground/background pairings must meet WCAG AA contrast (4.5:1 minimum). Use `meshtastic-600` or `meshtastic-700` for green text on light backgrounds — never the raw accent `meshtastic-300` (`#67EA94`), which does not meet contrast requirements on white.

## Firmware Flashing Architecture

### Device Architectures
The flasher supports three device architectures:
- **ESP32** (esp32, esp32-s3, esp32-c3, etc.) - Uses WebSerial API for direct flashing
- **nRF52840** - Uses UF2 file download (device enters DFU mode, mounts as USB drive)
- **RP2040** - Uses UF2 file download (similar to nRF52840)

### UF2 Flashing (nRF52840 / RP2040)
UF2 flashing is a simple download-based approach:
1. User puts device in DFU mode (via `deviceStore.enterDfuMode()`)
2. Device mounts as USB mass storage drive
3. User downloads `.uf2` file via direct link or from zip file
4. User copies the file to the mounted drive
5. Device auto-reboots with new firmware

Key files:
- `components/targets/Uf2.vue` - UI for UF2 download steps
- `components/targets/EraseUf2.vue` - Erase functionality for UF2 devices
- `firmwareStore.downloadUf2FileSystem()` - Extracts UF2 from zip file

### ESP32 Flashing
ESP32 flashing uses the WebSerial API with esptool.js. There are two approaches:

**Manifest-Driven Flashing** (preferred, when `.mt.json` is available):
- Uses `manifest.files[]` array with `part_name` to determine binary file names
- Uses `manifest.part[]` array to look up partition offsets
- No convention-based file naming required except for the .factory.bin file
- Uses `firmwareStore.updateEspFlash(selectedTarget)` and `firmwareStore.cleanInstallEspFlash(selectedTarget)`
- Helper methods: `getPartitionOffset(partName)`, `findFileByPartName(partName)`, `findFactoryFile()`

**Legacy Flashing** (fallback for older releases):
- Uses convention-based file naming patterns
- Uses `firmwareStore.updateEspFlashLegacy(fileName, selectedTarget)` 
- Uses `firmwareStore.cleanInstallEspFlashLegacy(fileName, otaFileName, littleFsFileName, selectedTarget)`
- Hardcoded partition offsets based on `partitionScheme` string

**Update Flash** (non-destructive):
- Writes only the app binary to the `app0` partition offset
- Preserves user settings and filesystem

**Clean Install** (full erase):
- Erases entire flash first
- Writes three binaries:
  - Factory app binary (`.factory.bin`) at `0x00`
  - OTA binary at `app1` partition offset
  - LittleFS filesystem at `spiffs` partition offset

**Legacy Partition Schemes (used when no manifest):**
- `4MB` - Default: OTA at `0x260000`, SPIFFS at `0x300000`
- `8MB` - Legacy: OTA at `0x340000`, SPIFFS at `0x670000`
- `8MB` (new, TFT devices 2.7.9+): OTA at `0x5D0000`, SPIFFS at `0x670000`
- `16MB` - OTA at `0x650000`, SPIFFS at `0xc90000`

Key files:
- `components/targets/Esp32.vue` - UI for ESP32 flashing steps
- `stores/firmwareStore.ts` - Core flashing logic, ESPLoader integration
- `utils/terminal.ts` - xterm.js terminal for flash output
- `types/manifest.ts` - Firmware manifest types and partition constants (PARTITION_NAMES)

### Firmware Manifest
New firmware releases include `.mt.json` manifest files with:
- Partition table info (`part` array with offsets/sizes)
- Files array with `part_name` field linking to partition name
- Device metadata (`hwModel`, `displayName`, `architecture`)
- Available files with MD5 checksums
- Feature flags (`has_mui`, `has_inkhud`, `requiresDfu`)

### State Management
- `firmwareStore` - Firmware selection, flashing state, progress tracking
- `firmwareStore.manifest` - Loaded FirmwareManifest object (when available)
- `deviceStore` - Device/target selection, serial port management
- Key state: `isFlashing`, `flashPercentDone`, `selectedFirmware`, `selectedTarget`
