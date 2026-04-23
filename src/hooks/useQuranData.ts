import { useState, useEffect } from 'react';
import { Verse } from '@/data/surahs';
import { sanitizeTajweedHtml } from '@/lib/sanitize';

interface QuranApiVerse {
  number: number;
  text: string;
  numberInSurah: number;
  page: number;
}

interface QuranApiResponse {
  code: number;
  data: {
    ayahs: QuranApiVerse[];
  };
}

// Local storage keys for offline cache
const CACHE_KEY_PREFIX = 'quran-offline-';
const getCacheKey = (surahNumber: number) => `${CACHE_KEY_PREFIX}${surahNumber}`;

interface CachedSurahData {
  verses: Verse[];
  tajweed: Record<number, string>;
  timestamp: number;
}

const saveSurahToCache = (surahNumber: number, verses: Verse[], tajweed: Record<number, string>) => {
  try {
    const data: CachedSurahData = { verses, tajweed, timestamp: Date.now() };
    localStorage.setItem(getCacheKey(surahNumber), JSON.stringify(data));
  } catch (e) {
    // localStorage might be full, silently fail
    console.warn('Could not cache surah data:', e);
  }
};

const loadSurahFromCache = (surahNumber: number): CachedSurahData | null => {
  try {
    const raw = localStorage.getItem(getCacheKey(surahNumber));
    if (!raw) return null;
    return JSON.parse(raw) as CachedSurahData;
  } catch {
    return null;
  }
};

// Parse tajweed markers from API into styled HTML
// Using Quran University / Al Muhafez standard color scheme
// Colors extracted from official GTAF Quran app documentation
const parseTajweedText = (text: string): string => {
  // ═══════════════════════════════════════════════════════════════════════════
  // FROZEN TAJWEED COLOR SCHEME - DO NOT MODIFY
  // User confirmed on 2026-01-28: Qalqalah=Blue, Madd=Red, Ghunnah=Green
  // ═══════════════════════════════════════════════════════════════════════════
  const tajweedColors: Record<string, string> = {
    'h': '#AAAAAA', 's': '#AAAAAA', 'l': '#AAAAAA',
    'u': '#AAAAAA', 'd': '#AAAAAA', 'b': '#AAAAAA',
    'g': '#2AAD2A',
    'f': '#DD0000', 'c': '#DD0000', 'n': '#DD0000',
    'p': '#CC0000', 'm': '#BB0000', 'o': '#AA0000',
    'a': '#B266D9', 'w': '#B266D9',
    'q': '#2E6ECB',
    'i': '#D4740C',
  };
  
  let result = text;
  Object.entries(tajweedColors).forEach(([marker, color]) => {
    const regex = new RegExp(`\\[${marker}(?::\\d+)?\\[([^\\]]+)\\]`, 'g');
    result = result.replace(regex, `<span style="color: ${color};">$1</span>`);
  });
  
  return result;
};

export const useQuranData = (surahNumber: number) => {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [versesTajweed, setVersesTajweed] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const fetchVerses = async () => {
      setIsLoading(true);
      setError(null);
      setIsOffline(false);

      try {
        // Fetch Uthmanic Arabic text, Tajweed text, and French translation
        const [arabicResponse, tajweedResponse, translationResponse] = await Promise.all([
          fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`),
          fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/quran-tajweed`),
          fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/fr.hamidullah`),
        ]);

        const arabicData: QuranApiResponse = await arabicResponse.json();
        const tajweedData: QuranApiResponse = await tajweedResponse.json();
        const translationData: QuranApiResponse = await translationResponse.json();

        if (arabicData.code === 200 && translationData.code === 200) {
          const combinedVerses: Verse[] = arabicData.data.ayahs.map((ayah, index) => ({
            number: ayah.numberInSurah,
            text: ayah.text,
            translation: translationData.data.ayahs[index]?.text || '',
            page: ayah.page,
          }));

          const tajweedMap: Record<number, string> = {};
          if (tajweedData.code === 200) {
            tajweedData.data.ayahs.forEach((ayah) => {
              tajweedMap[ayah.numberInSurah] = sanitizeTajweedHtml(parseTajweedText(ayah.text));
            });
          }

          setVerses(combinedVerses);
          setVersesTajweed(tajweedMap);

          // Cache for offline use
          saveSurahToCache(surahNumber, combinedVerses, tajweedMap);
        } else {
          throw new Error('Failed to fetch Quran data');
        }
      } catch (err) {
        console.error('Error fetching Quran data:', err);

        // Try loading from offline cache
        const cached = loadSurahFromCache(surahNumber);
        if (cached) {
          setVerses(cached.verses);
          setVersesTajweed(cached.tajweed);
          setIsOffline(true);
          setError(null);
        } else {
          setError('Impossible de charger les versets. Connectez-vous à Internet pour la première lecture.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchVerses();
  }, [surahNumber]);

  return { verses, versesTajweed, isLoading, error, isOffline };
};
