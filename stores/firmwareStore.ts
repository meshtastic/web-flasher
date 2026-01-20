import {
  ESPLoader,
  type FlashOptions,
  type LoaderOptions,
  Transport,
} from 'esptool-js'
import { saveAs } from 'file-saver'
import { mande } from 'mande'
import { defineStore } from 'pinia'
import type { Terminal } from '@xterm/xterm'
import { supportsNew8MBPartitionTable } from '~/utils/versionUtils'
import { convertToBinaryString } from '~/utils/fileUtils'
import { openTerminal } from '~/utils/terminal'
import {
  currentPrerelease,
  showPrerelease,
} from '~/types/resources'

import { track } from '@vercel/analytics'
import { useSessionStorage } from '@vueuse/core'
import {
  BlobReader,
  BlobWriter,
  ZipReader,
} from '@zip.js/zip.js'

import {
  type DeviceHardware,
  type FirmwareReleases,
  type FirmwareResource,
  getCorsFriendyReleaseUrl,
} from '../types/api'

import {
  type FirmwareManifest,
  type FirmwareManifestFile,
  PARTITION_NAMES,
  PARTITION_SUBTYPES,
  type ReleaseManifest,
} from '../types/manifest'

import { createUrl } from './store'

const previews = showPrerelease ? [currentPrerelease] : []

const firmwareApi = mande(createUrl('api/github/firmware/list'))

type ZipEntryWithData = { filename: string; getData: (writer: BlobWriter) => Promise<Blob> }

function hasGetData(entry: unknown): entry is ZipEntryWithData {
  return !!entry && typeof (entry as any).getData === 'function'
}

/**
 * Fetch release notes from meshtastic.github.io
 */
async function fetchReleaseNotes(version: string): Promise<string> {
  try {
    // Remove 'v' prefix if present
    const cleanVersion = version.replace(/^v/, '')
    const url = `https://raw.githubusercontent.com/meshtastic/meshtastic.github.io/master/firmware-${cleanVersion}/release_notes.md`
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`Could not fetch release notes from ${url}`)
      return ''
    }
    return await response.text()
  }
  catch (error) {
    console.warn(`Error fetching release notes for version ${version}:`, error)
    return ''
  }
}

/**
 * Fetch the release manifest that lists all available targets for a firmware version
 * @param version - The firmware version (with or without 'v' prefix)
 * @returns The ReleaseManifest or undefined if not found
 */
async function fetchReleaseManifest(version: string): Promise<ReleaseManifest | undefined> {
  try {
    const cleanVersion = version.replace(/^v/, '')
    const url = `https://raw.githubusercontent.com/meshtastic/meshtastic.github.io/master/firmware-${cleanVersion}/firmware-${cleanVersion}.json`
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`Could not fetch release manifest from ${url}`)
      return undefined
    }
    return await response.json() as ReleaseManifest
  }
  catch (error) {
    console.warn(`Error fetching release manifest for version ${version}:`, error)
    return undefined
  }
}

/**
 * Fetch the target-specific manifest (mt.json) for a given target
 * @param version - The firmware version (with or without 'v' prefix)
 * @param targetBoard - The target board name (e.g., 'heltec-v4', 'heltec-v4-tft')
 * @returns The FirmwareManifest or undefined if not found
 */
async function fetchTargetManifest(version: string, targetBoard: string): Promise<FirmwareManifest | undefined> {
  try {
    const cleanVersion = version.replace(/^v/, '')
    const url = `https://raw.githubusercontent.com/meshtastic/meshtastic.github.io/master/firmware-${cleanVersion}/firmware-${targetBoard}-${cleanVersion}.mt.json`
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`Could not fetch target manifest from ${url}`)
      return undefined
    }
    return await response.json() as FirmwareManifest
  }
  catch (error) {
    console.warn(`Error fetching target manifest for ${targetBoard}:`, error)
    return undefined
  }
}

export const useFirmwareStore = defineStore('firmware', {
  state: () => {
    return {
      stable: new Array<FirmwareResource>(),
      alpha: new Array<FirmwareResource>(),
      previews: previews,
      pullRequests: new Array<FirmwareResource>(),
      selectedFirmware: <FirmwareResource | undefined>{},
      selectedFile: <File | undefined>{},
      baudRate: 115200,
      hasSeenReleaseNotes: false,
      shouldCleanInstall: false,
      shouldBundleWebUI: false,
      shouldInstallMui: false,
      shouldInstallInkHud: false,
      partitionScheme: <string | undefined>{},
      flashPercentDone: 0,
      isFlashing: false,
      flashingIndex: 0,
      flashingFileDescriptions: new Array<string>(),
      isReaderLocked: false,
      isConnected: false,
      port: <SerialPort | undefined>{},
      couldntFetchFirmwareApi: false,
      prereleaseUnlocked: useSessionStorage('prereleaseUnlocked', false),
      hasManifest: false,
      manifest: <FirmwareManifest | undefined>undefined,
      releaseManifest: <ReleaseManifest | undefined>undefined,
    }
  },
  getters: {
    hasOnlineFirmware: state => (state.selectedFirmware?.id || '').length > 0,
    hasFirmwareFile: state => (state.selectedFile?.name || '').length > 0,
    percentDone: state => `${state.flashPercentDone}%`,
    firmwareVersion: state => state.selectedFirmware?.id ? state.selectedFirmware.id.replace('v', '') : '.+',
    canShowFlash: state => state.selectedFirmware?.id ? state.hasSeenReleaseNotes : true,
    isZipFile: state => state.selectedFile?.name.endsWith('.zip'),
    isFactoryBin: state => state.selectedFile?.name.endsWith('.factory.bin'),
  },
  actions: {
    clearState() {
      this.shouldCleanInstall = false
      this.shouldBundleWebUI = false
      this.shouldInstallMui = false
      this.shouldInstallInkHud = false
      this.partitionScheme = undefined
      this.hasManifest = false
    },
    continueToFlash() {
      this.hasSeenReleaseNotes = true
    },
    async fetchList() {
      firmwareApi.get<FirmwareReleases>()
        .then(async (response: FirmwareReleases) => {
          // Fetch release notes for each firmware version from meshtastic.github.io
          const fetchReleaseNotesForList = async (releases: FirmwareResource[]) => {
            for (const release of releases) {
              // Only fetch if we don't already have release notes from the API
              if (!release.release_notes || release.release_notes.trim().length === 0) {
                release.release_notes = await fetchReleaseNotes(release.id)
              }
            }
          }

          // Only grab the latest 4 releases
          this.stable = response.releases.stable.slice(0, 4)
          this.alpha = response.releases.alpha.filter(f => !f.title.includes('Preview')).slice(0, 4)
          this.previews = [
            ...response.releases.alpha
              .filter(f => f.title.includes('Preview') && !f.title.includes('2.6.0')) // Exclude 2.6.0 preview
              .slice(0, 4),
            ...previews,
          ]
          this.pullRequests = response.pullRequests.slice(0, 4)

          // Fetch release notes for all versions in parallel
          await Promise.all([
            fetchReleaseNotesForList(this.stable),
            fetchReleaseNotesForList(this.alpha),
            fetchReleaseNotesForList(this.previews),
            fetchReleaseNotesForList(this.pullRequests),
          ])
        })
        .catch((error) => {
          console.error('Error fetching firmware list:', error)
          this.couldntFetchFirmwareApi = true
        })
    },
    async setSelectedFirmware(firmware: FirmwareResource) {
      this.selectedFirmware = firmware
      this.selectedFile = undefined
      this.hasSeenReleaseNotes = false
      // Store current MUI setting before clearing state
      const currentMuiSetting = this.shouldInstallMui
      this.clearState()
      // Restore MUI setting if it was enabled (for devices that support it)
      this.shouldInstallMui = currentMuiSetting
      this.hasManifest = false
      this.manifest = undefined
      this.releaseManifest = undefined

      // Fetch the release manifest that lists all available targets
      if (firmware.id) {
        const releaseManifest = await fetchReleaseManifest(firmware.id)
        if (releaseManifest) {
          this.releaseManifest = releaseManifest
          console.log(`Loaded release manifest for ${firmware.id} with ${releaseManifest.targets.length} targets`)
        }
      }

      // Update Datadog RUM context with firmware version
      if (import.meta.client) {
        try {
          const { datadogRum } = await import('@datadog/browser-rum')
          datadogRum.setGlobalContextProperty('firmware_version', firmware.id)
        }
        catch (error) {
          console.error('Error setting Datadog RUM context:', error)
        }
      }
    },
    getReleaseFileUrl(fileName: string): string {
      if (!this.selectedFirmware?.zip_url) return ''
      const baseUrl = getCorsFriendyReleaseUrl(this.selectedFirmware.zip_url)
      return `${baseUrl}/${fileName}`
    },
    async downloadUf2FileSystem(searchRegex: RegExp) {
      if (!this.selectedFile) return
      const reader = new BlobReader(this.selectedFile)
      const zipReader = new ZipReader(reader)
      const entries = await zipReader.getEntries() as unknown as ZipEntryWithData[]
      console.log('Zip entries:', entries)
      const file = entries.find(entry => searchRegex.test(entry.filename))
      if (file) {
        if (hasGetData(file)) {
          const data = await file.getData(new BlobWriter())
          saveAs(data, file.filename)
        }
        else {
          throw new Error(`Could not find file with pattern ${searchRegex} in zip`)
        }
      }
      else {
        throw new Error(`Could not find file with pattern ${searchRegex} in zip`)
      }
      zipReader.close()
    },
    async setFirmwareFile(file: File) {
      this.selectedFile = file
      this.selectedFirmware = undefined
      // Store current MUI setting before clearing state
      const currentMuiSetting = this.shouldInstallMui
      this.clearState()
      // Restore MUI setting if it was enabled (for devices that support it)
      this.shouldInstallMui = currentMuiSetting
      this.hasManifest = false
    },
    async updateEspFlashLegacy(fileName: string, selectedTarget: DeviceHardware) {
      const terminal = await openTerminal()

      try {
        console.log(`Legacy update flash: ${fileName} at offset 0x10000`)
        this.port = await navigator.serial.requestPort({})
        this.isConnected = true
        this.port.ondisconnect = () => {
          this.isConnected = false
        }
        const transport = new Transport(this.port, true)
        const espLoader = await this.connectEsp32(transport, terminal)
        const content = await this.fetchBinaryContent(fileName)
        this.isFlashing = true
        const flashOptions: FlashOptions = {
          fileArray: [{ data: content, address: 0x10000 }],
          flashSize: 'keep',
          eraseAll: false,
          compress: true,
          flashMode: 'keep',
          flashFreq: 'keep',
          reportProgress: (fileIndex, written, total) => {
            this.flashPercentDone = Math.round((written / total) * 100)
            if (written === total) {
              this.isFlashing = false
              console.log('Done flashing!')
              this.trackDownload(selectedTarget, true)
            }
          },
        }
        await this.startWrite(terminal, espLoader, transport, flashOptions)
      }
      catch (error: any) {
        this.handleError(error, terminal)
      }
    },
    handleError(error: Error, terminal: Terminal) {
      console.error('Error flashing:', error)
      terminal.writeln('')
      terminal.writeln(`\x1b[38;5;9m${error}\x1b[0m`)
    },
    /**
     * Get the partition offset from the manifest for a given partition name
     * @param partName - The partition name (e.g., 'app0', 'app1', 'spiffs')
     * @returns The offset as a number, or undefined if not found
     */
    getPartitionOffset(partName: string): number | undefined {
      if (!this.manifest?.part) return undefined
      let partition = this.manifest.part.find(p => p.name === partName)

      // Some manifests use different partition names (e.g., 'app' instead of 'app0',
      // 'flashApp' instead of 'app1'). Fall back to searching by OTA subtype.
      if (!partition && partName === PARTITION_NAMES.APP0) {
        partition = this.manifest.part.find(p => p.subtype === PARTITION_SUBTYPES.OTA_0)
      }
      if (!partition && partName === PARTITION_NAMES.APP1) {
        partition = this.manifest.part.find(p => p.subtype === PARTITION_SUBTYPES.OTA_1)
      }

      if (!partition) return undefined
      // Parse hex string offset (e.g., "0x10000") to number
      return parseInt(partition.offset, 16)
    },
    /**
     * Find a file in the manifest by its partition name
     * @param partName - The partition name to search for (e.g., 'app0', 'app1', 'spiffs')
     * @returns The FirmwareManifestFile or undefined if not found
     */
    findFileByPartName(partName: string): FirmwareManifestFile | undefined {
      if (!this.manifest?.files) return undefined
      return this.manifest.files.find(f => f.part_name === partName)
    },
    /**
     * Find the factory binary file in the manifest (convention: ends with .factory.bin)
     * @returns The FirmwareManifestFile or undefined if not found
     */
    findFactoryFile(): FirmwareManifestFile | undefined {
      if (!this.manifest?.files) return undefined
      return this.manifest.files.find(f => f.name.endsWith('.factory.bin'))
    },
    /**
     * Find app0 (firmware) file by convention name pattern
     * @returns The FirmwareManifestFile or undefined if not found
     */
    findAppFileByConvention(): FirmwareManifestFile | undefined {
      if (!this.manifest?.files) return undefined
      // Look for firmware-*.bin pattern
      return this.manifest.files.find(f => f.name.match(/^firmware-.*\.bin$/) && !f.name.endsWith('.factory.bin'))
    },
    /**
     * Find OTA (app1) file by convention name pattern
     * @returns The FirmwareManifestFile or undefined if not found
     */
    findOtaFileByConvention(): FirmwareManifestFile | undefined {
      if (!this.manifest?.files) return undefined
      // Look for known OTA payload names:
      // - legacy: bleota.bin / bleota-s3.bin
      // - manifest-driven: mt-esp32*-ota.bin
      return this.manifest.files.find(f => /^bleota(-s3)?\.bin$/.test(f.name) || /^mt-.*-ota\.bin$/.test(f.name))
    },
    /**
     * Find SPIFFS/littlefs file by convention name pattern
     * @returns The FirmwareManifestFile or undefined if not found
     */
    findSpiffsFileByConvention(): FirmwareManifestFile | undefined {
      if (!this.manifest?.files) return undefined
      // Look for littlefs*.bin pattern (littlefs-*.bin or littlefswebui-*.bin)
      return this.manifest.files.find(f => f.name.match(/^littlefswebui?-.*\.bin$/))
    },
    /**
     * Check if a target board exists in the release manifest
     * @param targetBoard - The target board name (e.g., 'heltec-v4', 'heltec-v4-tft')
     * @returns True if the target exists in the release manifest
     */
    isTargetAvailable(targetBoard: string): boolean {
      if (!this.releaseManifest?.targets) return false
      return this.releaseManifest.targets.some(t => t.board === targetBoard)
    },
    /**
     * Load the target-specific manifest for a given target board
     * This should be called before flashing when variant options (MUI/InkHUD) are selected
     * @param targetBoard - The target board name (e.g., 'heltec-v4', 'heltec-v4-tft')
     * @returns True if the manifest was loaded successfully
     */
    async loadTargetManifest(targetBoard: string): Promise<boolean> {
      if (!this.selectedFirmware?.id) {
        console.error('No firmware selected')
        return false
      }

      // Check if the target exists in the release manifest
      if (this.releaseManifest && !this.isTargetAvailable(targetBoard)) {
        console.warn(`Target ${targetBoard} is not available in release manifest, falling back to legacy flashing`)
        this.manifest = undefined
        this.hasManifest = false
        return false
      }

      // Fetch the target-specific manifest
      const manifest = await fetchTargetManifest(this.selectedFirmware.id, targetBoard)
      if (manifest) {
        this.manifest = manifest
        this.hasManifest = true
        console.log(`Loaded target manifest for ${targetBoard}`)
        return true
      }
      else {
        console.warn(`Could not load target manifest for ${targetBoard}, falling back to legacy flashing`)
        this.manifest = undefined
        this.hasManifest = false
        return false
      }
    },
    /**
     * Manifest-driven update flash for ESP32
     * Uses the manifest's files[] array with part_name to determine file names
     * Uses the manifest's part[] array to determine partition offsets
     */
    async updateEspFlash(selectedTarget: DeviceHardware) {
      if (!this.manifest) {
        throw new Error('Cannot use manifest-driven flash without a loaded manifest')
      }

      const terminal = await openTerminal()

      try {
        const filesToFlash: Array<{ data: string, address: number }> = []
        const fileDescriptions: string[] = []

        // Find the app0 file (main firmware binary)
        let appFile = this.findFileByPartName(PARTITION_NAMES.APP0)
        if (!appFile) {
          appFile = this.findAppFileByConvention()
        }
        const appOffset = this.getPartitionOffset(PARTITION_NAMES.APP0)
        if (appFile && appOffset !== undefined) {
          const appContent = await this.fetchBinaryContent(appFile.name)
          filesToFlash.push({ data: appContent, address: appOffset })
          fileDescriptions.push('Flashing app')
          console.log(`App0: ${appFile.name} at offset 0x${appOffset.toString(16)}`)
        }
        else {
          console.error(`Could not find app0 file or partition offset in manifest`)
        }

        // Find the OTA file (app1 partition)
        let otaFile = this.findFileByPartName(PARTITION_NAMES.APP1)
        if (!otaFile) {
          otaFile = this.findOtaFileByConvention()
        }
        const otaOffset = this.getPartitionOffset(PARTITION_NAMES.APP1)
        if (otaFile && otaOffset !== undefined) {
          const otaContent = await this.fetchBinaryContent(otaFile.name)
          filesToFlash.push({ data: otaContent, address: otaOffset })
          fileDescriptions.push('Flashing OTA')
          console.log(`App1 (OTA): ${otaFile.name} at offset 0x${otaOffset.toString(16)}`)
        }
        else {
          console.error(`Could not find app1 (OTA) file or partition offset in manifest`)
        }
        
        this.flashingFileDescriptions = fileDescriptions

        if (filesToFlash.length === 0) {
          throw new Error('No files found to flash')
        }

        this.port = await navigator.serial.requestPort({})
        this.isConnected = true
        this.port.ondisconnect = () => {
          this.isConnected = false
        }
        const transport = new Transport(this.port, true)
        const espLoader = await this.connectEsp32(transport, terminal)
        this.isFlashing = true
        let lastFileIndex = -1
        const flashOptions: FlashOptions = {
          fileArray: filesToFlash,
          flashSize: 'keep',
          eraseAll: false,
          compress: true,
          flashMode: 'keep',
          flashFreq: 'keep',
          reportProgress: (fileIndex, written, total) => {
            this.flashingIndex = fileIndex
            if (fileIndex !== lastFileIndex && fileIndex < this.flashingFileDescriptions.length) {
              terminal.writeln(`\x1b[33m${this.flashingFileDescriptions[fileIndex]}...\x1b[0m`)
              lastFileIndex = fileIndex
            }
            this.flashPercentDone = Math.round((written / total) * 100)
            if (written === total) {
              this.isFlashing = false
              console.log('Done flashing!')
              this.trackDownload(selectedTarget, false)
            }
          },
        }
        await this.startWrite(terminal, espLoader, transport, flashOptions)
      }
      catch (error: any) {
        this.handleError(error, terminal)
      }
    },
    /**
     * Manifest-driven clean install flash for ESP32
     * Uses the manifest's files[] array with part_name to determine file names
     * Uses the manifest's part[] array to determine partition offsets
     * Preserves .factory.bin convention for the combined binary
     */
    async cleanInstallEspFlash(selectedTarget: DeviceHardware) {
      if (!this.manifest) {
        throw new Error('Cannot use manifest-driven flash without a loaded manifest')
      }

      const terminal = await openTerminal()

      try {
        const filesToFlash: Array<{ data: string, address: number }> = []
        const fileDescriptions: string[] = []

        // Find the factory binary (combined binary for clean install)
        const factoryFile = this.findFactoryFile()
        if (factoryFile) {
          const appContent = await this.fetchBinaryContent(factoryFile.name)
          filesToFlash.push({ data: appContent, address: 0x00 })
          fileDescriptions.push('Flashing factory app')
          console.log(`Factory: ${factoryFile.name} at offset 0x00`)
        }
        else {
          console.error('Could not find factory binary (.factory.bin) in manifest')
        }

        // Find the OTA binary (app1 partition)
        let otaFile = this.findFileByPartName(PARTITION_NAMES.APP1)
        if (!otaFile) {
          otaFile = this.findOtaFileByConvention()
        }
        const otaOffset = this.getPartitionOffset(PARTITION_NAMES.APP1)
        if (otaFile && otaOffset !== undefined) {
          const otaContent = await this.fetchBinaryContent(otaFile.name)
          filesToFlash.push({ data: otaContent, address: otaOffset })
          fileDescriptions.push('Flashing OTA app')
          console.log(`OTA: ${otaFile.name} at offset 0x${otaOffset.toString(16)}`)
        }
        else {
          console.error(`Could not find OTA file or partition offset for '${PARTITION_NAMES.APP1}' in manifest`)
        }

        // Find the LittleFS/SPIFFS binary
        let spiffsFile = this.findFileByPartName(PARTITION_NAMES.SPIFFS)
        if (!spiffsFile) {
          spiffsFile = this.findSpiffsFileByConvention()
        }
        const spiffsOffset = this.getPartitionOffset(PARTITION_NAMES.SPIFFS)
        if (spiffsFile && spiffsOffset !== undefined) {
          const spiffsContent = await this.fetchBinaryContent(spiffsFile.name)
          filesToFlash.push({ data: spiffsContent, address: spiffsOffset })
          fileDescriptions.push('Flashing filesystem')
          console.log(`SPIFFS: ${spiffsFile.name} at offset 0x${spiffsOffset.toString(16)}`)
        }
        else {
          console.error(`Could not find SPIFFS file or partition offset for '${PARTITION_NAMES.SPIFFS}' in manifest`)
        }
        
        this.flashingFileDescriptions = fileDescriptions

        if (filesToFlash.length === 0) {
          throw new Error('No files found to flash')
        }

        this.port = await navigator.serial.requestPort({})
        this.isConnected = true
        this.port.ondisconnect = () => {
          this.isConnected = false
        }
        const transport = new Transport(this.port, true)
        const espLoader = await this.connectEsp32(transport, terminal)

        this.isFlashing = true
        let lastFileIndex = -1
        const flashOptions: FlashOptions = {
          fileArray: filesToFlash,
          flashSize: 'keep',
          eraseAll: true,
          compress: true,
          flashMode: 'keep',
          flashFreq: 'keep',
          reportProgress: (fileIndex, written, total) => {
            this.flashingIndex = fileIndex
            if (fileIndex !== lastFileIndex && fileIndex < this.flashingFileDescriptions.length) {
              terminal.writeln(`\x1b[33m${this.flashingFileDescriptions[fileIndex]}...\x1b[0m`)
              lastFileIndex = fileIndex
            }
            this.flashPercentDone = Math.round((written / total) * 100)
            if (written === total && fileIndex > 1) {
              this.isFlashing = false
              console.log('Done flashing!')
              this.trackDownload(selectedTarget, true)
            }
          },
        }
        await this.startWrite(terminal, espLoader, transport, flashOptions)
      }
      catch (error: any) {
        this.handleError(error, terminal)
      }
    },
    async startWrite(terminal: Terminal, espLoader: ESPLoader, transport: Transport, flashOptions: FlashOptions) {
      await espLoader.writeFlash(flashOptions)
      
      // Perform hard reset to boot the chip (esptool-js method)
      await espLoader.after('hard_reset')
      
      // Disconnect the esptool transport to release the reader lock
      try {
        await transport.disconnect()
        await transport.waitForUnlock(1500)
      }
      catch (e) {
        console.warn('Error disconnecting transport:', e)
      }
      
      // Small delay to let the chip boot
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Reopen the port at application baud rate (115200) and read serial output
      if (this.port) {
        try {
          await this.port.open({ baudRate: 115200 })
          await this.readSerial(this.port, terminal)
        }
        catch (e) {
          console.warn('Error reopening port for serial monitor:', e)
        }
      }
      else {
        throw new Error('Serial port is not defined')
      }
    },
    async resetEsp32(transport: Transport) {
      // Classic reset sequence to boot the chip after flashing
      // Based on esptool-js ClassicReset strategy
      await transport.setDTR(false)  // IO0=HIGH
      await transport.setRTS(true)   // EN=LOW (chip in reset)
      await new Promise(resolve => setTimeout(resolve, 100))
      await transport.setDTR(true)   // IO0=LOW (not needed for normal boot, but part of sequence)
      await transport.setRTS(false)  // EN=HIGH (chip out of reset - starts booting)
      await new Promise(resolve => setTimeout(resolve, 50))
      await transport.setDTR(false)  // IO0=HIGH (ensure normal boot mode, not download mode)
    },
    trackDownload(selectedTarget: DeviceHardware, isCleanInstall: boolean) {
      if (selectedTarget.hwModelSlug?.length > 0) {
        // Vercel Analytics tracking
        track('Download', {
          hardwareModel: selectedTarget.hwModelSlug,
          arch: selectedTarget.architecture,
          cleanInstall: isCleanInstall,
          version: this.selectedFirmware?.id || '',
          count: 1,
        })

        // Datadog tracking - both RUM and Logs for comprehensive coverage
        if (import.meta.client) {
          const flashData = {
            firmware_version: this.selectedFirmware?.id || '',
            hw_model: selectedTarget.hwModel,
            hw_model_slug: selectedTarget.hwModelSlug,
            platformio_target: selectedTarget.platformioTarget,
            architecture: selectedTarget.architecture,
            clean_install: isCleanInstall,
            support_level: selectedTarget.supportLevel || 3,
            has_mui: selectedTarget.hasMui || false,
            partition_scheme: this.partitionScheme || 'default',
            partition_table_version: this.partitionScheme === '8MB' && selectedTarget.hasMui && supportsNew8MBPartitionTable(this.firmwareVersion) ? 'new-8mb' : 'legacy',
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            url: window.location.href,
          }

          // RUM Action (for user experience correlation, subject to sampling)
          import('@datadog/browser-rum').then(({ datadogRum }) => {
            datadogRum.addAction('firmware_flash', flashData)
          }).catch((error) => {
            console.warn('Datadog RUM not available for flash tracking:', error)
          })

          // Datadog Logs (for precise counting, no sampling)
          import('@datadog/browser-logs').then(({ datadogLogs }) => {
            datadogLogs.logger.info('Firmware flash completed', {
              event_type: 'firmware_flash',
              ...flashData,
            })
          }).catch((error) => {
            console.warn('Datadog Logs not available for flash tracking:', error)
          })
        }
      }
    },
    async cleanInstallEspFlashLegacy(fileName: string, otaFileName: string, littleFsFileName: string, selectedTarget: DeviceHardware) {
      const terminal = await openTerminal()

      try {
        this.port = await navigator.serial.requestPort({})
        this.isConnected = true
        this.port.ondisconnect = () => {
          this.isConnected = false
        }
        const transport = new Transport(this.port, true)
        const espLoader = await this.connectEsp32(transport, terminal)
        const appContent = await this.fetchBinaryContent(fileName)
        const otaContent = await this.fetchBinaryContent(otaFileName)
        const littleFsContent = await this.fetchBinaryContent(littleFsFileName)

        // Log the files being flashed
        console.log(`Legacy clean install: ${fileName} at offset 0x00`)
        console.log(`Legacy clean install: ${otaFileName} (offset will be determined by partition scheme)`)
        console.log(`Legacy clean install: ${littleFsFileName} (offset will be determined by partition scheme)`)

        let otaOffset = 0x260000
        let spiffsOffset = 0x300000

        if (this.partitionScheme == '8MB') {
          // Check if this is a TFT (MUI) device with firmware 2.7.9+ that should use the new partition table
          const isTftDevice = selectedTarget.hasMui === true
          const useNewPartitionTable = isTftDevice && supportsNew8MBPartitionTable(this.firmwareVersion)

          console.log(`8MB partition selection: TFT device: ${isTftDevice}, Firmware: ${this.firmwareVersion}, Use new table: ${useNewPartitionTable}`)

          if (useNewPartitionTable) {
            // New 8MB partition table for TFT devices (firmware 2.7.9+)
            // Based on: https://github.com/meshtastic/firmware/blob/d43bd7f45b1c19d95288b5589adda2c0ef117bc4/partition-table-8MB.csv
            // flashApp (ota_1): 0x5D0000, spiffs: 0x670000
            otaOffset = 0x5D0000
            spiffsOffset = 0x670000
            console.log(`Using new 8MB partition table: OTA at 0x${otaOffset.toString(16)}, SPIFFS at 0x${spiffsOffset.toString(16)}`)
          }
          else {
            // Legacy 8MB partition table
            otaOffset = 0x340000
            spiffsOffset = 0x670000
            console.log(`Using legacy 8MB partition table: OTA at 0x${otaOffset.toString(16)}, SPIFFS at 0x${spiffsOffset.toString(16)}`)
          }
        }
        else if (this.partitionScheme == '16MB') {
          // 16mb
          otaOffset = 0x650000
          spiffsOffset = 0xc90000
          console.log(`Using 16MB partition table: OTA at 0x${otaOffset.toString(16)}, SPIFFS at 0x${spiffsOffset.toString(16)}`)
        }

        // Log the final flash offsets
        console.log(`Flashing ${otaFileName} at offset 0x${otaOffset.toString(16)}`)
        console.log(`Flashing ${littleFsFileName} at offset 0x${spiffsOffset.toString(16)}`)

        this.isFlashing = true
        const flashOptions: FlashOptions = {
          fileArray: [
            { data: appContent, address: 0x00 },
            { data: otaContent, address: otaOffset },
            { data: littleFsContent, address: spiffsOffset },
          ],
          flashSize: 'keep',
          eraseAll: true,
          compress: true,
          flashMode: 'keep',
          flashFreq: 'keep',
          reportProgress: (fileIndex, written, total) => {
            this.flashingIndex = fileIndex
            this.flashPercentDone = Math.round((written / total) * 100)
            if (written === total && fileIndex > 1) {
              this.isFlashing = false
              console.log('Done flashing!')
              this.trackDownload(selectedTarget, true)
            }
          },
        }
        await this.startWrite(terminal, espLoader, transport, flashOptions)
      }
      catch (error: any) {
        this.handleError(error, terminal)
      }
    },
    async fetchBinaryContent(fileName: string): Promise<string> {
      if (this.selectedFirmware?.zip_url) {
        const baseUrl = getCorsFriendyReleaseUrl(this.selectedFirmware.zip_url)
        const response = await fetch(`${baseUrl}/${fileName}`)
        const blob = await response.blob()
        const data = await blob.arrayBuffer()
        return convertToBinaryString(new Uint8Array(data))
      }
      if (this.selectedFile && this.isZipFile) {
        const reader = new BlobReader(this.selectedFile)
        const zipReader = new ZipReader(reader)
        const entries = await zipReader.getEntries() as unknown as ZipEntryWithData[]
        console.log('Zip entries:', entries)
        console.log('Looking for file matching pattern:', fileName)
        const file = entries.find((entry) => {
          if (fileName.startsWith('firmware-tbeam-.'))
            return !entry.filename.includes('s3') && new RegExp(fileName).test(entry.filename) && (fileName.endsWith('update.bin') === entry.filename.endsWith('update.bin'))
          return new RegExp(fileName).test(entry.filename) && (fileName.endsWith('update.bin') === entry.filename.endsWith('update.bin'))
        })
        if (file) {
          console.log('Found file:', file.filename)
          if (hasGetData(file)) {
            const blob = await file.getData(new BlobWriter())
            const arrayBuffer = await blob.arrayBuffer()
            return convertToBinaryString(new Uint8Array(arrayBuffer))
          }
          throw new Error(`Could not find file with pattern ${fileName} in zip`)
        }
      }
      else if (this.selectedFile && !this.isZipFile) {
        const buffer = await this.selectedFile.arrayBuffer()
        return convertToBinaryString(new Uint8Array(buffer))
      }
      throw new Error('Cannot fetch binary content without a file or firmware selected')
    },
    async connectEsp32(transport: Transport, terminal: Terminal): Promise<ESPLoader> {
      const loaderOptions = <LoaderOptions>{
        transport,
        baudrate: this.baudRate,
        enableTracing: false,
        terminal: {
          clean() {
            terminal.clear()
          },
          writeLine(data) {
            terminal.writeln(data)
          },
          write(data) {
            terminal.write(data)
          },
        },
      }
      const espLoader = new ESPLoader(loaderOptions)
      const chip = await espLoader.main()
      console.log('Detected chip:', chip)
      return espLoader
    },
    async readSerial(port: SerialPort, terminal: Terminal): Promise<void> {
      if (!port.readable) {
        throw new Error('Serial port is not readable')
      }
      if (this.isReaderLocked || port.readable.locked) {
        console.warn('Serial reader already locked; skipping duplicate read request')
        return
      }

      this.isReaderLocked = true
      const reader = port.readable.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          if (value) {
            terminal.write(decoder.decode(value, { stream: true }))
          }
          await new Promise(resolve => setTimeout(resolve, 5))
        }
      }
      finally {
        reader.releaseLock()
        this.isReaderLocked = false
      }
    },
  },
})
