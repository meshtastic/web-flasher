import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { setGlobalI18n } from '~/utils/i18n'
import type { DeviceHardware } from '~/types/api'
import { useDeviceStore } from './deviceStore'
import { useFirmwareStore } from './firmwareStore'

vi.hoisted(() => {
  (globalThis as any).window = { location: { host: 'localhost:3000', protocol: 'https:', href: 'https://localhost:3000/' } }
})

const { addRumAction, logTelemetry, setTelemetryContext } = vi.hoisted(() => ({
  addRumAction: vi.fn(),
  logTelemetry: vi.fn(),
  setTelemetryContext: vi.fn(),
}))
vi.mock('~/utils/telemetry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/telemetry')>()
  return { ...actual, addRumAction, logTelemetry, setTelemetryContext }
})
vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))
vi.mock('~/utils/terminal', () => ({
  openTerminal: vi.fn(async () => ({ writeln: vi.fn(), write: vi.fn(), clear: vi.fn() })),
}))

const { flashStm32Firmware } = vi.hoisted(() => ({
  flashStm32Firmware: vi.fn<(port: unknown, image: Uint8Array, opts: any) => Promise<void>>(async () => {}),
}))
vi.mock('~/utils/stm32/flashStm32', () => ({ flashStm32Firmware }))

vi.stubGlobal('navigator', {
  userAgent: 'vitest',
  serial: { requestPort: vi.fn() },
})

const russell: DeviceHardware = {
  hwModel: 99,
  hwModelSlug: 'RAK3172',
  platformioTarget: 'russell',
  architecture: 'stm32wl',
  activelySupported: true,
  displayName: 'RAK3172 (Russell)',
  supportLevel: 1,
}

const STABLE = { id: 'v2.7.22.abcdef0', title: 'Meshtastic Firmware 2.7.22' }

function actionNamed(name: string) {
  return addRumAction.mock.calls.find(([n]) => n === name)?.[1]
}
function actionsNamed(name: string) {
  return addRumAction.mock.calls.filter(([n]) => n === name)
}

function fakePort() {
  return { open: vi.fn(async () => {}), close: vi.fn(async () => {}), ondisconnect: null as any }
}

function stm32Store() {
  const store = useFirmwareStore()
  store.selectedFirmware = STABLE
  store.fetchBinaryContent = vi.fn(async () => '\x01\x02\x03\x04')
  store.readSerial = vi.fn(async () => {})
  const device = useDeviceStore()
  device.enterStm32Bootloader = vi.fn(async () => fakePort() as any)
  return { store, device }
}

beforeEach(() => {
  setActivePinia(createPinia())
  setGlobalI18n({ t: (key: string) => key })
  addRumAction.mockReset()
  logTelemetry.mockReset()
  flashStm32Firmware.mockReset()
  flashStm32Firmware.mockResolvedValue(undefined)
})

describe('flashStm32', () => {
  it('downloads the .bin, runs the AN3155 flow and reports one device-verified success', async () => {
    const { store } = stm32Store()

    await store.flashStm32(russell)

    expect(store.fetchBinaryContent).toHaveBeenCalledWith('firmware-russell-2.7.22.abcdef0.bin')
    expect(flashStm32Firmware).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Uint8Array),
      expect.objectContaining({ massErase: false }),
    )
    expect(store.flashPercentDone).toBe(100)
    expect(store.isFlashing).toBe(false)

    expect(actionsNamed('flash_success')).toHaveLength(1)
    expect(actionNamed('flash_start')).toMatchObject({ method: 'stm32', clean_install: false })
    expect(actionNamed('flash_success')).toMatchObject({
      platformio_target: 'russell',
      method: 'stm32',
      outcome_source: 'device',
    })
  })

  it('passes a full mass-erase through when clean install is selected', async () => {
    const { store } = stm32Store()
    store.shouldCleanInstall = true

    await store.flashStm32(russell)

    expect(flashStm32Firmware).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Uint8Array),
      expect.objectContaining({ massErase: true }),
    )
    expect(actionNamed('flash_success')).toMatchObject({ clean_install: true })
  })

  it('maps write progress to 0-90% and verify progress to 90-100%', async () => {
    const { store } = stm32Store()
    flashStm32Firmware.mockImplementation(async (_port, _image, opts: any) => {
      opts.onProgress('write', 45, 90)
      expect(store.flashPercentDone).toBe(45)
      opts.onProgress('verify', 5, 10)
      expect(store.flashPercentDone).toBe(95)
    })

    await store.flashStm32(russell)
    expect(store.flashPercentDone).toBe(100)
  })

  it('classifies a dismissed port picker as a user cancellation', async () => {
    const { store, device } = stm32Store()
    const cancelled = new Error('No port selected by the user.')
    cancelled.name = 'NotFoundError'
    device.enterStm32Bootloader = vi.fn(() => Promise.reject(cancelled))

    await store.flashStm32(russell)

    expect(actionsNamed('flash_success')).toHaveLength(0)
    expect(actionNamed('flash_error')).toMatchObject({ error_kind: 'user_cancelled' })
  })

  it('reports a flash failure and clears the flashing flag when the protocol throws', async () => {
    const { store } = stm32Store()
    flashStm32Firmware.mockRejectedValue(new Error('bootloader did not respond'))

    await store.flashStm32(russell)

    expect(actionsNamed('flash_success')).toHaveLength(0)
    expect(store.isFlashing).toBe(false)
    expect(actionNamed('flash_error')).toMatchObject({ method: 'stm32', error_kind: 'flash_failed' })
  })
})
