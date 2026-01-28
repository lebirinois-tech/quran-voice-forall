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
  // Quran University / Al Muhafez standard Tajweed color scheme:
  // - ORANGE: Ghunnah (nasalisation)
  // - RED: Ikhfa (hiding/softening)
  // - PURPLE/VIOLET: Idgham with Ghunnah (merging with nasalization)
  // - GREEN: Qalqalah (echoing)
  // - BLUE: Iqlab (flipping/assimilation)
  // - GRAY: Idgham without Ghunnah, silent letters
  const tajweedColors: Record<string, string> = {
    // Gray - Letters not pronounced / Idgham without Ghunnah
    'h': '#AAAAAA',      // Hamzat ul Wasl - gray
    's': '#AAAAAA',      // Silent - gray
    'l': '#AAAAAA',      // Laam Shamsiyyah - gray
    'u': '#AAAAAA',      // Idgham without Ghunnah - gray
    'd': '#AAAAAA',      // Idgham Mutajanisayn - gray
    'b': '#AAAAAA',      // Idgham Mutaqaribayn - gray
    
    // Orange - Ghunnah (nasalization sound from nose)
    'g': '#D4740C',      // Ghunnah (2 vowels) - orange
    
    // Red - Ikhfa (hiding/softening the sound)
    'f': '#DD0000',      // Ikhfa - red
    'c': '#DD0000',      // Ikhfa Shafawi (with Meem) - red
    
    // Purple/Violet - Idgham with Ghunnah (merging with nasalization)
    'a': '#B266D9',      // Idgham with Ghunnah - purple/violet
    'w': '#B266D9',      // Idgham Shafawi (with Meem) - purple/violet
    
    // Green - Qalqalah (echoing sound)
    'q': '#2AAD2A',      // Qalqalah - green
    
    // Blue - Iqlab (assimilation/flipping)
    'i': '#2E6ECB',      // Iqlab - blue
    
    // Red shades - Madd (prolongation) - using same red family
    'n': '#DD0000',      // Madd Normal (2 vowels) - red
    'p': '#CC0000',      // Madd Permissible (2,4,6 vowels) - dark red
    'm': '#BB0000',      // Madd Necessary (6 vowels) - darker red
    'o': '#AA0000',      // Madd Obligatory (4-5 vowels) - darkest red
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
