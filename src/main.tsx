import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { preloadOfflineTafsir } from "./lib/offlineTafsir";

const APP_SHELL_VERSION = "2026-07-11-mushaf-image-only-v2";
const APP_SHELL_VERSION_KEY = "quran-app-shell-version";

const refreshStaleAppShellCaches = async () => {
  try {
    if (localStorage.getItem(APP_SHELL_VERSION_KEY) === APP_SHELL_VERSION) return;

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) =>
            name.includes("workbox-precache") ||
            name.includes("quran-navigation-cache") ||
            name.includes("quran-assets-cache") ||
            name.includes("quran-mushaf-pages-cache") ||
            name.includes("quran-api-cache")
          )
          .map((name) => caches.delete(name))
      );
    }

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.update().catch(() => undefined)));
    }

    localStorage.setItem(APP_SHELL_VERSION_KEY, APP_SHELL_VERSION);
  } catch (error) {
    console.warn("App shell cache refresh skipped:", error);
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

try {
  void refreshStaleAppShellCaches();

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
} catch (error) {
  showStartupFallback(error);
}
