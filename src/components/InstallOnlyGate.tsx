import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isNativeApp } from "@/lib/appUpdates";

const OPEN_PATHS = ["/install", "/reset"];

const isInstalledApp = () => {
  if (typeof window === "undefined") return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    isNativeApp() ||
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
};

/** In a plain web browser, only installation is reachable; the app itself opens once installed. */
export function InstallOnlyGate({ children, bypass }: { children: ReactNode; bypass: boolean }) {
  const { pathname } = useLocation();
  if (bypass || isInstalledApp() || OPEN_PATHS.includes(pathname)) return <>{children}</>;
  return <Navigate to="/install" replace />;
}
