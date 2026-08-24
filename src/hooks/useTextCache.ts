import { useState, useCallback } from 'react';
import { surahs } from '@/data/surahs';
import { sanitizeTajweedHtml } from '@/lib/sanitize';
import { putSurahText } from '@/lib/offlineTextStore';

const CACHE_KEY_PREFIX = 'quran-offline-';
const TEXT_CACHE_STATUS = 'quran-text-cache-status';

interface TextCacheStatus {
  [surahNumber: number]: boolean;
}

interface BundledAyah {
  text: string;
  numberInSurah: number;
  page: number;
}

interface BundledSurah {
  arabic: BundledAyah[];
  tajweed: BundledAyah[];
  translation: BundledAyah[];
}

let bundledQuranPromise: Promise<Record<string, BundledSurah>> | null = null;

const getBundledQuran = () => {
  bundledQuranPromise ??= fetch('/data/quran-hafs-fr.json').then((response) => {
    if (!response.ok) throw new Error(`Texte intégré indisponible (${response.status})`);
    return response.json() as Promise<Record<string, BundledSurah>>;
  });
  return bundledQuranPromise;
};

const getTextCacheStatus = (): TextCacheStatus => {
  try {
    return JSON.parse(localStorage.getItem(TEXT_CACHE_STATUS) || '{}');
  } catch { return {}; }
};

export const isTextSurahCached = (surahNumber: number): boolean => {
  try {
    return getTextCacheStatus()[surahNumber] === true || !!localStorage.getItem(`${CACHE_KEY_PREFIX}${surahNumber}`);
  } catch { return false; }
};

export const getCachedTextSurahCount = (): number => {
  return Object.keys(getTextCacheStatus()).length;
};

// Tajweed parser (same as useQuranData)
const parseTajweedText = (text: string): string => {
  const tajweedColors: Record<string, string> = {
    'h': '#AAAAAA', 's': '#AAAAAA', 'l': '#AAAAAA',
    'u': '#AAAAAA', 'd': '#AAAAAA', 'b': '#AAAAAA',
    'g': '#2AAD2A',
    'f': '#DD0000', 'c': '#DD0000', 'n': '#DD0000',
    'p': '#CC0000', 'm': '#BB0000', 'o': '#AA0000',
    'a': '#B266D9', 'w': '#B266D9',
    'q': '#2E6ECB',
    'i': '#D4740C',
  };
  
  let result = text;
  Object.entries(tajweedColors).forEach(([marker, color]) => {
    const regex = new RegExp(`\\[${marker}(?::\\d+)?\\[([^\\]]+)\\]`, 'g');
    result = result.replace(regex, `<span style="color: ${color};">$1</span>`);
  });
  
  return result;
};

export const useTextCache = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingSurah, setDownloadingSurah] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  const downloadSurahText = useCallback(async (surahNumber: number) => {
    if (isTextSurahCached(surahNumber)) return;

    setIsDownloading(true);
    setDownloadingSurah(surahNumber);
    setProgress(0);

    try {
      const bundled = (await getBundledQuran())[String(surahNumber)];
      if (!bundled) throw new Error(`Sourate ${surahNumber} absente du texte intégré`);
      {
        const verses = bundled.arabic.map((ayah, index) => ({
          number: ayah.numberInSurah,
          text: ayah.text,
          translation: bundled.translation[index]?.text || '',
          page: ayah.page,
        }));

        const tajweed: Record<number, string> = {};
        bundled.tajweed.forEach((ayah) => {
          tajweed[ayah.numberInSurah] = sanitizeTajweedHtml(parseTajweedText(ayah.text));
        });

        const stored = await putSurahText(surahNumber, {
          verses, tajweed, timestamp: Date.now(),
        });
        if (!stored) throw new Error('Stockage hors ligne indisponible');

        // Update status
        const status = getTextCacheStatus();
        status[surahNumber] = true;
        localStorage.setItem(TEXT_CACHE_STATUS, JSON.stringify(status));
      }
      setProgress(100);
    } catch (err) {
      console.error('Text cache error:', err);
      throw err;
    } finally {
      setIsDownloading(false);
      setDownloadingSurah(null);
      setProgress(0);
    }
  }, []);

  const downloadAllText = useCallback(async () => {
    setIsDownloading(true);
    setDownloadingSurah(1);
    setProgress(0);
    try {
      await navigator.storage?.persist?.();
      const allSurahs = await getBundledQuran();
      for (let s = 1; s <= 114; s++) {
        setDownloadingSurah(s);
        if (!isTextSurahCached(s)) {
          const bundled = allSurahs[String(s)];
          if (!bundled) throw new Error(`Sourate ${s} absente du texte intégré`);
          const verses = bundled.arabic.map((ayah, index) => ({
            number: ayah.numberInSurah,
            text: ayah.text,
            translation: bundled.translation[index]?.text || '',
            page: ayah.page,
          }));
          const tajweed: Record<number, string> = {};
          bundled.tajweed.forEach((ayah) => {
            tajweed[ayah.numberInSurah] = sanitizeTajweedHtml(parseTajweedText(ayah.text));
          });
          if (!await putSurahText(s, { verses, tajweed, timestamp: Date.now() })) {
            throw new Error('Stockage hors ligne indisponible');
          }
          const status = getTextCacheStatus();
          status[s] = true;
          localStorage.setItem(TEXT_CACHE_STATUS, JSON.stringify(status));
        }
        setProgress(Math.round((s / 114) * 100));
      }
    } finally {
      setIsDownloading(false);
      setDownloadingSurah(null);
    }
  }, []);

  return {
    downloadSurahText,
    downloadAllText,
    isDownloading,
    downloadingSurah,
    progress,
  };
};
