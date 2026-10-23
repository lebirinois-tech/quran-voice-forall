import { registerSW } from "virtual:pwa-register";
import { isNativeApp } from './appUpdates';

let registered = false;
let activeRegistration: ServiceWorkerRegistration | undefined;
let applyUpdate: (() => Promise<void>) | undefined;

export const checkPwaUpdate = async () => {
  if (!shouldRegisterPwa()) return;
  await activeRegistration?.update();
  if (applyUpdate) await applyUpdate();
};

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const isBlockedServiceWorkerHost = () => {
  const host = window.location.hostname.toLowerCase();
  return (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    (/\.(?:lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host) &&
      /^(?:(?:id-preview|preview)(?:-[a-z0-9]+)?--|project--.+-dev$)/.test(host.split('.')[0])) ||
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
    !isNativeApp() &&
    "serviceWorker" in navigator &&
    new URLSearchParams(window.location.search).get('sw') !== 'off' &&
    !isInIframe() &&
    !isBlockedServiceWorkerHost()
  );
};

export const registerQuranPwa = (onNeedRefresh?: (update: () => Promise<void>) => void) => {
  if (!shouldRegisterPwa()) {
    void clearAppShellServiceWorkers();
    return;
  }

  if (registered) return;
  registered = true;

  let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      applyUpdate = () => updateSW?.(true) ?? Promise.resolve();
      onNeedRefresh?.(applyUpdate);
      void applyUpdate().catch(() => undefined);
    },
    onRegisteredSW(_url, registration) {
      activeRegistration = registration;
    },
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent("quran-app-offline-ready"));
    },
  });
};