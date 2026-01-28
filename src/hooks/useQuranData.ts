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
// Using Quran University / Al Muhafez standard color scheme
// Colors extracted from official GTAF Quran app documentation
const parseTajweedText = (text: string): string => {
  // Official Al Quran Cloud API Tajweed color scheme
  // Source: https://alquran.cloud/tajweed-guide
  const tajweedColors: Record<string, string> = {
    // Gray - Silent/Not pronounced letters
    'h': '#AAAAAA',      // Hamzat ul Wasl
    's': '#AAAAAA',      // Silent
    'l': '#AAAAAA',      // Laam Shamsiyyah
    'd': '#A1A1A1',      // Idgham Mutajanisayn
    'b': '#A1A1A1',      // Idgham Mutaqaribayn
    
    // Orange - Ghunnah (nasalization - 2 vowels)
    'g': '#FF7E1E',      // Ghunnah - ORANGE
    
    // Violet/Purple - Ikhfa (hiding/softening)
    'f': '#9400A8',      // Ikhfa - purple
    'c': '#D500B7',      // Ikhfa Shafawi (with Meem) - pink/magenta
    
    // Green - Idgham with Ghunnah
    'a': '#169777',      // Idgham with Ghunnah - teal/green
    'u': '#169200',      // Idgham without Ghunnah - green
    'w': '#58B800',      // Idgham Shafawi (with Meem) - lime green
    
    // Red - Qalqalah (echoing sound)
    'q': '#DD0008',      // Qalqalah - RED
    
    // Blue - Iqlab (assimilation/flipping)
    'i': '#26BFFD',      // Iqlab - light blue
    
    // Blue shades - Madd (prolongation)
    'n': '#537FFF',      // Madd Normal (2 vowels)
    'p': '#4050FF',      // Madd Permissible (2,4,6 vowels)
    'm': '#000EBC',      // Madd Necessary (6 vowels)
    'o': '#2144C1',      // Madd Obligatory (4-5 vowels)
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
