import { useState, useCallback } from 'react';
import { surahs } from '@/data/surahs';
import { getOfflineTafsir } from '@/lib/offlineTafsir';

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
      // Les trois Tafsir sont déjà inclus dans l'application et l'APK.
      // Cette vérification confirme que le fichier embarqué est lisible hors ligne.
      const samples = await Promise.all([
        getOfflineTafsir(surahNumber, 1, 'ar'),
        getOfflineTafsir(surahNumber, 1, 'fr'),
        getOfflineTafsir(surahNumber, 1, 'en'),
      ]);
      if (samples.some((sample) => !sample)) throw new Error('Tafsir intégré incomplet');
      const status = getTafsirCacheStatus();
      status[surahNumber] = true;
      localStorage.setItem(TAFSIR_CACHE_STATUS, JSON.stringify(status));
      setProgress(100);
    } catch (err) {
      console.error('Tafsir cache error:', err);
      throw err;
    } finally {
      setIsDownloading(false);
      setDownloadingSurah(null);
      setProgress(0);
    }
  }, []);

  const downloadAllTafsir = useCallback(async () => {
    setIsDownloading(true);
    setDownloadingSurah(1);
    setProgress(0);
    try {
      const samples = await Promise.all([
        getOfflineTafsir(1, 1, 'ar'),
        getOfflineTafsir(1, 1, 'fr'),
        getOfflineTafsir(1, 1, 'en'),
      ]);
      if (samples.some((sample) => !sample)) throw new Error('Tafsir intégré incomplet');
      const status = getTafsirCacheStatus();
      for (let s = 1; s <= 114; s++) {
        setDownloadingSurah(s);
        status[s] = true;
        setProgress(Math.round((s / 114) * 100));
      }
      localStorage.setItem(TAFSIR_CACHE_STATUS, JSON.stringify(status));
    } finally {
      setIsDownloading(false);
      setDownloadingSurah(null);
    }
  }, []);

  return {
    downloadSurahTafsir,
    downloadAllTafsir,
    isDownloading,
    downloadingSurah,
    progress,
  };
};
