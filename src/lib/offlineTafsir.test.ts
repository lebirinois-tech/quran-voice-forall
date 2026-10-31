import { describe, it, expect, beforeEach } from 'vitest';
import { getTafsirSource, setTafsirSource, getTafsirSourceLabel } from './offlineTafsir';

describe('choix du Tafsir', () => {
  beforeEach(() => localStorage.clear());
  it('Al-Muyassar par défaut', () => expect(getTafsirSource()).toBe('muyassar'));
  it('mémorise As-Sa\'di', () => { setTafsirSource('saadi'); expect(getTafsirSource()).toBe('saadi'); });
  it('libellé arabe Al-Mukhtasar', () => expect(getTafsirSourceLabel('ar', 'mukhtasar')).toBe('المختصر في التفسير'));
});
