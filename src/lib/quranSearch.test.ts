import { describe, expect, it } from 'vitest';
import { buildVocabulary, matchesVerse, normalizeArabic, suggestWords, verseSearchUrl } from './quranSearch';

const entries = [
  { surah: 1, verse: 2, page: 1, juz: 1, text: 'ٱلْحَمْدُ لِلَّهِ', tokens: ['الحمد', 'لله'] },
  { surah: 2, verse: 30, page: 6, juz: 1, text: 'وَقَالَ رَبُّكَ', tokens: ['وقال', 'ربك'] },
  { surah: 2, verse: 67, page: 10, juz: 1, text: 'قَالَ مُوسَىٰ', tokens: ['قال', 'موسي'] },
];

describe('Quran word search', () => {
  it('suggests Quran words from their initial letters without diacritics', () => {
    expect(suggestWords(buildVocabulary(entries), 'حمد')).toEqual([]);
    expect(suggestWords(buildVocabulary(entries), 'الْحَ')[0]?.normalized).toBe('الحمد');
    expect(normalizeArabic('ٱلْحَمْدُ')).toBe('الحمد');
  });
  it('a selected word matches a complete word, not a substring', () => {
    expect(entries.filter(entry => matchesVerse(entry, 'قال', true)).map(entry => entry.verse)).toEqual([67]);
  });
  it('opens the selected later occurrence, not the first matching verse', () => {
    expect(verseSearchUrl(entries[2])).toBe('/surah/2?verse=67&page=10');
  });
  it('does not truncate common-word occurrences at 100 results', () => {
    const many = Array.from({ length: 150 }, (_, i) => ({ ...entries[2], verse: i + 1 }));
    expect(many.filter(entry => matchesVerse(entry, 'قال', true))).toHaveLength(150);
  });
});