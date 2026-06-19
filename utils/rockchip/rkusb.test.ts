import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildCBW,
  countChipSelects,
  crcCcitt,
  firstSetBit,
  isCswValid,
  isEmmcId,
  LBA_ERASE_CHUNK_SECTORS,
  OpCode,
  padToSector,
  parseCSW,
  parseFlashInfo,
  parseRkBoot,
  planLbaErase,
  sectorCount,
  Storage,
} from './rkusb'

/** Encode a CSW the way a device would, for round-trip tests. */
function makeCsw(tag: number, status: number, residue = 0): Uint8Array {
  const bytes = new Uint8Array(13)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 0x53425355, true) // "USBS"
  view.setUint32(4, tag >>> 0, true)
  view.setUint32(8, residue, true)
  view.setUint8(12, status)
  return bytes
}

describe('buildCBW', () => {
  it('writes a 31-byte wrapper with the little-endian "USBC" signature', () => {
    const cbw = buildCBW({ opcode: OpCode.TEST_UNIT_READY, tag: 0x11223344 })
    expect(cbw.length).toBe(31)
    // Signature stored little-endian: 0x43425355 -> 55 53 42 43 ("USBC").
    expect([...cbw.slice(0, 4)]).toEqual([0x55, 0x53, 0x42, 0x43])
    // Tag is little-endian.
    expect([...cbw.slice(4, 8)]).toEqual([0x44, 0x33, 0x22, 0x11])
  })

  it('encodes transfer length little-endian and address/length big-endian', () => {
    const cbw = buildCBW({
      opcode: OpCode.ERASE_LBA,
      direction: 0x00,
      cbLength: 10,
      transferLength: 0,
      address: 0x01020304,
      length: 0x8000,
      tag: 0,
    })
    const view = new DataView(cbw.buffer)
    expect(view.getUint32(8, true)).toBe(0) // dwCBWTransferLength (LE)
    expect(cbw[12]).toBe(0x00) // flags = OUT
    expect(cbw[14]).toBe(10) // bCBWCBLength
    expect(cbw[15]).toBe(OpCode.ERASE_LBA) // opcode
    // Address is big-endian at offset 17.
    expect([...cbw.slice(17, 21)]).toEqual([0x01, 0x02, 0x03, 0x04])
    // Length is big-endian at offset 22 (0x8000 = 32768 sectors).
    expect([...cbw.slice(22, 24)]).toEqual([0x80, 0x00])
  })

  it('places the sub-code in the command-block reserved byte and LUN for chip-select', () => {
    const cbw = buildCBW({ opcode: OpCode.ERASE_FORCE, lun: 2, subCode: 0xfe, tag: 0 })
    expect(cbw[13]).toBe(2) // bCBWLUN
    expect(cbw[16]).toBe(0xfe) // sub-code
  })

  it('defaults to an inbound 6-byte command block', () => {
    const cbw = buildCBW({ opcode: OpCode.READ_FLASH_INFO, transferLength: 11, tag: 0 })
    expect(cbw[12]).toBe(0x80) // DIRECTION_IN
    expect(cbw[14]).toBe(6)
    const view = new DataView(cbw.buffer)
    expect(view.getUint32(8, true)).toBe(11)
  })
})

describe('parseCSW / isCswValid', () => {
  it('round-trips a device CSW', () => {
    const csw = parseCSW(makeCsw(0xdeadbeef, 0, 4))
    expect(csw.signature).toBe(0x53425355)
    expect(csw.tag >>> 0).toBe(0xdeadbeef)
    expect(csw.dataResidue).toBe(4)
    expect(csw.status).toBe(0)
  })

  it('accepts a matching signature + tag', () => {
    const csw = parseCSW(makeCsw(0x12345678, 0))
    expect(isCswValid(csw, 0x12345678)).toBe(true)
  })

  it('rejects a mismatched tag', () => {
    const csw = parseCSW(makeCsw(0x12345678, 0))
    expect(isCswValid(csw, 0x000000ff)).toBe(false)
  })

  it('rejects a bad signature', () => {
    const bytes = makeCsw(1, 0)
    bytes[0] = 0x00
    expect(isCswValid(parseCSW(bytes), 1)).toBe(false)
  })

  it('throws when the buffer is too short', () => {
    expect(() => parseCSW(new Uint8Array(5))).toThrow(/too short/)
  })
})

describe('parseFlashInfo', () => {
  function makeFlashInfo(totalSectors: number, sectorsPerBlock: number, opts: Partial<{ pageSize: number, flashCs: number }> = {}): Uint8Array {
    const bytes = new Uint8Array(11)
    const view = new DataView(bytes.buffer)
    view.setUint32(0, totalSectors, true)
    view.setUint16(4, sectorsPerBlock, true)
    view.setUint8(6, opts.pageSize ?? 4)
    view.setUint8(7, 2) // eccBits
    view.setUint8(8, 1) // accessTime
    view.setUint8(9, 0) // manufCode
    view.setUint8(10, opts.flashCs ?? 0x01)
    return bytes
  }

  it('parses geometry and derives byte size', () => {
    // 16 GiB eMMC = 33554432 sectors of 512 bytes.
    const info = parseFlashInfo(makeFlashInfo(33554432, 1024, { flashCs: 0x01 }))
    expect(info.totalSectors).toBe(33554432)
    expect(info.sectorsPerBlock).toBe(1024)
    expect(info.flashCs).toBe(0x01)
    expect(info.sizeBytes).toBe(33554432 * 512)
  })

  it('throws when block size or page size is zero (maskrom without loader)', () => {
    expect(() => parseFlashInfo(makeFlashInfo(1000, 0))).toThrow(/Invalid flash info/)
    expect(() => parseFlashInfo(makeFlashInfo(1000, 64, { pageSize: 0 }))).toThrow(/Invalid flash info/)
  })

  it('throws when the payload is shorter than 11 bytes', () => {
    expect(() => parseFlashInfo(new Uint8Array(10))).toThrow(/too short/)
  })
})

describe('isEmmcId', () => {
  it('detects the "EMMC" magic', () => {
    expect(isEmmcId(new Uint8Array([0x45, 0x4d, 0x4d, 0x43, 0x00]))).toBe(true)
  })

  it('rejects other flash ids', () => {
    expect(isEmmcId(new Uint8Array([0x98, 0x3a, 0xa5, 0x00, 0x00]))).toBe(false)
    expect(isEmmcId(new Uint8Array([0x45, 0x4d]))).toBe(false)
  })
})

describe('planLbaErase', () => {
  it('uses 16 MiB chunks by default', () => {
    expect(LBA_ERASE_CHUNK_SECTORS).toBe(32768)
  })

  it('splits an exact multiple into equal chunks', () => {
    const chunks = planLbaErase(65536)
    expect(chunks).toEqual([
      { pos: 0, count: 32768 },
      { pos: 32768, count: 32768 },
    ])
  })

  it('keeps the remainder in a final short chunk', () => {
    const chunks = planLbaErase(70000)
    expect(chunks).toEqual([
      { pos: 0, count: 32768 },
      { pos: 32768, count: 32768 },
      { pos: 65536, count: 4464 },
    ])
    // Covers exactly the whole device, nothing dropped or doubled.
    const covered = chunks.reduce((sum, c) => sum + c.count, 0)
    expect(covered).toBe(70000)
    expect(chunks[1].pos).toBe(chunks[0].pos + chunks[0].count)
  })

  it('handles a flash smaller than one chunk', () => {
    expect(planLbaErase(100)).toEqual([{ pos: 0, count: 100 }])
  })

  it('returns nothing for an empty device', () => {
    expect(planLbaErase(0)).toEqual([])
  })

  it('honours a custom chunk size', () => {
    expect(planLbaErase(25, 10)).toEqual([
      { pos: 0, count: 10 },
      { pos: 10, count: 10 },
      { pos: 20, count: 5 },
    ])
  })
})

describe('countChipSelects', () => {
  it('counts populated chip-selects in the bitmask', () => {
    expect(countChipSelects(0x00)).toBe(0)
    expect(countChipSelects(0x01)).toBe(1)
    expect(countChipSelects(0x03)).toBe(2)
    expect(countChipSelects(0xff)).toBe(8)
  })
})

describe('crcCcitt', () => {
  // Reference values produced by compiling rkdeveloptool's CRC_CCITT.
  it('matches CRC-16/CCITT-FALSE reference vectors', () => {
    const hex = (n: number) => n.toString(16).padStart(4, '0')
    expect(hex(crcCcitt(new TextEncoder().encode('123456789')))).toBe('29b1')
    expect(hex(crcCcitt(new Uint8Array([0x00])))).toBe('e1f0')
    expect(hex(crcCcitt(new Uint8Array([0x01, 0x02, 0x03, 0x04])))).toBe('89c3')
    expect(hex(crcCcitt(new Uint8Array([0xde, 0xad, 0xbe, 0xef])))).toBe('4097')
  })

  it('returns the init value 0xFFFF for empty input', () => {
    expect(crcCcitt(new Uint8Array(0))).toBe(0xffff)
  })
})

describe('parseRkBoot', () => {
  /** Build a minimal RKBOOT image with one 471 and one 472 entry. */
  function makeRkBoot(): Uint8Array {
    const entrySize = 57
    const h471Off = 100
    const h472Off = h471Off + entrySize // 157
    const data471Off = 300
    const data472Off = 310
    const buf = new Uint8Array(320)
    const view = new DataView(buf.buffer)
    view.setUint32(0, 0x544f4f42, true) // tag "BOOT"
    view.setUint8(25, 1) // code471Num
    view.setUint32(26, h471Off, true) // code471Offset
    view.setUint8(30, entrySize) // code471Size
    view.setUint8(31, 1) // code472Num
    view.setUint32(32, h472Off, true) // code472Offset
    view.setUint8(36, entrySize) // code472Size
    // 471 entry
    view.setUint32(h471Off + 45, data471Off, true)
    view.setUint32(h471Off + 49, 4, true)
    view.setUint32(h471Off + 53, 10, true) // delay 10 ms
    buf.set([0xaa, 0xbb, 0xcc, 0xdd], data471Off)
    // 472 entry
    view.setUint32(h472Off + 45, data472Off, true)
    view.setUint32(h472Off + 49, 3, true)
    view.setUint32(h472Off + 53, 0, true)
    buf.set([0x11, 0x22, 0x33], data472Off)
    return buf
  }

  it('extracts 471 and 472 entry data and delays', () => {
    const boot = parseRkBoot(makeRkBoot())
    expect(boot.entries471).toHaveLength(1)
    expect([...boot.entries471[0].data]).toEqual([0xaa, 0xbb, 0xcc, 0xdd])
    expect(boot.entries471[0].delayMs).toBe(10)
    expect(boot.entries472).toHaveLength(1)
    expect([...boot.entries472[0].data]).toEqual([0x11, 0x22, 0x33])
    expect(boot.entries472[0].delayMs).toBe(0)
  })

  it('rejects a file without the RKBOOT tag', () => {
    const bogus = new Uint8Array(64)
    expect(() => parseRkBoot(bogus)).toThrow(/RKBOOT tag/)
  })

  it('rejects a file that is too small', () => {
    expect(() => parseRkBoot(new Uint8Array(8))).toThrow(/too small/)
  })

  // The shipped loaders are built from official rkbin components; make sure the
  // real parser extracts the DDR (471) and usbplug (472) blobs from them.
  it.each([
    'rk3506_spl_loader.bin',
    'rk3506b_spl_loader.bin',
  ])('parses the bundled %s into ddr(471) + usbplug(472)', (file) => {
    const bytes = new Uint8Array(readFileSync(resolve(process.cwd(), 'public/rockchip', file)))
    const boot = parseRkBoot(bytes)
    expect(boot.entries471).toHaveLength(1)
    expect(boot.entries471[0].data.length).toBeGreaterThan(0)
    expect(boot.entries472).toHaveLength(1)
    expect(boot.entries472[0].data.length).toBe(48680) // shared rk3506_usbplug_v1.03.bin
  })
})

describe('firstSetBit', () => {
  it('returns the active storage id from a READ_STORAGE word', () => {
    expect(firstSetBit(1 << Storage.EMMC)).toBe(Storage.EMMC) // 1
    expect(firstSetBit(1 << Storage.SD)).toBe(Storage.SD) // 2
    expect(firstSetBit(1 << Storage.SPINOR)).toBe(Storage.SPINOR) // 9
  })

  it('returns the lowest set bit when several are set', () => {
    expect(firstSetBit(0b101000)).toBe(3)
  })

  it('returns 0 for an empty word', () => {
    expect(firstSetBit(0)).toBe(0)
  })
})

describe('sectorCount', () => {
  it('rounds byte lengths up to whole 512-byte sectors', () => {
    expect(sectorCount(0)).toBe(0)
    expect(sectorCount(1)).toBe(1)
    expect(sectorCount(512)).toBe(1)
    expect(sectorCount(513)).toBe(2)
    expect(sectorCount(1024 * 1024)).toBe(2048)
  })
})

describe('padToSector', () => {
  it('leaves sector-aligned buffers untouched', () => {
    const aligned = new Uint8Array(1024).fill(7)
    expect(padToSector(aligned)).toBe(aligned)
  })

  it('zero-pads a partial final sector', () => {
    const partial = new Uint8Array([1, 2, 3])
    const padded = padToSector(partial)
    expect(padded.length).toBe(512)
    expect([...padded.slice(0, 3)]).toEqual([1, 2, 3])
    expect(padded[3]).toBe(0)
    expect(padded[511]).toBe(0)
  })

  it('rounds up across multiple sectors', () => {
    expect(padToSector(new Uint8Array(513)).length).toBe(1024)
  })
})

describe('buildCBW for WRITE_LBA', () => {
  it('encodes an outbound 10-byte command block with the data length and sector address', () => {
    const sectors = 2048
    const cbw = buildCBW({
      opcode: OpCode.WRITE_LBA,
      direction: 0x00,
      cbLength: 10,
      transferLength: sectors * 512,
      address: 0,
      length: sectors,
      tag: 0,
    })
    const view = new DataView(cbw.buffer)
    expect(cbw[12]).toBe(0x00) // OUT
    expect(cbw[14]).toBe(10) // CBWCB length
    expect(cbw[15]).toBe(OpCode.WRITE_LBA)
    expect(view.getUint32(8, true)).toBe(sectors * 512) // transfer length (LE)
    expect([...cbw.slice(22, 24)]).toEqual([0x08, 0x00]) // sector count 2048 (big-endian)
  })
})
