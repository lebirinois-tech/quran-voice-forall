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

const WARSH_DATA_URL = 'https://raw.githubusercontent.com/thetruetruth/quran-data-kfgqpc/main/warsh/data/warshData_v10.json';
const CACHE_KEY = 'quran-warsh-data';

let warshDataCache: WarshVerse[] | null = null;

const loadFromStorage = (): WarshVerse[] | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WarshVerse[];
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

export const useWarshData = (surahNumber: number, enabled: boolean) => {
  const [warshVerses, setWarshVerses] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setWarshVerses({});
      return;
    }

    const fetchWarshData = async () => {
      setIsLoading(true);
      try {
        // Use in-memory cache first
        if (!warshDataCache) {
          warshDataCache = loadFromStorage();
        }

        if (!warshDataCache) {
          const response = await fetch(WARSH_DATA_URL);
          warshDataCache = await response.json();
          if (warshDataCache) {
            saveToStorage(warshDataCache);
          }
        }

        if (warshDataCache) {
          const surahVerses: Record<number, string> = {};
          warshDataCache
            .filter(v => v.sura_no === surahNumber)
            .forEach(v => {
              surahVerses[v.aya_no] = v.aya_text;
            });
          setWarshVerses(surahVerses);
        }
      } catch (err) {
        console.error('Error fetching Warsh data:', err);
        // Try from storage as fallback
        const cached = loadFromStorage();
        if (cached) {
          warshDataCache = cached;
          const surahVerses: Record<number, string> = {};
          cached
            .filter(v => v.sura_no === surahNumber)
            .forEach(v => {
              surahVerses[v.aya_no] = v.aya_text;
            });
          setWarshVerses(surahVerses);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchWarshData();
  }, [surahNumber, enabled]);

  return { warshVerses, isLoading };
};
