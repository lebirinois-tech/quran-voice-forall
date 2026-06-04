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
    VitePWA({
      filename: "sw.js",
      registerType: "autoUpdate",
      injectRegister: null,
      devOptions: { enabled: false },
      manifest: false,
      includeAssets: ["pwa-192x192.png", "pwa-512x512.png"],
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/auth/],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "quran-navigation-cache",
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith("/assets/"),
            handler: "CacheFirst",
            options: {
              cacheName: "quran-assets-cache",
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
