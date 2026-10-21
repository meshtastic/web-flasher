/**
 * Which build of a board's firmware to flash.
 *
 * The firmware repo publishes a board per PlatformIO env, and the display
 * variants are separate envs rather than options on one build: `t-deck` and
 * `t-deck-tft` are two boards in the release, as are `t-echo` and
 * `t-echo-inkhud`. Whether a given variant exists is a property of the
 * release, not of the hardware - `unphone` has no `-tft` env, and
 * `seeed_wio_tracker_L2` has no plain one - so the registry's `hasMui` /
 * `hasInkHud` flags say what the board can run, and the release manifest says
 * what was actually built.
 */
export type FirmwareVariant = 'stock' | 'mui' | 'inkhud'

const VARIANT_SUFFIX: Record<FirmwareVariant, string> = {
  stock: '',
  mui: '-tft',
  inkhud: '-inkhud',
}

/**
 * The board name a variant resolves to. Idempotent: the Crowpanel envs are
 * named `elecrow-adv-35-tft` and friends, so asking for their MUI build must
 * yield that same board rather than `-tft-tft`.
 */
export function variantBoard(pioTarget: string, variant: FirmwareVariant): string {
  const suffix = VARIANT_SUFFIX[variant]
  if (!suffix || pioTarget.endsWith(suffix)) return pioTarget
  return `${pioTarget}${suffix}`
}

/**
 * The variant an env name already carries, for boards whose only build is a
 * display one. Crowpanel ships as `*-tft` and the InkHUD-only Heltecs as
 * `*-inkhud`; for those there is no plain build to fall back to, which is what
 * separates them from a board that merely happens to have both.
 */
function intrinsicVariant(pioTarget: string): FirmwareVariant | undefined {
  if (pioTarget.endsWith('-tft')) return 'mui'
  if (pioTarget.endsWith('-inkhud')) return 'inkhud'
  return undefined
}

export interface VariantAvailability {
  stock: boolean
  mui: boolean
  inkhud: boolean
  /**
   * No release manifest to consult - which is not the same as "nothing was
   * built". Releases before v2.7.23 publish no board list, and the manifest is
   * briefly cleared while a newly selected release fetches its own.
   */
  unknown: boolean
}

const NOTHING_KNOWN: VariantAvailability = { stock: false, mui: false, inkhud: false, unknown: true }

/**
 * Which of a board's variants the selected release published.
 *
 * @param boards Board names from the release manifest, or `undefined` when
 *   there is no manifest - reported as `unknown`, never as "not built".
 */
export function resolveVariants(
  pioTarget: string,
  boards: ReadonlySet<string> | undefined,
): VariantAvailability {
  if (!boards) return NOTHING_KNOWN

  // An env that names its own variant is that variant, so looking up all three
  // names would find the same board twice and report a choice that isn't there.
  const intrinsic = intrinsicVariant(pioTarget)
  if (intrinsic) {
    const built = boards.has(pioTarget)
    return {
      stock: false,
      mui: intrinsic === 'mui' && built,
      inkhud: intrinsic === 'inkhud' && built,
      unknown: false,
    }
  }

  return {
    stock: boards.has(pioTarget),
    mui: boards.has(variantBoard(pioTarget, 'mui')),
    inkhud: boards.has(variantBoard(pioTarget, 'inkhud')),
    unknown: false,
  }
}

/**
 * Whether to offer the MUI toggle. Only a release that built both gives the
 * user something to choose; with one variant the toggle would offer a build
 * that 404s, and with no manifest there is nothing to base it on.
 */
export function canChooseMui(availability: VariantAvailability, hasMui: boolean): boolean {
  if (!hasMui || availability.unknown) return false
  return availability.stock && availability.mui
}

/**
 * The value to force the MUI toggle to when there is no choice, or `undefined`
 * when the user owns the setting. Complementary to `canChooseMui`: whenever the
 * toggle is on screen this returns `undefined`, so forcing never fights it.
 */
export function pinnedMui(availability: VariantAvailability, hasMui: boolean): boolean | undefined {
  if (!hasMui || availability.unknown) return undefined
  if (availability.mui && !availability.stock) return true
  if (availability.stock && !availability.mui) return false
  return undefined
}

/**
 * The variant to build filenames from.
 *
 * Derived rather than read straight off the toggles, because the flags outlive
 * the board they were set for: `deviceStore.setSelectedTarget` turns MUI on for
 * a board that has it but never turns it off again, so auto-detecting a plain
 * board after picking a T-Deck would otherwise ask for `firmware-tbeam-tft-*`.
 * Guarding each flag with the board's own capability keeps that impossible.
 */
export function resolveSelectedVariant(opts: {
  availability: VariantAvailability
  hasMui: boolean
  hasInkHud: boolean
  shouldInstallMui: boolean
  shouldInstallInkHud: boolean
}): FirmwareVariant {
  const { availability, hasMui, hasInkHud, shouldInstallMui, shouldInstallInkHud } = opts
  // MUI wins over InkHUD, as the suffix chain in Esp32.vue always has - no
  // board in the registry carries both flags.
  const wantsMui = pinnedMui(availability, hasMui) ?? (shouldInstallMui && hasMui)
  if (wantsMui) return 'mui'
  if (shouldInstallInkHud && hasInkHud) return 'inkhud'
  return 'stock'
}
