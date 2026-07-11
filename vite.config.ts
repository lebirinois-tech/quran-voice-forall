import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      strategies: "generateSW",
      filename: "sw.js",
      registerType: "autoUpdate",
      injectRegister: null,
      manifest: false,
      devOptions: { enabled: false },
      workbox: {
        importScripts: ["sw-cleanup.js"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/~oauth(?:\/|$)/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,woff,woff2,ttf}", "data/*.json"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
            handler: "NetworkFirst",
            options: {
              cacheName: "quran-navigation-cache-v6",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 20, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: ({ url }) => /\/assets\/.*\.(?:js|css|woff2?|ttf)$/.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "quran-assets-cache-v6",
              expiration: { maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/api\.alquran\.cloud\/v1\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "quran-api-cache-v6",
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 800, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/(?:everyayah\.com|archive\.org)\//,
            handler: "CacheFirst",
            options: {
              cacheName: "quran-audio-cache-v6",
              expiration: { maxEntries: 2000, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200, 206] },
            },
          },
          {
            urlPattern: /^https:\/\/(?:cdn\.jsdelivr\.net\/gh\/jahedev\/tajweed-quran-pages|raw\.githubusercontent\.com\/jahedev\/tajweed-quran-pages)\//,
            handler: "CacheFirst",
            options: {
              cacheName: "quran-mushaf-pages-cache-v6",
              expiration: { maxEntries: 700, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
