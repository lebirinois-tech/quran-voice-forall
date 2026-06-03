import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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

if (isInIframe || isPreviewHost) {
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

// ─── First-run initialization ───────────────────────────────────────────────
// Ensure every app option has a sensible default written to localStorage at
// install time so the user never lands on an "empty" configuration.
(() => {
  const FIRST_RUN_KEY = "quran-first-run-initialized-v1";
  if (localStorage.getItem(FIRST_RUN_KEY)) return;

  const defaults: Record<string, string> = {
    "quran-reciter": "alafasy",
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
