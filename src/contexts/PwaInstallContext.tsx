import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type InstallOutcome = "accepted" | "dismissed" | "unavailable";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaInstallContextValue = {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isPreviewHost: boolean;
  install: () => Promise<InstallOutcome>;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function computeIsPreviewHost(hostname: string) {
  return (
    hostname.includes("id-preview--") ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isPreviewHost, setIsPreviewHost] = useState(false);

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    setIsInstalled(
      window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true
    );

    const hostname = window.location.hostname.toLowerCase();
    setIsPreviewHost(computeIsPreviewHost(hostname));

    const ua = navigator.userAgent.toLowerCase();
    const isAppleTouchDevice = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    setIsIOS(/iphone|ipad|ipod/.test(ua) || isAppleTouchDevice);
    setIsAndroid(/android/.test(ua));
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<InstallOutcome> => {
    if (!deferredPrompt) return "unavailable";

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      return outcome;
    } finally {
      // The event can only be used once.
      setDeferredPrompt(null);
    }
  };

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      deferredPrompt,
      isInstalled,
      isIOS,
      isAndroid,
      isPreviewHost,
      install,
    }),
    [deferredPrompt, isAndroid, isIOS, isInstalled, isPreviewHost]
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall() {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    throw new Error("usePwaInstall must be used within PwaInstallProvider");
  }
  return ctx;
}
