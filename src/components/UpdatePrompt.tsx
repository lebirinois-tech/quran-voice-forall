import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

async function clearAppShellServiceWorkers() {
  if (!("serviceWorker" in navigator)) return 0;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const appRegistrations = registrations.filter((registration) => {
    const scriptUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || '';
    return scriptUrl.endsWith('/sw.js') || registration.scope === `${window.location.origin}/`;
  });

  await Promise.all(appRegistrations.map(async (registration) => {
    try {
      await registration.update();
    } catch {
      // Ignore update errors: unregistering is enough to recover the app shell.
    }
    await registration.unregister();
  }));

  return appRegistrations.length;
}

export const useUpdateCheck = () => {
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdate = useCallback(async () => {
    setIsChecking(true);
    try {
      const removed = await clearAppShellServiceWorkers();
      if (removed > 0) toast.success('Cache de l’application réinitialisé ✅');
      else toast.success('L\'application est à jour ✅');
    } catch (err) {
      console.error('Update check error:', err);
      toast.error('Impossible de vérifier les mises à jour');
    } finally {
      setIsChecking(false);
    }
  }, []);

  return { needRefresh: false, isChecking, checkForUpdate, updateServiceWorker: undefined };
};

export const UpdatePrompt = () => {
  useEffect(() => {
    const clearStaleAppShell = async () => {
      try {
        await clearAppShellServiceWorkers();
      } catch (err) {
        console.error('Service worker cleanup error:', err);
      }
    };

    void clearStaleAppShell();
  }, []);

  return null;
};
