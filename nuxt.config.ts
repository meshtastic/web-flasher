// https://nuxt.com/docs/api/configuration/nuxt-config
import nodePolyfills from 'vite-plugin-node-stdlib-browser';

export default defineNuxtConfig({
  devtools: { enabled: true },
  routeRules: {
    // prerender index route by default
    '/': { prerender: true },
  },
  css: ['~/assets/css/main.css'],
  modules: [
    '@pinia/nuxt',
  ],
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
        "^/assets/.*": {
          target: "http://github.com/",
          changeOrigin: true,
          followRedirects: true,
          rewrite: (path) => path.replace(/^\/assets/, ""),
          headers: {
            Accept: "application/octet-stream"
          },
          configure: (proxy, _options) => {
            proxy.on("error", (err, _req, _res) => {
              console.log("proxy error", err);
            });
            proxy.on("proxyReq", (proxyReq, req, _res) => {
              console.log(
                "Sending Request:",
                req.method,
                req.url,
                " => TO THE TARGET =>  ",
                proxyReq.method,
                proxyReq.protocol,
                proxyReq.host,
                proxyReq.path,
              );
            });
            proxy.on("proxyRes", (proxyRes, req, _res) => {
              console.log(
                "Received Response from the Target:",
                proxyRes.statusCode,
                req.url,
                JSON.stringify(proxyRes.headers),
              );
            });
          },
        },
        "^/api/.*": {
          target:
            "https://api.meshtastic.org/",
          changeOrigin: true,
          followRedirects: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
          headers: {
            Accept: "application/octet-stream"
          },
        }
      }
    }
  },
});
