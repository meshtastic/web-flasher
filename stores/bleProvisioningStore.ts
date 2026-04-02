import { defineStore } from 'pinia'
import { useToastStore } from './toastStore'

declare global {
  interface Navigator {
    readonly bluetooth: Bluetooth
  }
}

// nymea-networkmanager GATT UUIDs
// Reference: https://github.com/nymea/nymea-networkmanager
const WIRELESS_SERVICE_UUID = 'e081fec0-f757-4449-b9c9-bfa83133f7fc'
const WIRELESS_COMMANDER_UUID = 'e081fec1-f757-4449-b9c9-bfa83133f7fc'
const COMMANDER_RESPONSE_UUID = 'e081fec2-f757-4449-b9c9-bfa83133f7fc'

// nymea command codes
const CMD_GET_NETWORKS = 0
const CMD_CONNECT = 1
const CMD_SCAN = 4

// nymea response codes
const RESPONSE_SUCCESS = 0

// Protocol constants
const MAX_PACKET_SIZE = 20
const STREAM_TERMINATOR = '\n'
const RESPONSE_TIMEOUT_MS = 15000
const SUBSCRIPTION_SETTLE_MS = 300

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export interface WifiNetwork {
  ssid: string
  bssid: string
  signalStrength: number
  isProtected: boolean
}

type ProvisioningStatus = 'idle' | 'scanning' | 'provisioning' | 'success' | 'failed'

/**
 * Encode a JSON string into ≤20-byte BLE packets with newline terminator.
 */
function encodePackets(json: string): Uint8Array[] {
  const payload = encoder.encode(json + STREAM_TERMINATOR)
  const packets: Uint8Array[] = []
  let offset = 0
  while (offset < payload.length) {
    const end = Math.min(offset + MAX_PACKET_SIZE, payload.length)
    packets.push(payload.slice(offset, end))
    offset = end
  }
  return packets
}

/**
 * Reassembler for inbound BLE notification packets.
 * Buffers UTF-8 chunks until a newline terminator is received.
 */
class PacketReassembler {
  private buffer = ''

  feed(bytes: ArrayBuffer): string | null {
    this.buffer += decoder.decode(bytes)
    if (this.buffer.endsWith(STREAM_TERMINATOR)) {
      const message = this.buffer.trimEnd()
      this.buffer = ''
      return message
    }
    return null
  }

  reset() {
    this.buffer = ''
  }
}

function nymeaErrorMessage(code: number): string {
  switch (code) {
    case 1: return 'Invalid command'
    case 2: return 'Invalid parameter'
    case 3: return 'NetworkManager not available'
    case 4: return 'Wireless adapter not available'
    case 5: return 'Networking disabled'
    case 6: return 'Wireless disabled'
    default: return `Unknown error (code ${code})`
  }
}

export const useBleProvisioningStore = defineStore('bleProvisioning', {
  state: () => ({
    device: undefined as BluetoothDevice | undefined,
    server: undefined as BluetoothRemoteGATTServer | undefined,
    service: undefined as BluetoothRemoteGATTService | undefined,
    commanderChar: undefined as BluetoothRemoteGATTCharacteristic | undefined,
    responseChar: undefined as BluetoothRemoteGATTCharacteristic | undefined,
    isConnecting: false,
    isConnected: false,
    availableNetworks: [] as WifiNetwork[],
    isScanning: false,
    ssid: '',
    psk: '',
    status: 'idle' as ProvisioningStatus,
    isProvisioning: false,
    _reassembler: null as PacketReassembler | null,
    _responseResolve: null as ((value: string) => void) | null,
  }),
  getters: {
    isWebBluetoothSupported(): boolean {
      return typeof navigator !== 'undefined' && 'bluetooth' in navigator
    },
    canProvision(): boolean {
      return this.isConnected && this.ssid.length > 0 && !this.isProvisioning
    },
  },
  actions: {
    async connect(tFunc?: (key: string) => string) {
      const toastStore = useToastStore()
      this.isConnecting = true

      try {
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ services: [WIRELESS_SERVICE_UUID] }],
        })

        device.addEventListener('gattserverdisconnected', () => {
          this.handleDisconnect(tFunc)
        })

        const server = await device.gatt!.connect()
        const service = await server.getPrimaryService(WIRELESS_SERVICE_UUID)

        // Get characteristics
        const commanderChar = await service.getCharacteristic(WIRELESS_COMMANDER_UUID)
        const responseChar = await service.getCharacteristic(COMMANDER_RESPONSE_UUID)

        // Set up response reassembler and notification handler
        const reassembler = new PacketReassembler()
        this._reassembler = reassembler

        responseChar.addEventListener('characteristicvaluechanged', (event: Event) => {
          const target = event.target as BluetoothRemoteGATTCharacteristic
          if (!target.value) return
          const message = reassembler.feed(target.value.buffer)
          if (message !== null) {
            console.log('BLE response:', message)
            if (this._responseResolve) {
              this._responseResolve(message)
              this._responseResolve = null
            }
          }
        })

        await responseChar.startNotifications()

        // Allow subscription to settle
        await new Promise(resolve => setTimeout(resolve, SUBSCRIPTION_SETTLE_MS))

        this.device = device
        this.server = server
        this.service = service
        this.commanderChar = commanderChar
        this.responseChar = responseChar
        this.isConnected = true

        toastStore.success(
          tFunc?.('ble.connected') || 'Connected',
          tFunc?.('ble.connected_message') || `Connected to ${device.name || 'BLE device'}`,
        )
      }
      catch (error: unknown) {
        if ((error as Error)?.name === 'NotFoundError') {
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

    /**
     * Send a JSON command via the nymea commander characteristic,
     * chunked into ≤20-byte packets with newline terminator.
     */
    async sendCommand(json: string) {
      if (!this.commanderChar) throw new Error('Not connected')
      console.log('BLE command:', json)
      const packets = encodePackets(json)
      for (const packet of packets) {
        await this.commanderChar.writeValueWithResponse(packet)
      }
    },

    /**
     * Wait for a complete JSON response from the notification stream.
     */
    waitForResponse(): Promise<string> {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this._responseResolve = null
          reject(new Error('Response timeout'))
        }, RESPONSE_TIMEOUT_MS)

        this._responseResolve = (value: string) => {
          clearTimeout(timeout)
          resolve(value)
        }
      })
    },

    async scanNetworks(tFunc?: (key: string) => string) {
      const toastStore = useToastStore()
      if (!this.isConnected) return

      this.isScanning = true
      try {
        // Step 1: Trigger a fresh WiFi scan (CMD_SCAN = 4)
        this.sendCommand(JSON.stringify({ c: CMD_SCAN }))
        const scanResponse = JSON.parse(await this.waitForResponse())
        if (scanResponse.r !== RESPONSE_SUCCESS) {
          throw new Error(nymeaErrorMessage(scanResponse.r))
        }

        // Step 2: Get network list (CMD_GET_NETWORKS = 0)
        this.sendCommand(JSON.stringify({ c: CMD_GET_NETWORKS }))
        const networksResponse = JSON.parse(await this.waitForResponse())
        if (networksResponse.r !== RESPONSE_SUCCESS) {
          throw new Error(nymeaErrorMessage(networksResponse.r))
        }

        // Parse network entries: {e: ssid, m: bssid, s: signal, p: protected}
        this.availableNetworks = (networksResponse.p || []).map((entry: { e: string, m: string, s: number, p: number }) => ({
          ssid: entry.e,
          bssid: entry.m || '',
          signalStrength: entry.s || 0,
          isProtected: entry.p !== 0,
        }))
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
      if (!this.isConnected || !this.ssid) return

      this.isProvisioning = true
      this.status = 'provisioning'

      try {
        // Send connect command: {c: 1, p: {e: "SSID", p: "password"}}
        const command = {
          c: CMD_CONNECT,
          p: { e: this.ssid, p: this.psk },
        }
        this.sendCommand(JSON.stringify(command))

        const responseJson = await this.waitForResponse()
        const response = JSON.parse(responseJson)

        if (response.r === RESPONSE_SUCCESS) {
          this.status = 'success'
          toastStore.success(
            tFunc?.('ble.status_applied') || 'WiFi Configured',
            tFunc?.('ble.provision_success') || 'WiFi credentials applied successfully!',
          )
        }
        else {
          this.status = 'failed'
          const errorMsg = nymeaErrorMessage(response.r)
          toastStore.error(
            tFunc?.('ble.error_provision_title') || 'Provisioning Failed',
            errorMsg,
          )
        }
      }
      catch (error: unknown) {
        console.error('BLE provisioning error:', error)
        this.status = 'failed'
        if ((error as Error).message === 'Response timeout') {
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
      this._reassembler?.reset()
      this._reassembler = null
      this._responseResolve = null
      this.device = undefined
      this.server = undefined
      this.service = undefined
      this.commanderChar = undefined
      this.responseChar = undefined
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
