import { computed, readonly, ref } from 'vue'
import {
  type FlashInfo,
  isWebUsbSupported,
  padToSector,
  ResetSubCode,
  RockusbDevice,
  type RockusbMode,
  Storage,
  STORAGE_NAMES,
  WRITE_LBA_CHUNK_SECTORS,
} from '~/utils/rockchip/rkusb'

export interface RockchipDeviceInfo {
  vendorId: number
  productId: number
  manufacturerName?: string
  productName?: string
  serialNumber?: string
}

export type FullFlashInfo = FlashInfo & { isEmmc: boolean, directLba: boolean }

const SECTOR_SIZE = 512

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

/** Best-effort uncompressed size of a gzip file from its 4-byte ISIZE trailer (mod 2^32). */
async function gzipUncompressedSize(file: File): Promise<number> {
  if (file.size < 4) return 0
  const tail = await file.slice(file.size - 4).arrayBuffer()
  return new DataView(tail).getUint32(0, true)
}

/**
 * Reactive wrapper around {@link RockusbDevice} for the standalone Rockchip
 * flash tool. Owns connection state, progress and a human-readable log, and
 * drives both erase and image-write (`wl`) operations.
 */
export function useRockchipErase() {
  const isSupported = computed(() => isWebUsbSupported())

  const isConnected = ref(false)
  const isBusy = ref(false)
  const isErasing = ref(false)
  const isFlashing = ref(false)
  const status = ref('Not connected')
  const mode = ref<RockusbMode | null>(null)
  const deviceInfo = ref<RockchipDeviceInfo | null>(null)
  const flashInfo = ref<FullFlashInfo | null>(null)
  const currentStorage = ref<number | null>(null)
  /** Storage the next write/erase targets. Writable so the UI can bind it. */
  const targetStorage = ref<number>(Storage.SD)
  const progress = ref(0)
  const flashProgress = ref(0)
  /** True while writing an image whose total size is unknown (show an indeterminate bar). */
  const flashIndeterminate = ref(false)
  const error = ref<string | null>(null)
  const log = ref<string[]>([])

  /** Ready once we have a flash-accessible (Loader-mode) device with geometry read. */
  const canErase = computed(() => isConnected.value && !isBusy.value && !!flashInfo.value)
  const canFlash = computed(() => isConnected.value && !isBusy.value && !isMaskrom.value)
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
        appendLog('Device is in Maskrom mode. Flash is not accessible until a loader is downloaded; erase and write are unavailable. Put the device in Loader mode and reconnect.')
        return
      }

      status.value = 'Reading flash info…'
      const info = await rk.getFlashInfo()
      flashInfo.value = info
      appendLog(`Flash: ${formatBytes(info.sizeBytes)} (${info.totalSectors.toLocaleString()} sectors), ${info.isEmmc ? 'eMMC' : info.directLba ? 'direct-LBA' : 'raw NAND'}.`)

      try {
        const active = await rk.readStorage()
        currentStorage.value = active
        if (active === Storage.EMMC || active === Storage.SD || active === Storage.SPINOR) {
          targetStorage.value = active
        }
        appendLog(`Active storage: ${STORAGE_NAMES[active] ?? `id ${active}`}.`)
      }
      catch {
        // READ_STORAGE is optional; some loaders may not implement it.
      }
      status.value = 'Ready'
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
    flashProgress.value = 0
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

  /**
   * Stream a (possibly gzip) image to the device via chunked WRITE_LBA.
   * `capacity` (the storage size in bytes) is enforced as we go, so an
   * oversized image is rejected even when `total` is unknown or unreliable
   * (gzip ISIZE wraps at 4 GiB and is only a best-effort progress hint).
   */
  async function streamImage(file: File, total: number, capacity: number): Promise<void> {
    const isGz = /\.gz$/i.test(file.name)
    let stream: ReadableStream<Uint8Array> = file.stream()
    if (isGz) stream = stream.pipeThrough(new DecompressionStream('gzip'))
    const reader = stream.getReader()

    const chunkBytes = WRITE_LBA_CHUNK_SECTORS * SECTOR_SIZE
    const staging = new Uint8Array(chunkBytes)
    let stagingLen = 0
    let sector = 0
    let written = 0

    const ensureFits = (extra: number) => {
      if (capacity > 0 && written + extra > capacity) {
        throw new Error(`Image is larger than the target storage (${formatBytes(capacity)}).`)
      }
    }
    const report = () => {
      // Stay below 100 mid-stream; flash() sets 100 only once the stream ends.
      flashProgress.value = total > 0 ? Math.min(99, Math.round((written / total) * 100)) : 0
    }

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        let offset = 0
        while (offset < value.length) {
          const take = Math.min(chunkBytes - stagingLen, value.length - offset)
          staging.set(value.subarray(offset, offset + take), stagingLen)
          stagingLen += take
          offset += take
          if (stagingLen === chunkBytes) {
            ensureFits(chunkBytes)
            await rk!.writeLba(sector, staging)
            sector += WRITE_LBA_CHUNK_SECTORS
            written += chunkBytes
            stagingLen = 0
            report()
          }
        }
      }
      // Flush the final partial chunk, zero-padded to a whole sector.
      if (stagingLen > 0) {
        ensureFits(stagingLen)
        const tail = padToSector(staging.subarray(0, stagingLen))
        await rk!.writeLba(sector, tail)
        written += stagingLen
        report()
      }
    }
    finally {
      reader.releaseLock()
    }

    if (written === 0) {
      throw new Error('The selected image is empty (no data to write).')
    }
  }

  async function flash(file: File | null): Promise<void> {
    if (!rk || !file || isMaskrom.value) return
    error.value = null
    isBusy.value = true
    isFlashing.value = true
    flashProgress.value = 0
    progress.value = 0
    flashIndeterminate.value = false
    const storageName = STORAGE_NAMES[targetStorage.value] ?? `storage ${targetStorage.value}`
    status.value = `Selecting ${storageName}…`
    appendLog(`Flashing ${file.name} to ${storageName}…`)
    try {
      await rk.changeStorage(targetStorage.value)
      currentStorage.value = targetStorage.value

      status.value = 'Reading target geometry…'
      const info = await rk.getFlashInfo()
      flashInfo.value = info

      // A raw image reports its exact size; gzip ISIZE is only a best-effort hint
      // (it wraps at 4 GiB), so for .gz the real capacity check happens during the
      // stream and the progress bar runs indeterminate when the size is unknown.
      const isGz = /\.gz$/i.test(file.name)
      const total = isGz ? await gzipUncompressedSize(file) : file.size
      flashIndeterminate.value = total <= 0
      if (!isGz) {
        if (total === 0) throw new Error('The selected image is empty.')
        if (info.sizeBytes > 0 && total > info.sizeBytes) {
          throw new Error(`Image (${formatBytes(total)}) is larger than ${storageName} (${formatBytes(info.sizeBytes)}).`)
        }
      }
      appendLog(`Writing ${total > 0 ? formatBytes(total) : 'image'} to ${storageName}…`)

      status.value = `Writing image to ${storageName}…`
      await streamImage(file, total, info.sizeBytes)

      flashProgress.value = 100
      flashIndeterminate.value = false
      status.value = 'Flash complete'
      appendLog('Image write complete. Remove USB and boot the device.')
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
    currentStorage.value = null
    progress.value = 0
    flashProgress.value = 0
    flashIndeterminate.value = false
    status.value = 'Not connected'
    appendLog('Disconnected.')
  }

  return {
    isSupported,
    isConnected: readonly(isConnected),
    isBusy: readonly(isBusy),
    isErasing: readonly(isErasing),
    isFlashing: readonly(isFlashing),
    canErase,
    canFlash,
    isMaskrom,
    status: readonly(status),
    deviceInfo: readonly(deviceInfo),
    flashInfo: readonly(flashInfo),
    currentStorage: readonly(currentStorage),
    targetStorage,
    progress: readonly(progress),
    flashProgress: readonly(flashProgress),
    flashIndeterminate: readonly(flashIndeterminate),
    error: readonly(error),
    log: readonly(log),
    connect,
    erase,
    flash,
    reset,
    disconnect,
  }
}
