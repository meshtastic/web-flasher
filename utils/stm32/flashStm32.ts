// SPDX-License-Identifier: MIT
//
// Choreography around AN3155Client: open an already-granted Web Serial port at
// the STM32 system bootloader's framing (8E1), erase/write/verify an image, jump
// to it, and always release the port. Kept separate from an3155.ts (pure
// protocol) and from the Pinia store (telemetry / UI state) so each layer is
// testable on its own.

import { AN3155Client, STM32_FLASH_BASE } from './an3155'

export interface Stm32FlashOptions {
  /** true = full mass-erase (wipes config + filesystem); false = erase only the pages the image covers. */
  massErase: boolean
  /** Bootloader baud; the ROM autobauds, 115200 is the norm. */
  baudRate?: number
  /** Issue the Go command when done (default true). */
  run?: boolean
  /** Human-readable progress lines for the terminal. */
  onStatus?: (line: string) => void
  onProgress?: (phase: 'write' | 'verify', done: number, total: number) => void
}

const OPEN_8E1 = (baudRate: number) => ({
  baudRate,
  dataBits: 8 as const,
  parity: 'even' as const,
  stopBits: 1 as const,
  bufferSize: 4096,
  flowControl: 'none' as const,
})

export async function flashStm32Firmware(
  port: SerialPort,
  image: Uint8Array,
  opts: Stm32FlashOptions,
): Promise<void> {
  const status = opts.onStatus ?? (() => {})
  const baudRate = opts.baudRate ?? 115200

  try {
    await port.open(OPEN_8E1(baudRate))
  }
  catch (e) {
    // Most likely already open from a previous attempt — recycle it once.
    try {
      await port.close()
    }
    catch {
      throw e
    }
    await port.open(OPEN_8E1(baudRate))
  }

  if (!port.readable || !port.writable) {
    throw new Error('serial port has no readable/writable stream after open')
  }
  const reader = port.readable.getReader()
  const writer = port.writable.getWriter()
  const client = new AN3155Client(reader, writer)

  try {
    await client.flushInput(150)

    status('Syncing with the bootloader…')
    await client.sync(10, 500)

    const info = await client.get()
    status(`Bootloader v${info.blVersion}`)
    if (!info.commands.includes(0x31) || !info.commands.includes(0x44)) {
      throw new Error('bootloader does not advertise Write Memory / Extended Erase')
    }

    if (opts.massErase) {
      status('Mass-erasing flash…')
      await client.massErase()
    }
    else {
      status('Erasing firmware region…')
      const pages = await client.eraseForImage(image.length)
      status(`Erased ${pages} pages — configuration preserved`)
    }

    status(`Writing ${image.length} bytes…`)
    await client.writeMemory(STM32_FLASH_BASE, image, {
      onProgress: (done, total) => opts.onProgress?.('write', done, total),
    })

    status('Verifying…')
    await client.verifyMemory(STM32_FLASH_BASE, image, {
      onProgress: (done, total) => opts.onProgress?.('verify', done, total),
    })
    status('Verified OK')

    if (opts.run !== false) {
      try {
        await client.go(STM32_FLASH_BASE)
        status('Starting firmware…')
      }
      catch {
        status('Could not auto-start — press the RESET button on the board')
      }
    }
  }
  finally {
    try {
      await reader.cancel()
    }
    catch { /* stream already gone */ }
    try {
      await writer.abort()
    }
    catch { /* stream already gone */ }
    try {
      await port.close()
    }
    catch { /* already closed */ }
  }
}
