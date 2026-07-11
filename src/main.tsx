import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { preloadOfflineTafsir } from "./lib/offlineTafsir";
import {
  HAFS_MUSHAF_VERSION,
  HAFS_MUSHAF_VERSION_KEY,
  HAFS_CACHE_URL_MARKER,
} from "./lib/hafsMushafVersion";

const APP_SHELL_VERSION = "2026-07-11-hafs-tajweed-themes-v7";
const APP_SHELL_VERSION_KEY = "quran-app-shell-version";
const APP_SHELL_RELOAD_KEY = "quran-app-shell-reload-version";

const APP_CACHE_NAME_MATCHERS = [
  "workbox-precache",
  "precache",
  "quran-navigation-cache",
  "quran-assets-cache",
  "quran-mushaf-pages-cache",
  "quran-pages-cache",
  "quran-api-cache",
    "vite-precache",
];

const normalizeOldMushafSettings = () => {
  const savedDisplayStyle = localStorage.getItem("quran-text-display-style");
  const migrations: Record<string, string> = {
    "mushaf-hafs": "pages-hafs",
    "mushaf-warsh": "pages-warsh",
    "mushaf-qalun": "pages-qalun",
    "mushaf-hafs-video": "pages-hafs-video",
    "mushaf-warsh-video": "pages-warsh-video",
    "mushaf-qalun-video": "pages-qalun-video",
  };

  if (savedDisplayStyle && migrations[savedDisplayStyle]) {
    localStorage.setItem("quran-text-display-style", migrations[savedDisplayStyle]);
  }
};

const refreshStaleAppShellCaches = async () => {
  try {
    normalizeOldMushafSettings();
    await refreshStaleHafsMushafCaches();
    if (localStorage.getItem(APP_SHELL_VERSION_KEY) === APP_SHELL_VERSION) return false;

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => APP_CACHE_NAME_MATCHERS.some((matcher) => name.includes(matcher)))
          .map((name) => caches.delete(name))
      );
    }

    let hadController = false;
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      hadController = Boolean(navigator.serviceWorker.controller || registrations.length > 0);
      await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
    }

    localStorage.setItem(APP_SHELL_VERSION_KEY, APP_SHELL_VERSION);

    if (hadController && sessionStorage.getItem(APP_SHELL_RELOAD_KEY) !== APP_SHELL_VERSION) {
      sessionStorage.setItem(APP_SHELL_RELOAD_KEY, APP_SHELL_VERSION);
      const freshUrl = new URL(window.location.href);
      freshUrl.searchParams.set("fresh", APP_SHELL_VERSION);
      window.location.replace(freshUrl.toString());
      return true;
    }

    sessionStorage.removeItem(APP_SHELL_RELOAD_KEY);
    return false;
  } catch (error) {
    console.warn("App shell cache refresh skipped:", error);
    return false;
  }
};

// Force-refresh Hafs Mushaf image caches on every new HAFS_MUSHAF_VERSION.
// Runs independently of APP_SHELL_VERSION so a Hafs-only bump still purges
// stale page images on devices that already have the latest app shell.
const refreshStaleHafsMushafCaches = async () => {
  try {
    if (localStorage.getItem(HAFS_MUSHAF_VERSION_KEY) === HAFS_MUSHAF_VERSION) return;

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(async (cacheName) => {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          await Promise.all(
            requests
              .filter((request) => {
                const url = request.url;
                if (!url.includes(HAFS_CACHE_URL_MARKER)) return false;
                // Keep entries already keyed on the current version.
                return !url.includes(`v=${HAFS_MUSHAF_VERSION}`);
              })
              .map((request) => cache.delete(request))
          );
        })
      );
    }

    localStorage.setItem(HAFS_MUSHAF_VERSION_KEY, HAFS_MUSHAF_VERSION);
  } catch (error) {
    console.warn("Hafs Mushaf cache refresh skipped:", error);
  }
};

function showStartupFallback(error?: unknown) {
  const root = document.getElementById("root");
  if (!root) return;

  console.error("Application startup failed:", error);
  root.innerHTML = `
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#fdf6e3;color:#123524;font-family:system-ui,-apple-system,Segoe UI,sans-serif;text-align:center;">
      <section style="max-width:520px;">
        <img src="/pwa-192x192.png" alt="Apprenons le Coran" style="width:88px;height:88px;border-radius:20px;margin-bottom:18px;" />
        <h1 style="font-size:24px;margin:0 0 10px;">Apprenons le Coran</h1>
        <p style="margin:0 0 18px;line-height:1.6;">Le lancement a été interrompu. Réinitialisez l’application puis rouvrez-la.</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <a href="/reset" style="padding:12px 16px;border-radius:10px;background:#1b7f5a;color:white;text-decoration:none;font-weight:700;">Réinitialiser</a>
          <a href="/app?sw=off" style="padding:12px 16px;border-radius:10px;border:1px solid #1b7f5a;color:#1b7f5a;text-decoration:none;font-weight:700;">Réouvrir</a>
        </div>
      </section>
    </main>
  `;
}

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isInIframe || isPreviewHost || window.location.search.includes("sw=off")) {
  navigator.serviceWorker?.getRegistrations().then(async (registrations) => {
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if (registrations.length > 0 && navigator.serviceWorker.controller && !sessionStorage.getItem("sw-preview-reset")) {
      sessionStorage.setItem("sw-preview-reset", "1");
      window.location.reload();
      return;
    }

    sessionStorage.removeItem("sw-preview-reset");
  });
}

const startApp = async () => {
  const reloadingForFreshShell = await refreshStaleAppShellCaches();
  if (reloadingForFreshShell) return;

  // ─── First-run initialization ─────────────────────────────────────────────
  // Ensure every app option has a sensible default written to localStorage at
  // install time so the user never lands on an "empty" configuration.
  (() => {
    const FIRST_RUN_KEY = "quran-first-run-initialized-v1";
    const RECITER_MIGRATION_KEY = "quran-reciter-list-v2";
    const allowedReciters = new Set(["husary", "ibrahimDosaryWarsh", "husaryQalunPerVerse"]);
    const savedReciter = localStorage.getItem("quran-reciter");

    if (!allowedReciters.has(savedReciter || "")) {
      localStorage.setItem("quran-reciter", "husary");
    }

    if (localStorage.getItem(RECITER_MIGRATION_KEY) !== "done") {
      localStorage.setItem(RECITER_MIGRATION_KEY, "done");
    }

    if (localStorage.getItem(FIRST_RUN_KEY)) return;

    const defaults: Record<string, string> = {
      "quran-reciter": "husary",
      "quran-background-color": "hsl(45, 30%, 96%)",
      "quran-text-display-style": "tajweed",
      "quran-font-size": "medium",
      "quran-tts-lang": "fr",
      "quran-audio-speed": "1",
      "quran-continuous-mode": "false",
    };

    for (const [k, v] of Object.entries(defaults)) {
      if (localStorage.getItem(k) === null) {
        try { localStorage.setItem(k, v); } catch { /* quota */ }
      }
    }

    localStorage.setItem(FIRST_RUN_KEY, new Date().toISOString());
  })();

  createRoot(document.getElementById("root")!).render(<App />);
  // Pré-charge les datasets Tafsir bundle (AR Al-Muyassar + FR Al-Montada)
  // pour qu'ils soient disponibles immédiatement et hors-ligne.
  preloadOfflineTafsir();
};

startApp().catch((error) => {
  showStartupFallback(error);
});
