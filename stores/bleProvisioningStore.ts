import { defineStore } from 'pinia'
import { useToastStore } from './toastStore'

declare global {
  interface Navigator {
    readonly bluetooth: Bluetooth
  }
}

const WIFI_SERVICE_UUID = '7b9c0000-3c1b-4f52-9e1a-1d5f0e9c1000'
const CHAR_SSID_UUID = '7b9c0000-3c1b-4f52-9e1a-1d5f0e9c1001'
const CHAR_PSK_UUID = '7b9c0000-3c1b-4f52-9e1a-1d5f0e9c1002'
const CHAR_STATUS_UUID = '7b9c0000-3c1b-4f52-9e1a-1d5f0e9c1003'
const CHAR_APPLY_UUID = '7b9c0000-3c1b-4f52-9e1a-1d5f0e9c1004'
const CHAR_SCAN_RESULTS_UUID = '7b9c0000-3c1b-4f52-9e1a-1d5f0e9c1005'

type ProvisioningStatus = 'idle' | 'missing-ssid-or-psk' | 'applying' | 'applied' | 'apply-failed'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const useBleProvisioningStore = defineStore('bleProvisioning', {
  state: () => ({
    device: undefined as BluetoothDevice | undefined,
    server: undefined as BluetoothRemoteGATTServer | undefined,
    service: undefined as BluetoothRemoteGATTService | undefined,
    isConnecting: false,
    isConnected: false,
    availableNetworks: [] as string[],
    isScanning: false,
    ssid: '',
    psk: '',
    status: 'idle' as ProvisioningStatus,
    isProvisioning: false,
  }),
  getters: {
    isWebBluetoothSupported(): boolean {
      return typeof navigator !== 'undefined' && 'bluetooth' in navigator
    },
    canProvision(): boolean {
      return this.isConnected && this.ssid.length > 0 && this.psk.length > 0 && !this.isProvisioning
    },
  },
  actions: {
    async connect(tFunc?: (key: string) => string) {
      const toastStore = useToastStore()
      this.isConnecting = true

      try {
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ services: [WIFI_SERVICE_UUID] }],
        })

        device.addEventListener('gattserverdisconnected', () => {
          this.handleDisconnect(tFunc)
        })

        const server = await device.gatt!.connect()
        const service = await server.getPrimaryService(WIFI_SERVICE_UUID)

        this.device = device
        this.server = server
        this.service = service
        this.isConnected = true

        toastStore.success(
          tFunc?.('ble.connected') || 'Connected',
          tFunc?.('ble.connected_message') || `Connected to ${device.name || 'BLE device'}`,
        )
      }
      catch (error: unknown) {
        if ((error as Error)?.name === 'NotFoundError') {
          // User cancelled device selection
          return
        }
        console.error('BLE connection error:', error)
        toastStore.error(
          tFunc?.('ble.error_connect_title') || 'BLE Connection Failed',
          tFunc?.('ble.error_connect') || 'Failed to connect to device via Bluetooth. Ensure the device is nearby and Bluetooth is enabled.',
        )
      }
      finally {
        this.isConnecting = false
      }
    },

    disconnect() {
      if (this.device?.gatt?.connected) {
        this.device.gatt.disconnect()
      }
      this.resetState()
    },

    handleDisconnect(tFunc?: (key: string) => string) {
      if (!this.isConnected) return
      const toastStore = useToastStore()
      toastStore.warning(
        tFunc?.('ble.disconnected_title') || 'Device Disconnected',
        tFunc?.('ble.disconnected') || 'The BLE device was disconnected.',
      )
      this.resetState()
    },

    async scanNetworks(tFunc?: (key: string) => string) {
      const toastStore = useToastStore()
      if (!this.service) return

      this.isScanning = true
      try {
        const characteristic = await this.service.getCharacteristic(CHAR_SCAN_RESULTS_UUID)
        const value = await characteristic.readValue()
        const text = decoder.decode(value)

        // Try JSON array first, fall back to newline-separated
        try {
          const parsed = JSON.parse(text)
          this.availableNetworks = Array.isArray(parsed) ? parsed : [text]
        }
        catch {
          this.availableNetworks = text.split('\n').filter(s => s.trim().length > 0)
        }
      }
      catch (error) {
        console.error('BLE scan error:', error)
        toastStore.error(
          tFunc?.('ble.error_scan_title') || 'Network Scan Failed',
          tFunc?.('ble.error_scan') || 'Failed to scan for WiFi networks.',
        )
      }
      finally {
        this.isScanning = false
      }
    },

    async provisionWifi(tFunc?: (key: string) => string) {
      const toastStore = useToastStore()
      if (!this.service || !this.ssid || !this.psk) return

      this.isProvisioning = true
      this.status = 'idle'

      try {
        // Write SSID
        const ssidChar = await this.service.getCharacteristic(CHAR_SSID_UUID)
        await ssidChar.writeValueWithResponse(encoder.encode(this.ssid))

        // Write PSK
        const pskChar = await this.service.getCharacteristic(CHAR_PSK_UUID)
        await pskChar.writeValueWithResponse(encoder.encode(this.psk))

        // Subscribe to status notifications
        const statusChar = await this.service.getCharacteristic(CHAR_STATUS_UUID)

        const statusPromise = new Promise<ProvisioningStatus>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('timeout'))
          }, 30000)

          const handler = (event: Event) => {
            const target = event.target as BluetoothRemoteGATTCharacteristic
            const statusText = decoder.decode(target.value!) as ProvisioningStatus
            this.status = statusText

            if (statusText === 'applied' || statusText === 'apply-failed') {
              clearTimeout(timeout)
              statusChar.removeEventListener('characteristicvaluechanged', handler)
              statusChar.stopNotifications().catch(() => {})
              resolve(statusText)
            }
          }

          statusChar.addEventListener('characteristicvaluechanged', handler)
        })

        await statusChar.startNotifications()

        // Write apply trigger
        const applyChar = await this.service.getCharacteristic(CHAR_APPLY_UUID)
        await applyChar.writeValueWithResponse(new Uint8Array([1]))

        this.status = 'applying'

        // Wait for terminal status
        const finalStatus = await statusPromise

        if (finalStatus === 'applied') {
          toastStore.success(
            tFunc?.('ble.status_applied') || 'WiFi Configured',
            tFunc?.('ble.provision_success') || 'WiFi credentials applied successfully!',
          )
        }
        else {
          toastStore.error(
            tFunc?.('ble.error_provision_title') || 'Provisioning Failed',
            tFunc?.('ble.status_apply_failed') || 'Failed to apply WiFi configuration.',
          )
        }
      }
      catch (error: unknown) {
        console.error('BLE provisioning error:', error)
        if ((error as Error).message === 'timeout') {
          toastStore.error(
            tFunc?.('ble.error_timeout_title') || 'Provisioning Timeout',
            tFunc?.('ble.error_timeout') || 'The device did not respond in time. Please try again.',
          )
        }
        else {
          toastStore.error(
            tFunc?.('ble.error_provision_title') || 'Provisioning Failed',
            tFunc?.('ble.error_provision') || 'Failed to provision WiFi credentials. Please try again.',
          )
        }
      }
      finally {
        this.isProvisioning = false
      }
    },

    resetState() {
      this.device = undefined
      this.server = undefined
      this.service = undefined
      this.isConnected = false
      this.isConnecting = false
      this.availableNetworks = []
      this.isScanning = false
      this.ssid = ''
      this.psk = ''
      this.status = 'idle'
      this.isProvisioning = false
    },
  },
})
