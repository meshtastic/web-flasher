import { computed, readonly, ref } from 'vue'
import {
  type FastbootReply,
  FastbootDevice,
  isWebUsbSupported,
  parseHexSize,
} from '~/utils/fastboot/fastboot'

export interface FastbootDeviceInfo {
  vendorId: number
  productId: number
  manufacturerName?: string
  productName?: string
  serialNumber?: string
}

/** Format a byte count as a human-readable size (e.g. "128.0 MB"). */
export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** exp).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`
}

function hex(value: number): string {
  return `0x${value.toString(16).padStart(4, '0')}`
}

/**
 * Reactive wrapper around {@link FastbootDevice}. Drives a generic fastboot
 * gadget (U-Boot CONFIG_USB_FUNCTION_FASTBOOT, or an Android bootloader) over
 * WebUSB: read device vars, flash/erase partitions, boot an image, and reboot.
 */
export function useFastboot() {
  const isSupported = computed(() => isWebUsbSupported())

  const isConnected = ref(false)
  const isBusy = ref(false)
  const isFlashing = ref(false)
  const status = ref('Not connected')
  const deviceInfo = ref<FastbootDeviceInfo | null>(null)
  const vars = ref<Record<string, string>>({})
  const progress = ref(0)
  const error = ref<string | null>(null)
  const log = ref<string[]>([])

  /** max-download-size in bytes, or 0 if the device did not report it. */
  const maxDownloadSize = computed(() => parseHexSize(vars.value['max-download-size'] ?? ''))

  let fb: FastbootDevice | null = null

  function appendLog(message: string) {
    log.value.push(message)
  }

  function describeError(err: unknown): string {
    if (err instanceof Error) {
      if (err.name === 'NotFoundError') return 'No device selected.'
      return err.message
    }
    return String(err)
  }

  async function refreshVars(): Promise<void> {
    if (!fb) return
    status.value = 'Reading device info…'
    vars.value = await fb.getVars()
    if (maxDownloadSize.value > 0) {
      appendLog(`max-download-size: ${formatBytes(maxDownloadSize.value)}.`)
    }
    status.value = 'Ready'
  }

  async function connect(): Promise<void> {
    if (!isSupported.value) {
      error.value = 'WebUSB is not supported in this browser. Use Chrome, Edge or another Chromium-based browser.'
      return
    }
    error.value = null
    isBusy.value = true
    status.value = 'Requesting device…'
    try {
      if (fb) {
        await fb.close().catch(() => {})
        fb = null
      }
      fb = await FastbootDevice.request()
      fb.onInfo = line => appendLog(`(device) ${line}`)
      await fb.open()
      isConnected.value = true
      deviceInfo.value = {
        vendorId: fb.vendorId,
        productId: fb.productId,
        manufacturerName: fb.device.manufacturerName,
        productName: fb.device.productName,
        serialNumber: fb.device.serialNumber,
      }
      appendLog(`Connected to ${hex(fb.vendorId)}:${hex(fb.productId)} in fastboot mode.`)
      await refreshVars()
    }
    catch (err) {
      error.value = describeError(err)
      appendLog(`Error: ${error.value}`)
      status.value = isConnected.value ? 'Connected (info unavailable)' : 'Not connected'
    }
    finally {
      isBusy.value = false
    }
  }

  async function readFile(file: File): Promise<Uint8Array> {
    return new Uint8Array(await file.arrayBuffer())
  }

  function checkSize(size: number): void {
    if (maxDownloadSize.value > 0 && size > maxDownloadSize.value) {
      throw new Error(`Image (${formatBytes(size)}) exceeds the device's max-download-size (${formatBytes(maxDownloadSize.value)}). Sparse images are not yet supported.`)
    }
  }

  async function flashPartition(partition: string, file: File | null): Promise<void> {
    if (!fb || !file) return
    const part = partition.trim()
    if (!part) {
      error.value = 'Enter a partition name to flash to.'
      return
    }
    error.value = null
    isBusy.value = true
    isFlashing.value = true
    progress.value = 0
    status.value = `Flashing ${part}…`
    appendLog(`Flashing ${file.name} (${formatBytes(file.size)}) to ${part}…`)
    try {
      const bytes = await readFile(file)
      checkSize(bytes.length)
      await fb.flash(part, bytes, (f) => {
        progress.value = Math.min(99, Math.round(f * 100))
      })
      progress.value = 100
      status.value = 'Flash complete'
      appendLog(`Flashed ${part}.`)
    }
    catch (err) {
      error.value = describeError(err)
      appendLog(`Flash failed: ${error.value}`)
      status.value = 'Flash failed'
    }
    finally {
      isFlashing.value = false
      isBusy.value = false
    }
  }

  async function erasePartition(partition: string): Promise<void> {
    if (!fb) return
    const part = partition.trim()
    if (!part) {
      error.value = 'Enter a partition name to erase.'
      return
    }
    error.value = null
    isBusy.value = true
    progress.value = 0 // clear any leftover bar from a prior flash
    status.value = `Erasing ${part}…`
    appendLog(`Erasing ${part}…`)
    try {
      await fb.erase(part)
      status.value = 'Erase complete'
      appendLog(`Erased ${part}.`)
    }
    catch (err) {
      error.value = describeError(err)
      appendLog(`Erase failed: ${error.value}`)
      status.value = 'Erase failed'
    }
    finally {
      isBusy.value = false
    }
  }

  async function bootImage(file: File | null): Promise<void> {
    if (!fb || !file) return
    error.value = null
    isBusy.value = true
    isFlashing.value = true
    progress.value = 0
    status.value = 'Booting image…'
    appendLog(`Downloading and booting ${file.name} (${formatBytes(file.size)})…`)
    try {
      const bytes = await readFile(file)
      checkSize(bytes.length)
      await fb.bootImage(bytes, (f) => {
        progress.value = Math.min(99, Math.round(f * 100))
      })
      progress.value = 100
      status.value = 'Boot command sent'
      appendLog('Boot command sent; the device should jump to the image.')
    }
    catch (err) {
      error.value = describeError(err)
      appendLog(`Boot failed: ${error.value}`)
      status.value = 'Boot failed'
    }
    finally {
      isFlashing.value = false
      isBusy.value = false
    }
  }

  async function reboot(target = ''): Promise<void> {
    if (!fb) return
    error.value = null
    isBusy.value = true
    progress.value = 0
    const label = target ? `reboot-${target}` : 'reboot'
    status.value = `Sending ${label}…`
    try {
      await fb.reboot(target)
      appendLog(`${label} sent.`)
      status.value = `${label} sent`
      // Any reboot (incl. -bootloader / -fastboot) re-enumerates the device, so
      // the current handle is dead. Drop it and make the user reconnect.
      await fb.close().catch(() => {})
      fb = null
      isConnected.value = false
      deviceInfo.value = null
      vars.value = {}
    }
    catch (err) {
      // A FAIL means the device is still in fastboot; keep the connection.
      error.value = describeError(err)
      appendLog(`${label} failed: ${error.value}`)
    }
    finally {
      isBusy.value = false
    }
  }

  /** Run an arbitrary fastboot command (advanced); returns the terminal reply. */
  async function runCommand(cmd: string): Promise<FastbootReply | null> {
    if (!fb) return null
    const trimmed = cmd.trim()
    if (!trimmed) return null
    // Commands that open a data phase (download:/upload:) would leave the bulk
    // pipe waiting for bytes that never come and desync every later command.
    if (/^(download|upload):/i.test(trimmed)) {
      error.value = 'Data-phase commands (download:/upload:) are not supported here. Use Flash or Boot.'
      return null
    }
    error.value = null
    isBusy.value = true
    appendLog(`> ${trimmed}`)
    try {
      const reply = await fb.command(trimmed)
      appendLog(`< ${reply.status}${reply.message ? ` ${reply.message}` : ''}`)
      return reply
    }
    catch (err) {
      error.value = describeError(err)
      appendLog(`Command failed: ${error.value}`)
      return null
    }
    finally {
      isBusy.value = false
    }
  }

  async function disconnect(): Promise<void> {
    if (fb) {
      await fb.close()
      fb = null
    }
    isConnected.value = false
    deviceInfo.value = null
    vars.value = {}
    progress.value = 0
    status.value = 'Not connected'
    appendLog('Disconnected.')
  }

  return {
    isSupported,
    isConnected: readonly(isConnected),
    isBusy: readonly(isBusy),
    isFlashing: readonly(isFlashing),
    status: readonly(status),
    deviceInfo: readonly(deviceInfo),
    vars: readonly(vars),
    maxDownloadSize,
    progress: readonly(progress),
    error: readonly(error),
    log: readonly(log),
    connect,
    disconnect,
    refreshVars,
    flashPartition,
    erasePartition,
    bootImage,
    reboot,
    runCommand,
  }
}
