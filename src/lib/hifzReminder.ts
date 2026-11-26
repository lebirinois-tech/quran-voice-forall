import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { localDay } from './hifzPlan';

export const HIFZ_NOTIFICATION_ID = 76236;
export interface HifzReminderSettings { enabled: boolean; time: string }
export const reminderStorageKey = 'quran-hifz-reminder-v1';
export function readHifzReminder(): HifzReminderSettings {
  try {
    const value = JSON.parse(localStorage.getItem(reminderStorageKey) ?? '{}');
    return { enabled: value.enabled === true, time: /^([01]\d|2[0-3]):[0-5]\d$/.test(value.time) ? value.time : '08:00' };
  } catch { return { enabled: false, time: '08:00' }; }
}
export function nextReminderDate(time: string, now = new Date()) {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date(now); date.setHours(hour, minute, 0, 0);
  if (date <= now) date.setDate(date.getDate() + 1);
  return date;
}
export function shouldShowHifzReminder(settings: HifzReminderSettings, dueCount: number, lastDay: string | null, now = new Date()) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const [h, m] = settings.time.split(':').map(Number);
  return settings.enabled && dueCount > 0 && lastDay !== localDay(now) && minutes >= h * 60 + m;
}
export async function requestHifzReminderPermission() {
  if (Capacitor.isNativePlatform()) return (await LocalNotifications.requestPermissions()).display === 'granted';
  return 'Notification' in window && (await Notification.requestPermission()) === 'granted';
}
export async function scheduleHifzReminder(settings: HifzReminderSettings, hasEntries: boolean) {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.cancel({ notifications: [{ id: HIFZ_NOTIFICATION_ID }] });
  if (!settings.enabled || !hasEntries || (await LocalNotifications.checkPermissions()).display !== 'granted') return;
  await LocalNotifications.schedule({ notifications: [{
    id: HIFZ_NOTIFICATION_ID, title: 'Révision du Coran · مراجعة القرآن',
    body: 'Votre programme de mémorisation vous attend. Retrouvez les passages à réviser aujourd’hui.',
    extra: { destination: '/hifz?tab=plan' },
    schedule: { at: nextReminderDate(settings.time), every: 'day', allowWhileIdle: true },
    isExactNotification: false,
  }] });
}