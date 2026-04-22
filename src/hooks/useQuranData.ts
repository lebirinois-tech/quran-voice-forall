import { useState, useEffect } from 'react';
import { Verse } from '@/data/surahs';
import { sanitizeTajweedHtml } from '@/lib/sanitize';
import { useTranslation } from 'react-i18next';

// Map app language to AlQuran Cloud translation edition.
const TRANSLATION_EDITIONS: Record<string, string> = {
  fr: 'fr.hamidullah',
  en: 'en.sahih',
  ar: 'ar.muyassar',
};

const getTranslationEdition = (lang: string): string => {
  const code = (lang || 'fr').split('-')[0];
  return TRANSLATION_EDITIONS[code] || TRANSLATION_EDITIONS.fr;
};

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
const getCacheKey = (
  surahNumber: number,
  lang: string,
  secondaryEdition: string | null,
) =>
  `${CACHE_KEY_PREFIX}${surahNumber}-${lang}${
    secondaryEdition ? `-${secondaryEdition}` : ''
  }`;

interface CachedSurahData {
  verses: Verse[];
  tajweed: Record<number, string>;
  timestamp: number;
}

const saveSurahToCache = (
  surahNumber: number,
  lang: string,
  secondaryEdition: string | null,
  verses: Verse[],
  tajweed: Record<number, string>,
) => {
  try {
    const data: CachedSurahData = { verses, tajweed, timestamp: Date.now() };
    localStorage.setItem(
      getCacheKey(surahNumber, lang, secondaryEdition),
      JSON.stringify(data),
    );
  } catch (e) {
    // localStorage might be full, silently fail
    console.warn('Could not cache surah data:', e);
  }
};

const loadSurahFromCache = (
  surahNumber: number,
  lang: string,
  secondaryEdition: string | null,
): CachedSurahData | null => {
  try {
    // Try the most specific cache (lang + secondary), then lang-only, then legacy.
    const raw =
      localStorage.getItem(getCacheKey(surahNumber, lang, secondaryEdition)) ||
      localStorage.getItem(getCacheKey(surahNumber, lang, null)) ||
      localStorage.getItem(`${CACHE_KEY_PREFIX}${surahNumber}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSurahData;
    // If the user wants dual translation but cached data doesn't have it,
    // ignore the cache to force a fresh fetch.
    if (secondaryEdition) {
      const hasSecondary = parsed.verses.some(
        (v) => typeof v.translation2 === 'string' && v.translation2.length > 0,
      );
      if (!hasSecondary) return null;
    }
    return parsed;
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

export const useQuranData = (
  surahNumber: number,
  showDualTranslation = false,
) => {
  const { i18n } = useTranslation();
  const lang = (i18n.language || 'fr').split('-')[0];
  // Primary translation always matches the UI language.
  const translationEdition = getTranslationEdition(lang);
  // In dual mode, add a secondary translation in a *different* language.
  // - UI in FR → secondary = EN
  // - UI in EN → secondary = FR
  // - UI in AR → secondary = EN
  const secondaryEdition: string | null = !showDualTranslation
    ? null
    : lang === 'en'
      ? 'fr.hamidullah'
      : 'en.sahih';

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
        // Fetch Uthmanic Arabic text, Tajweed text, primary translation,
        // and (optionally) a secondary translation for dual display.
        const requests = [
          fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`),
          fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/quran-tajweed`),
          fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${translationEdition}`),
        ];
        if (secondaryEdition) {
          requests.push(
            fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${secondaryEdition}`),
          );
        }
        const responses = await Promise.all(requests);
        const arabicData: QuranApiResponse = await responses[0].json();
        const tajweedData: QuranApiResponse = await responses[1].json();
        const translationData: QuranApiResponse = await responses[2].json();
        const translation2Data: QuranApiResponse | null = responses[3]
          ? await responses[3].json()
          : null;

        if (arabicData.code === 200 && translationData.code === 200) {
          const combinedVerses: Verse[] = arabicData.data.ayahs.map((ayah, index) => ({
            number: ayah.numberInSurah,
            text: ayah.text,
            translation: translationData.data.ayahs[index]?.text || '',
            translation2:
              translation2Data?.code === 200
                ? translation2Data.data.ayahs[index]?.text || ''
                : undefined,
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
          saveSurahToCache(surahNumber, lang, secondaryEdition, combinedVerses, tajweedMap);
        } else {
          throw new Error('Failed to fetch Quran data');
        }
      } catch (err) {
        console.error('Error fetching Quran data:', err);

        // Try loading from offline cache
        const cached = loadSurahFromCache(surahNumber, lang, secondaryEdition);
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
  }, [surahNumber, lang, translationEdition, secondaryEdition]);

  return { verses, versesTajweed, isLoading, error, isOffline };
};
