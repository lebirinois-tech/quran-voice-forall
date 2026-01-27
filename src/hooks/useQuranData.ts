import { useState, useEffect } from 'react';
import { Verse } from '@/data/surahs';

interface QuranApiVerse {
  number: number;
  text: string;
  numberInSurah: number;
}

interface QuranApiResponse {
  code: number;
  data: {
    ayahs: QuranApiVerse[];
  };
}

export const useQuranData = (surahNumber: number) => {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVerses = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch Arabic text (simple, without Tajweed markup) and French translation
        const [arabicResponse, translationResponse] = await Promise.all([
          fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/ar.alafasy`),
          fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/fr.hamidullah`),
        ]);

        const arabicData: QuranApiResponse = await arabicResponse.json();
        const translationData: QuranApiResponse = await translationResponse.json();

        if (arabicData.code === 200 && translationData.code === 200) {
          const combinedVerses: Verse[] = arabicData.data.ayahs.map((ayah, index) => ({
            number: ayah.numberInSurah,
            text: ayah.text,
            translation: translationData.data.ayahs[index]?.text || '',
          }));

          setVerses(combinedVerses);
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

  return { verses, isLoading, error };
};
