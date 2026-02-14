import { useState, useCallback } from 'react';
import { surahs } from '@/data/surahs';

const TAFSIR_CACHE_PREFIX = 'quran-tafsir-';
const TAFSIR_CACHE_STATUS = 'quran-tafsir-cache-status';

interface TafsirCacheStatus {
  [surahNumber: number]: boolean;
}

/** Get cached tafsir for a specific verse */
export const getCachedTafsir = (surahNumber: number, verseNumber: number): string | null => {
  try {
    const raw = localStorage.getItem(`${TAFSIR_CACHE_PREFIX}${surahNumber}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as Record<number, string>;
    return data[verseNumber] || null;
  } catch {
    return null;
  }
};

/** Save tafsir for a single verse */
export const saveTafsirToCache = (surahNumber: number, verseNumber: number, text: string) => {
  try {
    const key = `${TAFSIR_CACHE_PREFIX}${surahNumber}`;
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    existing[verseNumber] = text;
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (e) {
    console.warn('Could not cache tafsir:', e);
  }
};

const getTafsirCacheStatus = (): TafsirCacheStatus => {
  try {
    return JSON.parse(localStorage.getItem(TAFSIR_CACHE_STATUS) || '{}');
  } catch { return {}; }
};

export const isTafsirSurahCached = (surahNumber: number): boolean => {
  return getTafsirCacheStatus()[surahNumber] || false;
};

export const getCachedTafsirSurahCount = (): number => {
  return Object.keys(getTafsirCacheStatus()).length;
};

export const useTafsirCache = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingSurah, setDownloadingSurah] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  const downloadSurahTafsir = useCallback(async (surahNumber: number) => {
    const surah = surahs.find(s => s.number === surahNumber);
    if (!surah) return;

    setIsDownloading(true);
    setDownloadingSurah(surahNumber);
    setProgress(0);

    try {
      // Fetch all tafsir for the surah at once
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/ar.muyassar`);
      const data = await res.json();

      if (data.code === 200 && data.data?.ayahs) {
        const ayahs = data.data.ayahs;
        for (let i = 0; i < ayahs.length; i++) {
          saveTafsirToCache(surahNumber, ayahs[i].numberInSurah, ayahs[i].text);
          setProgress(Math.round(((i + 1) / ayahs.length) * 100));
        }

        // Mark surah as fully cached
        const status = getTafsirCacheStatus();
        status[surahNumber] = true;
        localStorage.setItem(TAFSIR_CACHE_STATUS, JSON.stringify(status));
      }
    } catch (err) {
      console.error('Tafsir cache error:', err);
    } finally {
      setIsDownloading(false);
      setDownloadingSurah(null);
      setProgress(0);
    }
  }, []);

  const downloadAllTafsir = useCallback(async () => {
    for (let s = 1; s <= 114; s++) {
      if (isTafsirSurahCached(s)) continue;
      await downloadSurahTafsir(s);
    }
  }, [downloadSurahTafsir]);

  return {
    downloadSurahTafsir,
    downloadAllTafsir,
    isDownloading,
    downloadingSurah,
    progress,
  };
};
