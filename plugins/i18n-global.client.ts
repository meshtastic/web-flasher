// Plugin to set up global i18n instance for Pinia stores
import { setGlobalI18n } from '~/utils/i18n'

export default defineNuxtPlugin(({ $i18n }) => {
  // Set the global i18n instance so it can be used in Pinia stores
  console.log('Setting global i18n instance:', $i18n)
  setGlobalI18n($i18n)
  console.log('Global i18n instance set successfully')
})
