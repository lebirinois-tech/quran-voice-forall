import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { clearAppShellServiceWorkers, registerQuranPwa, shouldRegisterPwa } from '@/lib/registerPwa';

export const useUpdateCheck = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [updateServiceWorker, setUpdateServiceWorker] = useState<(() => Promise<void>) | undefined>();

  const checkForUpdate = useCallback(async () => {
    setIsChecking(true);
    try {
      if (updateServiceWorker) {
        await updateServiceWorker();
        toast.success('Mise à jour appliquée ✅');
        return;
      }

      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.update();
      toast.success('L\'application est à jour ✅');
    } catch (err) {
      console.error('Update check error:', err);
      toast.error('Impossible de vérifier les mises à jour');
    } finally {
      setIsChecking(false);
    }
  }, [updateServiceWorker]);

  useEffect(() => {
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<{ update: () => Promise<void> }>;
      setUpdateServiceWorker(() => customEvent.detail.update);
    };

    window.addEventListener('quran-app-update-ready', listener);
    return () => window.removeEventListener('quran-app-update-ready', listener);
  }, []);

  return { needRefresh: Boolean(updateServiceWorker), isChecking, checkForUpdate, updateServiceWorker };
};

export const UpdatePrompt = () => {
  useEffect(() => {
    if (!shouldRegisterPwa()) {
      void clearAppShellServiceWorkers();
      return;
    }

    registerQuranPwa((update) => {
      window.dispatchEvent(new CustomEvent('quran-app-update-ready', { detail: { update } }));
      toast.info('Nouvelle version disponible', {
        action: {
          label: 'Mettre à jour',
          onClick: () => void update(),
        },
      });
    });
  }, []);

  return null;
};
