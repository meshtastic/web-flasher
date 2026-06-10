import type { PrBuildResponse } from '~/types/api'

/**
 * Map a device hardware architecture to the firmware CI artifact arch token.
 * Artifacts are named firmware-{arch}-{version} where arch has no dashes
 * (e.g. device 'esp32-s3' → artifact 'esp32s3').
 */
export function artifactArchForDevice(architecture: string): string {
  return architecture.replace(/-/g, '')
}

/**
 * Escape an untrusted value so it renders as literal text when embedded in the
 * synthesized markdown. HTML-escaping prevents raw HTML tags; backslash-escaping
 * markdown punctuation prevents links, images, emphasis and code spans from
 * forming (so the title cannot break out of, or inject, markdown syntax). With
 * the renderer's DOMPurify pass this leaves attacker-controlled fields inert.
 */
function escapeMarkdown(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
    .replace(/[\\`*_[\]~]/g, '\\$&')
}

/**
 * Synthesize release notes for a PR build, shown in the flash dialog before
 * the user can continue (the non-empty notes force the warning step).
 * The PR title and author are attacker-controlled (any GitHub user can open a
 * PR), so they are escaped before being embedded in the markdown. The PR link
 * wraps only the (numeric, trusted) PR number, so the title sits outside any
 * markdown link syntax.
 */
export function buildPrReleaseNotes(payload: PrBuildResponse): string {
  const expires = new Date(payload.expires_at).toLocaleDateString()
  const title = escapeMarkdown(payload.pr.title)
  const author = escapeMarkdown(payload.pr.author)
  return [
    '> [!WARNING]',
    '> This is an automated test build of a pull request. It has not been reviewed or released by Meshtastic. Back up your device configuration before flashing, and only flash devices you are able to recover.',
    '',
    `### [#${payload.pr.number}](${payload.pr.page_url}): ${title}`,
    '',
    `- Author: @${author}`,
    `- Version: \`${payload.version}\` (commit \`${payload.pr.head_sha.substring(0, 7)}\`)`,
    `- Build artifacts expire: ${expires}`,
    '',
    `Found a problem with this build? Report it on [the pull request](${payload.pr.page_url}).`,
  ].join('\n')
}
