import { useState, useCallback } from 'react';
import { RECITERS, ReciterId } from './useQuranAudio';
import { surahs } from '@/data/surahs';

const AUDIO_CACHE_KEY = 'quran-audio-cache-status';

interface CacheStatus {
  [reciterId: string]: {
    [surahNumber: number]: boolean;
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

const formatNum = (n: number) => n.toString().padStart(3, '0');

const getAudioUrl = (reciterId: ReciterId, surahNumber: number, verseNumber: number): string => {
  if (reciterId === 'ibrahimDosaryWarsh') {
    return `https://everyayah.com/data/warsh/warsh_ibrahim_aldosary_128kbps/${formatNum(surahNumber)}${formatNum(verseNumber)}.mp3`;
  }
  if (reciterId === 'yassinJazaeryWarsh') {
    return `https://everyayah.com/data/Yassin_Al-Jazaery_64kbps/${formatNum(surahNumber)}${formatNum(verseNumber)}.mp3`;
  }
  // For Hafs reciters, we use alquran.cloud API which returns a URL we can cache via SW
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
      if (reciterInfo.qiraat === 'warsh') {
        // Direct URL pattern - fetch each verse to populate SW cache
        for (let v = 1; v <= totalVerses; v++) {
          const url = getAudioUrl(reciterId, surahNumber, v);
          if (url) {
            await fetch(url, { mode: 'cors' }).catch(() => {});
          }
          setProgress(Math.round((v / totalVerses) * 100));
        }
      } else {
        // Hafs - get URLs from API then fetch to cache
        const edition = reciterInfo.id;
        const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${edition}`);
        const data = await res.json();
        if (data.code === 200 && data.data?.ayahs) {
          const ayahs = data.data.ayahs;
          for (let i = 0; i < ayahs.length; i++) {
            if (ayahs[i]?.audio) {
              await fetch(ayahs[i].audio, { mode: 'cors' }).catch(() => {});
            }
            setProgress(Math.round(((i + 1) / ayahs.length) * 100));
          }
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
