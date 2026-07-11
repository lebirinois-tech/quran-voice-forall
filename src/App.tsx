import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { PwaInstallProvider } from "@/contexts/PwaInstallContext";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { FloatingResetButton } from "@/components/FloatingResetButton";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import SurahReader from "./pages/SurahReader";
import Install from "./pages/Install";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Reset from "./pages/Reset";
import AudioLibrary from "./pages/AudioLibrary";
import AudioUpload from "./pages/AudioUpload";

const queryClient = new QueryClient();

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error("Application render failed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-background pattern-islamic flex items-center justify-center px-4 py-10">
          <section className="max-w-md text-center space-y-4">
            <img src="/pwa-192x192.png" alt="Apprenons le Coran" className="mx-auto h-20 w-20 rounded-2xl" />
            <h1 className="text-2xl font-bold text-foreground">Apprenons le Coran</h1>
            <p className="text-muted-foreground">
              Le lancement a été interrompu. Réinitialisez l’application pour supprimer l’ancien cache.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button type="button" onClick={() => window.location.assign('/reset')} className="rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground">
                Réinitialiser
              </button>
              <button type="button" onClick={() => window.location.assign('/app?sw=off')} className="rounded-lg border border-primary px-4 py-3 font-semibold text-primary">
                Réouvrir
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

const isPreviewRuntime = (() => {
  if (typeof window === "undefined") return false;

  const previewHost =
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com");

  try {
    return previewHost || window.self !== window.top;
  } catch {
    return true;
  }
})();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        {!isPreviewRuntime && <UpdatePrompt />}
        <FloatingResetButton />
        <AppErrorBoundary>
          <PwaInstallProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/index" element={<Index />} />
                <Route path="/app" element={<Index />} />
                <Route path="/surah/:surahNumber" element={<SurahReader />} />
                <Route path="/install" element={<Install />} />
                <Route path="/reset" element={<Reset />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/audio-library" element={<AudioLibrary />} />
                <Route path="/audio-upload" element={<AudioUpload />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </PwaInstallProvider>
        </AppErrorBoundary>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
