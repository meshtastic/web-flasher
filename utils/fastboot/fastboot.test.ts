import { describe, expect, it } from 'vitest'
import { downloadCommand, parseHexSize, parseReply } from './fastboot'

describe('downloadCommand', () => {
  it('formats the size as 8 lowercase hex digits', () => {
    expect(downloadCommand(0)).toBe('download:00000000')
    expect(downloadCommand(1)).toBe('download:00000001')
    expect(downloadCommand(0x1234)).toBe('download:00001234')
    expect(downloadCommand(0xffffffff)).toBe('download:ffffffff')
  })

  it('rejects out-of-range or non-integer sizes', () => {
    expect(() => downloadCommand(-1)).toThrow()
    expect(() => downloadCommand(0x1_0000_0000)).toThrow()
    expect(() => downloadCommand(1.5)).toThrow()
  })
})

describe('parseReply', () => {
  const enc = (s: string) => new TextEncoder().encode(s)

  it('splits the 4-byte status word from the message', () => {
    expect(parseReply(enc('OKAY'))).toEqual({ status: 'OKAY', message: '' })
    expect(parseReply(enc('OKAY0.4'))).toEqual({ status: 'OKAY', message: '0.4' })
    expect(parseReply(enc('FAILunknown command'))).toEqual({ status: 'FAIL', message: 'unknown command' })
    expect(parseReply(enc('DATA00001000'))).toEqual({ status: 'DATA', message: '00001000' })
    expect(parseReply(enc('INFOerasing'))).toEqual({ status: 'INFO', message: 'erasing' })
  })
})

describe('parseHexSize', () => {
  it('parses 0x-prefixed hex (max-download-size form)', () => {
    expect(parseHexSize('0x8000000')).toBe(0x8000000)
  })

  it('parses a bare DATA payload as hex, not decimal', () => {
    expect(parseHexSize('00001000')).toBe(0x1000) // 4096, not 1000
    expect(parseHexSize('8000000')).toBe(0x8000000)
  })

  it('returns 0 for junk', () => {
    expect(parseHexSize('')).toBe(0)
    expect(parseHexSize('nonsense')).toBe(0)
  })
})
