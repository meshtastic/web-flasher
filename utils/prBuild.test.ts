import { describe, expect, it } from 'vitest'
import { marked } from 'marked'
import type { PrBuildResponse } from '~/types/api'
import { artifactArchForDevice, buildPrReleaseNotes } from './prBuild'

describe('prBuild', () => {
  describe('artifactArchForDevice', () => {
    // CI artifact arches: firmware-{arch}-{version} with no dashes in arch
    const CI_ARCHES = ['esp32', 'esp32s3', 'esp32c3', 'esp32c6', 'nrf52840', 'rp2040', 'rp2350', 'stm32']

    it.each([
      ['esp32', 'esp32'],
      ['esp32-s3', 'esp32s3'],
      ['esp32-c3', 'esp32c3'],
      ['esp32-c6', 'esp32c6'],
      ['nrf52840', 'nrf52840'],
      ['rp2040', 'rp2040'],
    ])('maps device architecture %s to artifact arch %s', (device, artifact) => {
      const result = artifactArchForDevice(device)
      expect(result).toBe(artifact)
      expect(CI_ARCHES).toContain(result)
    })
  })

  describe('buildPrReleaseNotes', () => {
    const payload: PrBuildResponse = {
      pr: {
        number: 10665,
        title: 'Clamp position precision on public / known-keys',
        page_url: 'https://github.com/meshtastic/firmware/pull/10665',
        author: 'thebentern',
        head_sha: '9c4317ef9d2178381cecbf72e342adeba95c2784',
        state: 'open',
        merged: false,
      },
      run_id: 27241663552,
      version: '2.8.0.7a414be',
      expires_at: '2026-07-09T23:08:08Z',
      artifacts: [],
      targets: [],
    }

    it('includes the warning admonition so the release notes gate engages', () => {
      const notes = buildPrReleaseNotes(payload)
      expect(notes).toContain('[!WARNING]')
      expect(notes.trim().length).toBeGreaterThan(0)
    })

    it('links only the PR number and shows the title outside link syntax', () => {
      const notes = buildPrReleaseNotes(payload)
      expect(notes).toContain('[#10665](https://github.com/meshtastic/firmware/pull/10665):')
      expect(notes).toContain('Clamp position precision on public / known-keys')
      expect(notes).toContain('@thebentern')
    })

    it('shows the version, short commit, and expiry date', () => {
      const notes = buildPrReleaseNotes(payload)
      expect(notes).toContain('`2.8.0.7a414be`')
      expect(notes).toContain('`9c4317e`')
      expect(notes).toContain(new Date(payload.expires_at).toLocaleDateString())
    })

    it('HTML-escapes an attacker-controlled PR title so it cannot form raw HTML', () => {
      const malicious: PrBuildResponse = {
        ...payload,
        pr: { ...payload.pr, title: '<img src=x onerror="alert(document.domain)">' },
      }
      const notes = buildPrReleaseNotes(malicious)
      expect(notes).not.toContain('<img')
      expect(notes).not.toContain('onerror="')
      expect(notes).toContain('&lt;img src=x onerror=&quot;alert(document.domain)&quot;&gt;')
    })

    it('HTML-escapes the author field', () => {
      const malicious: PrBuildResponse = {
        ...payload,
        pr: { ...payload.pr, author: '<b>evil</b>' },
      }
      const notes = buildPrReleaseNotes(malicious)
      expect(notes).not.toContain('<b>')
      expect(notes).toContain('@&lt;b&gt;evil&lt;/b&gt;')
    })

    it('backslash-escapes markdown so a title cannot break out of or inject a link', async () => {
      const malicious: PrBuildResponse = {
        ...payload,
        pr: { ...payload.pr, title: 'pwn](javascript:alert(1)) and [evil](javascript:alert(2))' },
      }
      const notes = buildPrReleaseNotes(malicious)
      // The title's brackets are backslash-escaped...
      expect(notes).toContain('pwn\\]')
      expect(notes).toContain('\\[evil\\]')
      // ...so marked forms no link with a javascript: href from the title
      const html = await marked(notes)
      expect(html).not.toMatch(/href="javascript:/i)
    })

    it('renders emphasis and code markers in the title literally', () => {
      const malicious: PrBuildResponse = {
        ...payload,
        pr: { ...payload.pr, title: '*spoof* `code` _x_' },
      }
      const notes = buildPrReleaseNotes(malicious)
      expect(notes).toContain('\\*spoof\\*')
      expect(notes).toContain('\\`code\\`')
      expect(notes).toContain('\\_x\\_')
    })
  })
})
