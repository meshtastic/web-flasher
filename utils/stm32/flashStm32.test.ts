import { describe, expect, it } from 'vitest'
import { FakeSerialPort, FakeStm32 } from '~/test/stm32FakeBootloader'
import { STM32_FLASH_BASE } from './an3155'
import { flashStm32Firmware } from './flashStm32'

function setup() {
  const dev = new FakeStm32()
  const port = new FakeSerialPort(dev)
  const status: string[] = []
  const progress: Array<[string, number, number]> = []
  const opts = {
    massErase: false,
    onStatus: (l: string) => status.push(l),
    onProgress: (phase: 'write' | 'verify', done: number, total: number) =>
      progress.push([phase, done, total]),
  }
  return { dev, port, status, progress, opts }
}

const image = new Uint8Array(600).map((_, i) => (i * 3) & 0xff)

describe('flashStm32Firmware', () => {
  it('erases the firmware region, writes, verifies and jumps to the app', async () => {
    const { dev, port, status, progress, opts } = setup()
    await flashStm32Firmware(port as unknown as SerialPort, image, opts)

    expect(port.openOptions[0]).toMatchObject({ baudRate: 115200, dataBits: 8, parity: 'even', stopBits: 1 })
    expect(dev.massErased).toBe(false)
    expect(dev.erasedPages).toEqual([0]) // ceil(600 / 2048) = 1 page
    expect([...dev.flash.subarray(0, 600)]).toEqual([...image])
    expect(dev.wentTo).toBe(STM32_FLASH_BASE)

    const phases = status.join('\n')
    expect(phases).toMatch(/Erasing firmware region/)
    expect(phases).toMatch(/configuration preserved/)
    expect(phases).toMatch(/Verified OK/)

    const write = progress.filter(p => p[0] === 'write').map(p => p[1])
    const verify = progress.filter(p => p[0] === 'verify').map(p => p[1])
    expect(write).toEqual([256, 512, 600])
    expect(verify).toEqual([256, 512, 600])

    expect(port.opened).toBe(false)
    expect(port.closeCount).toBeGreaterThanOrEqual(1)
  })

  it('mass-erases when asked', async () => {
    const { dev, port, opts } = setup()
    await flashStm32Firmware(port as unknown as SerialPort, image, { ...opts, massErase: true })
    expect(dev.massErased).toBe(true)
  })

  it('does not throw when Go is refused — tells the user to press RESET', async () => {
    const { dev, port, status, opts } = setup()
    dev.goNack = true
    await flashStm32Firmware(port as unknown as SerialPort, image, opts)
    expect(status.join('\n')).toMatch(/press the RESET button/)
  })

  it('throws on a verify mismatch', async () => {
    const { dev, port, opts } = setup()
    dev.corruptReadAt = 300
    await expect(flashStm32Firmware(port as unknown as SerialPort, image, opts))
      .rejects.toThrow('verify failed')
    expect(port.opened).toBe(false) // still cleaned up
  })

  it('recycles the port when the first open() fails', async () => {
    const { dev, port, opts } = setup()
    port.failOpensBeforeSuccess = 1
    await flashStm32Firmware(port as unknown as SerialPort, image, opts)
    expect(dev.wentTo).toBe(STM32_FLASH_BASE)
    expect(port.closeCount).toBeGreaterThanOrEqual(2) // one recycle + final
  })

  it('releases the port even when writing fails', async () => {
    const { dev, port, opts } = setup()
    dev.nackWriteAlways = true
    await expect(flashStm32Firmware(port as unknown as SerialPort, image, opts))
      .rejects.toThrow('write failed')
    expect(port.opened).toBe(false)
    expect(port.closeCount).toBeGreaterThanOrEqual(1)
  })
})
