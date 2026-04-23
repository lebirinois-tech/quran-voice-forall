import { useEffect, useState } from 'react';

export type TtsLang = 'fr' | 'en';

const STORAGE_KEY = 'verse-tts-lang';
const EVENT = 'tts-lang-change';

export const getStoredTtsLang = (): TtsLang => {
  if (typeof window === 'undefined') return 'fr';
  return (localStorage.getItem(STORAGE_KEY) as TtsLang) || 'fr';
};

export const setStoredTtsLang = (lang: TtsLang) => {
  localStorage.setItem(STORAGE_KEY, lang);
  window.dispatchEvent(new CustomEvent<TtsLang>(EVENT, { detail: lang }));
};

export const useTtsLang = () => {
  const [lang, setLang] = useState<TtsLang>(getStoredTtsLang);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<TtsLang>).detail;
      if (detail) setLang(detail);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const update = (l: TtsLang) => {
    setStoredTtsLang(l);
    setLang(l);
  };

  return [lang, update] as const;
};
