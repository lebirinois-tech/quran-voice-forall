import { useState, useEffect } from 'react';
import { stripLeadingBasmala, surahHasHeaderBasmala } from '@/lib/basmala';
import { getDataset, putDataset } from '@/lib/offlineDatasetStore';
import { QALUN_DATASET_KEY } from '@/lib/autoOfflineRiwayat';

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

const QALUN_DATA_URLS = [
  '/data/qalun-data.json',
  'https://cdn.jsdelivr.net/gh/thetruetruth/quran-data-kfgqpc@main/qaloon/data/QaloonData_v10.json',
  'https://raw.githubusercontent.com/thetruetruth/quran-data-kfgqpc/main/qaloon/data/QaloonData_v10.json',
];
const CACHE_KEY = 'quran-qalun-data-v2';

let qalunDataCache: QalunVerse[] | null = null;

const isQalunData = (data: unknown): data is QalunVerse[] =>
  Array.isArray(data) && data.every((item) => typeof item === 'object' && item !== null && 'sura_no' in item && 'aya_no' in item && 'aya_text' in item);

/** Lecture hors ligne : IndexedDB d'abord (téléchargement auto), puis ancien localStorage. */
const loadFromStorage = async (): Promise<QalunVerse[] | null> => {
  const fromDb = await getDataset<QalunVerse[]>(QALUN_DATASET_KEY);
  if (isQalunData(fromDb)) return fromDb;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isQalunData(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const saveToStorage = async (data: QalunVerse[]) => {
  // ~2,8 Mo : IndexedDB uniquement (le quota localStorage est trop faible).
  await putDataset(QALUN_DATASET_KEY, data);
};

const fetchQalunDataset = async (): Promise<QalunVerse[]> => {
  let lastError: unknown;

  for (const url of QALUN_DATA_URLS) {
    try {
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!isQalunData(data)) throw new Error('Invalid Qalun data');
      return data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const getSurahVerses = (data: QalunVerse[], surahNumber: number): Record<number, string> => {
  const surahVerses: Record<number, string> = {};
  data
    .filter((v) => v.sura_no === surahNumber)
    .forEach((v) => {
      surahVerses[v.aya_no] = v.aya_text;
    });
  if (surahHasHeaderBasmala(surahNumber) && surahVerses[1]) {
    surahVerses[1] = stripLeadingBasmala(surahVerses[1]);
  }
  return surahVerses;
};

export const useQalunData = (surahNumber: number, enabled: boolean) => {
  const [qalunVerses, setQalunVerses] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setQalunVerses({});
      return;
    }

    const fetchQalunData = async () => {
      setIsLoading(true);
      try {
        if (!qalunDataCache) {
          qalunDataCache = await loadFromStorage();
        }

        if (!qalunDataCache) {
          qalunDataCache = await fetchQalunDataset();
          await saveToStorage(qalunDataCache);
        }

        if (!cancelled) {
          setQalunVerses(getSurahVerses(qalunDataCache, surahNumber));
        }
      } catch (err) {
        console.error('Error fetching Qalun data:', err);
        const cached = await loadFromStorage();
        if (!cancelled) {
          setQalunVerses(cached ? getSurahVerses(cached, surahNumber) : {});
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchQalunData();

    return () => {
      cancelled = true;
    };
  }, [surahNumber, enabled]);

  return { qalunVerses, isLoading };
};