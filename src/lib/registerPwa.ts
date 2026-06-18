import { registerSW } from "virtual:pwa-register";

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const isBlockedServiceWorkerHost = () => {
  const host = window.location.hostname;
  return (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  );
};

export const clearAppShellServiceWorkers = async () => {
  if (!("serviceWorker" in navigator)) return 0;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const appRegistrations = registrations.filter((registration) => {
    const scriptUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || "";
    return scriptUrl.endsWith("/sw.js") || registration.scope === `${window.location.origin}/`;
  });

  await Promise.all(appRegistrations.map((registration) => registration.unregister()));
  return appRegistrations.length;
};

export const shouldRegisterPwa = () => {
  return (
    import.meta.env.PROD &&
    "serviceWorker" in navigator &&
    !window.location.search.includes("sw=off") &&
    !isInIframe() &&
    !isBlockedServiceWorkerHost()
  );
};

export const registerQuranPwa = (onNeedRefresh?: (update: () => Promise<void>) => void) => {
  if (!shouldRegisterPwa()) {
    void clearAppShellServiceWorkers();
    return;
  }

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      onNeedRefresh?.(updateSW);
    },
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent("quran-app-offline-ready"));
    },
  });
};