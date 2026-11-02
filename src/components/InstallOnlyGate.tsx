import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isNativeApp } from "@/lib/appUpdates";

/** Pages that change shared content or accounts; closed in a plain web browser. */
const CLOSED_PATHS = ["/audio-upload", "/audio-library", "/auth"];

const isInstalledApp = () => {
  if (typeof window === "undefined") return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    isNativeApp() ||
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
};

/** Website visitors can try the app (read-only) and install it; sharing/editing pages stay closed. */
export function InstallOnlyGate({ children, bypass }: { children: ReactNode; bypass: boolean }) {
  const { pathname } = useLocation();
  if (bypass || isInstalledApp() || !CLOSED_PATHS.includes(pathname)) return <>{children}</>;
  return <Navigate to="/install" replace />;
}
