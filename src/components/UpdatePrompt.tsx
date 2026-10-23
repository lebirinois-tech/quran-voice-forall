import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { checkPwaUpdate, registerQuranPwa, shouldRegisterPwa } from '@/lib/registerPwa';
import { fetchInstalledUpdateVersion, hasInstalledUpdate, isNativeApp, openApkUpdate, UPDATE_INTERVAL_MS, UPDATE_START_DELAY_MS } from '@/lib/appUpdates';
import { updateMessage } from '@/lib/updateMessages';

let checking = false;
const listeners = new Set<() => void>();
let notifiedBuild = '';
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

const checkUpdate = async (manual = false) => {
  if (checking || (!manual && (!navigator.onLine || document.visibilityState === 'hidden'))) return;
  checking = true;
  listeners.forEach(listener => listener());
  try {
    if (!navigator.onLine) {
      if (manual) toast.error(updateMessage('unavailable'));
      return;
    }
    const remote = await fetchInstalledUpdateVersion();
    if (remote && hasInstalledUpdate(remote)) {
      if (isNativeApp()) {
        if (manual || notifiedBuild !== remote.buildId) {
          notifiedBuild = remote.buildId;
          toast.info(updateMessage('available'), {
            id: 'apk-update', duration: Infinity,
            action: { label: updateMessage('install'), onClick: () => {
              void openApkUpdate().catch(() => toast.error(updateMessage('downloadFailed')));
            } },
          });
        }
      } else if (shouldRegisterPwa()) {
        if (manual) toast.info(updateMessage('webAvailable'));
        await checkPwaUpdate();
      }
    } else {
      if (!isNativeApp()) await checkPwaUpdate();
      if (manual) {
        if (remote) toast.success(updateMessage('current'));
        else toast.error(updateMessage('unavailable'));
      }
    }
  } catch {
    if (manual) toast.error(updateMessage('unavailable'));
  } finally {
    checking = false;
    listeners.forEach(listener => listener());
  }
};

export const useUpdateCheck = () => {
  const isChecking = useSyncExternalStore(subscribe, () => checking);
  const [updateServiceWorker, setUpdateServiceWorker] = useState<(() => Promise<void>) | undefined>();

  const checkForUpdate = useCallback(() => checkUpdate(true), []);

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
    registerQuranPwa((update) => {
      window.dispatchEvent(new CustomEvent('quran-app-update-ready', { detail: { update } }));
    });
    const run = () => { void checkUpdate(); };
    const startup = window.setTimeout(run, UPDATE_START_DELAY_MS);
    const interval = window.setInterval(run, UPDATE_INTERVAL_MS);
    window.addEventListener('online', run);
    document.addEventListener('visibilitychange', run);
    return () => {
      window.clearTimeout(startup);
      window.clearInterval(interval);
      window.removeEventListener('online', run);
      document.removeEventListener('visibilitychange', run);
    };
  }, []);

  return null;
};
