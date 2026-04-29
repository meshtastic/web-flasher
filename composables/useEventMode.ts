import { computed } from 'vue'
import { eventMode as staticEventMode } from '~/types/resources'

export const useEventMode = () => {
  const isEventDomain = computed(() => {
    if (process.client) {
      return window.location.hostname.includes(staticEventMode.domain)
    }
    return false
  })

  const eventMode = computed(() => {
    if (isEventDomain.value) {
      return {
        ...staticEventMode,
        enabled: true,
      }
    }
    return staticEventMode
  })

  return { eventMode, isEventDomain }
}
