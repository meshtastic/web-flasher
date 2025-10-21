export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'en',
  // Ensure missing translations fall back to English
  silentTranslationWarn: false,
  silentFallbackWarn: false,
  // Enable fallback for missing keys
  fallbackWarn: false,
  missingWarn: false,
}))
