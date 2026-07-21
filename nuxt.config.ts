// nuxt.config.ts
import { defineNuxtConfig } from 'nuxt/config'

const ignoredDevWatchPaths = [
  '**/.claude/**',
  '**/.git/**',
  '**/.nuxt/**',
  '**/.output/**',
  '**/.playwright-mcp/**',
  '**/test-results/**',
]

export default defineNuxtConfig({

  modules: ['@pinia/nuxt', '@vite-pwa/nuxt', '@nuxtjs/i18n', '@nuxt/eslint'],

  ssr: false,
  devtools: { enabled: true },

  app: {
    head: {
      script: process.env.COOKIEYES_CLIENT_ID
        ? [
            {
              src: `https://cdn-cookieyes.com/client_data/${process.env.COOKIEYES_CLIENT_ID}/script.js`,
              async: true,
            },
          ]
        : [],
    },
  },
  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      datadogApplicationId: process.env.DATADOG_APPLICATION_ID || '',
      datadogClientToken: process.env.DATADOG_CLIENT_TOKEN || '',
      datadogEnv: process.env.NODE_ENV || 'production',
      cookieyesClientId: process.env.COOKIEYES_CLIENT_ID || '',
      // Alphanaut feedback tool (2.8 bug reporter). Empty URL = feature disabled.
      feedbackWebhookUrl: process.env.FEEDBACK_WEBHOOK_URL || '',
      // NOTE: public runtime config ships in the browser bundle, so this token is
      // intentionally NOT a secret — it is only a best-effort speed-bump against
      // low-effort bots hitting the "Anyone"-access Apps Script endpoint. This is
      // an SPA (ssr: false) with no server runtime to proxy through; real controls
      // are the Apps Script's required-field validation, size caps, and kill switch.
      feedbackToken: process.env.FEEDBACK_TOKEN || '',
    },
  },
  ignore: ignoredDevWatchPaths,

  routeRules: {
    // prerender index route by default
    '/': { prerender: true },
  },

  watchers: {
    chokidar: {
      ignored: ignoredDevWatchPaths,
    },
  },

  compatibilityDate: '2024-09-03',

  vite: {
    plugins: [],
    // xz-decompress is a UMD bundle (with inlined WASM). Pre-bundle it so esbuild
    // takes its CommonJS branch; served raw, its UMD global path dereferences an
    // undefined `this` in ESM context and throws.
    optimizeDeps: {
      include: ['xz-decompress'],
    },
    server: {
      watch: {
        ignored: ignoredDevWatchPaths,
      },
      hmr: {
        overlay: true, // Enable HMR overlay for errors
      },
      proxy: {
        '^/api/.*': {
          // Point at a local api.meshtastic.org instance with e.g.
          // API_PROXY_TARGET=http://localhost:4000 pnpm dev
          target: process.env.API_PROXY_TARGET ?? 'https://api.meshtastic.org/',
          changeOrigin: true,
          followRedirects: true,
          rewrite: path => path.replace(/^\/api/, ''),
          secure: false,
          headers: {
            Accept: 'application/octet-stream',
            Origin: 'https://flash.meshtastic.org',
            Referer: 'https://flash.meshtastic.org/',
          },
        },
      },
    },
  },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  eslint: {
    config: {
      stylistic: true,
      typescript: true,
    },
  },
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
        code: 'pl',
        name: 'Polski',
        file: 'pl.json',
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
        code: 'uk',
        name: 'Українська',
        file: 'uk.json',
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
    vueI18n: '../i18n.config.ts',
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
})
