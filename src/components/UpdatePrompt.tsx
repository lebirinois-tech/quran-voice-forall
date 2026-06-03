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

    // Also re-check when the app becomes visible again (returning from background)
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkOnLaunch();
    };
    const onFocus = () => checkOnLaunch();
    const onOnline = () => checkOnLaunch();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  // Mise à jour totalement automatique : dès qu'une nouvelle version est prête,
  // on l'applique et on recharge l'app sans interaction utilisateur.
  useEffect(() => {
    if (!needRefresh) return;
    (async () => {
      try {
        await updateServiceWorker(true);
      } catch (err) {
        console.error('Auto update failed:', err);
      }
    })();
  }, [needRefresh, updateServiceWorker]);

  return null;
};
