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

createRoot(document.getElementById("root")!).render(<App />);
