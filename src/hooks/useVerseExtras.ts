import { useEffect, useState, useCallback } from 'react';

/** Préférences d'affichage sous chaque verset (mode Versets) : traduction et Tafsir. */
const KEYS = { translation: 'quran-show-translation', tafsir: 'quran-show-tafsir' } as const;
const EVENT = 'quran-verse-extras-change';
type Extra = keyof typeof KEYS;

const read = (k: Extra) => localStorage.getItem(KEYS[k]) !== '0';

export const useVerseExtra = (k: Extra): [boolean, (v: boolean) => void] => {
  const [value, setValue] = useState(() => read(k));
  useEffect(() => {
    const sync = () => setValue(read(k));
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [k]);
  const update = useCallback((v: boolean) => {
    localStorage.setItem(KEYS[k], v ? '1' : '0');
    window.dispatchEvent(new Event(EVENT));
  }, [k]);
  return [value, update];
};
