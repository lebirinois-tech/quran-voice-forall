import { useState, useEffect } from 'react';
import { Verse } from '@/data/surahs';

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
// API format: [h:1[ٱ] or [n[ـٰ] - marker followed by optional :number, then [ content ]
const parseTajweedText = (text: string): string => {
  const tajweedColors: Record<string, string> = {
    'h': '#AAAAAA',      // Hamzat ul Wasl - grey
    's': '#AAAAAA',      // Silent - grey
    'l': '#AAAAAA',      // Laam Shamsiyyah - grey
    'n': '#537FFF',      // Normal Madd - blue
    'p': '#4050FF',      // Permissible Madd - blue
    'o': '#000EBC',      // Obligatory Madd - dark blue
    'a': '#26BFFD',      // Iqlab - cyan
    'u': '#DD0008',      // Qalqalah - red
    'q': '#000080',      // Necessary Madd - navy
    'i': '#D500B7',      // Ikhfa Shafawi - pink
    'f': '#9400A8',      // Ikhfa - purple
    'w': '#58B800',      // Idgham Shafawi - light green
    'g': '#FF7E1E',      // Ghunnah - orange
    'd': '#169200',      // Idgham with Ghunnah - green
    'b': '#169200',      // Idgham without Ghunnah - green
    'm': '#A1A1A1',      // Idgham Mutajanisayn - grey
    'e': '#A1A1A1',      // Idgham Mutaqaribayn - grey
  };
  
  let result = text;
  
  // The format is [marker:number[content] or [marker[content]
  // We need to match: [h:1[ٱ] -> <span style="color:#AAAAAA;">ٱ</span>
  Object.entries(tajweedColors).forEach(([marker, color]) => {
    // Match pattern: [marker or [marker:number followed by [content]
    // The regex matches: [h:1[ٱ] or [n[ـٰ]
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

          // Parse tajweed text and store separately
          const tajweedMap: Record<number, string> = {};
          if (tajweedData.code === 200) {
            tajweedData.data.ayahs.forEach((ayah) => {
              tajweedMap[ayah.numberInSurah] = parseTajweedText(ayah.text);
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
