import { mande } from 'mande'
import { defineStore } from 'pinia'
import {
  eventMode,
  vendorCobrandingTag,
} from '~/types/resources'
import { applyEventDeviceOverrides } from '~/utils/eventDevices'
import { isUnsupportedDevice } from '~/utils/unsupportedDevices'
import { addRumAction, boardAttributes, eventAttributes, setTelemetryContext } from '~/utils/telemetry'

import { MeshDevice } from '@meshtastic/core'
import { TransportWebSerial } from '@meshtastic/transport-web-serial'

// biome-ignore lint/style/useImportType: WUT?
import type { DeviceHardware } from '../types/api'
import { createUrl } from './store'
import { useFirmwareStore } from './firmwareStore'
import { useSerialMonitorStore } from './serialMonitorStore'
import { useToastStore } from './toastStore'

// Ensure Web Serial API types are available and extend them safely
declare global {
  interface Navigator {
    readonly serial: Serial
  }

  interface SerialPort {
    forget(): Promise<void>
  }
}

const firmwareApi = mande(createUrl('api/resource/deviceHardware'))

export const shouldAutoSelectMui = (target: DeviceHardware) => {
  return target.hasMui === true && target.platformioTarget !== 'heltec-v4'
}

export const useDeviceStore = defineStore('device', {
  state: () => {
    return {
      selectedDevice: <DeviceHardware | undefined>undefined,
      selectedTarget: <DeviceHardware | undefined>undefined,
      tag: <string | undefined>undefined,
      apiTargets: <DeviceHardware[]>[],
      // Boards the registry does not mark activelySupported - both the too-new
      // and the long-retired. Held back from `targets` until the Konami code
      // reveals them; see unsupportedTargetsUnlocked below.
      unsupportedApiTargets: <DeviceHardware[]>[],
      // User attests the DFU drive's INFO_UF2.TXT carries a Factory-Erase:
      // line, so eraseUf2File serves the bootloader-native erase file.
      bootloaderFactoryErase: false,
      isConnecting: false,
      abortController: <AbortController | undefined>undefined,
      readerClosed: <Promise<any> | undefined>undefined,
      writerClosed: <Promise<any> | undefined>undefined,
      port: <SerialPort | undefined>undefined,
    }
  },
  getters: {
    /**
     * The API device list plus any devices only the active event's firmware
     * build ships. Derived (not baked into state) so it stays correct however
     * event mode and the device fetch interleave — plugins/eventMode.client.ts
     * can still re-resolve the edition from the live API after mount.
     */
    targets(): DeviceHardware[] {
      // Co-branded builds are pinned to one vendor's devices; never widen them.
      if (vendorCobrandingTag.length > 0) return this.apiTargets
      const base = applyEventDeviceOverrides(this.apiTargets, eventMode.enabled ? eventMode.eventTag : undefined)
      if (!this.unsupportedTargetsUnlocked) return base
      return base.concat(this.unsupportedApiTargets)
    },
    /**
     * Whether boards the registry does not mark activelySupported are showing.
     * Gated on the Konami code *and* a published nightly of the eligible
     * series, so a revealed board always has a build to flash it with.
     */
    unsupportedTargetsUnlocked(): boolean {
      if (vendorCobrandingTag.length > 0 || eventMode.enabled) return false
      return useFirmwareStore().unsupportedDevicesUnlocked
    },
    /**
     * Whether the selected board is one the registry does not mark
     * activelySupported. Those are pinned to the nightly - `develop` is the
     * only branch guaranteed to still build the variant - so neither another
     * release nor a locally uploaded zip or bin may be flashed onto one: both
     * would carry firmware built for different hardware. Firmware.vue offers
     * only the nightly and refuses the upload; Flash.vue enforces the same.
     */
    nightlyOnlyTarget(): boolean {
      return isUnsupportedDevice(this.selectedTarget)
    },
    filteredDevices(): DeviceHardware[] {
      if (this.tag) {
        return this.targets.filter(t => t.tags?.includes(this.tag ?? '') || t.architecture === this.tag)
      }
      return this.targets
    },
    sortedDevices(): DeviceHardware[] {
      return this.filteredDevices
        .filter(t => t.supportLevel === 1).sort((a, b) => {
          const hwModelComparison = a.hwModel - b.hwModel
          if (hwModelComparison !== 0) return hwModelComparison
          return (a.images?.length ?? 0) - (b.images?.length ?? 0)
        })
        .concat(this.filteredDevices.filter(t => t.supportLevel === 2)
          .sort((a, b) => {
            const hwModelComparison = a.hwModel - b.hwModel
            if (hwModelComparison !== 0) return hwModelComparison
            return (a.images?.length ?? 0) - (b.images?.length ?? 0)
          }))
        .concat(this.filteredDevices.filter(t => (t.supportLevel ?? 3) === 3)
          .sort((a, b) => a.hwModel - b.hwModel))
    },
    allTags(): string[] {
      return this.targets.flatMap(t => t.tags ?? []).filter((v, i, a) => a.indexOf(v) === i)
    },
    allArchs(): string[] {
      return this.targets.map(t => t.architecture).filter((v, i, a) => a.indexOf(v) === i)
    },
    selectedArchitecture: state => state.selectedTarget?.architecture || '',
    isSelectedNrf(): boolean {
      return this.selectedArchitecture.startsWith('nrf52')
    },
    /**
     * Whether the selected nRF52 target's bootloader carries SoftDevice S140
     * v7.3.0 (app base 0x27000) rather than v6.1.1 (app base 0x26000). This
     * picks the factory-erase UF2: the v6.1.1 build is flashed at 0x26000,
     * which on a v7.3.0 device overwrites the last page of the SoftDevice and
     * leaves the board unbootable until the bootloader + SoftDevice package is
     * reflashed (#85, #145).
     *
     * Every Seeed nRF52840 board ships the v7.3.0 bootloader (see
     * meshtastic/nrf52_factory_erase), so Seeed is treated as v7.3.0 by default
     * rather than adding each new board here one at a time. Mis-serving the
     * v7.3.0 file to a v6.1.1 board is the benign direction (recoverable with
     * a normal firmware reflash), so defaulting towards v7.3.0 is the safe bet.
     */
    isSoftDevice7point3(): boolean {
      const sd73Devices = [
        'WIO_WM1110',
        'TRACKER_T1000_E',
        'XIAO_NRF52_KIT',
        'SEEED_SOLAR_NODE',
        'SEEED_WIO_TRACKER_L1',
        'SEEED_WIO_TRACKER_L1_EINK',
        'MESH_TRACKER_X1',
      ]
      const target = this.selectedTarget
      if (!target) return false
      if (sd73Devices.includes(target.hwModelSlug || '')) return true
      return this.isSelectedNrf && (target.tags?.includes('Seeed') ?? false)
    },
    /**
     * Factory-erase UF2 (under /public/uf2) for the selected target. The nRF52
     * build has to match the target's SoftDevice layout — see
     * isSoftDevice7point3 for what happens when it doesn't.
     *
     * meshtastic_factory_erase.uf2 is the exception: a single 512-byte UF2
     * block with family ID 0x4D455348 ("MESH") and no payload, from
     * Adafruit_nRF52_Bootloader_OTAFIX tools/ (c8ccd1d, MIT). It is not an
     * application at all - a bootloader that recognises the family erases its
     * own App Data reservation (LittleFS config, keys, bonds, node DB) and
     * leaves the installed firmware in place, so one file fits every nRF52
     * board regardless of SoftDevice. Older bootloaders ignore the family and
     * silently do nothing, and the flasher cannot read the drive to tell them
     * apart, so it is only served when the user attests that INFO_UF2.TXT
     * shows the Factory-Erase: line.
     */
    eraseUf2File(): string {
      if (!this.isSelectedNrf) {
        return '/uf2/pico_erase.uf2'
      }
      if (this.bootloaderFactoryErase) {
        return '/uf2/meshtastic_factory_erase.uf2'
      }
      return this.isSoftDevice7point3 ? '/uf2/nrf_erase_sd7_3.uf2' : '/uf2/nrf_erase2.uf2'
    },
    enterDfuVersion(): string {
      if (this.isSelectedNrf) {
        return '2.2.17'
      }
      return '2.2.18'
    },
    dfuStepAction(): string {
      const { t } = useI18n()

      if (this.isSelectedNrf) {
        return t('flash.dfu_action_doubleclick')
      }
      return t('flash.dfu_action_bootsel')
    },
  },
  actions: {
    async fetchList() {
      try {
        // First try to fetch from the API
        const targets = await firmwareApi.get<DeviceHardware[]>()
        this.setTargetsList(targets)
      }
      catch (ex) {
        console.error(ex)
        // Fallback to offline list from the JSON file
        try {
          const response = await fetch('/data/hardware-list.json')
          if (response.ok) {
            const offlineHardwareList = await response.json()
            this.setTargetsList(offlineHardwareList)
          }
          else {
            console.error('Failed to load hardware list from JSON file')
          }
        }
        catch (error) {
          console.error('Error loading hardware list from JSON file:', error)
        }
      }
    },
    setTargetsList(targets: DeviceHardware[]) {
      // meshtasticd targets are never flashable from here, whatever their
      // support status, so they are dropped from both lists up front.
      const flashable = targets.filter(
        (t: DeviceHardware) => !t.architecture.toLowerCase().startsWith('portduino'),
      )
      if (vendorCobrandingTag.length > 0) {
        this.apiTargets = flashable.filter(
          (t: DeviceHardware) => t.activelySupported && t.tags?.includes(vendorCobrandingTag),
        )
        // Co-branded builds are pinned to one vendor's supported devices and
        // are never widened, so nothing is held back for them.
        this.unsupportedApiTargets = []
        return
      }
      this.apiTargets = flashable.filter((t: DeviceHardware) => t.activelySupported)
      this.unsupportedApiTargets = flashable.filter(isUnsupportedDevice)
    },
    async setSelectedTarget(target: DeviceHardware) {
      this.selectedTarget = target
      // The attestation is about one board's bootloader, not the next one's.
      this.bootloaderFactoryErase = false
      document.getElementById('device-modal')?.click()
      const firmwareStore = useFirmwareStore()

      await new Promise(_ => setTimeout(_, 250))
      // A board the registry does not mark activelySupported is pinned to the
      // nightly, overriding whatever was selected for the previous target:
      // develop is the only branch guaranteed to still build its variant.
      // Firmware.vue offers nothing else while such a board is selected, so
      // this is the only build it can ever be flashed with. The reveal is
      // gated on this nightly existing, so it is present here.
      if (isUnsupportedDevice(target)) {
        const nightly = firmwareStore.unlockNightly
        if (nightly) firmwareStore.setSelectedFirmware(nightly)
      }
      else if (!firmwareStore.hasFirmwareFile && !firmwareStore.hasOnlineFirmware && !firmwareStore.prDeepLinkPending && firmwareStore.stable.length > 0) {
        firmwareStore.setSelectedFirmware(firmwareStore.stable[0])
      }

      // Auto-select MUI for supported variants except Heltec V4.
      if (shouldAutoSelectMui(target)) {
        firmwareStore.$state.shouldInstallMui = true
      }

      // First joint of the provisioning funnel (issue #403). The context sticks
      // to every later event in the session; the action makes "which board did
      // they pick" countable on its own — including for the ~half of visitors
      // who never get as far as flashing.
      const board = boardAttributes(target)
      setTelemetryContext({
        // Original keys kept so existing dashboards/monitors keep resolving.
        hwModel: target.hwModel,
        platformioTarget: target.platformioTarget,
        ...board,
      })
      addRumAction('select_board', { ...board, ...eventAttributes(eventMode) })
    },
    setSelectedTag(tag: string) {
      if (tag === 'all') {
        this.tag = undefined
        return
      }
      if (tag === this.tag) {
        this.tag = undefined
      }
      else {
        this.tag = tag
      }
    },
    async openDeviceConnection(shouldConfigure: boolean = true): Promise<MeshDevice> {
      // Close any existing port first
      if (this.port) {
        try {
          await this.port.close()
        }
        catch {
          // Port may not be open, ignore
        }
      }

      // Request serial port from user
      this.port = await navigator.serial.requestPort()

      // Create transport and device using the new API
      const transport = await TransportWebSerial.createFromPort(this.port!, 115200)
      const id = Math.floor(Math.random() * 1e9)
      const device = new MeshDevice(transport, id)

      // Configure the device connection
      if (shouldConfigure) {
        await device.configure()
      }

      return device
    },
    async cleanupDevice(device: MeshDevice) {
      console.log('Starting device cleanup...')

      if (this.port && device?.transport?.fromDevice) {
        try {
          await device.transport.fromDevice.cancel() // Cancel any ongoing reads
        }
        catch (error) {
          console.warn('Error cancelling fromDevice reader:', error)
        }
        try {
          await device.transport.toDevice.close() // Close the toDevice stream
        }
        catch (error) {
          console.warn('Error closing toDevice writer:', error)
        }
        try {
          const reader = device.transport.fromDevice.getReader()

          const textEncoder = new TextEncoderStream()
          const writer = textEncoder.writable.getWriter()
          const writableStreamClosed = textEncoder.readable.pipeTo(this.port.writable!)

          await reader.cancel()

          await writer.close()
          await writableStreamClosed

          // this is the secret sauce!
          await this.port?.forget()
        }
        catch (error: any) {
          console.log('Disconnect failed:', error?.message || error)
          if (this.port) {
            await this.port.forget()
          }
        }
      }

      // Clear any store state
      this.abortController = undefined
      this.readerClosed = undefined
      this.writerClosed = undefined
    },
    async enterDfuMode(tFunc?: (key: string) => string) {
      const toastStore = useToastStore()
      const firmwareStore = useFirmwareStore()
      const serialMonitorStore = useSerialMonitorStore()

      const isPortBusy = firmwareStore.isConnected || firmwareStore.isReaderLocked || serialMonitorStore.isConnected || serialMonitorStore.isReaderLocked
      if (isPortBusy) {
        const errorTitle = tFunc?.('serial.busy_title') || 'Serial Port Busy'
        const errorMessage = tFunc?.('serial.busy_message') || 'A serial connection is already open. Please close it before starting DFU mode.'
        toastStore.error(errorTitle, errorMessage)
        return
      }
      let device: MeshDevice | null = null

      this.isConnecting = true
      try {
        // Open device connection (includes port selection)
        // Use a longer timeout since it includes user interaction
        const connectionPromise = this.openDeviceConnection(false)
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 30000),
        )
        try {
          device = await Promise.race([connectionPromise, timeoutPromise])
        }
        catch (error: unknown) {
          // User cancelled port selection
          if ((error as Error)?.name === 'NotFoundError') {
            this.isConnecting = false
            return
          }
          if ((error as Error).message === 'timeout') {
            const errorTitle = tFunc?.('dfu.error_connection_title') || 'Device Connection Failed'
            const errorMessage = tFunc?.('dfu.error_connection') || 'Failed to connect to device. Please disconnect and reconnect the device, then try again. If the problem persists, reload the page.'
            toastStore.error(errorTitle, errorMessage)
            throw error
          }
          else {
            throw error
          }
        }

        // Configure the device - this may hang even though config is received
        // Use a timeout and proceed anyway if it times out
        try {
          const configurePromise = device.configure()
          const configureTimeout = new Promise<void>((resolve) =>
            setTimeout(resolve, 5000),
          )
          await Promise.race([configurePromise, configureTimeout])
        }
        catch (error) {
          console.error('Error configuring device:', error)
          // Continue anyway - we may still be able to enter DFU mode
        }

        // Enter DFU mode
        await device.enterDfuMode()

        // Show success message
        const successTitle = tFunc?.('dfu.success_title') || 'DFU Mode'
        const successMessage = tFunc?.('dfu.success_message') || 'Device successfully entered DFU mode'
        toastStore.success(successTitle, successMessage)
      }
      catch (error: any) {
        console.error('Error entering DFU mode:', error)

        const errorTitle = tFunc?.('dfu.error_connection_title') || 'Device Connection Failed'
        const errorMessage = tFunc?.('dfu.error_connection') || 'Failed to connect to device. Please disconnect and reconnect the device, then try again. If the problem persists, reload the page.'

        toastStore.error(errorTitle, errorMessage)
        throw error
      }
      finally {
        // Always attempt to clean up the device connection
        if (device) {
          await this.cleanupDevice(device)
        }
        this.isConnecting = false
      }
    },
    async baud1200() {
      this.port = await navigator.serial.requestPort()
      await this.port?.open({ baudRate: 1200 })
      // Give the device a moment to recognize the 1200 baud connection
      await new Promise(resolve => setTimeout(resolve, 500))
      await this.port?.close()
    },
    async autoSelectHardware(tFunc?: (key: string) => string) {
      const toastStore = useToastStore()
      const firmwareStore = useFirmwareStore()
      const serialMonitorStore = useSerialMonitorStore()

      const isPortBusy = firmwareStore.isConnected || firmwareStore.isReaderLocked || serialMonitorStore.isConnected || serialMonitorStore.isReaderLocked
      if (isPortBusy) {
        const errorTitle = tFunc?.('serial.busy_title') || 'Serial Port Busy'
        const errorMessage = tFunc?.('serial.busy_message') || 'A serial connection is already open. Please close it before auto-detecting hardware.'
        toastStore.error(errorTitle, errorMessage)
        return
      }
      this.isConnecting = true
      try {
        // Promise.race for connection timeout
        const connectionPromise = this.openDeviceConnection(false)
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000),
        )
        let device: MeshDevice
        try {
          device = await Promise.race([connectionPromise, timeoutPromise])
        }
        catch (error) {
          if ((error as Error).message === 'timeout') {
            const errorTitle = tFunc?.('dfu.error_connection_title') || 'Device Connection Failed'
            const errorMessage = tFunc?.('dfu.error_connection') || 'Failed to connect to device. Please disconnect and reconnect the device, then try again. If the problem persists, reload the page.'
            toastStore.error(errorTitle, errorMessage)
            throw error
          }
          else {
            throw error
          }
        }
        device.events.onDeviceMetadataPacket.subscribe(async (packet: any) => {
          console.log('Received device metadata packet:', packet)
          // Try to find the device by pio env name first, then hw model if that fails
          let targetDevice: DeviceHardware | undefined = undefined
          if (packet?.data?.platformioTarget?.length > 0) {
            targetDevice = this.targets.find(
              (target: DeviceHardware) => target.platformioTarget === packet?.data?.platformioTarget,
            )
          }
          if (!targetDevice) {
            targetDevice = this.targets.find(
              (target: DeviceHardware) => target.hwModel === packet?.data?.hwModel,
            )
          }
          if (targetDevice) {
            console.log('Found device onDeviceMetadataPacket', targetDevice)
            this.setSelectedTarget(targetDevice)
            if (targetDevice.architecture.startsWith('nrf')) {
              toastStore.success(
                tFunc?.('dfu.success_title') || 'DFU Mode',
                tFunc?.('dfu.success_message') || 'Device successfully entered DFU mode',
              )
              await device?.enterDfuMode()
            }
            await this.cleanupDevice(device)

            return 0
          }
        })

        const configurePromise = device.configure()
        try {
          await Promise.race([configurePromise, timeoutPromise])
        }
        catch (error) {
          if ((error as Error).message === 'timeout') {
            if (this.selectedTarget) {
              await this.cleanupDevice(device)
              return
            }
            const errorTitle = tFunc?.('dfu.error_unresponsive_title') || 'Device Unresponsive'
            const errorMessage = tFunc?.('dfu.error_unresponsive') || 'The device is not responding. Please ensure it is properly connected and not in DFU mode.'
            toastStore.error(errorTitle, errorMessage)
            throw error
          }
          else {
            throw error
          }
        }

        // Wait for device metadata, then clean up
        await new Promise(resolve => setTimeout(resolve, 5000))

        await this.cleanupDevice(device)

        return -1
      }
      catch (error) {
        console.error('Error in autoSelectHardware:', error)
        const errorTitle = tFunc?.('dfu.error_connection_title') || 'Device Connection Failed'
        const errorMessage = tFunc?.('dfu.error_connection') || 'Failed to connect to device. Please disconnect and reconnect the device, then try again. If the problem persists, reload the page.'

        toastStore.error(errorTitle, errorMessage)
        throw error
      }
      finally {
        this.isConnecting = false
      }
    },
  },
})
