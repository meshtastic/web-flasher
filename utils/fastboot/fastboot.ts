/**
 * Fastboot over WebUSB.
 *
 * Fastboot is a vendor-neutral USB protocol (the Android bootloader protocol),
 * also implemented by U-Boot when built with CONFIG_USB_FUNCTION_FASTBOOT. It is
 * a plain bulk transport: the host writes an ASCII command on the bulk-OUT
 * endpoint and reads reply packets on bulk-IN that begin with a 4-byte status
 * word (OKAY / FAIL / DATA / INFO / TEXT). Because the interface is
 * vendor-specific (class 0xFF, subclass 0x42, protocol 0x03), WebUSB can claim
 * it (unlike USB Mass Storage).
 *
 * This module is device-agnostic: it works with any board that exposes a
 * fastboot gadget (many ARM SBCs and routers running U-Boot, and Android devices
 * in bootloader mode). It does NOT depend on the Rockchip module.
 */

// ---------------------------------------------------------------------------
// Minimal WebUSB typings (this project does not depend on @types/w3c-web-usb).
// Module-scoped; only the surface this transport uses is declared.
// ---------------------------------------------------------------------------
interface UsbInTransferResult {
  data?: DataView
  status: 'ok' | 'stall' | 'babble'
}
interface UsbOutTransferResult {
  bytesWritten: number
  status: 'ok' | 'stall' | 'babble'
}
interface UsbEndpoint {
  endpointNumber: number
  direction: 'in' | 'out'
  type: 'bulk' | 'interrupt' | 'isochronous'
}
interface UsbAlternateInterface {
  interfaceClass: number
  interfaceSubclass: number
  interfaceProtocol: number
  endpoints: UsbEndpoint[]
}
interface UsbInterface {
  interfaceNumber: number
  alternates: UsbAlternateInterface[]
}
interface UsbConfiguration {
  interfaces: UsbInterface[]
}
export interface UsbDevice {
  vendorId: number
  productId: number
  manufacturerName?: string
  productName?: string
  serialNumber?: string
  opened: boolean
  configuration?: UsbConfiguration
  open(): Promise<void>
  close(): Promise<void>
  selectConfiguration(configurationValue: number): Promise<void>
  claimInterface(interfaceNumber: number): Promise<void>
  transferIn(endpointNumber: number, length: number): Promise<UsbInTransferResult>
  transferOut(endpointNumber: number, data: BufferSource): Promise<UsbOutTransferResult>
}
interface UsbDeviceFilter {
  vendorId?: number
  productId?: number
  classCode?: number
  subclassCode?: number
  protocolCode?: number
}
interface UsbRequestOptions {
  filters: UsbDeviceFilter[]
}
interface Usb {
  requestDevice(options: UsbRequestOptions): Promise<UsbDevice>
  getDevices(): Promise<UsbDevice[]>
}

function getUsb(): Usb | null {
  if (typeof navigator === 'undefined') return null
  return (navigator as unknown as { usb?: Usb }).usb ?? null
}

export function isWebUsbSupported(): boolean {
  return getUsb() !== null
}

/** Reject after `ms` if `promise` hasn't settled (WebUSB transfers have no native timeout). */
function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${what} timed out`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

// ---------------------------------------------------------------------------
// Protocol constants
// ---------------------------------------------------------------------------

/** Standard fastboot interface descriptor (Android / U-Boot f_fastboot). */
export const FASTBOOT_INTERFACE = { classCode: 0xff, subclass: 0x42, protocol: 0x03 } as const

/** VIDs commonly seen for fastboot gadgets (Google AOSP, Rockchip). */
export const FASTBOOT_VENDOR_IDS = [0x18d1, 0x2207]

/**
 * Fastboot command length limit. The protocol allows a single ASCII packet up to
 * 4096 bytes (AOSP fastboot spec; U-Boot f_fastboot uses EP_BUFFER_SIZE 4096).
 * The old 64-byte figure was the full-speed max-packet size, not the command cap.
 */
export const MAX_COMMAND_LENGTH = 4096
/** Reply packets are small; read generously and rely on the short packet. */
const REPLY_BUFFER = 256
/** Split the download data phase into 1 MiB bulk transfers. */
const DATA_CHUNK = 1 << 20
/** Per-transfer timeout. */
const TRANSFER_TIMEOUT_MS = 15000
/** Backstop so a misbehaving device (endless INFO / zero-length packets) can't loop forever. */
const MAX_REPLY_PACKETS = 100000

/** getvar names worth probing for a device summary (best-effort; FAIL is fine). */
export const COMMON_VARS = [
  'product',
  'version-bootloader',
  'serialno',
  'secure',
  'max-download-size',
  'slot-count',
  'current-slot',
]

export type FastbootStatus = 'OKAY' | 'FAIL' | 'DATA' | 'INFO' | 'TEXT'

export interface FastbootReply {
  status: FastbootStatus
  message: string
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested without hardware)
// ---------------------------------------------------------------------------

/** Build a `download:` command for `size` bytes (8 lowercase hex digits). */
export function downloadCommand(size: number): string {
  if (!Number.isInteger(size) || size < 0 || size > 0xffffffff) {
    throw new Error(`invalid download size: ${size}`)
  }
  return `download:${size.toString(16).padStart(8, '0')}`
}

/** Split a raw reply packet into its 4-byte status word and the message. */
export function parseReply(bytes: Uint8Array): FastbootReply {
  const text = new TextDecoder().decode(bytes)
  const status = text.slice(0, 4) as FastbootStatus
  return { status, message: text.slice(4) }
}

/**
 * Parse a fastboot size value as hex. Both the `DATA` reply payload (bare hex,
 * e.g. "00001000" = 4096) and `max-download-size` (e.g. "0x8000000") are
 * hexadecimal in the protocol, so a bare value is NOT decimal.
 */
export function parseHexSize(value: string): number {
  let s = value.trim()
  if (s.toLowerCase().startsWith('0x')) s = s.slice(2)
  const n = Number.parseInt(s, 16)
  return Number.isFinite(n) ? n : 0
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

interface BulkIface {
  interfaceNumber: number
  epIn: number
  epOut: number
}

/**
 * Find a fastboot interface on a device. Requires the EXACT fastboot triple
 * (0xFF/0x42/0x03): a generic "any vendor 0xFF interface" fallback would happily
 * claim a foreign vendor protocol on the same bus (e.g. a Rockchip RockUSB
 * interface, 0xFF/6/5, on VID 0x2207) and then write fastboot bytes to an
 * endpoint that expects something else.
 */
function findFastbootInterface(device: UsbDevice): BulkIface | null {
  const cfg = device.configuration
  if (!cfg) return null
  for (const iface of cfg.interfaces) {
    for (const alt of iface.alternates) {
      if (alt.interfaceClass !== FASTBOOT_INTERFACE.classCode
        || alt.interfaceSubclass !== FASTBOOT_INTERFACE.subclass
        || alt.interfaceProtocol !== FASTBOOT_INTERFACE.protocol) continue
      const epIn = alt.endpoints.find(e => e.direction === 'in' && e.type === 'bulk')
      const epOut = alt.endpoints.find(e => e.direction === 'out' && e.type === 'bulk')
      if (!epIn || !epOut) continue
      return {
        interfaceNumber: iface.interfaceNumber,
        epIn: epIn.endpointNumber,
        epOut: epOut.endpointNumber,
      }
    }
  }
  return null
}

export class FastbootDevice {
  private iface: BulkIface | null = null
  /** Called for each INFO/TEXT line the device emits during a command. */
  onInfo: ((line: string) => void) | null = null

  constructor(public readonly device: UsbDevice) {}

  /** Prompt the user to pick a fastboot device (requires a user gesture). */
  static async request(): Promise<FastbootDevice> {
    const usb = getUsb()
    if (!usb) throw new Error('WebUSB is not supported in this browser.')
    const device = await usb.requestDevice({
      filters: [
        ...FASTBOOT_VENDOR_IDS.map(vendorId => ({ vendorId })),
        // Match the exact fastboot interface on any VID, so non-fastboot 0xFF
        // devices (USB-serial, RockUSB, webcams, ...) do not clutter the chooser.
        {
          classCode: FASTBOOT_INTERFACE.classCode,
          subclassCode: FASTBOOT_INTERFACE.subclass,
          protocolCode: FASTBOOT_INTERFACE.protocol,
        },
      ],
    })
    return new FastbootDevice(device)
  }

  get vendorId(): number { return this.device.vendorId }
  get productId(): number { return this.device.productId }

  async open(): Promise<void> {
    if (!this.device.opened) await this.device.open()
    if (!this.device.configuration) await this.device.selectConfiguration(1)
    const iface = findFastbootInterface(this.device)
    if (!iface) {
      throw new Error('No fastboot interface (0xFF/0x42/0x03) found on this device.')
    }
    await this.device.claimInterface(iface.interfaceNumber)
    this.iface = iface
  }

  private ep(): BulkIface {
    if (!this.iface) throw new Error('Device is not open.')
    return this.iface
  }

  /** Write a bulk-OUT transfer, checking status and the written length. */
  private async writeOut(data: Uint8Array): Promise<void> {
    const result = await withTimeout(
      this.device.transferOut(this.ep().epOut, data), TRANSFER_TIMEOUT_MS, 'bulk OUT',
    )
    if (result.status !== 'ok') throw new Error(`bulk OUT ${result.status}`)
    if (result.bytesWritten !== data.length) {
      throw new Error(`short bulk OUT (${result.bytesWritten}/${data.length})`)
    }
  }

  /** Read a bulk-IN transfer, checking status; returns the raw bytes (possibly empty). */
  private async readIn(): Promise<Uint8Array> {
    const result = await withTimeout(
      this.device.transferIn(this.ep().epIn, REPLY_BUFFER), TRANSFER_TIMEOUT_MS, 'bulk IN',
    )
    if (result.status !== 'ok') throw new Error(`bulk IN ${result.status}`)
    const view = result.data
    return view ? new Uint8Array(view.buffer, view.byteOffset, view.byteLength) : new Uint8Array(0)
  }

  private async readReply(): Promise<FastbootReply> {
    for (let i = 0; i < MAX_REPLY_PACKETS; i++) {
      const bytes = await this.readIn()
      if (bytes.length === 0) continue // ignore zero-length packets
      if (bytes.length < 4) throw new Error('malformed fastboot reply (short packet)')
      const reply = parseReply(bytes)
      if (reply.status === 'INFO' || reply.status === 'TEXT') {
        this.onInfo?.(reply.message)
        continue
      }
      if (reply.status !== 'OKAY' && reply.status !== 'FAIL' && reply.status !== 'DATA') {
        throw new Error(`unexpected fastboot reply: ${reply.status}${reply.message}`)
      }
      return reply
    }
    throw new Error('fastboot reply was never terminated')
  }

  private async sendCommand(cmd: string): Promise<void> {
    const encoded = new TextEncoder().encode(cmd)
    if (encoded.length > MAX_COMMAND_LENGTH) {
      throw new Error(`fastboot command too long (${encoded.length} > ${MAX_COMMAND_LENGTH}).`)
    }
    await this.writeOut(encoded)
  }

  /** Send a raw fastboot command and return its terminal reply. */
  async command(cmd: string): Promise<FastbootReply> {
    await this.sendCommand(cmd)
    return this.readReply()
  }

  /** getvar:<name>; returns the reported value or throws on FAIL. */
  async getvar(name: string): Promise<string> {
    const reply = await this.command(`getvar:${name}`)
    if (reply.status !== 'OKAY') throw new Error(`getvar ${name} failed: ${reply.message}`)
    return reply.message
  }

  /** Best-effort getvar over a list; unsupported vars are simply omitted. */
  async getVars(names: string[] = COMMON_VARS): Promise<Record<string, string>> {
    const out: Record<string, string> = {}
    for (const name of names) {
      try {
        out[name] = await this.getvar(name)
      }
      catch {
        // var unsupported on this device
      }
    }
    return out
  }

  /** Stage `data` in the device's download buffer (download: + data phase). */
  async download(data: Uint8Array, onProgress?: (fraction: number) => void): Promise<void> {
    const reply = await this.command(downloadCommand(data.length))
    if (reply.status !== 'DATA') {
      throw new Error(`download rejected: ${reply.status} ${reply.message}`)
    }
    const accepted = parseHexSize(reply.message)
    if (accepted < data.length) {
      throw new Error(`device will accept only ${accepted} of ${data.length} bytes (image too large for the download buffer; sparse images are not yet supported).`)
    }
    if (accepted > data.length) {
      throw new Error(`device reported an unexpected accept size (${accepted} > ${data.length}).`)
    }
    for (let offset = 0; offset < data.length; offset += DATA_CHUNK) {
      const end = Math.min(offset + DATA_CHUNK, data.length)
      await this.writeOut(data.subarray(offset, end))
      onProgress?.(end / data.length)
    }
    const done = await this.readReply()
    if (done.status !== 'OKAY') throw new Error(`download failed: ${done.message}`)
  }

  /** Flash a staged image to a named partition. */
  async flash(partition: string, data: Uint8Array, onProgress?: (fraction: number) => void): Promise<void> {
    await this.download(data, onProgress)
    const reply = await this.command(`flash:${partition}`)
    if (reply.status !== 'OKAY') throw new Error(`flash ${partition} failed: ${reply.message}`)
  }

  /** Erase a named partition. */
  async erase(partition: string): Promise<void> {
    const reply = await this.command(`erase:${partition}`)
    if (reply.status !== 'OKAY') throw new Error(`erase ${partition} failed: ${reply.message}`)
  }

  /**
   * Send a command after which the device is expected to leave fastboot
   * (boot / reboot). The device may re-enumerate before replying, so a failed
   * reply read is treated as "device left"; only an explicit FAIL is an error.
   */
  private async commandThenLeave(cmd: string): Promise<void> {
    await this.sendCommand(cmd)
    let reply: FastbootReply | null = null
    try {
      reply = await this.readReply()
    }
    catch {
      // No reply: the device rebooted / jumped before answering. Expected.
    }
    if (reply && reply.status !== 'OKAY') throw new Error(`${cmd} failed: ${reply.message}`)
  }

  /** Download an image and boot it from RAM (download + boot). */
  async bootImage(data: Uint8Array, onProgress?: (fraction: number) => void): Promise<void> {
    await this.download(data, onProgress)
    await this.commandThenLeave('boot')
  }

  /** target: '' (normal), 'bootloader', or 'fastboot'. */
  async reboot(target = ''): Promise<void> {
    await this.commandThenLeave(target ? `reboot-${target}` : 'reboot')
  }

  async close(): Promise<void> {
    try {
      await this.device.close()
    }
    catch {
      // already gone (rebooted / unplugged)
    }
  }
}
