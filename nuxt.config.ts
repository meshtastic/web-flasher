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
      // {
      //   code: 'es',
      //   name: 'Español',
      //   file: 'es.json',
      // },
    ],
    defaultLocale: 'en',
    lazy: true,
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