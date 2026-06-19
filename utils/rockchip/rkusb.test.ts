import { describe, expect, it } from 'vitest'
import {
  buildCBW,
  countChipSelects,
  isCswValid,
  isEmmcId,
  LBA_ERASE_CHUNK_SECTORS,
  OpCode,
  parseCSW,
  parseFlashInfo,
  planLbaErase,
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
