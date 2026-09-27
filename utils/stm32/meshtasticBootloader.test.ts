import { describe, expect, it } from 'vitest'
import { rebootMeshtasticToBootloader } from './meshtasticBootloader'

// Framed FromRadio{ my_info: MyNodeInfo{ my_node_num: 4660 } }
//   FromRadio.my_info  = field 3, message  -> tag 0x1A, len 0x03
//   MyNodeInfo.my_node_num = field 1, varint -> tag 0x08, varint(4660) = B4 24
const MY_INFO_FRAME = [0x94, 0xc3, 0x00, 0x05, 0x1a, 0x03, 0x08, 0xb4, 0x24]

function includesSeq(haystack: number[], needle: number[]): boolean {
  return haystack.some((_, i) => needle.every((b, j) => haystack[i + j] === b))
}

/** Minimal Web Serial port backed by a stub that answers wantConfigId with my_info. */
class FakeMeshtasticPort {
  opened = false
  closeCount = 0
  readable: ReadableStream<Uint8Array> | null = null
  writable: WritableStream<Uint8Array> | null = null
  received: number[] = []
  answerConfig = true

  lastReadable: ReadableStream<Uint8Array> | null = null
  lastWritable: WritableStream<Uint8Array> | null = null

  private rx: ReadableStreamDefaultController<Uint8Array> | null = null

  async open() {
    this.opened = true
    this.readable = new ReadableStream<Uint8Array>({ start: c => (this.rx = c) })
    this.writable = new WritableStream<Uint8Array>({ write: chunk => this.onHostBytes(chunk) })
    this.lastReadable = this.readable
    this.lastWritable = this.writable
  }

  async close() {
    this.closeCount++
    this.opened = false
    this.readable = null
    this.writable = null
    this.rx = null
  }

  private onHostBytes(chunk: Uint8Array) {
    for (const b of chunk) this.received.push(b)
    if (this.answerConfig && this.rx) {
      this.answerConfig = false
      queueMicrotask(() => {
        try {
          this.rx?.enqueue(new Uint8Array(MY_INFO_FRAME))
        }
        catch { /* stream gone */ }
      })
    }
  }
}

// @meshtastic/core's queue waits 200ms before every write, so give configure
// (1 packet) and the DFU send (1 packet) enough headroom.
const fast = { configureMs: 700, dfuAckMs: 600 }

describe('rebootMeshtasticToBootloader', () => {
  it('learns the node number, sends enter_dfu_mode_request, and releases the port', async () => {
    const port = new FakeMeshtasticPort()
    await rebootMeshtasticToBootloader(port as unknown as SerialPort, fast)

    // AdminMessage{ enter_dfu_mode_request: true } = A8 01 01 (field 21, bool)
    expect(includesSeq(port.received, [0xa8, 0x01, 0x01])).toBe(true)
    // MeshPacket.to = field 2 fixed32 -> 15 34 12 00 00 (our own node 4660)
    expect(includesSeq(port.received, [0x15, 0x34, 0x12, 0x00, 0x00])).toBe(true)

    expect(port.closeCount).toBeGreaterThanOrEqual(1)
    expect(port.lastReadable!.locked).toBe(false)
    expect(port.lastWritable!.locked).toBe(false)
  })

  it('still completes when the device never reports its node number', async () => {
    const port = new FakeMeshtasticPort()
    port.answerConfig = false
    await rebootMeshtasticToBootloader(port as unknown as SerialPort, fast)

    expect(includesSeq(port.received, [0xa8, 0x01, 0x01])).toBe(true)
    expect(port.closeCount).toBeGreaterThanOrEqual(1)
    expect(port.lastReadable!.locked).toBe(false)
    expect(port.lastWritable!.locked).toBe(false)
  })

  it('recovers if the port is already open', async () => {
    const port = new FakeMeshtasticPort()
    await port.open()
    await rebootMeshtasticToBootloader(port as unknown as SerialPort, fast)
    expect(port.closeCount).toBeGreaterThanOrEqual(1)
  })
})
