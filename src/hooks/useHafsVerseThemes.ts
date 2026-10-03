import { useEffect, useState } from 'react';
import type { ThemeId } from '@/data/quranThemes';
import { MUSHAF_PAGES_VERSION } from '@/lib/hafsMushafVersion';

type HafsVerseThemes = Record<string, ThemeId>;

let themesPromise: Promise<HafsVerseThemes> | null = null;

const loadThemes = () => {
  themesPromise ??= fetch(`/data/hafs-verse-themes.json?v=${encodeURIComponent(MUSHAF_PAGES_VERSION)}`, {
    cache: 'force-cache',
  }).then((response) => {
    if (!response.ok) throw new Error(`Hafs themes HTTP ${response.status}`);
    return response.json() as Promise<HafsVerseThemes>;
  });
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
