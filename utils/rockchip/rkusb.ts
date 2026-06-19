/**
 * Rockchip RockUSB protocol over WebUSB: a port of the parts of `rkdeveloptool`
 * needed to implement the `ef` (erase flash) command.
 *
 * RockUSB is USB Bulk-Only Transport (the same CBW -> [data] -> CSW dance as USB
 * Mass Storage). The C++ reference is rockchip-linux/rkdeveloptool (RKComm.cpp,
 * RKDevice.cpp). All struct fields are little-endian EXCEPT the address/length
 * inside the command block, which rkdeveloptool byte-swaps to big-endian.
 *
 * Scope: erase-only. We assume the device is already in Loader mode (flash is
 * accessible). Pure Maskrom needs a loader downloaded first (the `db` step),
 * which is intentionally out of scope; we detect it and let the caller warn.
 */

// ---------------------------------------------------------------------------
// Minimal WebUSB typings (this project does not depend on @types/w3c-web-usb).
// Only the surface we actually use is declared, scoped to this module.
// ---------------------------------------------------------------------------
export interface UsbInTransferResult {
  data?: DataView
  status: 'ok' | 'stall' | 'babble'
}
export interface UsbOutTransferResult {
  bytesWritten: number
  status: 'ok' | 'stall' | 'babble'
}
interface UsbEndpoint {
  endpointNumber: number
  direction: 'in' | 'out'
  type: 'bulk' | 'interrupt' | 'isochronous'
}
interface UsbAlternateInterface {
  alternateSetting: number
  interfaceClass: number
  interfaceSubclass: number
  interfaceProtocol: number
  endpoints: UsbEndpoint[]
}
interface UsbInterface {
  interfaceNumber: number
  alternate: UsbAlternateInterface
  alternates: UsbAlternateInterface[]
  claimed: boolean
}
interface UsbConfiguration {
  configurationValue: number
  interfaces: UsbInterface[]
}
export interface UsbDevice {
  vendorId: number
  productId: number
  usbVersionMajor: number
  usbVersionMinor: number
  usbVersionSubminor: number
  manufacturerName?: string
  productName?: string
  serialNumber?: string
  opened: boolean
  configuration?: UsbConfiguration
  configurations: UsbConfiguration[]
  open(): Promise<void>
  close(): Promise<void>
  reset(): Promise<void>
  selectConfiguration(configurationValue: number): Promise<void>
  claimInterface(interfaceNumber: number): Promise<void>
  releaseInterface(interfaceNumber: number): Promise<void>
  transferIn(endpointNumber: number, length: number): Promise<UsbInTransferResult>
  transferOut(endpointNumber: number, data: BufferSource): Promise<UsbOutTransferResult>
}
interface UsbRequestOptions {
  filters: Array<{ vendorId?: number, productId?: number, classCode?: number }>
}
interface Usb {
  requestDevice(options: UsbRequestOptions): Promise<UsbDevice>
  getDevices(): Promise<UsbDevice[]>
}

/** Rockchip USB vendor id; covers every modern RockUSB chip (maskrom & loader). */
export const ROCKCHIP_VENDOR_ID = 0x2207

/** RockUSB operation codes (subset used by `ef`). */
export const OpCode = {
  TEST_UNIT_READY: 0x00,
  READ_FLASH_ID: 0x01,
  ERASE_FORCE: 0x0b, // raw-NAND block erase
  READ_LBA: 0x14,
  WRITE_LBA: 0x15,
  ERASE_LBA: 0x25, // eMMC / direct-LBA erase
  READ_FLASH_INFO: 0x1a,
  READ_CAPABILITY: 0xaa,
  DEVICE_RESET: 0xff,
} as const

/** Sub-codes for DEVICE_RESET. */
export const ResetSubCode = {
  RESET: 0x00,
  RESET_MASKROM: 0x03,
} as const

const SECTOR_SIZE = 512
const CBW_LENGTH = 31
const CSW_LENGTH = 13
const CBW_SIGNATURE = 0x43425355 // "USBC"
const CSW_SIGNATURE = 0x53425355 // "USBS"
const DIRECTION_IN = 0x80
const DIRECTION_OUT = 0x00

/** Erase granularity, in 512-byte sectors, mirroring rkdeveloptool's EraseEmmc (32 * 1024 = 16 MiB). */
export const LBA_ERASE_CHUNK_SECTORS = 32 * 1024
/** Max blocks per ERASE_FORCE command (rkdeveloptool MAX_ERASE_BLOCKS). */
export const MAX_ERASE_BLOCKS = 16

export interface CbwOptions {
  opcode: number
  direction?: number // DIRECTION_IN | DIRECTION_OUT
  lun?: number
  cbLength?: number // command-block length (6 or 10)
  transferLength?: number // expected data-phase bytes
  address?: number // command-block address (sent big-endian)
  length?: number // command-block length field (sent big-endian)
  subCode?: number // command-block reserved byte
  tag?: number // override the random tag (used by tests)
}

export interface ParsedCsw {
  signature: number
  tag: number
  dataResidue: number
  status: number
}

export interface FlashInfo {
  /** Total capacity in 512-byte sectors. */
  totalSectors: number
  /** Sectors per erase block. */
  sectorsPerBlock: number
  pageSize: number
  eccBits: number
  accessTime: number
  manufacturerCode: number
  /** Bitmask of populated flash chip-selects. */
  flashCs: number
  /** Capacity in bytes. */
  sizeBytes: number
}

export interface LbaEraseChunk {
  pos: number
  count: number
}

export type EraseProgress = (current: number, total: number) => void

// ---------------------------------------------------------------------------
// Pure helpers (no WebUSB), exported for unit testing.
// ---------------------------------------------------------------------------

/**
 * Build a 31-byte Command Block Wrapper. The wrapper fields are little-endian,
 * but the command-block `address` and `length` are big-endian, matching
 * rkdeveloptool's EndianU32_LtoB / EndianU16_LtoB byte-swaps.
 */
export function buildCBW(options: CbwOptions): Uint8Array {
  const {
    opcode,
    direction = DIRECTION_IN,
    lun = 0,
    cbLength = 6,
    transferLength = 0,
    address = 0,
    length = 0,
    subCode = 0,
    tag = makeTag(),
  } = options

  const buffer = new Uint8Array(CBW_LENGTH)
  const view = new DataView(buffer.buffer)
  view.setUint32(0, CBW_SIGNATURE, true) // dwCBWSignature "USBC"
  view.setUint32(4, tag >>> 0, true) // dwCBWTag
  view.setUint32(8, transferLength, true) // dwCBWTransferLength
  view.setUint8(12, direction) // bmCBWFlags
  view.setUint8(13, lun) // bCBWLUN (flash chip-select for block erase)
  view.setUint8(14, cbLength) // bCBWCBLength
  // --- command block (CBWCB) ---
  view.setUint8(15, opcode) // ucOperCode
  view.setUint8(16, subCode) // ucReserved (sub-code)
  view.setUint32(17, address >>> 0, false) // dwAddress (big-endian)
  // byte 21 reserved
  view.setUint16(22, length & 0xffff, false) // usLength (big-endian)
  // bytes 24..30 reserved
  return buffer
}

/** Parse a 13-byte Command Status Wrapper. */
export function parseCSW(bytes: Uint8Array): ParsedCsw {
  if (bytes.length < CSW_LENGTH) {
    throw new Error(`CSW too short: expected ${CSW_LENGTH} bytes, got ${bytes.length}`)
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return {
    signature: view.getUint32(0, true),
    tag: view.getUint32(4, true),
    dataResidue: view.getUint32(8, true),
    status: view.getUint8(12),
  }
}

/** Validate a CSW against the CBW tag it should answer (matches UFI_CHECK_SIGN). */
export function isCswValid(csw: ParsedCsw, expectedTag: number): boolean {
  return csw.signature === CSW_SIGNATURE && csw.tag === (expectedTag >>> 0)
}

/**
 * Parse the flash-info payload returned by READ_FLASH_INFO. Layout
 * (STRUCT_FLASHINFO_CMD): u32 flashSize (sectors), u16 blockSize (sectors),
 * u8 pageSize, u8 eccBits, u8 accessTime, u8 manufCode, u8 flashCS.
 */
export function parseFlashInfo(bytes: Uint8Array): FlashInfo {
  if (bytes.length < 11) {
    throw new Error(`Flash info too short: expected >= 11 bytes, got ${bytes.length}`)
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const totalSectors = view.getUint32(0, true)
  const sectorsPerBlock = view.getUint16(4, true)
  const pageSize = view.getUint8(6)
  if (totalSectors === 0 || sectorsPerBlock === 0 || pageSize === 0) {
    throw new Error('Invalid flash info (size, block size or page size is zero); device may be in Maskrom mode without a loader')
  }
  return {
    totalSectors,
    sectorsPerBlock,
    pageSize,
    eccBits: view.getUint8(7),
    accessTime: view.getUint8(8),
    manufacturerCode: view.getUint8(9),
    flashCs: view.getUint8(10),
    sizeBytes: totalSectors * SECTOR_SIZE,
  }
}

/** True when the 5-byte READ_FLASH_ID response identifies eMMC ("EMMC"). */
export function isEmmcId(flashId: Uint8Array): boolean {
  return flashId.length >= 4
    && flashId[0] === 0x45 && flashId[1] === 0x4d && flashId[2] === 0x4d && flashId[3] === 0x43
}

/** Split a full-flash LBA erase into device-sized chunks (mirrors EraseEmmc). */
export function planLbaErase(totalSectors: number, chunkSectors: number = LBA_ERASE_CHUNK_SECTORS): LbaEraseChunk[] {
  const chunks: LbaEraseChunk[] = []
  let pos = 0
  let remaining = totalSectors
  while (remaining > 0) {
    const count = Math.min(remaining, chunkSectors)
    chunks.push({ pos, count })
    pos += count
    remaining -= count
  }
  return chunks
}

/** Count the populated chip-selects in a flashCs bitmask. */
export function countChipSelects(flashCs: number): number {
  let count = 0
  for (let i = 0; i < 8; i++) {
    if (flashCs & (1 << i)) count++
  }
  return count
}

function makeTag(): number {
  // 32-bit random tag, like rkdeveloptool's MakeCBWTag.
  return Math.floor(Math.random() * 0x100000000) >>> 0
}

// ---------------------------------------------------------------------------
// WebUSB device wrapper.
// ---------------------------------------------------------------------------

/** Returns true when the current context supports WebUSB. */
export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator
}

function getUsb(): Usb {
  const usb = (navigator as unknown as { usb?: Usb }).usb
  if (!usb) throw new Error('WebUSB is not supported in this browser')
  return usb
}

export type RockusbMode = 'maskrom' | 'loader'

export class RockusbError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'RockusbError'
  }
}

export class RockusbDevice {
  private bulkIn = 0
  private bulkOut = 0
  private interfaceNumber = -1

  constructor(readonly device: UsbDevice) {}

  /** Prompt the user to pick a Rockchip device (VID 0x2207, any PID). */
  static async request(): Promise<RockusbDevice> {
    const usb = getUsb()
    const device = await usb.requestDevice({ filters: [{ vendorId: ROCKCHIP_VENDOR_ID }] })
    return new RockusbDevice(device)
  }

  /** A previously-authorized device, if one is still connected. */
  static async getAuthorized(): Promise<RockusbDevice | null> {
    if (!isWebUsbSupported()) return null
    const devices = await getUsb().getDevices()
    const match = devices.find(d => d.vendorId === ROCKCHIP_VENDOR_ID)
    return match ? new RockusbDevice(match) : null
  }

  get vendorId(): number {
    return this.device.vendorId
  }

  get productId(): number {
    return this.device.productId
  }

  /**
   * Maskrom vs Loader is encoded in bcdUSB's low bit: 0 = Maskrom, 1 = Loader
   * (rkdeveloptool: `usbcdUsb & 1`). WebUSB surfaces this as usbVersionSubminor.
   */
  get mode(): RockusbMode {
    return (this.device.usbVersionSubminor & 1) === 1 ? 'loader' : 'maskrom'
  }

  /** Open the device and claim the RockUSB vendor interface (class 0xFF/6/5). */
  async open(): Promise<void> {
    if (!this.device.opened) await this.device.open()
    if (!this.device.configuration) await this.device.selectConfiguration(1)

    const found = this.findVendorInterface()
    if (!found) {
      throw new RockusbError('No RockUSB vendor interface (0xFF/6/5) found. Is the device in download mode?')
    }
    this.interfaceNumber = found.interfaceNumber
    this.bulkIn = found.bulkIn
    this.bulkOut = found.bulkOut
    await this.device.claimInterface(this.interfaceNumber)
  }

  async close(): Promise<void> {
    try {
      if (this.interfaceNumber >= 0) await this.device.releaseInterface(this.interfaceNumber)
    }
    catch {
      // ignore; device may already be gone
    }
    try {
      if (this.device.opened) await this.device.close()
    }
    catch {
      // ignore
    }
    this.interfaceNumber = -1
  }

  private findVendorInterface(): { interfaceNumber: number, bulkIn: number, bulkOut: number } | null {
    const config = this.device.configuration
    if (!config) return null
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        // RockUSB loader/maskrom interface: class 0xFF, subclass 6, protocol 5.
        if (alt.interfaceClass !== 0xff || alt.interfaceSubclass !== 6 || alt.interfaceProtocol !== 5) {
          continue
        }
        let bulkIn = 0
        let bulkOut = 0
        for (const ep of alt.endpoints) {
          if (ep.type !== 'bulk') continue
          if (ep.direction === 'in' && bulkIn === 0) bulkIn = ep.endpointNumber
          else if (ep.direction === 'out' && bulkOut === 0) bulkOut = ep.endpointNumber
        }
        if (bulkIn && bulkOut) {
          return { interfaceNumber: iface.interfaceNumber, bulkIn, bulkOut }
        }
      }
    }
    return null
  }

  // --- transport ----------------------------------------------------------

  private async writeOut(data: Uint8Array): Promise<void> {
    const result = await this.device.transferOut(this.bulkOut, data)
    if (result.status !== 'ok') {
      throw new RockusbError(`Bulk OUT transfer failed (status ${result.status})`)
    }
  }

  private async readIn(length: number): Promise<Uint8Array> {
    const result = await this.device.transferIn(this.bulkIn, length)
    if (result.status !== 'ok' || !result.data) {
      throw new RockusbError(`Bulk IN transfer failed (status ${result.status})`)
    }
    return new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength)
  }

  private async readCsw(tag: number): Promise<ParsedCsw> {
    const csw = parseCSW(await this.readIn(CSW_LENGTH))
    if (!isCswValid(csw, tag)) {
      throw new RockusbError('CSW signature/tag mismatch (device out of sync)')
    }
    return csw
  }

  /** Send a command with no data phase, then read and check the CSW. */
  private async command(options: CbwOptions): Promise<ParsedCsw> {
    const tag = options.tag ?? makeTag()
    await this.writeOut(buildCBW({ ...options, tag }))
    return this.readCsw(tag)
  }

  /** Send a command with an inbound data phase, returning the data and CSW. */
  private async commandIn(options: CbwOptions, readLength: number): Promise<{ data: Uint8Array, csw: ParsedCsw }> {
    const tag = options.tag ?? makeTag()
    await this.writeOut(buildCBW({ ...options, direction: DIRECTION_IN, tag }))
    const data = await this.readIn(readLength)
    const csw = await this.readCsw(tag)
    return { data, csw }
  }

  // --- commands -----------------------------------------------------------

  /** TEST_UNIT_READY: probes whether the device is responsive. */
  async testUnitReady(subCode = 0): Promise<boolean> {
    const csw = await this.command({
      opcode: OpCode.TEST_UNIT_READY,
      direction: DIRECTION_IN,
      cbLength: 6,
      subCode,
    })
    return csw.status === 0
  }

  /** READ_FLASH_INFO: returns the parsed flash geometry. */
  async readFlashInfo(): Promise<FlashInfo> {
    // CBW declares 11 bytes but the device may return up to 512 (short packet).
    const { data, csw } = await this.commandIn(
      { opcode: OpCode.READ_FLASH_INFO, cbLength: 6, transferLength: 11 },
      512,
    )
    if (csw.status !== 0) throw new RockusbError('READ_FLASH_INFO failed', csw.status)
    return parseFlashInfo(data)
  }

  /** READ_FLASH_ID: true when the storage reports itself as eMMC. */
  async readFlashIsEmmc(): Promise<boolean> {
    const { data, csw } = await this.commandIn(
      { opcode: OpCode.READ_FLASH_ID, cbLength: 6, transferLength: 5 },
      5,
    )
    if (csw.status !== 0) throw new RockusbError('READ_FLASH_ID failed', csw.status)
    return isEmmcId(data)
  }

  /** READ_CAPABILITY: bit 0 of the first byte means "direct LBA" storage. */
  async readDirectLba(): Promise<boolean> {
    const { data, csw } = await this.commandIn(
      { opcode: OpCode.READ_CAPABILITY, cbLength: 6, transferLength: 8 },
      8,
    )
    if (csw.status !== 0) throw new RockusbError('READ_CAPABILITY failed', csw.status)
    return (data[0] & 0x1) === 0x1
  }

  /** ERASE_LBA: erase `count` sectors starting at sector `pos` (eMMC/LBA). */
  async eraseLba(pos: number, count: number): Promise<void> {
    const csw = await this.command({
      opcode: OpCode.ERASE_LBA,
      direction: DIRECTION_OUT,
      cbLength: 10,
      address: pos,
      length: count,
    })
    if (csw.status !== 0) throw new RockusbError(`ERASE_LBA failed at sector ${pos}`, csw.status)
  }

  /** ERASE_FORCE: erase `count` blocks at block `pos` on chip-select `cs` (raw NAND). */
  async eraseBlock(cs: number, pos: number, count: number): Promise<void> {
    const csw = await this.command({
      opcode: OpCode.ERASE_FORCE,
      direction: DIRECTION_OUT,
      lun: cs,
      cbLength: 10,
      address: pos,
      length: count,
    })
    // status 1 here means "bad block", which is expected/skippable during a full erase.
    if (csw.status !== 0 && csw.status !== 1) {
      throw new RockusbError(`ERASE_FORCE failed at block ${pos} (cs ${cs})`, csw.status)
    }
  }

  /** DEVICE_RESET: reset the device (optionally back into Maskrom). */
  async resetDevice(subCode: number = ResetSubCode.RESET): Promise<void> {
    await this.command({
      opcode: OpCode.DEVICE_RESET,
      direction: DIRECTION_OUT,
      cbLength: 6,
      subCode,
    })
  }

  // --- high level ---------------------------------------------------------

  /** Gather everything `ef` needs: geometry, eMMC flag and direct-LBA flag. */
  async getFlashInfo(): Promise<FlashInfo & { isEmmc: boolean, directLba: boolean }> {
    const info = await this.readFlashInfo()
    const isEmmc = await this.readFlashIsEmmc()
    const directLba = await this.readDirectLba()
    return { ...info, isEmmc, directLba }
  }

  /**
   * Erase the whole flash, mirroring rkdeveloptool's EraseAllBlocks: an LBA
   * erase for eMMC / direct-LBA storage, otherwise a per-chip-select block erase.
   */
  async eraseAll(onProgress?: EraseProgress): Promise<void> {
    const info = await this.getFlashInfo()

    if (info.isEmmc || info.directLba) {
      const chunks = planLbaErase(info.totalSectors)
      let done = 0
      for (const chunk of chunks) {
        await this.eraseLba(chunk.pos, chunk.count)
        done += chunk.count
        onProgress?.(done, info.totalSectors)
      }
      return
    }

    // Raw NAND: erase block-by-block across every populated chip-select.
    const blocksPerCs = Math.floor(info.totalSectors / info.sectorsPerBlock)
    const csCount = countChipSelects(info.flashCs) || 1
    const totalBlocks = blocksPerCs * csCount
    let done = 0
    for (let cs = 0; cs < 8; cs++) {
      if (!(info.flashCs & (1 << cs))) continue
      let pos = 0
      let remaining = blocksPerCs
      while (remaining > 0) {
        const count = Math.min(remaining, MAX_ERASE_BLOCKS)
        await this.eraseBlock(cs, pos, count)
        pos += count
        remaining -= count
        done += count
        onProgress?.(done, totalBlocks)
      }
    }
  }
}
