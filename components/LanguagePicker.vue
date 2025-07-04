<template>
  <div class="relative inline-block text-left">
    <button id="languageDropdownButton" data-dropdown-toggle="languageDropdown" type="button" 
            class="bottom-button border-meshtastic text-meshtastic">
      {{ currentLanguageFlag }} {{ $t('language') }}
      <svg class="w-2.5 h-2.5 ml-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
      </svg>
    </button>

    <!-- Dropdown menu -->
    <div id="languageDropdown" class="z-10 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-48 dark:bg-gray-700 dark:divide-gray-600">
      <ul class="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="languageDropdownButton">
        <li v-for="locale in availableLocales" :key="locale.code">
          <button @click="switchLanguage(locale.code)" 
                  class="w-full text-left block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                  :class="{ 'bg-gray-100 dark:bg-gray-600': $i18n.locale === locale.code }">
            {{ locale.flag }} {{ locale.name }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale, setLocale, locales } = useI18n()

// Flag mapping for each language code
const flagMap = {
  'en': '🇺🇸',
  'bg': '🇧🇬',
  'cs': '🇨🇿',
  'de': '🇩🇪',
  'es': '🇪🇸',
  'fi': '🇫🇮',
  'fr': '🇫🇷',
  'it': '🇮🇹',
  'ja': '🇯🇵',
  'nl': '🇳🇱',
  'pt': '🇵🇹',
  'ru': '🇷🇺',
  'sv': '🇸🇪',
  'tr': '🇹🇷',
  'zh-Hans': '🇨🇳',
  'zh-Hant': '🇹🇼',
}

// Get available locales from Nuxt i18n config with flags
const availableLocales = computed(() => {
  return locales.value.map(locale => ({
    code: locale.code,
    name: locale.name,
    flag: flagMap[locale.code] || '🌐'
  }))
})

const currentLanguageFlag = computed(() => {
  return flagMap[locale.value] || '🌐'
})

const switchLanguage = async (newLocale) => {
  await setLocale(newLocale)
  // Close the dropdown (Flowbite's way)
  await nextTick()
  const dropdown = document.getElementById('languageDropdown')
  if (dropdown) {
    dropdown.classList.add('hidden')
  }
}
</script>
