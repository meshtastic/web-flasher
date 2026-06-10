import { describe, expect, it } from 'vitest'
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js'
import { extractZipEntry, listZipEntries } from './zipUtils'

async function makeZip(entries: Record<string, string>): Promise<Blob> {
  const writer = new ZipWriter(new BlobWriter('application/zip'))
  for (const [name, content] of Object.entries(entries)) {
    await writer.add(name, new TextReader(content))
  }
  return writer.close()
}

describe('zipUtils', () => {
  describe('extractZipEntry', () => {
    it('extracts an entry by exact name', async () => {
      const zip = await makeZip({
        'firmware-rak11200-2.8.0.7a414be.bin': 'app binary',
        'littlefs-rak11200-2.8.0.7a414be.bin': 'filesystem',
      })
      const entry = await extractZipEntry(zip, name => name === 'firmware-rak11200-2.8.0.7a414be.bin')
      expect(entry?.filename).toBe('firmware-rak11200-2.8.0.7a414be.bin')
      expect(await entry?.blob.text()).toBe('app binary')
    })

    it('extracts an entry matched by regex predicate', async () => {
      const zip = await makeZip({
        'device-install.sh': 'script',
        'firmware-t-echo-2.8.0.7a414be.uf2': 'uf2 payload',
      })
      const regex = /firmware-t-echo-.+\.uf2/
      const entry = await extractZipEntry(zip, name => regex.test(name))
      expect(entry?.filename).toBe('firmware-t-echo-2.8.0.7a414be.uf2')
      expect(await entry?.blob.text()).toBe('uf2 payload')
    })

    it('returns undefined when nothing matches', async () => {
      const zip = await makeZip({ 'readme.txt': 'hi' })
      const entry = await extractZipEntry(zip, name => name.endsWith('.bin'))
      expect(entry).toBeUndefined()
    })
  })

  describe('listZipEntries', () => {
    it('lists all entry filenames', async () => {
      const zip = await makeZip({
        'a.bin': '1',
        'b.uf2': '2',
        'nested/c.json': '3',
      })
      const names = await listZipEntries(zip)
      expect(names.sort()).toEqual(['a.bin', 'b.uf2', 'nested/c.json'])
    })
  })
})
