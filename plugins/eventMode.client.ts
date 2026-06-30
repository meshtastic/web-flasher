import { fetchApiManifest, fetchBundledManifest, hostMatches, manifestEditionToEventMode, resolveActiveEdition, applyEventTheme } from '~/utils/eventManifest'
import type { EventFirmwareResponse } from '~/types/eventFirmware'
import { setActiveEventMode, staticEventModes } from '~/types/resources'

// Resolve the active event edition for the current host. ssr:false guarantees
// window is available, and Nuxt awaits async plugins — so we gate first paint
// ONLY on the fast, same-origin bundled snapshot (offline-first). The
// cross-origin live API is refreshed in the BACKGROUND and reactively re-applied,
// so a slow/unreachable API never blanks the screen for any visitor.
export default defineNuxtPlugin(async () => {
  const hostname = window.location.hostname
  // ?event=DEFCON lets you preview an edition on localhost.
  const override = new URLSearchParams(window.location.search).get('event')

  const applyManifest = (manifest: EventFirmwareResponse): boolean => {
    const edition = resolveActiveEdition(manifest, hostname, override)
    if (!edition) return false
    setActiveEventMode(manifestEditionToEventMode(edition))
    applyEventTheme(edition.theme)
    return true
  }

  try {
    const bundled = await fetchBundledManifest()
    if (!applyManifest(bundled)) {
      // Events not present in the manifest (e.g. Hamcation has no FirmwareEdition).
      const fallback = staticEventModes.find(e => hostMatches(hostname, e.domain))
      if (fallback) {
        setActiveEventMode({ ...fallback, enabled: true })
        applyEventTheme(fallback.theme)
      }
    }
  }
  catch (e) {
    console.error('eventMode: failed to resolve bundled manifest', e)
  }

  // Background refresh from the source of truth; reactively re-applies if the
  // live API resolves an edition for this host (e.g. a build that shipped after
  // this app was deployed). Never blocks mount.
  fetchApiManifest()
    .then((api) => {
      if (api) applyManifest(api)
    })
    .catch(() => {})
})
