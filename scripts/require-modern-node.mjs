/**
 * Guard for the survey generators, which are authored in TypeScript and run
 * through Node's built-in type stripping with no flag.
 *
 * Feature-detects rather than comparing version numbers, because the version
 * ranges are genuinely awkward: type stripping arrived in 22.6.0 behind
 * `--experimental-strip-types`, and was only unflagged in 22.18.0 — and
 * separately in 23.6.0 for the 23.x line, so 23.0–23.5 still need the flag. A
 * naive `>= 22.6` or even `>= 22.18` check passes on versions where a flagless
 * `node script.ts` still fails.
 *
 * `process.features.typescript` is exactly the signal we want: 'strip' or
 * 'transform' when TypeScript runs without a flag, false when it does not, and
 * undefined on Node old enough to predate the property.
 *
 * Without this, an unsupported Node fails deep in the module loader with a
 * syntax error pointing at a type annotation, which reads like a broken script
 * rather than a toolchain mismatch. CI pins Node 20, so that is a realistic
 * default for anyone who has not switched locally.
 *
 * Deliberately not an `engines` field: the app itself builds fine on Node 20,
 * and constraining the whole package would flag every install.
 */

if (!process.features.typescript) {
  console.error(
    `This script runs TypeScript directly, which Node ${process.versions.node} cannot do without a flag.\n\n`
    + 'Node 22.18+ (or 23.6+, or any 24+) enables type stripping by default.\n'
    + 'Switch with `nvm use 22` or newer.\n\n'
    + 'The generated files are committed, so you only need this when changing\n'
    + 'the survey schema or the device list.',
  )
  process.exit(1)
}
