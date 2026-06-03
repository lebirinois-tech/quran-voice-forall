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

// Cache name must match the one declared in vite.config.ts runtimeCaching
// so the service worker will serve these entries on later playback.
const CACHE_NAME_BY_HOST: Record<string, string> = {
  'cdn.islamic.network': 'quran-audio-cache',
  'everyayah.com': 'quran-warsh-audio-cache',
  'archive.org': 'quran-archive-audio-cache',
};

const putInRuntimeCache = async (url: string): Promise<boolean> => {
  if (typeof caches === 'undefined') return false;
  try {
    const host = new URL(url).hostname;
    const cacheName = CACHE_NAME_BY_HOST[host];
    if (!cacheName) return false;
    // Try CORS first so the response is usable; fall back to no-cors (opaque)
    let res: Response | null = null;
    try {
      res = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!res.ok && res.type !== 'opaque') res = null;
    } catch { /* fall through */ }
    if (!res) {
      try {
        res = await fetch(url, { mode: 'no-cors' });
      } catch { return false; }
    }
    const cache = await caches.open(cacheName);
    await cache.put(url, res.clone());
    return true;
  } catch (e) {
    console.warn('[audio-cache] put failed', url, e);
    return false;
  }
};

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
    let okCount = 0;
    let failCount = 0;

    try {
      if (reciterInfo.fullSurah && reciterInfo.fullSurahBaseUrl) {
        // Full-surah reciter: one MP3 per surah, no per-verse files.
        const surahStr = formatNum(surahNumber);
        const url = `${reciterInfo.fullSurahBaseUrl}${surahStr}.mp3`;
        const ok = await putInRuntimeCache(url);
        ok ? okCount++ : failCount++;
        // Save the same surah URL under every verse key so any verse playback resolves to it.
        for (let v = 1; v <= totalVerses; v++) {
          saveAudioUrl(reciterId, surahNumber, v, url);
          setProgress(Math.round((v / totalVerses) * 100));
        }
      } else if (reciterInfo.archiveItem) {
        // archive.org per-verse inside a ZIP per surah
        const surahStr = formatNum(surahNumber);
        for (let v = 1; v <= totalVerses; v++) {
          const url = `https://archive.org/download/${reciterInfo.archiveItem}/${surahStr}.zip/${surahStr}${formatNum(v)}.mp3`;
          const ok = await putInRuntimeCache(url);
          ok ? okCount++ : failCount++;
          saveAudioUrl(reciterId, surahNumber, v, url);
          setProgress(Math.round((v / totalVerses) * 100));
        }
      } else if (reciterInfo.qiraat === 'warsh') {
        // Direct URL pattern - fetch each verse to populate SW cache + save URL
        for (let v = 1; v <= totalVerses; v++) {
          const url = getWarshDirectUrl(reciterId, surahNumber, v);
          if (url) {
            const ok = await putInRuntimeCache(url);
            ok ? okCount++ : failCount++;
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
              const ok = await putInRuntimeCache(data.data.audio);
              ok ? okCount++ : failCount++;
              saveAudioUrl(reciterId, surahNumber, v, data.data.audio);
            }
          } catch {
            failCount++;
          }
          setProgress(Math.round((v / totalVerses) * 100));
        }
      }
      // Only mark as cached if at least some files were stored
      if (okCount > 0) {
        markSurahCached(reciterId, surahNumber);
      }
      if (failCount > 0) {
        console.warn(`[audio-cache] sourate ${surahNumber}: ${okCount} ok, ${failCount} échec`);
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
