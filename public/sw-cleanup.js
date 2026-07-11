const QURAN_APP_CLEANUP_VERSION = "2026-07-11-installed-mushaf-clean-v5";

const APP_CACHE_MATCHERS = [
  "quran-navigation-cache",
  "quran-assets-cache",
  "quran-mushaf-pages-cache",
  "quran-pages-cache",
  "quran-api-cache",
];

const shouldDeleteAppCache = (name) => APP_CACHE_MATCHERS.some((matcher) => name.includes(matcher));

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.allSettled(cacheNames.filter(shouldDeleteAppCache).map((name) => caches.delete(name)));

      await self.clients.claim();

      const windowClients = await self.clients.matchAll({ type: "window" });
      await Promise.allSettled(
        windowClients.map((client) => {
          const url = new URL(client.url);
          if (url.searchParams.get("fresh") === QURAN_APP_CLEANUP_VERSION) return undefined;
          url.searchParams.set("fresh", QURAN_APP_CLEANUP_VERSION);
          return client.navigate(url.toString());
        })
      );
    })()
  );
});