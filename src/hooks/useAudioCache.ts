import { useState, useCallback } from 'react';
import { RECITERS, ReciterId } from './useQuranAudio';
import { surahs } from '@/data/surahs';
import { putOfflineAudio } from '@/lib/offlineAudioStore';

// v2 indique que les fichiers sont réellement présents dans IndexedDB.
const AUDIO_CACHE_KEY = 'quran-audio-cache-status-v2';
const AUDIO_URL_CACHE_KEY = 'quran-audio-urls';

interface CacheStatus {
  [reciterId: string]: {
    [surahNumber: number]: boolean;
  };
}

interface AudioUrlCache {
  [reciterId: string]: {
    [key: string]: string; // "surah:verse" -> audioUrl
  };
}

const getCacheStatus = (): CacheStatus => {
  try {
    return JSON.parse(localStorage.getItem(AUDIO_CACHE_KEY) || '{}');
  } catch { return {}; }
};

const setCacheStatus = (status: CacheStatus) => {
  localStorage.setItem(AUDIO_CACHE_KEY, JSON.stringify(status));
};

const markSurahCached = (reciterId: string, surahNumber: number) => {
  const status = getCacheStatus();
  if (!status[reciterId]) status[reciterId] = {};
  status[reciterId][surahNumber] = true;
  setCacheStatus(status);
};

export const isSurahCached = (reciterId: string, surahNumber: number): boolean => {
  return getCacheStatus()[reciterId]?.[surahNumber] || false;
};

export const getCachedSurahCount = (reciterId: string): number => {
  const status = getCacheStatus()[reciterId];
  return status ? Object.keys(status).length : 0;
};

// ─── Audio URL cache for offline playback ───────────────────────────
const getAudioUrlCache = (): AudioUrlCache => {
  try {
    return JSON.parse(localStorage.getItem(AUDIO_URL_CACHE_KEY) || '{}');
  } catch { return {}; }
};

const saveAudioUrl = (reciterId: string, surahNumber: number, verseNumber: number, url: string) => {
  const cache = getAudioUrlCache();
  if (!cache[reciterId]) cache[reciterId] = {};
  cache[reciterId][`${surahNumber}:${verseNumber}`] = url;
  localStorage.setItem(AUDIO_URL_CACHE_KEY, JSON.stringify(cache));
};

/** Get a cached audio URL for offline playback */
export const getCachedAudioUrl = (reciterId: string, surahNumber: number, verseNumber: number): string | null => {
  const cache = getAudioUrlCache();
  return cache[reciterId]?.[`${surahNumber}:${verseNumber}`] || null;
};

const formatNum = (n: number) => n.toString().padStart(3, '0');

// Cache name must match the one declared in vite.config.ts runtimeCaching
// so the service worker will serve these entries on later playback.
const downloadAudioFile = async (
  url: string,
  reciterId: ReciterId,
  surahNumber: number,
  verseNumber: number,
): Promise<boolean> => {
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) return false;
    return putOfflineAudio(reciterId, surahNumber, verseNumber, await response.blob());
  } catch (e) {
    console.warn('[audio-cache] download failed', url, e);
    return false;
  }
};


export const useAudioCache = () => {
  const [downloadingReciter, setDownloadingReciter] = useState<string | null>(null);
  const [downloadingSurah, setDownloadingSurah] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadSurahAudio = useCallback(async (reciterId: ReciterId, surahNumber: number) => {
    const surah = surahs.find(s => s.number === surahNumber);
    if (!surah) return;

    setIsDownloading(true);
    setDownloadingReciter(reciterId);
    setDownloadingSurah(surahNumber);
    setProgress(0);

    const totalVerses = surah.versesCount;
    const reciterInfo = RECITERS[reciterId];
    let okCount = 0;
    let failCount = 0;

    try {
      if (reciterInfo.fullSurah && reciterInfo.fullSurahBaseUrl) {
        // Full-surah reciter: one MP3 per surah, no per-verse files.
        const surahStr = formatNum(surahNumber);
        const url = `${reciterInfo.fullSurahBaseUrl}${surahStr}.mp3`;
        for (let v = 1; v <= totalVerses; v++) {
          const ok = await downloadAudioFile(url, reciterId, surahNumber, v);
          ok ? okCount++ : failCount++;
          saveAudioUrl(reciterId, surahNumber, v, url);
          setProgress(Math.round((v / totalVerses) * 100));
        }
      } else if (reciterInfo.archiveItem) {
        // archive.org per-verse inside a ZIP per surah
        const surahStr = formatNum(surahNumber);
        const zipName = reciterInfo.archiveZipPad === 2
          ? surahNumber.toString().padStart(2, '0')
          : surahStr;
        for (let v = 1; v <= totalVerses; v++) {
          const url = `https://archive.org/download/${reciterInfo.archiveItem}/${zipName}.zip/${surahStr}${formatNum(v)}.mp3`;
          const ok = await downloadAudioFile(url, reciterId, surahNumber, v);
          ok ? okCount++ : failCount++;
          saveAudioUrl(reciterId, surahNumber, v, url);
          setProgress(Math.round((v / totalVerses) * 100));
        }
      } else {
        // Hafs : URL directe, sans dépendre d'un second appel API par verset.
        for (let v = 1; v <= totalVerses; v++) {
          try {
            const url = `https://everyayah.com/data/Husary_128kbps/${formatNum(surahNumber)}${formatNum(v)}.mp3`;
            const ok = await downloadAudioFile(url, reciterId, surahNumber, v);
            ok ? okCount++ : failCount++;
            saveAudioUrl(reciterId, surahNumber, v, url);
          } catch {
            failCount++;
          }
          setProgress(Math.round((v / totalVerses) * 100));
        }
      }
      // Only mark as cached if at least some files were stored
      if (okCount === totalVerses) {
        markSurahCached(reciterId, surahNumber);
      }
      if (failCount > 0) {
        console.warn(`[audio-cache] sourate ${surahNumber}: ${okCount} ok, ${failCount} échec`);
        throw new Error(`${failCount} fichier(s) audio non téléchargé(s)`);
      }
    } catch (err) {
      console.error('Audio cache error:', err);
      throw err;
    } finally {
      setIsDownloading(false);
      setDownloadingReciter(null);
      setDownloadingSurah(null);
      setProgress(0);
    }
  }, []);

  const downloadAllSurahs = useCallback(async (reciterId: ReciterId) => {
    for (let s = 1; s <= 114; s++) {
      if (isSurahCached(reciterId, s)) continue;
      await downloadSurahAudio(reciterId, s);
    }
  }, [downloadSurahAudio]);

  return {
    downloadSurahAudio,
    downloadAllSurahs,
    isDownloading,
    downloadingReciter,
    downloadingSurah,
    progress,
  };
};
