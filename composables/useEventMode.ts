import { computed } from 'vue'
import { eventMode as staticEventMode } from '~/types/resources'

export const useEventMode = () => {
  const isHamcationDomain = computed(() => {
    if (process.client) {
      const hostname = window.location.hostname
      return hostname.includes('hamcation.meshtastic.org')
    }
    return false
  })

  const eventMode = computed(() => {
    if (isHamcationDomain.value) {
      return {
        ...staticEventMode,
        enabled: true,
      }
    }
    return staticEventMode
  })

  return { eventMode, isHamcationDomain }
}
