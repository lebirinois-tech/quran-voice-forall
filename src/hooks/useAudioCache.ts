import { useState, useCallback } from 'react';
import { RECITERS, ReciterId } from './useQuranAudio';
import { surahs } from '@/data/surahs';

const AUDIO_CACHE_KEY = 'quran-audio-cache-status';
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

const getWarshDirectUrl = (reciterId: ReciterId, surahNumber: number, verseNumber: number): string => {
  if (reciterId === 'ibrahimDosaryWarsh') {
    return `https://everyayah.com/data/warsh/warsh_ibrahim_aldosary_128kbps/${formatNum(surahNumber)}${formatNum(verseNumber)}.mp3`;
  }
  if (reciterId === 'yassinJazaeryWarsh') {
    return `https://everyayah.com/data/Yassin_Al-Jazaery_64kbps/${formatNum(surahNumber)}${formatNum(verseNumber)}.mp3`;
  }
  return '';
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

    try {
      if (reciterInfo.fullSurah && reciterInfo.fullSurahBaseUrl) {
        // Full-surah reciter: one MP3 per surah, no per-verse files.
        const surahStr = formatNum(surahNumber);
        const url = `${reciterInfo.fullSurahBaseUrl}${surahStr}.mp3`;
        await fetch(url, { mode: 'cors' }).catch(() => {});
        // Save the same surah URL under every verse key so any verse playback resolves to it.
        for (let v = 1; v <= totalVerses; v++) {
          saveAudioUrl(reciterId, surahNumber, v, url);
          setProgress(Math.round((v / totalVerses) * 100));
        }
      } else if (reciterInfo.qiraat === 'warsh') {
        // Direct URL pattern - fetch each verse to populate SW cache + save URL
        for (let v = 1; v <= totalVerses; v++) {
          const url = getWarshDirectUrl(reciterId, surahNumber, v);
          if (url) {
            await fetch(url, { mode: 'cors' }).catch(() => {});
            saveAudioUrl(reciterId, surahNumber, v, url);
          }
          setProgress(Math.round((v / totalVerses) * 100));
        }
      } else {
        // Hafs - get URLs from API then fetch to cache
        // Use verse-level API to match what playVerse uses
        const edition = reciterInfo.id;
        for (let v = 1; v <= totalVerses; v++) {
          try {
            const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNumber}:${v}/${edition}`);
            const data = await res.json();
            if (data.code === 200 && data.data?.audio) {
              // Fetch audio file to populate SW cache
              await fetch(data.data.audio, { mode: 'cors' }).catch(() => {});
              // Save URL for offline lookup
              saveAudioUrl(reciterId, surahNumber, v, data.data.audio);
            }
          } catch {
            // Continue with next verse
          }
          setProgress(Math.round((v / totalVerses) * 100));
        }
      }
      markSurahCached(reciterId, surahNumber);
    } catch (err) {
      console.error('Audio cache error:', err);
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
