import { useState, useCallback } from 'react';
import { surahs } from '@/data/surahs';
import { sanitizeTajweedHtml } from '@/lib/sanitize';

const CACHE_KEY_PREFIX = 'quran-offline-';
const TEXT_CACHE_STATUS = 'quran-text-cache-status';

interface TextCacheStatus {
  [surahNumber: number]: boolean;
}

const getTextCacheStatus = (): TextCacheStatus => {
  try {
    return JSON.parse(localStorage.getItem(TEXT_CACHE_STATUS) || '{}');
  } catch { return {}; }
};

export const isTextSurahCached = (surahNumber: number): boolean => {
  // Check both the status flag and actual data
  try {
    return !!localStorage.getItem(`${CACHE_KEY_PREFIX}${surahNumber}`);
  } catch { return false; }
};

export const getCachedTextSurahCount = (): number => {
  let count = 0;
  for (let i = 1; i <= 114; i++) {
    if (isTextSurahCached(i)) count++;
  }
  return count;
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
      const [arabicRes, tajweedRes, translationRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`),
        fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/quran-tajweed`),
        fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/fr.hamidullah`),
      ]);

      const [arabicData, tajweedData, translationData] = await Promise.all([
        arabicRes.json(), tajweedRes.json(), translationRes.json(),
      ]);

      if (arabicData.code === 200 && translationData.code === 200) {
        const verses = arabicData.data.ayahs.map((ayah: any, index: number) => ({
          number: ayah.numberInSurah,
          text: ayah.text,
          translation: translationData.data.ayahs[index]?.text || '',
          page: ayah.page,
        }));

        const tajweed: Record<number, string> = {};
        if (tajweedData.code === 200) {
          tajweedData.data.ayahs.forEach((ayah: any) => {
            tajweed[ayah.numberInSurah] = sanitizeTajweedHtml(parseTajweedText(ayah.text));
          });
        }

        localStorage.setItem(`${CACHE_KEY_PREFIX}${surahNumber}`, JSON.stringify({
          verses, tajweed, timestamp: Date.now(),
        }));

        // Update status
        const status = getTextCacheStatus();
        status[surahNumber] = true;
        localStorage.setItem(TEXT_CACHE_STATUS, JSON.stringify(status));
      }
      setProgress(100);
    } catch (err) {
      console.error('Text cache error:', err);
    } finally {
      setIsDownloading(false);
      setDownloadingSurah(null);
      setProgress(0);
    }
  }, []);

  const downloadAllText = useCallback(async () => {
    for (let s = 1; s <= 114; s++) {
      if (isTextSurahCached(s)) continue;
      setProgress(Math.round((s / 114) * 100));
      await downloadSurahText(s);
    }
  }, [downloadSurahText]);

  return {
    downloadSurahText,
    downloadAllText,
    isDownloading,
    downloadingSurah,
    progress,
  };
};
