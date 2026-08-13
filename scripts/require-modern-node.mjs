/**
 * Guard for the survey generators, which are authored in TypeScript and run
 * directly via Node's type stripping (unflagged from 22.6).
 *
 * Without this, an older Node fails deep inside the module loader with a syntax
 * error pointing at a type annotation, which reads like a broken script rather
 * than a toolchain mismatch. CI pins Node 20, so this is a realistic default for
 * anyone who has not switched versions locally.
 *
 * Deliberately not an `engines` field: the app itself builds fine on Node 20,
 * and constraining the whole package would flag every install.
 */

const MINIMUM = [22, 6]

const current = process.versions.node.split('.').map(Number)
const tooOld
  = current[0] < MINIMUM[0]
    || (current[0] === MINIMUM[0] && current[1] < MINIMUM[1])

if (tooOld) {
  console.error(
    `This script needs Node ${MINIMUM.join('.')} or newer to run TypeScript directly.\n`
    + `You are on Node ${process.versions.node}.\n\n`
    + 'The generated files are committed, so you only need this when changing the\n'
    + 'survey schema or the device list. Switch with `nvm use 22` (or newer).',
  )
  process.exit(1)
}
