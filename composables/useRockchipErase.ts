import { computed, readonly, ref } from 'vue'
import {
  type FlashInfo,
  isWebUsbSupported,
  RockusbDevice,
  type RockusbMode,
  ResetSubCode,
} from '~/utils/rockchip/rkusb'

export interface RockchipDeviceInfo {
  vendorId: number
  productId: number
  manufacturerName?: string
  productName?: string
  serialNumber?: string
}

export type FullFlashInfo = FlashInfo & { isEmmc: boolean, directLba: boolean }

/** Format a byte count as a human-readable size (e.g. "16.0 GB"). */
export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exp
  return `${value.toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`
}

function hex(value: number): string {
  return `0x${value.toString(16).padStart(4, '0')}`
}

/**
 * Reactive wrapper around {@link RockusbDevice} for the standalone Rockchip
 * erase-flash tool. Owns connection state, progress and a human-readable log.
 */
export function useRockchipErase() {
  const isSupported = computed(() => isWebUsbSupported())

  const isConnected = ref(false)
  const isBusy = ref(false)
  const isErasing = ref(false)
  const status = ref('Not connected')
  const mode = ref<RockusbMode | null>(null)
  const deviceInfo = ref<RockchipDeviceInfo | null>(null)
  const flashInfo = ref<FullFlashInfo | null>(null)
  const progress = ref(0)
  const error = ref<string | null>(null)
  const log = ref<string[]>([])

  /** True only when we have a flash-accessible (Loader-mode) device with geometry read. */
  const canErase = computed(() => isConnected.value && !isBusy.value && !!flashInfo.value)
  const isMaskrom = computed(() => mode.value === 'maskrom')

  let rk: RockusbDevice | null = null

  function appendLog(message: string) {
    log.value.push(message)
  }

  function describeError(err: unknown): string {
    if (err instanceof Error) {
      // The chooser being dismissed surfaces as a NotFoundError, so treat it gently.
      if (err.name === 'NotFoundError') return 'No device selected.'
      return err.message
    }
    return String(err)
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
      rk = await RockusbDevice.request()
      await rk.open()
      isConnected.value = true
      mode.value = rk.mode
      deviceInfo.value = {
        vendorId: rk.vendorId,
        productId: rk.productId,
        manufacturerName: rk.device.manufacturerName,
        productName: rk.device.productName,
        serialNumber: rk.device.serialNumber,
      }
      appendLog(`Connected to ${hex(rk.vendorId)}:${hex(rk.productId)} in ${rk.mode.toUpperCase()} mode.`)

      if (rk.mode === 'maskrom') {
        status.value = 'Connected (Maskrom, loader required)'
        appendLog('Device is in Maskrom mode. Flash is not accessible until a loader is downloaded; erase is unavailable. Put the device in Loader mode and reconnect.')
        return
      }

      status.value = 'Reading flash info…'
      const info = await rk.getFlashInfo()
      flashInfo.value = info
      appendLog(`Flash: ${formatBytes(info.sizeBytes)} (${info.totalSectors.toLocaleString()} sectors), ${info.isEmmc ? 'eMMC' : info.directLba ? 'direct-LBA' : 'raw NAND'}.`)
      status.value = 'Ready to erase'
    }
    catch (err) {
      error.value = describeError(err)
      appendLog(`Error: ${error.value}`)
      status.value = isConnected.value ? 'Connected (flash info unavailable)' : 'Not connected'
    }
    finally {
      isBusy.value = false
    }
  }

  async function erase(): Promise<void> {
    if (!rk || !flashInfo.value) return
    error.value = null
    isBusy.value = true
    isErasing.value = true
    progress.value = 0
    status.value = 'Erasing flash…'
    appendLog('Starting flash erase…')
    try {
      await rk.eraseAll((current, total) => {
        progress.value = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0
      })
      progress.value = 100
      status.value = 'Erase complete'
      appendLog('Flash erase complete.')
    }
    catch (err) {
      error.value = describeError(err)
      appendLog(`Erase failed: ${error.value}`)
      status.value = 'Erase failed'
    }
    finally {
      isErasing.value = false
      isBusy.value = false
    }
  }

  async function reset(): Promise<void> {
    if (!rk) return
    error.value = null
    isBusy.value = true
    status.value = 'Resetting device…'
    try {
      await rk.resetDevice(ResetSubCode.RESET)
      status.value = 'Reset command sent'
      appendLog('Reset command sent.')
    }
    catch (err) {
      status.value = 'Reset failed'
      appendLog(`Reset failed: ${describeError(err)}`)
    }
    finally {
      isBusy.value = false
    }
  }

  async function disconnect(): Promise<void> {
    if (rk) {
      await rk.close()
      rk = null
    }
    isConnected.value = false
    mode.value = null
    deviceInfo.value = null
    flashInfo.value = null
    progress.value = 0
    status.value = 'Not connected'
    appendLog('Disconnected.')
  }

  return {
    isSupported,
    isConnected: readonly(isConnected),
    isBusy: readonly(isBusy),
    isErasing: readonly(isErasing),
    canErase,
    isMaskrom,
    status: readonly(status),
    deviceInfo: readonly(deviceInfo),
    flashInfo: readonly(flashInfo),
    progress: readonly(progress),
    error: readonly(error),
    log: readonly(log),
    connect,
    erase,
    reset,
    disconnect,
  }
}
