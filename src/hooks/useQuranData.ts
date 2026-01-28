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
// Using Dar Al-Maarifah standard color scheme (most common in Quran apps)
// Reference: https://easyquran.com/en/tajweed-quran-colors-roles/
const parseTajweedText = (text: string): string => {
  // Dar Al-Maarifah standard Tajweed color scheme:
  // - RED shades: Madd (prolongation)
  // - GRAY: Letters not pronounced (silent, Laam Shamsiyyah, Hamzat ul Wasl)
  // - BLUE: Qalqalah and emphatic Ra
  // - GREEN: Nasalization (Ghunnah, Ikhfa, Iqlab, Idgham)
  const tajweedColors: Record<string, string> = {
    // Gray - Letters not pronounced
    'h': '#707070',      // Hamzat ul Wasl - gray
    's': '#707070',      // Silent - gray
    'l': '#707070',      // Laam Shamsiyyah - gray
    
    // Red shades - Madd (prolongation)
    'n': '#A00000',      // Madd Normal (2 vowels) - cumin red
    'p': '#E74C3C',      // Madd Permissible (2,4,6 vowels) - orange red
    'm': '#8B0000',      // Madd Necessary (6 vowels) - dark red
    'o': '#C0392B',      // Madd Obligatory (4-5 vowels) - blood red
    
    // Blue - Qalqalah
    'q': '#4A90D9',      // Qalqalah - light blue
    
    // Green - Nasalization (Ghunnah, Ikhfa, Iqlab, Idgham)
    'c': '#27AE60',      // Ikhfa Shafawi (with Meem) - green
    'f': '#27AE60',      // Ikhfa - green
    'w': '#27AE60',      // Idgham Shafawi (with Meem) - green
    'i': '#27AE60',      // Iqlab - green
    'a': '#27AE60',      // Idgham with Ghunnah - green
    'u': '#707070',      // Idgham without Ghunnah - gray (not pronounced)
    'd': '#707070',      // Idgham Mutajanisayn - gray
    'b': '#707070',      // Idgham Mutaqaribayn - gray
    'g': '#27AE60',      // Ghunnah (2 vowels) - green
  };
  
  let result = text;
  
  // The format is [marker:number[content] or [marker[content]
  // Example: [h:9421[ٱ] -> <span style="color:#707070;">ٱ</span>
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
