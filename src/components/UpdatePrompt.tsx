import { useEffect, useState, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui/button';
import { RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const useUpdateCheck = () => {
  const [isChecking, setIsChecking] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log('SW registered:', swUrl);
      if (r) {
        setInterval(() => { r.update(); }, 5 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const checkForUpdate = useCallback(async () => {
    setIsChecking(true);
    try {
      const registrations = await navigator.serviceWorker?.getRegistrations();
      if (registrations) {
        for (const reg of registrations) {
          await reg.update();
        }
      }
      // Small delay to allow detection
      await new Promise(r => setTimeout(r, 2000));
      if (!needRefresh) {
        toast.success('L\'application est à jour ✅');
      }
    } catch (err) {
      console.error('Update check error:', err);
      toast.error('Impossible de vérifier les mises à jour');
    } finally {
      setIsChecking(false);
    }
  }, [needRefresh]);

  return { needRefresh, isChecking, checkForUpdate, updateServiceWorker };
};

export const UpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log('SW registered:', swUrl);
      if (r) {
        setInterval(() => { r.update(); }, 5 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  // Check for updates on launch
  useEffect(() => {
    const checkOnLaunch = async () => {
      try {
        const registrations = await navigator.serviceWorker?.getRegistrations();
        if (registrations) {
          for (const reg of registrations) {
            await reg.update();
          }
        }
      } catch (err) {
        console.error('Launch update check error:', err);
      }
    };
    // Small delay to let the app render first
    const timer = setTimeout(checkOnLaunch, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (needRefresh) setShowPrompt(true);
  }, [needRefresh]);

  const handleUpdate = async () => {
    await updateServiceWorker(true);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setNeedRefresh(false);
  };

  if (!showPrompt) return null;

  return (
    <div className={cn(
      "fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50",
      "bg-card border border-primary/20 rounded-xl shadow-lg p-4",
      "animate-slide-in-bottom"
    )}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <RefreshCw className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm">Mise à jour disponible ✨</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Une nouvelle version de l'application est prête.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button onClick={handleUpdate} size="sm" className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Mettre à jour
            </Button>
            <Button onClick={handleDismiss} variant="ghost" size="sm">Plus tard</Button>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={handleDismiss} aria-label="Fermer">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
