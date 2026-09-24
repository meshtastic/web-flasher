// SPDX-License-Identifier: MIT
//
// STM32 AN3155 USART bootloader protocol client for the Web Serial API.
//
// Protocol framing (sync byte, command/checksum layout, GET/erase/write/go byte
// sequences) ported from Gamadril/stm-serial-flasher (MIT), src/api/STMapi.js:
// https://github.com/Gamadril/stm-serial-flasher
//
// TypeScript port of the JS reference at graw-dfm-17/webconfig/an3155.js, extended
// for the Meshtastic Web Flasher with Read Memory (0x11) read-back verification and
// Extended Erase (0x44) page-range erase (so an "update" flash preserves the
// LittleFS/config tail). Trimmed to what the STM32WL system bootloader needs: no
// BOOT0/NRST pin control, no STM8, no read-protection commands.

const SYNC = 0x7f
const ACK = 0x79
const NACK = 0x1f

const CMD_GET = 0x00
const CMD_READ_MEMORY = 0x11
const CMD_GO = 0x21
const CMD_WRITE = 0x31
const CMD_EXTENDED_ERASE = 0x44

/** AN3155 max Write Memory payload; must be a multiple of 4. */
const WRITE_BLOCK_SIZE = 256
/** AN3155 max Read Memory payload. */
const READ_BLOCK_SIZE = 256

/** STM32 flash is mapped here; the Meshtastic STM32WL build has no bootloader offset. */
export const STM32_FLASH_BASE = 0x08000000
/** STM32WLE5xx flash page size (RM0453). */
export const STM32WL_PAGE_SIZE = 2048
/** STM32WLE5CCU6 = 256 KB / 2 KB. */
export const STM32WL_PAGE_COUNT = 128

export type ProgressFn = (done: number, total: number) => void

export interface GetResult {
  blVersion: string
  commands: number[]
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function xor(bytes: ArrayLike<number>): number {
  let result = 0
  for (let i = 0; i < bytes.length; i++) result ^= bytes[i]
  return result
}

function cmdFrame(cmd: number): Uint8Array {
  return new Uint8Array([cmd, 0xff ^ cmd])
}

/** 4 address bytes, MSB first, followed by their XOR. Exported for tests. */
export function addressFrame(address: number): Uint8Array {
  const bytes = [
    (address >>> 24) & 0xff,
    (address >>> 16) & 0xff,
    (address >>> 8) & 0xff,
    address & 0xff,
  ]
  bytes.push(xor(bytes))
  return new Uint8Array(bytes)
}

/**
 * Extended Erase (0x44) page-range payload (everything after the command frame):
 * (count-1) big-endian, each page index big-endian, then one XOR checksum over
 * all of those bytes. Exported for tests.
 */
export function buildExtendedEraseFrame(startPage: number, count: number): number[] {
  const n = count - 1
  const payload = [(n >> 8) & 0xff, n & 0xff]
  for (let p = startPage; p < startPage + count; p++) {
    payload.push((p >> 8) & 0xff, p & 0xff)
  }
  payload.push(xor(payload))
  return payload
}

/**
 * Buffers raw bytes off a ReadableStreamDefaultReader<Uint8Array> with per-call
 * timeouts. Never issues a second reader.read() while one is still outstanding --
 * a pending read always drains into `queue` when it resolves, whether or not a
 * caller is still waiting on it, so nothing is dropped across a timed-out wait.
 */
export class ByteReader {
  queue: number[] = []
  private pendingRead: Promise<void> | null = null
  private closed = false

  constructor(private reader: ReadableStreamDefaultReader<Uint8Array>) {}

  private nextRead(): Promise<void> {
    if (!this.pendingRead) {
      this.pendingRead = this.reader.read().then((result) => {
        this.pendingRead = null
        if (result.done) {
          this.closed = true
          return
        }
        for (const b of result.value) this.queue.push(b)
      })
    }
    return this.pendingRead
  }

  async readBytes(n: number, timeoutMs: number): Promise<number[]> {
    const deadline = Date.now() + timeoutMs
    while (this.queue.length < n) {
      if (this.closed) throw new Error('port closed while waiting for a response')
      const remaining = deadline - Date.now()
      if (remaining <= 0) throw new Error('timed out waiting for a response')
      let timer: ReturnType<typeof setTimeout>
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timed out waiting for a response')), remaining)
      })
      try {
        await Promise.race([this.nextRead(), timeout])
      }
      finally {
        clearTimeout(timer!)
      }
    }
    return this.queue.splice(0, n)
  }

  async readByte(timeoutMs: number): Promise<number> {
    return (await this.readBytes(1, timeoutMs))[0]
  }
}

export class AN3155Client {
  commands: number[] = []
  blVersion = ''

  private byteReader: ByteReader

  constructor(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    private writer: WritableStreamDefaultWriter<Uint8Array>,
  ) {
    this.byteReader = new ByteReader(reader)
  }

  private write(bytes: Uint8Array | number[]): Promise<void> {
    return this.writer.write(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))
  }

  /**
   * Discards whatever is already sitting in the OS-level receive buffer -- stale
   * boot-log bytes, or framing noise from the baud/parity switch -- before starting
   * a protocol exchange. Without this a leftover byte gets consumed as if it were
   * the bootloader's response to the first command, desyncing everything after it.
   */
  async flushInput(idleTimeoutMs = 100): Promise<void> {
    this.byteReader.queue = []
    for (;;) {
      try {
        await this.byteReader.readBytes(1, idleTimeoutMs)
      }
      catch {
        return
      }
    }
  }

  private async expectAck(timeoutMs: number): Promise<void> {
    const b = await this.byteReader.readByte(timeoutMs)
    if (b === ACK) return
    if (b === NACK) throw new Error('device NACKed')
    throw new Error(`unexpected response byte 0x${b.toString(16)}`)
  }

  /** Single sync attempt -- never throws, returns whether a bootloader answered. */
  async probe(timeoutMs: number): Promise<boolean> {
    try {
      await this.write([SYNC])
      const b = await this.byteReader.readByte(timeoutMs)
      return b === ACK || b === NACK
    }
    catch {
      return false
    }
  }

  /**
   * Retries the sync handshake -- reopening the port right at the DFU disconnect
   * margin can still race the bootloader's autobaud lock-on.
   */
  async sync(attempts = 10, timeoutMs = 500): Promise<void> {
    for (let i = 0; i < attempts; i++) {
      if (await this.probe(timeoutMs)) return
      await sleep(300)
    }
    throw new Error('bootloader did not respond -- try the manual BOOT0 steps, then Flash again')
  }

  async get(): Promise<GetResult> {
    await this.write(cmdFrame(CMD_GET))
    await this.expectAck(2000)
    const n = await this.byteReader.readByte(2000) // count of command bytes after the version byte
    const version = await this.byteReader.readByte(2000)
    const commands = await this.byteReader.readBytes(n, 2000)
    await this.expectAck(2000)
    this.commands = commands
    this.blVersion = `${version >> 4}.${version & 0x0f}`
    return { blVersion: this.blVersion, commands }
  }

  /** Read Memory (0x11). `length` must be 1..256. */
  async readMemory(address: number, length: number): Promise<Uint8Array> {
    if (length < 1 || length > READ_BLOCK_SIZE) {
      throw new Error(`readMemory length out of range: ${length}`)
    }
    await this.write(cmdFrame(CMD_READ_MEMORY))
    await this.expectAck(2000)
    await this.write(addressFrame(address))
    await this.expectAck(2000)
    const n = length - 1
    await this.write([n, 0xff ^ n])
    await this.expectAck(2000)
    return new Uint8Array(await this.byteReader.readBytes(length, 5000))
  }

  /** Extended Erase (0x44) global mass erase. */
  async massErase(): Promise<void> {
    await this.write(cmdFrame(CMD_EXTENDED_ERASE))
    await this.expectAck(2000)
    await this.write([0xff, 0xff, 0x00]) // 0xFFFF mass-erase code + checksum
    await this.expectAck(30000)
  }

  /**
   * Extended Erase (0x44) of `count` consecutive pages starting at `startPage`.
   * Frame after the command: (count-1) big-endian, then each page index big-endian,
   * then a single XOR checksum over all of those bytes.
   */
  async extendedErasePages(startPage: number, count: number): Promise<void> {
    if (count < 1) return
    await this.write(cmdFrame(CMD_EXTENDED_ERASE))
    await this.expectAck(2000)
    await this.write(buildExtendedEraseFrame(startPage, count))
    await this.expectAck(count * 800 + 5000)
  }

  /** Erase exactly the pages an image of `imageLen` bytes occupies, from page 0. */
  async eraseForImage(imageLen: number): Promise<number> {
    const pages = Math.ceil(imageLen / STM32WL_PAGE_SIZE)
    if (pages > STM32WL_PAGE_COUNT) {
      throw new Error(`firmware too large: ${imageLen} bytes needs ${pages} pages, device has ${STM32WL_PAGE_COUNT}`)
    }
    await this.extendedErasePages(0, pages)
    return pages
  }

  private async writeMemoryBlock(address: number, data: Uint8Array): Promise<void> {
    await this.write(cmdFrame(CMD_WRITE))
    await this.expectAck(2000)
    await this.write(addressFrame(address))
    await this.expectAck(2000)
    const frame = new Uint8Array(data.length + 2)
    frame[0] = data.length - 1
    frame.set(data, 1)
    frame[frame.length - 1] = xor(data) ^ (data.length - 1)
    await this.write(frame)
    await this.expectAck(5000)
  }

  /**
   * Writes `bytes` to flash starting at `address`, in <=256-byte blocks (padded to
   * a multiple of 4 with 0xFF, matching erased-flash value). Retries each block a
   * bounded number of times before giving up.
   */
  async writeMemory(
    address: number,
    bytes: Uint8Array,
    { onProgress, attempts = 3 }: { onProgress?: ProgressFn, attempts?: number } = {},
  ): Promise<void> {
    const total = bytes.length
    for (let start = 0; start < total; start += WRITE_BLOCK_SIZE) {
      let block = bytes.subarray(start, start + WRITE_BLOCK_SIZE)
      if (block.length % 4 !== 0) {
        const padded = new Uint8Array(block.length + (4 - (block.length % 4)))
        padded.set(block)
        padded.fill(0xff, block.length)
        block = padded
      }
      let lastErr: unknown
      let ok = false
      for (let attempt = 0; attempt < attempts; attempt++) {
        try {
          await this.writeMemoryBlock(address + start, block)
          ok = true
          break
        }
        catch (e) {
          lastErr = e
          await sleep(200)
        }
      }
      if (!ok) {
        throw new Error(`write failed at 0x${(address + start).toString(16)}: ${(lastErr as Error)?.message}`)
      }
      onProgress?.(Math.min(start + WRITE_BLOCK_SIZE, total), total)
    }
  }

  /** Read the written region back and compare it against `expected`. */
  async verifyMemory(
    address: number,
    expected: Uint8Array,
    { onProgress }: { onProgress?: ProgressFn } = {},
  ): Promise<void> {
    const total = expected.length
    for (let off = 0; off < total; off += READ_BLOCK_SIZE) {
      const len = Math.min(READ_BLOCK_SIZE, total - off)
      const got = await this.readMemory(address + off, len)
      for (let i = 0; i < len; i++) {
        if (got[i] !== expected[off + i]) {
          throw new Error(
            `verify failed at 0x${(address + off + i).toString(16)}: `
            + `wrote 0x${expected[off + i].toString(16)}, read 0x${got[i].toString(16)}`,
          )
        }
      }
      onProgress?.(off + len, total)
    }
  }

  async go(address: number): Promise<void> {
    await this.write(cmdFrame(CMD_GO))
    await this.expectAck(2000)
    await this.write(addressFrame(address))
    await this.expectAck(2000)
  }
}
