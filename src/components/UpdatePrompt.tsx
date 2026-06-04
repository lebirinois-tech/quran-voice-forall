import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { registerSW } from 'virtual:pwa-register';

async function clearAppShellServiceWorkers(options: { includeGeneratedSw?: boolean } = {}) {
  if (!("serviceWorker" in navigator)) return 0;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const appRegistrations = registrations.filter((registration) => {
    const scriptUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || '';
    const isGeneratedSw = scriptUrl.endsWith('/sw.js') || registration.scope === `${window.location.origin}/`;
    return options.includeGeneratedSw ? isGeneratedSw : scriptUrl.includes('workbox-') || scriptUrl.includes('service-worker');
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
    if (!('serviceWorker' in navigator)) return;

    const host = window.location.hostname;
    const isPreview =
      !import.meta.env.PROD ||
      window.location.search.includes('sw=off') ||
      window.self !== window.top ||
      host.startsWith('id-preview--') ||
      host.startsWith('preview--') ||
      host === 'lovableproject.com' ||
      host.endsWith('.lovableproject.com') ||
      host === 'lovableproject-dev.com' ||
      host.endsWith('.lovableproject-dev.com') ||
      host === 'beta.lovable.dev' ||
      host.endsWith('.beta.lovable.dev');

    if (isPreview) {
      void clearAppShellServiceWorkers({ includeGeneratedSw: true });
      return;
    }

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        window.dispatchEvent(new CustomEvent('quran-app-update-ready', { detail: { update: () => updateSW(true) } }));
        toast.info('Nouvelle version disponible', {
          action: {
            label: 'Mettre à jour',
            onClick: () => void updateSW(true),
          },
        });
      },
      onOfflineReady() {
        toast.success('Application prête pour l’installation ✅');
      },
      onRegisterError(error) {
        console.error('PWA registration error:', error);
      },
    });
  }, []);

  return null;
};
