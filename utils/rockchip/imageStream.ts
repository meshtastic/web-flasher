/**
 * Streaming decompression for disk images written by the Rockchip flasher.
 * gzip uses the browser's native DecompressionStream; xz uses the xz-decompress
 * WASM decoder, imported lazily so it only loads when an .xz image is flashed.
 */

/** Compression formats the flasher can stream-decompress. */
export type ImageCompression = 'raw' | 'gzip' | 'xz'

/** Detect compression from a filename, or null for unsupported types. */
export function detectCompression(filename: string): ImageCompression | null {
  const name = filename.toLowerCase()
  if (name.endsWith('.gz')) return 'gzip'
  if (name.endsWith('.xz')) return 'xz'
  if (name.endsWith('.img')) return 'raw'
  return null
}

/** Wrap a compressed byte stream in the matching decompressor. */
export async function createDecompressedStream(
  source: ReadableStream<Uint8Array>,
  compression: ImageCompression,
): Promise<ReadableStream<Uint8Array>> {
  if (compression === 'gzip') {
    return source.pipeThrough(new DecompressionStream('gzip'))
  }
  if (compression === 'xz') {
    const { XzReadableStream } = await import('xz-decompress')
    return new XzReadableStream(source) as unknown as ReadableStream<Uint8Array>
  }
  return source
}
