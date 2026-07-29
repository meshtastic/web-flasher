import { ref } from 'vue'
import type { EventFirmwareEdition } from '~/types/eventFirmware'

// The full manifest edition resolved by plugins/eventMode.client.ts. The
// eventMode singleton (types/resources.ts) only carries the subset needed to
// drive the flasher, so the edition's extra detail (dates, location, links,
// firmware version) is kept here for display. Null when no manifest edition is
// active (non-event host, or a static fallback event like Hamcation).
const activeEventEdition = ref<EventFirmwareEdition | null>(null)

export function setActiveEventEdition(edition: EventFirmwareEdition): void {
  activeEventEdition.value = edition
}

export const useEventEdition = () => activeEventEdition
