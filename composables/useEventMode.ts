import { computed } from 'vue'
import { eventMode as activeEventMode } from '~/types/resources'

// The active event mode is resolved once at startup by
// plugins/eventMode.client.ts (manifest by hostname, with a static fallback).
// This composable just exposes that reactive singleton; consumers keep using
// `eventMode.value` / `eventMode.enabled` exactly as before.
export const useEventMode = () => {
  const eventMode = computed(() => activeEventMode)
  const isEventDomain = computed(() => activeEventMode.enabled)

  return { eventMode, isEventDomain }
}
