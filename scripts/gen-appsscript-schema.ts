/**
 * Generate appsscript/Schema.gs from the TypeScript survey schema.
 *
 * The Apps Script endpoint validates submissions against the same questions,
 * option codes, and branch rules the Vue app renders. Rather than maintain two
 * copies by hand — which would drift, and would drift silently, since a
 * too-permissive server allowlist fails open — the .gs constants are generated.
 *
 * Requires a Node with flagless TypeScript type stripping (22.18+, 23.6+, or
 * 24+); the pnpm script feature-detects and explains. CI pins Node 20, so this is
 * a local authoring step; the generated file is committed.
 *
 * Usage:
 *   pnpm run survey:schema
 */

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  MIN_FILL_MS,
  QUESTIONS,
  SCHEMA_VERSION,
  SECTIONS,
} from '../components/survey/schema.ts'

const here = dirname(fileURLToPath(import.meta.url))
const outputPath = join(here, '..', 'appscript', 'survey', 'Schema.gs')

const banner = `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Source:    components/survey/schema.ts
 * Regenerate: node scripts/gen-appsscript-schema.ts
 *
 * Paste the whole file into the Apps Script project as Schema.gs whenever the
 * survey schema changes, and bump SCHEMA_VERSION in the source first so stale
 * cached clients are rejected instead of writing mismatched columns.
 */
`

const body = [
  banner,
  `var SCHEMA_VERSION = ${JSON.stringify(SCHEMA_VERSION)};`,
  `var MIN_FILL_MS = ${JSON.stringify(MIN_FILL_MS)};`,
  '',
  `var SECTIONS = ${JSON.stringify(SECTIONS, null, 2)};`,
  '',
  `var QUESTIONS = ${JSON.stringify(QUESTIONS, null, 2)};`,
  '',
].join('\n')

writeFileSync(outputPath, body, 'utf8')

const multiCount = QUESTIONS.filter(q => q.type === 'multi').length
const oneHotCount = QUESTIONS
  .filter(q => q.type === 'multi')
  .reduce((sum, q) => sum + (q.options?.length ?? 0), 0)

console.log(`Wrote ${outputPath}`)
console.log(`  schema version ${SCHEMA_VERSION}`)
console.log(`  ${SECTIONS.length} sections, ${QUESTIONS.length} questions`)
console.log(`  ${multiCount} multi-selects contributing ${oneHotCount} one-hot columns`)
