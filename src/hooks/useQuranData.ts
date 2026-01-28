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
// API format examples:
// - [h:1[ٱ]  (marker + optional :number + [content])
// - [l[ل]
// Some environments can also show standalone tokens like [h:1] in RTL contexts,
// so we also handle token-style markers to avoid showing raw tags.
const parseTajweedText = (text: string): string => {
  const tajweedColors: Record<string, string> = {
    h: '#AAAAAA', // Hamzat ul Wasl
    s: '#AAAAAA', // Silent
    l: '#AAAAAA', // Laam Shamsiyyah
    n: '#537FFF', // Normal Madd
    p: '#4050FF', // Permissible Madd
    o: '#000EBC', // Obligatory Madd
    a: '#26BFFD', // Iqlab
    u: '#DD0008', // Qalqalah
    q: '#000080', // Necessary Madd
    i: '#D500B7', // Ikhfa Shafawi
    f: '#9400A8', // Ikhfa
    w: '#58B800', // Idgham Shafawi
    g: '#FF7E1E', // Ghunnah
    d: '#169200', // Idgham with Ghunnah
    b: '#169200', // Idgham without Ghunnah
    m: '#A1A1A1', // Idgham Mutajanisayn
    e: '#A1A1A1', // Idgham Mutaqaribayn
  };

  let html = text;

  // Format A: [h:1[ٱ] or [n[ـٰ]
  Object.entries(tajweedColors).forEach(([marker, color]) => {
    const regex = new RegExp(`\\[${marker}(?::\\d+)?\\[([^\\]]+)\\]`, 'g');
    html = html.replace(regex, `<span style="color: ${color};">$1</span>`);
  });

  // Format B (fallback): standalone marker tokens [h:1] that apply until next marker
  // This prevents unreadable output where markers remain visible.
  const tokenRegex = /\[([hslnpoauqifwgdbme])(?::\d+)?\]/g;
  if (tokenRegex.test(html)) {
    const tokenRegex2 = /\[([hslnpoauqifwgdbme])(?::\d+)?\]/g;
    let out = '';
    let lastIndex = 0;
    let isOpen = false;

    for (const match of html.matchAll(tokenRegex2)) {
      const idx = match.index ?? 0;
      const marker = match[1];
      out += html.slice(lastIndex, idx);
      if (isOpen) out += '</span>';
      const color = tajweedColors[marker];
      if (color) {
        out += `<span style="color: ${color};">`;
        isOpen = true;
      } else {
        isOpen = false;
      }
      lastIndex = idx + match[0].length;
    }

    out += html.slice(lastIndex);
    if (isOpen) out += '</span>';
    html = out;
  }

  // Final cleanup: remove any leftover bracketed tags (safety net)
  html = html.replace(/\[[a-z](?::\d+)?\[?/gi, '');
  html = html.replace(/\]/g, '');

  return html;
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
