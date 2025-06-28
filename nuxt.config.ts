// nuxt.config.ts
import { defineNuxtConfig } from 'nuxt/config';
import nodePolyfills from 'vite-plugin-node-stdlib-browser';

export default defineNuxtConfig({
  devtools: { enabled: true },

  routeRules: {
    // prerender index route by default
    '/': { prerender: true },
  },

  ssr: false,
  css: ['~/assets/css/main.css'],

  modules: [
    '@pinia/nuxt',
    '@vite-pwa/nuxt',
    '@nuxtjs/i18n',
  ],
  i18n: {
    locales: [
      {
        code: 'en',
        name: 'English',
        file: 'en.json',
      },
      {
        code: 'bg',
        name: 'Български',
        file: 'bg.json',
      },
      {
        code: 'cs',
        name: 'Čeština',
        file: 'cs.json',
      },
      {
        code: 'de',
        name: 'Deutsch',
        file: 'de.json',
      },
      {
        code: 'es',
        name: 'Español',
        file: 'es.json',
      },
      {
        code: 'fi',
        name: 'Suomi',
        file: 'fi.json',
      },
      {
        code: 'fr',
        name: 'Français',
        file: 'fr.json',
      },
      {
        code: 'it',
        name: 'Italiano',
        file: 'it.json',
      },
      {
        code: 'ja',
        name: '日本語',
        file: 'ja.json',
      },
      {
        code: 'nl',
        name: 'Nederlands',
        file: 'nl.json',
      },
      {
        code: 'pt',
        name: 'Português',
        file: 'pt.json',
      },
      {
        code: 'ru',
        name: 'Русский',
        file: 'ru.json',
      },
      {
        code: 'sv',
        name: 'Svenska',
        file: 'sv.json',
      },
      {
        code: 'tr',
        name: 'Türkçe',
        file: 'tr.json',
      },
      {
        code: 'zh-Hans',
        name: '简体中文',
        file: 'zh-Hans.json',
      },
      {
        code: 'zh-Hant',
        name: '繁體中文',
        file: 'zh-Hant.json',
      },
    ],
    defaultLocale: 'en',
    lazy: true,
    langDir: 'locales/',
    strategy: 'no_prefix',
    bundle: {
      optimizeTranslationDirective: false,
    },
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_lang',
      redirectOn: 'root',
    },
  },

  pwa: {
    /* PWA options */
  },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  vite: {
    plugins: [
      nodePolyfills(),
    ],
    server: {
      hmr: {
        overlay: true, // Enable HMR overlay for errors
      },
      proxy: {
        "^/api/.*": {
          target:
            "https://api.meshtastic.org/",
          changeOrigin: true,
          followRedirects: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
          secure: false,
          headers: {
            Accept: "application/octet-stream",
            Origin: 'https://flash.meshtastic.org',
            Referer: 'https://flash.meshtastic.org/'
          },
        }
      }
    }
  },

  compatibilityDate: '2024-09-03',
});