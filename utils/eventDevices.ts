import type { DeviceHardware } from '~/types/api'

/**
 * Devices an event's custom firmware build ships but that
 * api.meshtastic.org/resource/deviceHardware does not publish as actively
 * supported yet. Keyed by the edition's event tag (EventModeConfig.eventTag),
 * so an entry only ever reaches the device picker on that event's domain.
 *
 * Each entry mirrors the custom_meshtastic_* metadata in the firmware repo's
 * variants/<arch>/<env>/platformio.ini — the same source the API generates from
 * — so the UI doesn't shift once the API catches up. Entries are inert (not
 * duplicated) after that happens, but delete them anyway to keep this honest.
 */
export const eventOnlyDevices: Record<string, DeviceHardware[]> = {
  // DEF CON 34's build ships firmware-t-beam-bpf-*, but hwModel 124 is still
  // absent from the API device list.
  // https://github.com/meshtastic/firmware/blob/master/variants/esp32s3/t-beam-bpf/platformio.ini
  DEFCON: [
    {
      hwModel: 124,
      hwModelSlug: 'TBEAM_BPF',
      platformioTarget: 't-beam-bpf',
      // The API normalises the platformio `esp32s3` to a hyphenated arch, which
      // is what the flash flow matches on (see components/targets/Esp32.vue).
      architecture: 'esp32-s3',
      activelySupported: true,
      displayName: 'LilyGo T-Beam BPF',
      supportLevel: 3,
      tags: ['LilyGo'],
      images: ['tbeam-bpf.svg'],
      // board_build.partitions = default_16MB.csv
      partitionScheme: '16MB',
      hasMui: false,
      hasInkHud: false,
    },
  ],
}

/**
 * Overlay the active event's extra devices onto the API device list. A no-op
 * when no event is active, the event has no extras, or the API already
 * publishes the device — so this only ever adds entries on an event domain.
 */
export function applyEventDeviceOverrides(
  targets: DeviceHardware[],
  eventTag?: string,
): DeviceHardware[] {
  const extras = eventTag ? eventOnlyDevices[eventTag] : undefined
  if (!extras?.length) return targets

  const missing = extras.filter(
    extra => !targets.some(t => t.platformioTarget === extra.platformioTarget),
  )
  if (!missing.length) return targets
  return [...targets, ...missing]
}
