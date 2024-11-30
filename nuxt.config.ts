// nuxt.config.ts
import { defineNuxtConfig } from 'nuxt/config';
import nodePolyfills from 'vite-plugin-node-stdlib-browser'
import electron from 'vite-plugin-electron/simple'

export default defineNuxtConfig({
  devtools: { enabled: true },

  routeRules: {
    // prerender index route by default
    '/': { prerender: true },
  },

  electron: {
    build: [
      {
        // Main-Process entry file of the Electron App.
        entry: 'electron/main.ts',
      },
    ],
  },

  ssr: false,
  css: ['~/assets/css/main.css'],

  modules: ['@pinia/nuxt', '@vite-pwa/nuxt', 'nuxt-electron'],

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
      electron({
        main: {
          // Shortcut of `build.lib.entry`
          entry: 'electron/main.ts',
        },
        // preload: {
        //   // Shortcut of `build.rollupOptions.input`
        //   input: 'electron/preload.ts',
        // },
        // Optional: Use Node.js API in the Renderer process
        renderer: {},
      }),
    ],
    server: {
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