// SPDX-License-Identifier: MIT
//
// Reboot a running Meshtastic device into its DFU / ROM bootloader by sending
// the enter_dfu_mode_request admin message, then release the serial port so the
// AN3155 flasher can take it over.
//
// @meshtastic/transport-web-serial locks port.readable / port.writable in stream
// pipes it never tears down, so the flasher's usual MeshDevice cleanup can only
// free the port with port.forget() -- which revokes the grant and forces a
// second port picker. Here the two pipes are built locally, each gated by an
// AbortController, so aborting them cancels the port's streams and a plain
// port.close() succeeds with the grant intact.

import { MeshDevice, Utils } from '@meshtastic/core'

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

function frameHeader(length: number): Uint8Array {
  return new Uint8Array([0x94, 0xc3, (length >> 8) & 0xff, length & 0xff])
}

export interface RebootToBootloaderOptions {
  /** Wait at most this long for the config exchange (needed to learn our node number). */
  configureMs?: number
  /** enterDfuMode() never gets an ACK (the MCU resets first); stop waiting after this. */
  dfuAckMs?: number
  baudRate?: number
}

export async function rebootMeshtasticToBootloader(
  port: SerialPort,
  { configureMs = 4000, dfuAckMs = 1500, baudRate = 115200 }: RebootToBootloaderOptions = {},
): Promise<void> {
  try {
    await port.open({ baudRate })
  }
  catch (e) {
    try {
      await port.close()
    }
    catch {
      throw e
    }
    await port.open({ baudRate })
  }
  if (!port.readable || !port.writable) {
    throw new Error('serial port has no streams after open')
  }

  const rxAbort = new AbortController()
  const txAbort = new AbortController()

  // device -> host: raw bytes -> decoded DeviceOutput frames.
  // preventAbort keeps the abort from erroring fromTransform (MeshDevice pipes
  // its readable side with no .catch); we close that side explicitly instead.
  const fromTransform = Utils.fromDeviceStream()
  const rxPipe = port.readable
    .pipeTo(fromTransform.writable, { signal: rxAbort.signal, preventAbort: true })
    .catch(() => {})

  // host -> device: unframed ToRadio -> length-framed bytes -> port
  const toTransform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(new Uint8Array([...frameHeader(chunk.length), ...chunk]))
    },
  })
  const txPipe = toTransform.readable
    .pipeTo(port.writable, { signal: txAbort.signal, preventAbort: true, preventClose: true })
    .catch(() => {})

  const device = new MeshDevice({
    fromDevice: fromTransform.readable,
    toDevice: toTransform.writable,
  })

  try {
    // configure() frequently never resolves even though my_info has arrived;
    // race it so we still send the admin message with our node number set.
    try {
      await Promise.race([device.configure(), delay(configureMs)])
    }
    catch { /* proceed regardless */ }

    await Promise.race([device.enterDfuMode().catch(() => {}), delay(dfuAckMs)])
  }
  finally {
    try {
      device.queue.clear()
    }
    catch { /* no queue */ }
    rxAbort.abort()
    txAbort.abort()
    // Close the decode transform so MeshDevice's internal
    // fromDevice.pipeTo(decodePacket) resolves instead of hanging.
    try {
      await fromTransform.writable.close()
    }
    catch { /* already unlocked/closed */ }
    await Promise.allSettled([rxPipe, txPipe])
    await delay(50)
    try {
      await port.close()
    }
    catch { /* already closed */ }
  }
}
