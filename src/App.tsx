import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { PwaInstallProvider } from "@/contexts/PwaInstallContext";
import { UpdatePrompt } from "@/components/UpdatePrompt";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <UpdatePrompt />
        <PwaInstallProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
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
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
