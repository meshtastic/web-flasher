import { describe, expect, it, vi } from 'vitest'
import { FakeStm32 } from '~/test/stm32FakeBootloader'
import {
  AN3155Client,
  addressFrame,
  buildExtendedEraseFrame,
  ByteReader,
  STM32_FLASH_BASE,
} from './an3155'

function clientFor(dev: FakeStm32) {
  return new AN3155Client(dev.readable.getReader(), dev.writable.getWriter())
}

describe('pure framing helpers', () => {
  it('addressFrame is big-endian + XOR', () => {
    expect([...addressFrame(0x08000000)]).toEqual([0x08, 0x00, 0x00, 0x00, 0x08])
    expect([...addressFrame(0x08010204)]).toEqual([0x08, 0x01, 0x02, 0x04, 0x0f])
  })

  it('buildExtendedEraseFrame matches hand-computed vectors', () => {
    expect(buildExtendedEraseFrame(0, 1)).toEqual([0x00, 0x00, 0x00, 0x00, 0x00])
    expect(buildExtendedEraseFrame(0, 2)).toEqual([0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00])
    const f = buildExtendedEraseFrame(5, 3)
    expect(f.slice(0, -1)).toEqual([0x00, 0x02, 0x00, 0x05, 0x00, 0x06, 0x00, 0x07])
    expect(f[f.length - 1]).toBe(f.slice(0, -1).reduce((a, b) => a ^ b, 0))
  })
})

describe('ByteReader', () => {
  it('times out clearly and never drops a read that is still in flight', async () => {
    let resolveRead: (r: ReadableStreamReadResult<Uint8Array>) => void
    const reader = {
      read: vi.fn(() => new Promise<ReadableStreamReadResult<Uint8Array>>((res) => { resolveRead = res })),
    } as unknown as ReadableStreamDefaultReader<Uint8Array>
    const br = new ByteReader(reader)

    await expect(br.readBytes(2, 20)).rejects.toThrow('timed out waiting for a response')

    // next call re-races the SAME pending read before it settles
    const p = br.readBytes(2, 50)
    resolveRead!({ done: false, value: new Uint8Array([0xaa, 0xbb]) })
    expect(await p).toEqual([0xaa, 0xbb])
    expect(reader.read).toHaveBeenCalledTimes(1)
  })
})

describe('AN3155Client against a fake bootloader', () => {
  it('syncs, retrying past swallowed sync bytes', async () => {
    const dev = new FakeStm32()
    dev.ignoreSyncs = 2
    await expect(clientFor(dev).sync(5, 30)).resolves.toBeUndefined()
  })

  it('sync eventually throws with the manual-BOOT0 hint', async () => {
    const dev = new FakeStm32()
    dev.ignoreSyncs = 99
    await expect(clientFor(dev).sync(2, 20)).rejects.toThrow('BOOT0')
  })

  it('get() parses version and command list', async () => {
    const info = await clientFor(new FakeStm32()).get()
    expect(info.blVersion).toBe('3.1')
    expect(info.commands).toEqual([0x00, 0x11, 0x21, 0x31, 0x44])
  })

  it('flushInput drains a stale burst then returns', async () => {
    const dev = new FakeStm32()
    const client = clientFor(dev)
    dev.injectNoise([0x11, 0x22, 0x33])
    await expect(client.flushInput(20)).resolves.toBeUndefined()
  })

  it('massErase clears the whole model', async () => {
    const dev = new FakeStm32()
    dev.flash.fill(0x00)
    await clientFor(dev).massErase()
    expect(dev.massErased).toBe(true)
    expect(dev.flash.every(b => b === 0xff)).toBe(true)
  })

  it('eraseForImage erases exactly the covered pages and refuses oversize images', async () => {
    const dev = new FakeStm32()
    const client = clientFor(dev)
    expect(await client.eraseForImage(5000)).toBe(3)
    expect(dev.erasedPages).toEqual([0, 1, 2])
    await expect(client.eraseForImage(129 * 2048)).rejects.toThrow('firmware too large')
  })

  it('writeMemory splits into blocks, pads the tail to x4, reports progress, retries once', async () => {
    const dev = new FakeStm32()
    dev.nackWriteOnce = true
    const client = clientFor(dev)
    const image = new Uint8Array(602).map((_, i) => i & 0xff)
    const progress: number[] = []
    await client.writeMemory(STM32_FLASH_BASE, image, { onProgress: d => progress.push(d) })

    expect(dev.wroteAt).toEqual([STM32_FLASH_BASE, STM32_FLASH_BASE + 256, STM32_FLASH_BASE + 512])
    expect(progress).toEqual([256, 512, 602])
    expect([...dev.flash.subarray(0, 602)]).toEqual([...image])
    expect(dev.flash[602]).toBe(0xff) // tail padded with the erased value
  })

  it('writeMemory gives up after repeated NACKs, naming the address', async () => {
    const dev = new FakeStm32()
    dev.nackWriteAlways = true
    await expect(
      clientFor(dev).writeMemory(STM32_FLASH_BASE, new Uint8Array(8), { attempts: 2 }),
    ).rejects.toThrow(/write failed at 0x8000000/)
  })

  it('verifyMemory passes on a match and throws with the offset on a mismatch', async () => {
    const dev = new FakeStm32()
    const client = clientFor(dev)
    const image = new Uint8Array(300).map((_, i) => (i * 7) & 0xff)
    dev.flash.set(image, 0)
    await expect(client.verifyMemory(STM32_FLASH_BASE, image)).resolves.toBeUndefined()

    dev.corruptReadAt = 260
    await expect(client.verifyMemory(STM32_FLASH_BASE, image)).rejects.toThrow('0x8000104')
  })

  it('go() sends the entry address; NACK surfaces as an error', async () => {
    const dev = new FakeStm32()
    await clientFor(dev).go(STM32_FLASH_BASE)
    expect(dev.wentTo).toBe(STM32_FLASH_BASE)

    const dev2 = new FakeStm32()
    dev2.goNack = true
    await expect(clientFor(dev2).go(STM32_FLASH_BASE)).rejects.toThrow('NACK')
  })
})
