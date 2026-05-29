import { useState, useEffect } from 'react';

interface WarshVerse {
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

const WARSH_DATA_URLS = [
  'https://cdn.jsdelivr.net/gh/thetruetruth/quran-data-kfgqpc@main/warsh/data/warshData_v10.json',
  'https://raw.githubusercontent.com/thetruetruth/quran-data-kfgqpc/main/warsh/data/warshData_v10.json',
];
const CACHE_KEY = 'quran-warsh-data-v2';

let warshDataCache: WarshVerse[] | null = null;

const isWarshData = (data: unknown): data is WarshVerse[] =>
  Array.isArray(data) && data.every((item) => typeof item === 'object' && item !== null && 'sura_no' in item && 'aya_no' in item && 'aya_text' in item);

const loadFromStorage = (): WarshVerse[] | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isWarshData(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const saveToStorage = (data: WarshVerse[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not cache Warsh data:', e);
  }
};

const fetchWarshDataset = async (): Promise<WarshVerse[]> => {
  let lastError: unknown;

  for (const url of WARSH_DATA_URLS) {
    try {
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!isWarshData(data)) throw new Error('Invalid Warsh data');
      return data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const getSurahVerses = (data: WarshVerse[], surahNumber: number): Record<number, string> => {
  const surahVerses: Record<number, string> = {};
  data
    .filter((v) => v.sura_no === surahNumber)
    .forEach((v) => {
      surahVerses[v.aya_no] = v.aya_text;
    });
  return surahVerses;
};

export const useWarshData = (surahNumber: number, enabled: boolean) => {
  const [warshVerses, setWarshVerses] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setWarshVerses({});
      return;
    }

    const fetchWarshData = async () => {
      setIsLoading(true);
      try {
        if (!warshDataCache) {
          warshDataCache = loadFromStorage();
        }

        if (!warshDataCache) {
          warshDataCache = await fetchWarshDataset();
          saveToStorage(warshDataCache);
        }

        if (!cancelled) {
          setWarshVerses(getSurahVerses(warshDataCache, surahNumber));
        }
      } catch (err) {
        console.error('Error fetching Warsh data:', err);
        const cached = loadFromStorage();
        if (!cancelled) {
          setWarshVerses(cached ? getSurahVerses(cached, surahNumber) : {});
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchWarshData();

    return () => {
      cancelled = true;
    };
  }, [surahNumber, enabled]);

  return { warshVerses, isLoading };
};
