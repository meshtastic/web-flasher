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
import { createDecompressedStream, detectCompression } from '~/utils/rockchip/imageStream'

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

const sleepMs = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/** Reject after `ms` if `promise` hasn't settled — WebUSB transfers have no native timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Operation timed out')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
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
  /** Loader-download (db) state for Maskrom devices. */
  const isDownloadingBoot = ref(false)
  const bootProgress = ref(0)
  /** Set when the loader ran but the browser needs a fresh user gesture to re-select it. */
  const needsReconnect = ref(false)
  const error = ref<string | null>(null)
  const log = ref<string[]>([])

  /**
   * Storage is reachable when READ_FLASH_INFO succeeded — this, not the bcdUSB
   * mode bit, is what gates erase/write. Some loaders report an even bcdUSB
   * (so look like "maskrom") yet are fully functional.
   */
  const storageReady = computed(() => isConnected.value && !!flashInfo.value)
  const canErase = computed(() => storageReady.value && !isBusy.value)
  const canFlash = computed(() => storageReady.value && !isBusy.value)
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
    needsReconnect.value = false
    status.value = 'Requesting device…'
    try {
      if (rk) {
        await rk.close().catch(() => {})
        rk = null
      }
      rk = await RockusbDevice.request()
      await rk.open()
      isConnected.value = true
      appendLog(`Connected to ${hex(rk.vendorId)}:${hex(rk.productId)} in ${rk.mode.toUpperCase()} mode.`)
      await loadDeviceInfo()
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

  /**
   * Read identity, then probe storage. We decide "loader vs maskrom" by whether
   * READ_FLASH_INFO answers (with a timeout so a true maskrom doesn't hang),
   * NOT by the bcdUSB bit — some working loaders report an even bcdUSB.
   */
  async function loadDeviceInfo(): Promise<void> {
    if (!rk) return
    mode.value = rk.mode
    deviceInfo.value = {
      vendorId: rk.vendorId,
      productId: rk.productId,
      manufacturerName: rk.device.manufacturerName,
      productName: rk.device.productName,
      serialNumber: rk.device.serialNumber,
    }
    status.value = 'Reading flash info…'
    try {
      const info = await withTimeout(rk.getFlashInfo(), 5000)
      flashInfo.value = info
      appendLog(`Flash: ${formatBytes(info.sizeBytes)} (${info.totalSectors.toLocaleString()} sectors), ${info.isEmmc ? 'eMMC' : info.directLba ? 'direct-LBA' : 'raw NAND'}.`)
      try {
        const active = await withTimeout(rk.readStorage(), 3000)
        currentStorage.value = active
        // Default to the device's active/onboard storage (what it actually
        // exposes over USB), like rkdeveloptool writes to the default storage.
        if (active > 0) targetStorage.value = active
        appendLog(`Active storage: ${STORAGE_NAMES[active] ?? `id ${active}`}.`)
      }
      catch {
        // READ_STORAGE is optional; some loaders may not implement it.
      }
      status.value = 'Ready'
    }
    catch {
      // Storage not reachable — treat as needing a loader (typical of Maskrom).
      flashInfo.value = null
      currentStorage.value = null
      status.value = 'Connected (loader required)'
      appendLog('Storage is not accessible yet (likely Maskrom). Download a loader below, or boot the board into Loader mode.')
    }
  }

  /** Download a loader (.bin) to a Maskrom device and re-acquire it as a Loader (rkdeveloptool `db`). */
  async function downloadLoader(file: File | null): Promise<void> {
    if (!rk || !file) return
    error.value = null
    isBusy.value = true
    isDownloadingBoot.value = true
    bootProgress.value = 0
    status.value = 'Downloading loader…'
    appendLog(`Downloading loader ${file.name}…`)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      await rk.downloadBoot(bytes, (done, total) => {
        bootProgress.value = total > 0 ? Math.round((done / total) * 100) : 0
      })
      bootProgress.value = 100
      appendLog('Loader sent; waiting for the device to re-enumerate…')
      status.value = 'Waiting for the loader…'
      await rk.close().catch(() => {})
      rk = null
      await sleepMs(2500) // give the loader time to come up and re-enumerate

      // Re-acquire by capability: open whatever 0x2207 device is now present and
      // see if its storage answers (the loader may report an even bcdUSB).
      const candidate = await RockusbDevice.getAuthorized()
      if (candidate) {
        try {
          rk = candidate
          await rk.open()
          isConnected.value = true
          await loadDeviceInfo()
          if (flashInfo.value) {
            needsReconnect.value = false
            appendLog(`Loader ready: ${hex(rk.vendorId)}:${hex(rk.productId)}.`)
            return
          }
        }
        catch {
          // fall through to a manual reconnect
        }
        if (rk) {
          await rk.close().catch(() => {})
          rk = null
        }
        isConnected.value = false
      }
      needsReconnect.value = true
      mode.value = null
      status.value = 'Reconnect required'
      appendLog('Could not auto-acquire the loader. Click "Connect Rockchip device" again and select the device.')
    }
    catch (err) {
      error.value = describeError(err)
      appendLog(`Loader download failed: ${error.value}`)
      status.value = 'Loader download failed'
    }
    finally {
      isDownloadingBoot.value = false
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
   * Stream an image (raw, gzip or xz) to the device via chunked WRITE_LBA.
   * Progress tracks compressed bytes consumed (so it works for every format),
   * and `capacity` (the storage size) is enforced as decompressed data is
   * written, rejecting an oversized image mid-stream.
   */
  async function streamImage(file: File, capacity: number): Promise<void> {
    const compression = detectCompression(file.name) ?? 'raw'
    let compressedRead = 0
    const counted = file.stream().pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        compressedRead += chunk.byteLength
        controller.enqueue(chunk)
      },
    }))
    const reader = (await createDecompressedStream(counted, compression)).getReader()

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
      flashProgress.value = file.size > 0 ? Math.min(99, Math.round((compressedRead / file.size) * 100)) : 0
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
    if (!rk || !file || !flashInfo.value) return
    // Supported: raw .img, gzip .img.gz, and xz .img.xz. Anything else (zip,
    // bz2, …) can't be decompressed in-browser and would write corrupt data.
    const compression = detectCompression(file.name)
    if (!compression) {
      error.value = 'Unsupported image type. Use a raw .img, gzip .img.gz, or xz .img.xz.'
      appendLog(`Flash aborted: ${error.value}`)
      return
    }
    error.value = null
    isBusy.value = true
    isFlashing.value = true
    flashProgress.value = 0
    progress.value = 0
    const storageName = STORAGE_NAMES[targetStorage.value] ?? `storage ${targetStorage.value}`
    status.value = `Selecting ${storageName}…`
    appendLog(`Flashing ${file.name} to ${storageName}…`)
    try {
      await rk.changeStorage(targetStorage.value)
      currentStorage.value = targetStorage.value

      status.value = 'Reading target geometry…'
      const info = await rk.getFlashInfo()
      flashInfo.value = info

      // Raw images report an exact size up front; compressed ones are bounded
      // against the device capacity as they stream.
      if (compression === 'raw') {
        if (file.size === 0) throw new Error('The selected image is empty.')
        if (info.sizeBytes > 0 && file.size > info.sizeBytes) {
          throw new Error(`Image (${formatBytes(file.size)}) is larger than ${storageName} (${formatBytes(info.sizeBytes)}).`)
        }
      }
      appendLog(`Writing ${file.name} (${formatBytes(file.size)}${compression === 'raw' ? '' : `, ${compression}`}) to ${storageName}…`)

      status.value = `Writing image to ${storageName}…`
      await streamImage(file, info.sizeBytes)

      flashProgress.value = 100
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

  /** Fetch a bundled loader by URL and run the db flow with it. */
  async function fetchAndDownloadLoader(url: string): Promise<void> {
    if (!rk) return
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Could not fetch bundled loader (HTTP ${res.status})`)
      const blob = await res.blob()
      await downloadLoader(new File([blob], url.split('/').pop() ?? 'loader.bin'))
    }
    catch (err) {
      error.value = describeError(err)
      appendLog(`Loader download failed: ${error.value}`)
      status.value = 'Loader download failed'
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
    isDownloadingBoot.value = false
    bootProgress.value = 0
    needsReconnect.value = false
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
    storageReady,
    status: readonly(status),
    deviceInfo: readonly(deviceInfo),
    flashInfo: readonly(flashInfo),
    currentStorage: readonly(currentStorage),
    targetStorage,
    progress: readonly(progress),
    flashProgress: readonly(flashProgress),
    isDownloadingBoot: readonly(isDownloadingBoot),
    bootProgress: readonly(bootProgress),
    needsReconnect: readonly(needsReconnect),
    error: readonly(error),
    log: readonly(log),
    connect,
    erase,
    flash,
    downloadLoader,
    fetchAndDownloadLoader,
    reset,
    disconnect,
  }
}
