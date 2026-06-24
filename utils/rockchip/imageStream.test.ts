import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createDecompressedStream, detectCompression } from './imageStream'

function streamFrom(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes)
      controller.close()
    },
  })
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    chunks.push(value)
    length += value.length
  }
  const out = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

describe('detectCompression', () => {
  it('maps known extensions and rejects the rest', () => {
    expect(detectCompression('image.img')).toBe('raw')
    expect(detectCompression('image.img.gz')).toBe('gzip')
    expect(detectCompression('image.IMG.XZ')).toBe('xz')
    expect(detectCompression('image.zip')).toBeNull()
    expect(detectCompression('image.bin')).toBeNull()
  })
})

describe('createDecompressedStream', () => {
  const expected = 'meshtastic-rockchip-xz-test-payload.'.repeat(50)

  it('passes raw streams through unchanged', async () => {
    const raw = new TextEncoder().encode(expected)
    const out = await readAll(await createDecompressedStream(streamFrom(raw), 'raw'))
    expect(new TextDecoder().decode(out)).toBe(expected)
  })

  it('decompresses an xz image stream via the WASM decoder', async () => {
    const xz = new Uint8Array(readFileSync(resolve(process.cwd(), 'utils/rockchip/fixtures/sample.xz')))
    const out = await readAll(await createDecompressedStream(streamFrom(xz), 'xz'))
    expect(new TextDecoder().decode(out)).toBe(expected)
  })
})
