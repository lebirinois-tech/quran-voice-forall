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

// Parse tajweed markers from API into styled HTML
// Using Quran University / Al Muhafez standard color scheme
// Colors extracted from official GTAF Quran app documentation
const parseTajweedText = (text: string): string => {
  // ═══════════════════════════════════════════════════════════════════════════
  // FROZEN TAJWEED COLOR SCHEME - DO NOT MODIFY
  // User confirmed on 2026-01-28: Qalqalah=Blue, Madd=Red, Ghunnah=Green
  // ═══════════════════════════════════════════════════════════════════════════
  const tajweedColors: Record<string, string> = {
    // Gray - Silent letters / Idgham without Ghunnah
    'h': '#AAAAAA',
    's': '#AAAAAA',
    'l': '#AAAAAA',
    'u': '#AAAAAA',
    'd': '#AAAAAA',
    'b': '#AAAAAA',
    
    // Green - Ghunnah
    'g': '#2AAD2A',
    
    // Red - Ikhfa / Madd
    'f': '#DD0000',
    'c': '#DD0000',
    'n': '#DD0000',
    'p': '#CC0000',
    'm': '#BB0000',
    'o': '#AA0000',
    
    // Violet - Idgham with Ghunnah
    'a': '#B266D9',
    'w': '#B266D9',
    
    // Blue - Qalqalah
    'q': '#2E6ECB',
    
    // Orange - Iqlab
    'i': '#D4740C',
  };
  
  let result = text;
  
  // The format is [marker:number[content] or [marker[content]
  // Example: [h:9421[ٱ] -> <span style="color:#AAAAAA;">ٱ</span>
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

  useEffect(() => {
    const fetchVerses = async () => {
      setIsLoading(true);
      setError(null);

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

          // Parse tajweed text and store separately (sanitized for XSS protection)
          const tajweedMap: Record<number, string> = {};
          if (tajweedData.code === 200) {
            tajweedData.data.ayahs.forEach((ayah) => {
              tajweedMap[ayah.numberInSurah] = sanitizeTajweedHtml(parseTajweedText(ayah.text));
            });
          }

          setVerses(combinedVerses);
          setVersesTajweed(tajweedMap);
        } else {
          throw new Error('Failed to fetch Quran data');
        }
      } catch (err) {
        console.error('Error fetching Quran data:', err);
        setError('Impossible de charger les versets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVerses();
  }, [surahNumber]);

  return { verses, versesTajweed, isLoading, error };
};
