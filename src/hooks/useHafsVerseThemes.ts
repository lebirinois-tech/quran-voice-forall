import { useEffect, useState } from 'react';
import { registerMawduiPassages, type ThemeId } from '@/data/quranThemes';
import { MUSHAF_PAGES_VERSION } from '@/lib/hafsMushafVersion';

type HafsVerseThemes = Record<string, ThemeId>;

let themesPromise: Promise<HafsVerseThemes> | null = null;

const loadThemes = () => {
  const get = <T,>(file: string) =>
    fetch(`/data/${file}?v=${encodeURIComponent(MUSHAF_PAGES_VERSION)}`, { cache: 'force-cache' }).then((response) => {
      if (!response.ok) throw new Error(`${file} HTTP ${response.status}`);
      return response.json() as Promise<T>;
    });
  themesPromise ??= Promise.all([
    get<HafsVerseThemes>('hafs-verse-themes.json'),
    get<Record<string, { t: string; c: number }>>('hafs-mawdui-passages.json'),
  ]).then(([index, passages]) => {
    registerMawduiPassages(passages);
    return index;
  }).catch((error) => { themesPromise = null; throw error; });
  return themesPromise;
};

/** Classification thématique locale des 6 236 versets Hafs. */
export const useHafsVerseThemes = (enabled: boolean) => {
  const [themes, setThemes] = useState<HafsVerseThemes | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      setThemes(null);
      return;
    }
    loadThemes()
      .then((data) => {
        if (!cancelled) setThemes(data);
      })
      .catch(() => {
        if (!cancelled) setThemes(null);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return themes;
};
