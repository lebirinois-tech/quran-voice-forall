import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useHifzPlan } from '@/contexts/HifzPlanContext';
import { localDay } from '@/lib/hifzPlan';
import { HIFZ_NOTIFICATION_ID, readHifzReminder, scheduleHifzReminder, shouldShowHifzReminder } from '@/lib/hifzReminder';

export function HifzReminderMonitor() {
  const { entries, due, ready } = useHifzPlan();
  const navigate = useNavigate();
  useEffect(() => {
    if (!ready) return;
    const configure = () => void scheduleHifzReminder(readHifzReminder(), entries.length > 0).catch(() => {});
    configure();
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      const settings = readHifzReminder();
      const key = 'quran-hifz-reminded-day';
      if (!shouldShowHifzReminder(settings, due.length, localStorage.getItem(key))) return;
      localStorage.setItem(key, localDay());
      toast('Révision du Coran', { description: `${due.length} passage(s) à réviser aujourd’hui.`,
        action: { label: 'Réviser', onClick: () => navigate('/hifz?tab=plan') }, duration: 10000 });
      if (!Capacitor.isNativePlatform() && 'Notification' in window && Notification.permission === 'granted') {
        void (async () => {
          const registration = await navigator.serviceWorker?.getRegistration();
          if (registration) await registration.showNotification('Révision du Coran', { body: `${due.length} passage(s) à réviser.`, tag: 'hifz-review' });
          else { const notification = new Notification('Révision du Coran', { body: `${due.length} passage(s) à réviser.` }); notification.onclick = () => { window.focus(); navigate('/hifz?tab=plan'); }; }
        })().catch(() => {});
      }
    };
    const changed = () => { configure(); check(); };
    check();
    const timer = setInterval(check, 30000);
    window.addEventListener('hifz-reminder-changed', changed);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(timer); window.removeEventListener('hifz-reminder-changed', changed); document.removeEventListener('visibilitychange', check); };
  }, [entries.length, due.length, ready, navigate]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = LocalNotifications.addListener('localNotificationActionPerformed', event => {
      if (event.notification.id === HIFZ_NOTIFICATION_ID) navigate('/hifz?tab=plan');
    });
    return () => { void listener.then(handle => handle.remove()); };
  }, [navigate]);
  return null;
}