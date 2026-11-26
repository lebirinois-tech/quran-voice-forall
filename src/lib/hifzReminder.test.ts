import { describe, expect, it } from 'vitest';
import { nextReminderDate, shouldShowHifzReminder } from './hifzReminder';
describe('Rappel automatique de révision', () => {
  const settings = { enabled: true, time: '08:00' };
  it('attend l’heure choisie et ne rappelle qu’une fois par jour', () => {
    expect(shouldShowHifzReminder(settings, 1, null, new Date(2026, 10, 26, 7, 59))).toBe(false);
    expect(shouldShowHifzReminder(settings, 1, null, new Date(2026, 10, 26, 8))).toBe(true);
    expect(shouldShowHifzReminder(settings, 1, '2026-11-26', new Date(2026, 10, 26, 9))).toBe(false);
  });
  it('ne rappelle pas sans révision ni si les rappels sont désactivés', () => {
    expect(shouldShowHifzReminder(settings, 0, null, new Date(2026, 10, 26, 9))).toBe(false);
    expect(shouldShowHifzReminder({ ...settings, enabled: false }, 1, null, new Date(2026, 10, 26, 9))).toBe(false);
  });
  it('programme demain si l’heure choisie est passée', () => {
    expect(nextReminderDate('08:00', new Date(2026, 10, 26, 9))).toEqual(new Date(2026, 10, 27, 8));
    expect(nextReminderDate('08:00', new Date(2026, 10, 26, 7))).toEqual(new Date(2026, 10, 26, 8));
  });
});