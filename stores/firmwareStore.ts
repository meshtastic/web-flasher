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
  eventMode,
} from '~/types/resources'
import {
  getFirmwareBaseUrl,
  GITHUB_IO_BASE,
  NIGHTLY_DIR,
  nightlyState,
  setNightlyVersion,
} from '~/utils/firmwareUrl'
import { findUnlockNightly } from '~/utils/unsupportedDevices'
import {
  addRumAction,
  boardAttributes,
  classifyFlashError,
  eventAttributes,
  type FirmwareChannel,
  type FlashMethod,
  logTelemetry,
  resolveFirmwareChannel,
  setTelemetryContext,
} from '~/utils/telemetry'

import { track } from '@vercel/analytics'
import { useSessionStorage } from '@vueuse/core'
import { extractZipEntry } from '~/utils/zipUtils'
import { buildPrReleaseNotes } from '~/utils/prBuild'
import { t } from '~/utils/i18n'

import type {
  DeviceHardware,
  FirmwareReleases,
  FirmwareResource,
  PrBuildResponse,
} from '../types/api'

import {
  type FirmwareManifest,
  type FirmwareManifestFile,
  PARTITION_NAMES,
  PARTITION_SUBTYPES,
  type ReleaseManifest,
} from '../types/manifest'

import { createUrl } from './store'
import { useToastStore } from './toastStore'

const previews = showPrerelease ? [currentPrerelease] : []

const firmwareApi = mande(createUrl('api/github/firmware/list'))

// In-flight PR artifact downloads, keyed by architecture. Kept outside the
// store state so the promises are not made reactive.
const prZipPromises = new Map<string, Promise<Blob>>()

// Attributes of the flash currently in progress, captured at flash_start so the
// success/error actions describe the same attempt. Outside state for the same
// reason as above — it is telemetry bookkeeping, not UI state.
let activeFlash: Record<string, unknown> | undefined

/**
 * Fetch release notes from meshtastic.github.io
 */
async function fetchReleaseNotes(version: string): Promise<string> {
  try {
    const url = `${getFirmwareBaseUrl(version)}/release_notes.md`
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
    const url = `${getFirmwareBaseUrl(version)}/firmware-${cleanVersion}.json`
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
    const url = `${getFirmwareBaseUrl(version)}/firmware-${targetBoard}-${cleanVersion}.mt.json`
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
      nightly: new Array<FirmwareResource>(),
      pullRequests: new Array<FirmwareResource>(),
      prFirmware: <FirmwareResource | undefined>undefined,
      prDeepLinkPending: false,
      prZipBlobs: <Record<string, Blob>>{},
      prActiveArch: <string | undefined>undefined,
      prDownload: <{ arch: string, received: number, total: number } | undefined>undefined,
      // Bumped each time a PR build is loaded so in-flight downloads from a
      // previous selection can detect they are stale and skip store writes
      prGeneration: 0,
      selectedFirmware: eventMode.enabled ? eventMode.firmware : <FirmwareResource | undefined>{},
      selectedFile: <File | undefined>undefined,
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
      // Konami code: retro theme, chirpy flash background, and the boards the
      // registry hides as not activelySupported (see unlockNightly).
      konamiUnlocked: useSessionStorage('konamiUnlocked', false),
      hasManifest: false,
      manifest: <FirmwareManifest | undefined>undefined,
      releaseManifest: <ReleaseManifest | undefined>undefined,
      eventModeEnabled: eventMode.enabled,
    }
  },
  getters: {
    hasOnlineFirmware: state => (state.selectedFirmware?.id || '').length > 0,
    hasFirmwareFile: state => (state.selectedFile?.name || '').length > 0,
    isPrBuild: state => !!state.selectedFirmware?.prBuild,
    prDownloadPercent: state => state.prDownload ? Math.round((state.prDownload.received / Math.max(state.prDownload.total, 1)) * 100) : 0,
    /**
     * Whether the selected PR build includes firmware for a device target.
     * Accepts variant-only boards (e.g. only the -tft env was built) so the
     * Flash button stays enabled; the exact lookup happens at flash time.
     */
    isPrTargetAvailable: state => (pioTarget: string): boolean => {
      const targets = state.selectedFirmware?.prBuild?.targets
      if (!targets) return false
      return targets.some(t => t.board === pioTarget || t.board === `${pioTarget}-tft` || t.board === `${pioTarget}-inkhud`)
    },
    percentDone: state => `${state.flashPercentDone}%`,
    /**
     * Which section the selected firmware came from (stable / alpha / preview /
     * nightly / pr / event / local upload). Reported with every funnel action so
     * flash success rates can be split by release channel.
     */
    firmwareChannel(state): FirmwareChannel {
      return resolveFirmwareChannel({
        firmware: state.selectedFirmware,
        hasLocalFile: (state.selectedFile?.name || '').length > 0,
        isEventMode: eventMode.enabled,
        nightlyId: nightlyState.id,
        alphaIds: state.alpha.map(f => f.id),
        previewIds: state.previews.map(f => f.id),
      })
    },
    /**
     * The nightly that boards hidden as not activelySupported may be flashed
     * with, once the Konami code has revealed them. Undefined before the
     * nightly index resolves, in event mode (pinned to a single build), and for
     * any nightly below the series floor - each of which keeps those boards out
     * of the picker, so a revealed board always has something to flash.
     */
    unlockNightly(state): FirmwareResource | undefined {
      if (eventMode.enabled) return undefined
      return findUnlockNightly(state.nightly)
    },
    /** Whether the picker should reveal the boards the registry hides. */
    unsupportedDevicesUnlocked(): boolean {
      return this.konamiUnlocked && !!this.unlockNightly
    },
    firmwareVersion: state => state.selectedFirmware?.id ? state.selectedFirmware.id.replace('v', '') : '.+',
    canShowFlash: state => state.selectedFirmware?.id ? state.hasSeenReleaseNotes : true,
    // Guard the name too, not just the file: a File is only ever set from a real
    // upload, but reading these before one exists must not throw — they are
    // evaluated from watchers and render (see components/targets/Esp32.vue).
    isZipFile: state => (state.selectedFile?.name || '').endsWith('.zip'),
    isFactoryBin: state => (state.selectedFile?.name || '').endsWith('.factory.bin'),
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
      // Skip fetching firmware list in event mode - use locked firmware only
      if (eventMode.enabled) {
        console.log('Event mode enabled, skipping firmware API fetch')
        // The locked build is pre-seeded into state, so setSelectedFirmware()
        // never runs for it — and that is the only place the release manifest is
        // fetched. Without it every event flash falls through to the legacy
        // convention-based path, which uses stale partition offsets and asks for
        // bleota*.bin (gone since 2.8). Resolve it here so event domains take the
        // same manifest-driven path as flash.meshtastic.org.
        if (eventMode.firmware?.id && !this.releaseManifest) {
          await this.setSelectedFirmware(eventMode.firmware)
        }
        return
      }

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
    /**
     * Discover the current develop "nightly" build published to
     * meshtastic.github.io/firmware-nightly/. Skipped entirely in event mode
     * (never on event firmwares).
     */
    async fetchNightly() {
      if (eventMode.enabled) return
      try {
        const response = await fetch(`${GITHUB_IO_BASE}/${NIGHTLY_DIR}/index.json`)
        if (!response.ok) return // 404 before the first nightly is published -> no section
        const data = await response.json() as { version?: string, id?: string, title?: string }
        const id = data.id ?? (data.version ? `v${data.version}` : undefined)
        if (!id) {
          console.warn('Nightly index.json missing id/version', data)
          return // malformed pointer -> don't surface a broken entry
        }
        setNightlyVersion(id) // register so getManifestBasePath routes it to firmware-nightly/
        const version = id.replace(/^v/, '')
        this.nightly = [{
          id,
          title: data.title ?? `Meshtastic Firmware ${version} Nightly`,
        }]
      }
      catch (error) {
        console.warn('No nightly build available', error)
      }
    },
    /**
     * Load a pull request's CI build as a selectable firmware version.
     * Resolves PR metadata and artifact info through the API origin
     * (API_ORIGIN — see stores/store.ts).
     * @param prNumber - The meshtastic/firmware pull request number
     * @returns True if the PR build was loaded and selected
     */
    async loadPrFirmware(prNumber: number): Promise<boolean> {
      const toastStore = useToastStore()
      this.prDeepLinkPending = true
      try {
        const response = await fetch(createUrl(`api/github/firmware/pr/${prNumber}`))
        if (!response.ok) {
          let errorCode = ''
          try {
            errorCode = (await response.json())?.error ?? ''
          }
          catch {
            // Non-JSON error body
          }
          const message = errorCode === 'pr_not_found'
            ? t('firmware.pr.not_found')
            : errorCode === 'artifacts_expired'
              ? t('firmware.pr.expired')
              : errorCode === 'no_successful_run' || errorCode === 'no_artifacts'
                ? t('firmware.pr.no_build')
                : t('firmware.pr.load_failed')
          toastStore.error(t('firmware.pr.title', { pr: prNumber }), message)
          return false
        }
        const data = await response.json() as PrBuildResponse
        const prFirmware: FirmwareResource = {
          id: `v${data.version}`,
          title: `${t('firmware.pr.title', { pr: data.pr.number })} (${data.version})`,
          page_url: data.pr.page_url,
          release_notes: buildPrReleaseNotes(data),
          prBuild: {
            prNumber: data.pr.number,
            prTitle: data.pr.title,
            pageUrl: data.pr.page_url,
            author: data.pr.author,
            headSha: data.pr.head_sha,
            runId: data.run_id,
            version: data.version,
            expiresAt: data.expires_at,
            artifacts: data.artifacts,
            targets: data.targets,
          },
        }
        this.prFirmware = prFirmware
        this.prZipBlobs = {}
        prZipPromises.clear()
        this.prActiveArch = undefined
        // Invalidate any artifact download still in flight from a prior selection
        this.prGeneration++
        await this.setSelectedFirmware(prFirmware)
        toastStore.info(t('firmware.pr.title', { pr: prNumber }), t('firmware.pr.loaded', { pr: prNumber }))
        return true
      }
      catch (error) {
        console.error(`Error loading PR build ${prNumber}:`, error)
        toastStore.error(t('firmware.pr.title', { pr: prNumber }), t('firmware.pr.load_failed'))
        return false
      }
      finally {
        this.prDeepLinkPending = false
      }
    },
    /**
     * Download (and cache) the per-architecture artifact zip for the selected
     * PR build. Concurrent calls for the same arch share one download.
     * @param arch - Artifact architecture (e.g. 'esp32s3', 'nrf52840')
     */
    async getPrArchZip(arch: string): Promise<Blob> {
      const cachedZip = this.prZipBlobs[arch]
      if (cachedZip) return cachedZip
      const inflight = prZipPromises.get(arch)
      if (inflight) return inflight

      const prBuild = this.selectedFirmware?.prBuild
      if (!prBuild) {
        throw new Error('No PR build selected')
      }
      const toastStore = useToastStore()
      const artifact = prBuild.artifacts.find(a => a.arch === arch)
      if (!artifact) {
        toastStore.error(t('firmware.pr.title', { pr: prBuild.prNumber }), t('firmware.pr.arch_not_built', { arch }))
        throw new Error(`PR build does not include ${arch} firmware`)
      }
      if (new Date(artifact.expires_at).getTime() < Date.now()) {
        toastStore.error(t('firmware.pr.title', { pr: prBuild.prNumber }), t('firmware.pr.expired'))
        throw new Error('PR build artifacts have expired')
      }

      // Capture the current selection so a download that outlives a switch to
      // a different PR build does not update progress or cache the wrong zip
      const generation = this.prGeneration
      const isCurrent = () => this.prGeneration === generation

      const downloadPromise = (async () => {
        const response = await fetch(createUrl(`api/github/firmware/artifact/${artifact.artifact_id}/download`))
        if (response.status === 404 || response.status === 410) {
          toastStore.error(t('firmware.pr.title', { pr: prBuild.prNumber }), t('firmware.pr.expired'))
          throw new Error('PR build artifacts have expired')
        }
        if (!response.ok || !response.body) {
          toastStore.error(t('firmware.pr.title', { pr: prBuild.prNumber }), t('firmware.pr.download_failed'))
          throw new Error(`Failed to download PR build artifact: ${response.status}`)
        }
        const total = Number(response.headers.get('content-length')) || artifact.size_in_bytes
        if (isCurrent()) this.prDownload = { arch, received: 0, total }
        const reader = response.body.getReader()
        const chunks: BlobPart[] = []
        let received = 0
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) {
            chunks.push(value)
            received += value.length
            if (isCurrent()) this.prDownload = { arch, received, total }
          }
        }
        const blob = new Blob(chunks, { type: 'application/zip' })
        if (isCurrent()) this.prZipBlobs[arch] = blob
        return blob
      })().finally(() => {
        // Only clear progress that still belongs to this download, and only
        // remove our own promise (a newer request may have replaced it)
        if (isCurrent() && this.prDownload?.arch === arch) this.prDownload = undefined
        if (prZipPromises.get(arch) === downloadPromise) prZipPromises.delete(arch)
      })
      prZipPromises.set(arch, downloadPromise)
      return downloadPromise
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

      // PR builds carry their targets list and synthesized release notes with
      // them — nothing is hosted on meshtastic.github.io for these versions
      if (firmware.prBuild) {
        this.releaseManifest = { version: firmware.prBuild.version, targets: firmware.prBuild.targets }
      }

      // Fetch release notes if not already present
      if (firmware.id && !firmware.prBuild && (!firmware.release_notes || firmware.release_notes.trim().length === 0)) {
        firmware.release_notes = await fetchReleaseNotes(firmware.id)
      }

      // Auto-skip release notes step if there are no notes to show
      if (!firmware.release_notes || firmware.release_notes.trim().length === 0) {
        this.hasSeenReleaseNotes = true
      }

      // Fetch the release manifest that lists all available targets
      if (firmware.id && !firmware.prBuild) {
        const releaseManifest = await fetchReleaseManifest(firmware.id)
        if (releaseManifest) {
          this.releaseManifest = releaseManifest
          console.log(`Loaded release manifest for ${firmware.id} with ${releaseManifest.targets.length} targets`)
        }
      }

      // Carry the firmware onto every later RUM/Logs event in the session.
      setTelemetryContext({
        firmware_version: firmware.id,
        firmware_channel: this.firmwareChannel,
      })
    },
    getReleaseFileUrl(fileName: string): string {
      // PR build files come from artifact zips, not meshtastic.github.io
      if (!this.selectedFirmware?.id || this.selectedFirmware.prBuild) return ''
      return `${getFirmwareBaseUrl(this.selectedFirmware.id)}/${fileName}`
    },
    async downloadUf2FileSystem(searchRegex: RegExp, arch?: string) {
      let source: Blob | undefined = this.hasFirmwareFile ? this.selectedFile : undefined
      if (!source && this.selectedFirmware?.prBuild && arch) {
        source = await this.getPrArchZip(arch)
      }
      // Throw rather than no-op: the caller reports the hand-off as a completed
      // flash, so "nothing to extract from" has to be distinguishable.
      if (!source) {
        throw new Error('No firmware zip to extract a UF2 from')
      }
      const entry = await extractZipEntry(source, filename => searchRegex.test(filename))
      if (!entry) {
        throw new Error(`Could not find file with pattern ${searchRegex} in zip`)
      }
      saveAs(entry.blob, entry.filename)
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
      this.trackFlashStart(selectedTarget, { method: 'esptool', cleanInstall: false })

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
          flashMode: selectedTarget.platformioTarget.startsWith('tlora-t3s3') ? 'dio' : 'keep',
          flashFreq: 'keep',
          reportProgress: (fileIndex, written, total) => {
            this.flashPercentDone = Math.round((written / total) * 100)
            if (written === total) {
              this.isFlashing = false
              console.log('Done flashing!')
            }
          },
        }
        // Legacy update flash, not a clean install — this used to report every
        // one of them as a full erase.
        await this.startWrite(terminal, espLoader, transport, flashOptions, { selectedTarget, cleanInstall: false })
      }
      catch (error: any) {
        this.handleError(error, terminal)
      }
    },
    handleError(error: Error, terminal: Terminal) {
      console.error('Error flashing:', error)
      terminal.writeln('')
      terminal.writeln(`\x1b[38;5;9m${error}\x1b[0m`)
      this.trackFlashError(error)
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

      // PR builds: read the target manifest from the artifact zip
      if (this.selectedFirmware.prBuild) {
        const prBuild = this.selectedFirmware.prBuild
        const target = prBuild.targets.find(t => t.board === targetBoard)
        if (!target) {
          this.manifest = undefined
          this.hasManifest = false
          return false
        }
        try {
          const zip = await this.getPrArchZip(target.platform)
          this.prActiveArch = target.platform
          const manifestName = `firmware-${targetBoard}-${prBuild.version}.mt.json`
          const entry = await extractZipEntry(zip, name => name === manifestName)
          if (!entry) {
            console.warn(`Could not find ${manifestName} in PR build artifact`)
            this.manifest = undefined
            this.hasManifest = false
            return false
          }
          this.manifest = JSON.parse(await entry.blob.text()) as FirmwareManifest
          this.hasManifest = true
          console.log(`Loaded target manifest for ${targetBoard} from PR build artifact`)
          return true
        }
        catch (error) {
          console.error(`Error loading PR build manifest for ${targetBoard}:`, error)
          this.manifest = undefined
          this.hasManifest = false
          return false
        }
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
      this.trackFlashStart(selectedTarget, { method: 'esptool', cleanInstall: false })

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
            }
          },
        }
        await this.startWrite(terminal, espLoader, transport, flashOptions, { selectedTarget, cleanInstall: false })
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
      this.trackFlashStart(selectedTarget, { method: 'esptool', cleanInstall: true })

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
            }
          },
        }
        await this.startWrite(terminal, espLoader, transport, flashOptions, { selectedTarget, cleanInstall: true })
      }
      catch (error: any) {
        this.handleError(error, terminal)
      }
    },
    async startWrite(terminal: Terminal, espLoader: ESPLoader, transport: Transport, flashOptions: FlashOptions, flashed: { selectedTarget: DeviceHardware, cleanInstall: boolean }) {
      await espLoader.writeFlash(flashOptions)

      // The write is the flash, so success is recorded here: reportProgress
      // reaches written === total once per file and can do so before writeFlash
      // rejects, while everything below is the reset and the boot-log stream —
      // and readSerial only returns when the port closes.
      this.trackDownload(flashed.selectedTarget, flashed.cleanInstall)


      // Perform hard reset - toggle RTS to reset the chip
      // This matches the original working reset sequence that was used before PR #297
      terminal.writeln('\x1b[33mHard resetting via RTS pin...\x1b[0m')
      await transport.setRTS(true)   // EN=LOW (chip in reset)
      await new Promise(resolve => setTimeout(resolve, 100))
      await transport.setRTS(false)  // EN=HIGH (chip out of reset - starts booting)
      
      // Disconnect the esptool transport to release its reader lock
      // This also closes the port, so we need to reopen it
      await transport.disconnect()
      await transport.waitForUnlock(1500)
      
      // Small delay to let the chip start booting
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Reopen the port at application baud rate (115200) to read boot logs
      if (this.port) {
        await this.port.open({ baudRate: 115200 })
        await this.readSerial(this.port, terminal)
      }
      else {
        throw new Error('Serial port is not defined')
      }
    },
    /**
     * Attributes shared by every action in the flash funnel: which board, which
     * firmware, and which event edition (if any) it was flashed at.
     */
    flashAttributes(selectedTarget: DeviceHardware, method: FlashMethod, isCleanInstall: boolean) {
      return {
        ...boardAttributes(selectedTarget),
        ...eventAttributes(eventMode),
        firmware_version: this.selectedFirmware?.id || '',
        firmware_channel: this.firmwareChannel,
        pr_number: this.selectedFirmware?.prBuild?.prNumber,
        method,
        clean_install: isCleanInstall,
      }
    },
    /**
     * Second joint of the funnel: the user started a flash. Emitted before the
     * serial port picker opens, so start-vs-finish counts show how many attempts
     * never made it to a device.
     */
    trackFlashStart(selectedTarget: DeviceHardware, options: { method: FlashMethod, cleanInstall?: boolean }) {
      activeFlash = this.flashAttributes(selectedTarget, options.method, options.cleanInstall ?? false)
      addRumAction('flash_start', activeFlash)
    },
    /**
     * Final joint: the flash failed. Uses the attributes captured at
     * flash_start so the failure is attributed to the right board/firmware.
     */
    trackFlashError(error: unknown) {
      const context = {
        ...(activeFlash ?? eventAttributes(eventMode)),
        ...classifyFlashError(error),
        flash_percent_done: this.flashPercentDone,
      }
      activeFlash = undefined
      addRumAction('flash_error', context)
      logTelemetry('warn', 'Firmware flash failed', { event_type: 'flash_error', ...context })
    },
    trackDownload(selectedTarget: DeviceHardware, isCleanInstall: boolean, method: FlashMethod = 'esptool') {
      // This attempt is over either way — never attribute a later failure to it.
      activeFlash = undefined
      if (selectedTarget.hwModelSlug?.length > 0) {
        // Vercel Analytics tracking
        track('Download', {
          hardwareModel: selectedTarget.hwModelSlug,
          arch: selectedTarget.architecture,
          cleanInstall: isCleanInstall,
          version: this.selectedFirmware?.id || '',
          event: String(eventAttributes(eventMode).event_slug),
          count: 1,
        })

        // Datadog tracking - both RUM and Logs for comprehensive coverage
        const flashData = {
          ...this.flashAttributes(selectedTarget, method, isCleanInstall),
          has_mui: selectedTarget.hasMui || false,
          partition_scheme: this.partitionScheme || 'default',
          partition_table_version: this.partitionScheme === '8MB' && selectedTarget.hasMui && supportsNew8MBPartitionTable(this.firmwareVersion) ? 'new-8mb' : 'legacy',
          timestamp: new Date().toISOString(),
          user_agent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
          // Origin + path only. Query and fragment can carry anything a user was
          // linked with, and what the flasher itself puts there (?pr=, ?event=)
          // is already reported as pr_number / event_slug.
          url: typeof window === 'undefined' ? '' : `${window.location.origin}${window.location.pathname}`,
        }

        // Final joint of the funnel. For UF2 targets the flasher only hands the
        // file to the browser — the drag-and-drop onto the device is not
        // observable — so outcome_source distinguishes a confirmed write from a
        // delivered download when computing success rates.
        addRumAction('flash_success', {
          ...flashData,
          outcome_source: method === 'uf2' ? 'download' : 'device',
        })

        // Original action name, kept alongside flash_success so existing
        // dashboards and monitors keep reporting.
        addRumAction('firmware_flash', flashData)

        // Datadog Logs (for precise counting, no sampling)
        logTelemetry('info', 'Firmware flash completed', {
          event_type: 'firmware_flash',
          ...flashData,
        })
      }
    },
    async cleanInstallEspFlashLegacy(fileName: string, otaFileName: string, littleFsFileName: string, selectedTarget: DeviceHardware) {
      const terminal = await openTerminal()
      this.trackFlashStart(selectedTarget, { method: 'esptool', cleanInstall: true })

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
          flashMode: selectedTarget.platformioTarget.startsWith('tlora-t3s3') ? 'dio' : 'keep',
          flashFreq: 'keep',
          reportProgress: (fileIndex, written, total) => {
            this.flashingIndex = fileIndex
            this.flashPercentDone = Math.round((written / total) * 100)
            if (written === total && fileIndex > 1) {
              this.isFlashing = false
              console.log('Done flashing!')
            }
          },
        }
        await this.startWrite(terminal, espLoader, transport, flashOptions, { selectedTarget, cleanInstall: true })
      }
      catch (error: any) {
        this.handleError(error, terminal)
      }
    },
    async fetchBinaryContent(fileName: string): Promise<string> {
      if (this.selectedFirmware?.prBuild) {
        if (!this.prActiveArch) {
          throw new Error('Cannot flash a PR build before its target manifest is loaded')
        }
        const zip = await this.getPrArchZip(this.prActiveArch)
        // Manifest-driven file names are exact; fall back to regex for
        // convention-based lookups
        let entry = await extractZipEntry(zip, name => name === fileName)
        if (!entry) {
          const fileRegex = new RegExp(fileName)
          entry = await extractZipEntry(zip, name => fileRegex.test(name))
        }
        if (!entry) {
          throw new Error(`Could not find file ${fileName} in PR build artifact`)
        }
        const arrayBuffer = await entry.blob.arrayBuffer()
        return convertToBinaryString(new Uint8Array(arrayBuffer))
      }
      if (this.selectedFirmware?.id) {
        const baseUrl = getFirmwareBaseUrl(this.selectedFirmware.id)
        const url = `${baseUrl}/${fileName}`
        const response = await fetch(url)
        // Without this a 404 body ("404: Not Found") is happily flashed to the
        // partition as a 14-byte payload — silently corrupting it instead of
        // failing the flash.
        if (!response.ok) {
          throw new Error(`Could not download ${fileName} (HTTP ${response.status} from ${url})`)
        }
        const blob = await response.blob()
        const data = await blob.arrayBuffer()
        return convertToBinaryString(new Uint8Array(data))
      }
      if (this.selectedFile && this.isZipFile) {
        console.log('Looking for file matching pattern:', fileName)
        const entry = await extractZipEntry(this.selectedFile, (filename) => {
          if (fileName.startsWith('firmware-tbeam-.'))
            return !filename.includes('s3') && new RegExp(fileName).test(filename) && (fileName.endsWith('update.bin') === filename.endsWith('update.bin'))
          return new RegExp(fileName).test(filename) && (fileName.endsWith('update.bin') === filename.endsWith('update.bin'))
        })
        if (entry) {
          console.log('Found file:', entry.filename)
          const arrayBuffer = await entry.blob.arrayBuffer()
          return convertToBinaryString(new Uint8Array(arrayBuffer))
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
