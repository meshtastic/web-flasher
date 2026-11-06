// Shape of the api.meshtastic.org `GET resource/maintenanceUf2` manifest.
// Mirrors meshtastic/api src/lib/maintenanceUf2.ts; only the fields the flasher
// reads are typed here.

export interface MaintenanceUf2Image {
  fileName: string
  sha256: string
}

export interface MaintenanceUf2Manifest {
  manifestVersion: number
  otafixReleaseTag: string
  otafixBase: string
  erase: {
    nrf52Bootloader?: MaintenanceUf2Image
  }
  // platformioTarget values the Meshtastic nRF52 bootloader ships a build for
  otafixSupportedTargets?: string[]
}
