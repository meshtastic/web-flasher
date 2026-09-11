// Test-only in-memory STM32 system bootloader. Not part of the app bundle
// (outside utils/ and composables/, so Nuxt does not auto-import it).

import { STM32_FLASH_BASE } from '~/utils/stm32/an3155'

const ACK = 0x79
const NACK = 0x1f

/**
 * A byte-fed AN3155 state machine wired to a WritableStream (host -> device) and
 * a ReadableStream (device -> host), so an AN3155Client can be driven against it
 * with no hardware.
 */
export class FakeStm32 {
  flash = new Uint8Array(256 * 1024).fill(0xff)
  supportedCommands = [0x00, 0x11, 0x21, 0x31, 0x44]
  version = 0x31

  massErased = false
  erasedPages: number[] = []
  wroteAt: number[] = []
  wentTo = -1

  /** Swallow this many leading sync bytes without answering (autobaud race). */
  ignoreSyncs = 0
  /** NACK every Write Memory block. */
  nackWriteAlways = false
  /** NACK the first Write Memory block only. */
  nackWriteOnce = false
  /** Flip this flash offset when serving Read Memory (verify-mismatch test). */
  corruptReadAt = -1
  /** NACK the Go command. */
  goNack = false

  readable: ReadableStream<Uint8Array>
  writable: WritableStream<Uint8Array>

  private controller!: ReadableStreamDefaultController<Uint8Array>
  private rx: number[] = []
  private gen: Generator<number, void, number[]>
  private want = 1

  constructor() {
    this.readable = new ReadableStream<Uint8Array>({ start: c => (this.controller = c) })
    this.writable = new WritableStream<Uint8Array>({ write: chunk => this.feed(chunk) })
    this.gen = this.protocol()
    this.want = this.gen.next().value as number
  }

  /** Push unsolicited bytes to the host (stale boot-log noise). */
  injectNoise(bytes: number[]) {
    this.controller.enqueue(new Uint8Array(bytes))
  }

  private feed(chunk: Uint8Array) {
    for (const b of chunk) this.rx.push(b)
    while (this.rx.length >= this.want) {
      const bytes = this.rx.splice(0, this.want)
      const res = this.gen.next(bytes)
      if (res.done) return
      this.want = res.value
    }
  }

  private send(bytes: number[]) {
    this.controller.enqueue(new Uint8Array(bytes))
  }

  private addr(frame: number[]): number {
    return ((frame[0] << 24) | (frame[1] << 16) | (frame[2] << 8) | frame[3]) >>> 0
  }

  private* protocol(): Generator<number, void, number[]> {
    for (;;) {
      const [b] = yield 1

      if (b === 0x7f) {
        if (this.ignoreSyncs > 0) {
          this.ignoreSyncs--
          continue
        }
        this.send([ACK])
        continue
      }

      const [c] = yield 1
      if ((b ^ c) !== 0xff) {
        this.send([NACK])
        continue
      }
      this.send([ACK])

      switch (b) {
        case 0x00: // Get
          this.send([this.supportedCommands.length, this.version, ...this.supportedCommands, ACK])
          break

        case 0x11: { // Read Memory
          const a = this.addr(yield 5)
          this.send([ACK])
          const [n] = yield 2
          this.send([ACK])
          const len = n + 1
          const off = a - STM32_FLASH_BASE
          const out = Array.from(this.flash.subarray(off, off + len))
          if (this.corruptReadAt >= off && this.corruptReadAt < off + len) {
            out[this.corruptReadAt - off] ^= 0xff
          }
          this.send(out)
          break
        }

        case 0x21: { // Go
          const a = this.addr(yield 5)
          if (this.goNack) {
            this.send([NACK])
          }
          else {
            this.wentTo = a
            this.send([ACK])
          }
          break
        }

        case 0x31: { // Write Memory
          const a = this.addr(yield 5)
          this.send([ACK])
          const [m] = yield 1
          const dataLen = m + 1
          const rest = yield dataLen + 1 // data + checksum
          if (this.nackWriteAlways || this.nackWriteOnce) {
            this.nackWriteOnce = false
            this.send([NACK])
            break
          }
          this.flash.set(rest.slice(0, dataLen), a - STM32_FLASH_BASE)
          this.wroteAt.push(a)
          this.send([ACK])
          break
        }

        case 0x44: { // Extended Erase
          const [h, l] = yield 2
          if (h === 0xff && l === 0xff) {
            yield 1 // checksum
            this.flash.fill(0xff)
            this.massErased = true
          }
          else {
            const count = ((h << 8) | l) + 1
            const pages = yield count * 2 + 1 // page indices + checksum
            for (let i = 0; i < count; i++) {
              const pg = (pages[i * 2] << 8) | pages[i * 2 + 1]
              this.erasedPages.push(pg)
              this.flash.fill(0xff, pg * 2048, pg * 2048 + 2048)
            }
          }
          this.send([ACK])
          break
        }

        default:
          this.send([NACK])
      }
    }
  }
}

/**
 * Minimal Web Serial `SerialPort` over a FakeStm32: `open()` exposes the fake's
 * streams, `close()` withdraws them. `failOpensBeforeSuccess` makes the first N
 * `open()` calls throw (adapter-busy / already-open recovery path).
 */
export class FakeSerialPort {
  opened = false
  openOptions: SerialOptions[] = []
  closeCount = 0
  failOpensBeforeSuccess = 0

  readable: ReadableStream<Uint8Array> | null = null
  writable: WritableStream<Uint8Array> | null = null

  constructor(private dev: FakeStm32) {}

  async open(options: SerialOptions): Promise<void> {
    if (this.failOpensBeforeSuccess > 0) {
      this.failOpensBeforeSuccess--
      throw new DOMException('Failed to open serial port.', 'NetworkError')
    }
    this.openOptions.push(options)
    this.opened = true
    this.readable = this.dev.readable
    this.writable = this.dev.writable
  }

  async close(): Promise<void> {
    this.closeCount++
    this.opened = false
    this.readable = null
    this.writable = null
  }
}
