/**
 * Generate components/survey/devices.generated.ts from the vendored hardware list.
 *
 * The flasher fetches its device list from api.meshtastic.org at runtime. The
 * survey deliberately does not: every answer is validated server-side against a
 * fixed allowlist, and an option set that shifts underneath that allowlist would
 * start rejecting legitimate answers the moment new hardware ships. Snapshotting
 * at build time keeps client and server in agreement, and means the survey still
 * renders if the API is unavailable.
 *
 * Unlike the flasher, this includes hardware that is no longer actively
 * supported. Old T-Beams and Heltec V2s were all over DEF CON, and that older
 * hardware is exactly the population most likely to have had trouble — dropping
 * it would bias the results in the least useful direction.
 *
 * Reads public/data/hardware-list.json, which is a protected file (see
 * .github/workflows) — read-only here, never modified.
 *
 * Requires Node 22.6+ (TypeScript type stripping); the pnpm script checks this
 * and explains the mismatch rather than failing with a syntax error. CI pins
 * Node 20, so this is a local authoring step — the output is committed and
 * nothing in the build regenerates it.
 *
 * Usage:  pnpm run survey:devices
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

interface HardwareEntry {
  hwModel: number
  hwModelSlug: string
  platformioTarget: string
  displayName: string
  architecture: string
  activelySupported?: boolean
  tags?: string[]
  images?: string[]
}

const here = dirname(fileURLToPath(import.meta.url))
const inputPath = join(here, '..', 'public', 'data', 'hardware-list.json')
const outputPath = join(here, '..', 'components', 'survey', 'devices.generated.ts')

const hardware: HardwareEntry[] = JSON.parse(readFileSync(inputPath, 'utf8'))

/**
 * Devices actually seen at DEF CON 34, most common first.
 *
 * Source: the Android app's `device_hardware` RUM context, counted by unique
 * users. These nine cover the overwhelming majority of connected nodes, so they
 * lead the picker — a respondent with a RAK4631 should not have to scroll past
 * three dozen boards nobody carried.
 *
 * The telemetry's tenth entry, `private-hw`, is not a device: it's the value
 * reported when hardware is unset or private. The picker's "Something else, or
 * I'm not sure" option covers that case.
 *
 * Codes are platformioTarget values, validated against the hardware list below.
 */
const POPULAR_AT_DEFCON = [
  'rak4631', //                197 users — RAK WisBlock 4631
  'heltec-v3', //               96
  'tracker-t1000-e', //         63
  'seeed_wio_tracker_L1', //    46
  'heltec-v4', //               42
  't-deck', //                  33
  'heltec-mesh-node-t114', //   30
  'rak_wismeshtag', //          30
  't-echo', //                  21
]

const knownTargets = new Set(hardware.map(entry => entry.platformioTarget))
for (const code of POPULAR_AT_DEFCON) {
  if (!knownTargets.has(code)) {
    throw new Error(`POPULAR_AT_DEFCON references unknown platformioTarget: ${code}`)
  }
}

function rankOf(entry: HardwareEntry): number {
  const index = POPULAR_AT_DEFCON.indexOf(entry.platformioTarget)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

/**
 * Ordering, in priority order:
 *   1. The DEF CON telemetry devices, in popularity order.
 *   2. Devices that have real artwork, before those that do not — 22 boards
 *      ship no image and all render as the same generic placeholder, which
 *      looks broken when a screenful of them leads the grid.
 *   3. Vendor, then hwModel, so each manufacturer stays grouped and diffs
 *      remain readable across regenerations.
 */
const sorted = [...hardware].sort((a, b) => {
  const rankDelta = rankOf(a) - rankOf(b)
  if (rankDelta !== 0) return rankDelta

  const artA = a.images?.length ? 0 : 1
  const artB = b.images?.length ? 0 : 1
  if (artA !== artB) return artA - artB

  const vendorA = (a.tags?.[0] ?? 'zzz').toLowerCase()
  const vendorB = (b.tags?.[0] ?? 'zzz').toLowerCase()
  if (vendorA !== vendorB) return vendorA < vendorB ? -1 : 1
  return a.hwModel - b.hwModel
})

// platformioTarget, not hwModelSlug, is the unique key: five slugs cover
// multiple distinct boards (CROWPANEL spans three, HELTEC_WIRELESS_TRACKER
// four). platformioTarget is unique across all entries and is the same field
// the flasher matches on when auto-detecting a connected device.
/**
 * Explicit codes for boards whose platformioTarget is not unique, keyed by
 * hwModelSlug.
 *
 * `native` is shared by every Linux/portduino board. Rather than deriving a
 * suffix automatically — which would silently rewrite an existing code, and so
 * orphan already-collected answers, the first time a previously-unique target
 * gained a sibling — collisions are listed here by hand. The uniqueness check
 * below throws on any collision not covered, so a new one is a build failure
 * that a human resolves, never a silent data migration.
 */
const CODE_OVERRIDES: Record<string, string> = {
  RAK6421: 'native-rak6421',
  MESHSTICK_1262: 'native-meshstick-1262',
}

const imageDir = join(here, '..', 'public', 'img', 'devices')

/**
 * The hardware list names an image for some boards whose SVG is not actually
 * vendored here (newly added hardware, mostly). Resolving that at build time
 * and nulling it out means the picker falls back to the placeholder instead of
 * rendering a broken image — and the count is reported below, so missing art is
 * visible rather than silently ugly.
 */
function resolveImage(entry: HardwareEntry): string | null {
  const image = entry.images?.[0]
  if (!image) return null
  return existsSync(join(imageDir, image)) ? image : null
}

const devices = sorted.map(entry => ({
  code: CODE_OVERRIDES[entry.hwModelSlug] ?? entry.platformioTarget,
  label: entry.displayName,
  slug: entry.hwModelSlug,
  vendor: entry.tags?.[0] ?? 'Other',
  image: resolveImage(entry),
  legacy: entry.activelySupported !== true,
}))

const seen = new Set<string>()
for (const device of devices) {
  if (seen.has(device.code)) {
    throw new Error(
      `Duplicate device code "${device.code}" (${device.slug}). Add an entry to `
      + 'CODE_OVERRIDES keyed by hwModelSlug — do not change an existing code.',
    )
  }
  seen.add(device.code)
}

/**
 * Two boards sharing a displayName render as identical rows in the picker, so a
 * respondent picks one at random and neither code can be interpreted. The
 * hardware list is read-only here, so disambiguate with the code, which is what
 * actually distinguishes them.
 */
const labelCounts = new Map<string, number>()
for (const device of devices) {
  labelCounts.set(device.label, (labelCounts.get(device.label) ?? 0) + 1)
}
for (const device of devices) {
  if ((labelCounts.get(device.label) ?? 0) > 1) device.label = `${device.label} (${device.code})`
}

const duplicateLabels = devices
  .map(d => d.label)
  .filter((label, i, all) => all.indexOf(label) !== i)
if (duplicateLabels.length > 0) {
  throw new Error(`Device labels still duplicated after disambiguation: ${duplicateLabels.join(', ')}`)
}

const vendors = [...new Set(devices.map(d => d.vendor))].sort((a, b) =>
  a.localeCompare(b),
)

const body = `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Source:     public/data/hardware-list.json
 * Regenerate: node scripts/gen-device-options.ts
 *
 * Codes are platformioTarget values (with explicit overrides where that field
 * collides), which are permanent Meshtastic hardware identifiers — safe to use
 * as sheet column keys and to join against the flasher's own data later.
 * NEVER change an existing code: it is the answer key for collected responses.
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

export const DEVICE_VENDORS: string[] = ${JSON.stringify(vendors, null, 2)}

export const DEVICE_OPTIONS: DeviceOption[] = ${JSON.stringify(devices, null, 2)}
`

writeFileSync(outputPath, body, 'utf8')

const withImages = devices.filter(d => d.image).length
console.log(`Wrote ${outputPath}`)
console.log(`  ${devices.length} devices across ${vendors.length} vendors`)
console.log(`  ${withImages} with artwork, ${devices.length - withImages} without`)
console.log(`  ${devices.filter(d => d.legacy).length} no longer actively supported (kept deliberately)`)
