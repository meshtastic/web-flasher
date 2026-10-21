import { describe, it, expect } from 'vitest'
import {
  canChooseMui,
  pinnedMui,
  resolveSelectedVariant,
  resolveVariants,
  variantBoard,
  type VariantAvailability,
} from './firmwareVariants'

// Boards as v2.8.1.8e6a88d actually published them, so the fixtures stay
// honest about which shapes exist in the wild.
const V281 = new Set([
  't-deck',
  't-deck-tft',
  'unphone',
  'heltec-v4-r8-oled',
  'seeed_wio_tracker_L2-tft',
  'elecrow-adv-35-tft',
  't-echo',
  't-echo-inkhud',
  't-echo-plus',
])

describe('variantBoard', () => {
  it('appends the variant suffix', () => {
    expect(variantBoard('t-deck', 'mui')).toBe('t-deck-tft')
    expect(variantBoard('t-echo', 'inkhud')).toBe('t-echo-inkhud')
  })

  it('leaves the board alone for stock', () => {
    expect(variantBoard('t-deck', 'stock')).toBe('t-deck')
    expect(variantBoard('elecrow-adv-35-tft', 'stock')).toBe('elecrow-adv-35-tft')
  })

  it('is idempotent for envs that already name their variant', () => {
    // Crowpanel: asking for its MUI build must not produce -tft-tft.
    expect(variantBoard('elecrow-adv-35-tft', 'mui')).toBe('elecrow-adv-35-tft')
    expect(variantBoard('heltec-mesh-pocket-5000-inkhud', 'inkhud')).toBe('heltec-mesh-pocket-5000-inkhud')
  })
})

describe('resolveVariants', () => {
  it('reports both builds when the release has both', () => {
    expect(resolveVariants('t-deck', V281)).toEqual({ stock: true, mui: true, inkhud: false, unknown: false })
  })

  it('reports MUI only when the plain board is absent', () => {
    // Wio Tracker L2 ships -tft alone, which is why probing the plain name
    // left it unflashable.
    expect(resolveVariants('seeed_wio_tracker_L2', V281)).toEqual({ stock: false, mui: true, inkhud: false, unknown: false })
  })

  it('reports MUI only for an env that is itself -tft', () => {
    const v = resolveVariants('elecrow-adv-35-tft', V281)
    expect(v).toEqual({ stock: false, mui: true, inkhud: false, unknown: false })
  })

  it('reports stock only when the -tft build is absent', () => {
    expect(resolveVariants('unphone', V281)).toEqual({ stock: true, mui: false, inkhud: false, unknown: false })
    expect(resolveVariants('heltec-v4-r8-oled', V281)).toEqual({ stock: true, mui: false, inkhud: false, unknown: false })
  })

  it('reports nothing built for a board missing from the release', () => {
    expect(resolveVariants('seeed_meshpager_x2', V281)).toEqual({ stock: false, mui: false, inkhud: false, unknown: false })
  })

  it('reports InkHUD alongside stock', () => {
    expect(resolveVariants('t-echo', V281)).toEqual({ stock: true, mui: false, inkhud: true, unknown: false })
    expect(resolveVariants('t-echo-plus', V281)).toEqual({ stock: true, mui: false, inkhud: false, unknown: false })
  })

  it('reports unknown rather than unbuilt without a manifest', () => {
    expect(resolveVariants('t-deck', undefined)).toEqual({ stock: false, mui: false, inkhud: false, unknown: true })
  })
})

describe('canChooseMui / pinnedMui', () => {
  const a = (o: Partial<VariantAvailability>): VariantAvailability =>
    ({ stock: false, mui: false, inkhud: false, unknown: false, ...o })

  it('offers the choice only when both builds exist', () => {
    expect(canChooseMui(a({ stock: true, mui: true }), true)).toBe(true)
    expect(canChooseMui(a({ stock: false, mui: true }), true)).toBe(false)
    expect(canChooseMui(a({ stock: true, mui: false }), true)).toBe(false)
  })

  it('never offers the choice for a board without MUI', () => {
    expect(canChooseMui(a({ stock: true, mui: true }), false)).toBe(false)
  })

  it('declines to answer without a manifest', () => {
    expect(canChooseMui(a({ unknown: true }), true)).toBe(false)
    expect(pinnedMui(a({ unknown: true }), true)).toBeUndefined()
  })

  it('pins to the only variant that was built', () => {
    expect(pinnedMui(a({ stock: false, mui: true }), true)).toBe(true)
    expect(pinnedMui(a({ stock: true, mui: false }), true)).toBe(false)
  })

  it('leaves the setting alone when nothing was built', () => {
    expect(pinnedMui(a({}), true)).toBeUndefined()
  })

  // The one thing that could silently break the UX: a forced value while the
  // checkbox is on screen would fight the user on every click.
  it('never pins while the chooser is shown', () => {
    const boards = ['t-deck', 'seeed_wio_tracker_L2', 'elecrow-adv-35-tft', 'unphone', 'seeed_meshpager_x2', 't-echo']
    for (const pio of [...boards, ...boards.map(b => `${b}-tft`)]) {
      for (const hasMui of [true, false]) {
        for (const set of [V281, undefined]) {
          const v = resolveVariants(pio, set)
          if (canChooseMui(v, hasMui)) expect(pinnedMui(v, hasMui)).toBeUndefined()
        }
      }
    }
  })
})

describe('resolveSelectedVariant', () => {
  const opts = (o: Partial<Parameters<typeof resolveSelectedVariant>[0]>) => ({
    availability: resolveVariants('t-deck', V281),
    hasMui: true,
    hasInkHud: false,
    shouldInstallMui: false,
    shouldInstallInkHud: false,
    ...o,
  })

  it('follows the toggle when the user has a choice', () => {
    expect(resolveSelectedVariant(opts({ shouldInstallMui: true }))).toBe('mui')
    expect(resolveSelectedVariant(opts({ shouldInstallMui: false }))).toBe('stock')
  })

  it('overrides a stale toggle with the only variant that exists', () => {
    // Wio Tracker L2 has no plain build; unphone has no -tft build.
    expect(resolveSelectedVariant(opts({
      availability: resolveVariants('seeed_wio_tracker_L2', V281),
      shouldInstallMui: false,
    }))).toBe('mui')
    expect(resolveSelectedVariant(opts({
      availability: resolveVariants('unphone', V281),
      shouldInstallMui: true,
    }))).toBe('stock')
  })

  it('ignores a flag the board cannot honour', () => {
    // The flag outlives the board it was set for; a plain tbeam must never
    // resolve to -tft just because a T-Deck was picked first.
    expect(resolveSelectedVariant(opts({
      availability: resolveVariants('tbeam', undefined),
      hasMui: false,
      shouldInstallMui: true,
    }))).toBe('stock')
    expect(resolveSelectedVariant(opts({
      hasInkHud: false,
      shouldInstallInkHud: true,
    }))).toBe('stock')
  })

  it('prefers MUI over InkHUD', () => {
    expect(resolveSelectedVariant(opts({
      hasInkHud: true,
      shouldInstallMui: true,
      shouldInstallInkHud: true,
    }))).toBe('mui')
  })

  it('falls back to the toggles without a manifest', () => {
    expect(resolveSelectedVariant(opts({
      availability: resolveVariants('t-deck', undefined),
      shouldInstallMui: true,
    }))).toBe('mui')
  })
})
