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

// Tajweed parsing rules metadata
const tajweedMeta = [
  { identifier: '[h', css_class: 'ham_wasl', type: 'hamza-wasl', description: 'Hamzat ul Wasl' },
  { identifier: '[s', css_class: 'slnt', type: 'silent', description: 'Silent' },
  { identifier: '[l', css_class: 'laam_shamsiyah', type: 'laam-shamsiyah', description: 'Lam Shamsiyyah' },
  { identifier: '[n', css_class: 'madd_normal', type: 'madda-normal', description: 'Normal Prolongation: 2 Vowels' },
  { identifier: '[p', css_class: 'madd_permissible', type: 'madda-permissible', description: 'Permissible Prolongation: 2, 4, 6 Vowels' },
  { identifier: '[m', css_class: 'madd_necessary', type: 'madda-necessary', description: 'Necessary Prolongation: 6 Vowels' },
  { identifier: '[q', css_class: 'qlq', type: 'qalpiqa', description: 'Qalqalah' },
  { identifier: '[o', css_class: 'madd_obligatory', type: 'madda-obligatory', description: 'Obligatory Prolongation: 4-5 Vowels' },
  { identifier: '[c', css_class: 'ikhf_shfw', type: 'ikhfa-shafawi', description: 'Ikhfa\' Shafawi - Loss of Meem' },
  { identifier: '[f', css_class: 'ikhf', type: 'ikhfa', description: 'Ikhfa\'' },
  { identifier: '[w', css_class: 'idgh_w_ghn', type: 'idgham-without-ghunnah', description: 'Idgham - Loss Without Ghunnah' },
  { identifier: '[i', css_class: 'idgh_ghn', type: 'idgham-with-ghunnah', description: 'Idgham - Loss With Ghunnah' },
  { identifier: '[a', css_class: 'iqlb', type: 'iqlab', description: 'Iqlab' },
  { identifier: '[u', css_class: 'idgh_mus', type: 'idgham-mutajanisayn', description: 'Idgham - Loss Mutajanisayn' },
  { identifier: '[d', css_class: 'idgh_mus', type: 'idgham-mutaqaribayn', description: 'Idgham - Loss Mutaqaribayn' },
  { identifier: '[b', css_class: 'idgh_shfw', type: 'idgham-shafawi', description: 'Idgham Shafawi - Meem Merging' },
  { identifier: '[g', css_class: 'ghn', type: 'ghunnah', description: 'Ghunnah: 2 Vowels' },
];

// Parse Tajweed bracketed format to HTML
const parseTajweedText = (text: string): string => {
  try {
    let result = text;
    
    // Apply tajweed replacements
    tajweedMeta.forEach((meta) => {
      const regex = new RegExp(`\\${meta.identifier}:?\\d*\\[`, 'g');
      result = result.replace(regex, `<tajweed class="${meta.css_class}" data-type="${meta.type}" data-description="${meta.description}">`);
    });
    
    // Close brackets with closing tags
    result = result.replace(/\]/g, '</tajweed>');
    
    return result;
  } catch (error) {
    console.error('Error parsing Tajweed:', error);
    return text;
  }
};

export const useQuranData = (surahNumber: number) => {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVerses = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch Tajweed Arabic text and French translation
        const [tajweedResponse, translationResponse] = await Promise.all([
          fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/quran-tajweed`),
          fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/fr.hamidullah`),
        ]);

        const tajweedData: QuranApiResponse = await tajweedResponse.json();
        const translationData: QuranApiResponse = await translationResponse.json();

        if (tajweedData.code === 200 && translationData.code === 200) {
          const combinedVerses: Verse[] = tajweedData.data.ayahs.map((ayah, index) => ({
            number: ayah.numberInSurah,
            text: parseTajweedText(ayah.text),
            translation: translationData.data.ayahs[index]?.text || '',
            page: ayah.page,
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
