<template>
  <div class="relative inline-block text-left">
    <button
      id="languageDropdownButton"
      data-dropdown-toggle="languageDropdown"
      type="button"
      class="btn-secondary"
    >
      {{ currentLanguageFlag }} {{ $t('language') }}
      <ChevronDown class="w-2.5 h-2.5 ml-2 shrink-0" />
    </button>

    <!-- Dropdown menu -->
    <div
      id="languageDropdown"
      class="z-10 hidden rounded-lg shadow w-48 dropdown-menu"
    >
      <ul
        class="py-2 text-sm text-theme-muted"
        aria-labelledby="languageDropdownButton"
      >
        <li
          v-for="locale in availableLocales"
          :key="locale.code"
        >
          <button
            class="w-full text-left block px-4 py-2 hover:text-theme-accent hover:bg-surface-secondary transition-colors"
            @click="switchLanguage(locale.code)"
          >
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
import { ChevronDown } from 'lucide-vue-next'

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
  'pl': '🇵🇱',
  'ru': '🇷🇺',
  'sv': '🇸🇪',
  'tr': '🇹🇷',
  'uk': '🇺🇦',
  'zh-Hans': '🇨🇳',
  'zh-Hant': '🇹🇼',
}

// Get available locales from Nuxt i18n config with flags
const availableLocales = computed(() => {
  return locales.value.map(locale => ({
    code: locale.code,
    name: locale.name,
    flag: flagMap[locale.code] || '🌐',
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
