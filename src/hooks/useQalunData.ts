import { useState, useEffect } from 'react';

interface QalunVerse {
  id: number;
  jozz: number;
  page: string;
  sura_no: number;
  sura_name_en: string;
  sura_name_ar: string;
  line_start: number;
  line_end: number;
  aya_no: number;
  aya_text: string;
}

const QALUN_DATA_URL =
  'https://raw.githubusercontent.com/thetruetruth/quran-data-kfgqpc/main/qaloon/data/QaloonData_v10.json';
const CACHE_KEY = 'quran-qalun-data';

let qalunDataCache: QalunVerse[] | null = null;

const loadFromStorage = (): QalunVerse[] | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QalunVerse[];
  } catch {
    return null;
  }
};

const saveToStorage = (data: QalunVerse[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not cache Qalun data:', e);
  }
};

export const useQalunData = (surahNumber: number, enabled: boolean) => {
  const [qalunVerses, setQalunVerses] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setQalunVerses({});
      return;
    }

    const fetchQalunData = async () => {
      setIsLoading(true);
      try {
        if (!qalunDataCache) {
          qalunDataCache = loadFromStorage();
        }

        if (!qalunDataCache) {
          const response = await fetch(QALUN_DATA_URL);
          qalunDataCache = await response.json();
          if (qalunDataCache) saveToStorage(qalunDataCache);
        }

        if (qalunDataCache) {
          const surahVerses: Record<number, string> = {};
          qalunDataCache
            .filter((v) => v.sura_no === surahNumber)
            .forEach((v) => {
              surahVerses[v.aya_no] = v.aya_text;
            });
          setQalunVerses(surahVerses);
        }
      } catch (err) {
        console.error('Error fetching Qalun data:', err);
        const cached = loadFromStorage();
        if (cached) {
          qalunDataCache = cached;
          const surahVerses: Record<number, string> = {};
          cached
            .filter((v) => v.sura_no === surahNumber)
            .forEach((v) => {
              surahVerses[v.aya_no] = v.aya_text;
            });
          setQalunVerses(surahVerses);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchQalunData();
  }, [surahNumber, enabled]);

  return { qalunVerses, isLoading };
};