import { useEffect, useState } from 'react';

const CACHE_PREFIX = 'quran-en-sahih-';
const OFFLINE_URL = '/data/quran-en-sahih.json';
const memoryCache: Record<number, Record<number, string>> = {};
const inflight: Record<number, Promise<Record<number, string>> | undefined> = {};
let offlineDatasetPromise: Promise<Record<string, Record<string, string>>> | null = null;

const loadOfflineSurah = async (surah: number): Promise<Record<number, string> | null> => {
  offlineDatasetPromise ??= fetch(OFFLINE_URL, { cache: 'force-cache' }).then((response) => {
    if (!response.ok) throw new Error(`Offline English HTTP ${response.status}`);
    return response.json() as Promise<Record<string, Record<string, string>>>;
  });
  try {
    const source = (await offlineDatasetPromise)[String(surah)];
    if (!source) return null;
    return Object.fromEntries(Object.entries(source).map(([verse, text]) => [Number(verse), text]));
  } catch {
    offlineDatasetPromise = null;
    return null;
  }
};

const loadFromStorage = (surah: number): Record<number, string> | null => {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${surah}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveToStorage = (surah: number, map: Record<number, string>) => {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${surah}`, JSON.stringify(map));
  } catch {
    /* quota — ignore */
  }
};

const fetchSurahEnglish = (surah: number): Promise<Record<number, string>> => {
  if (memoryCache[surah]) return Promise.resolve(memoryCache[surah]);

  const stored = loadFromStorage(surah);
  if (stored) {
    memoryCache[surah] = stored;
    return Promise.resolve(stored);
  }

  if (inflight[surah]) return inflight[surah]!;

  const promise = loadOfflineSurah(surah).then((offline) => {
    if (offline) return offline;
    return fetch(`https://api.alquran.cloud/v1/surah/${surah}/en.sahih`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      if (data?.code !== 200 || !Array.isArray(data?.data?.ayahs)) {
        throw new Error('Invalid English payload');
      }
      const map: Record<number, string> = {};
      for (const ayah of data.data.ayahs) {
        map[ayah.numberInSurah] = ayah.text;
      }
      memoryCache[surah] = map;
      saveToStorage(surah, map);
      return map;
    });
  })
    .then((map) => {
      memoryCache[surah] = map;
      saveToStorage(surah, map);
      return map;
    })
    .finally(() => {
      delete inflight[surah];
    });

  inflight[surah] = promise;
  return promise;
};

/** Returns the English (Saheeh International) translation for a single ayah. */
export const useEnglishTranslation = (
  surahNumber: number,
  verseNumber: number,
  enabled: boolean,
) => {
  const [text, setText] = useState<string | null>(() => {
    if (memoryCache[surahNumber]?.[verseNumber]) return memoryCache[surahNumber][verseNumber];
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const cached = memoryCache[surahNumber]?.[verseNumber];
    if (cached) {
      setText(cached);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchSurahEnglish(surahNumber)
      .then((map) => {
        if (cancelled) return;
        setText(map[verseNumber] ?? null);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('English translation fetch failed', e);
        setError(e?.message || 'fetch failed');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, surahNumber, verseNumber]);

  return { text, isLoading, error };
};