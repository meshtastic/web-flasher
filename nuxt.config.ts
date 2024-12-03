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
    '@vite-pwa/nuxt'
  ],

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
      proxy: {
        "^/api/.*": {
          target:
            "http://localhost:6942/",
          changeOrigin: true,
          followRedirects: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
          secure: false,
        }
        // "^/api/.*": {
        //   target:
        //     "https://api.meshtastic.org/",
        //   changeOrigin: true,
        //   followRedirects: true,
        //   rewrite: (path) => path.replace(/^\/api/, ""),
        //   secure: false,
        //   headers: {
        //     Accept: "application/octet-stream",
        //     Origin: 'https://flash.meshtastic.org',
        //     Referer: 'https://flash.meshtastic.org/'
        //   },
        // }
      }
    }
  },

  compatibilityDate: '2024-09-03',
});