export interface SearchVerse {
  surah: number;
  verse: number;
  page: number;
  juz: number;
  text: string;
}

export const normalizeArabic = (text: string): string => text
  .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, '')
  .replace(/ـ/g, '')
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/ة/g, 'ه')
  .replace(/ى/g, 'ي')
  .replace(/ؤ/g, 'و')
  .replace(/ئ/g, 'ي')
  .replace(/\s+/g, ' ').trim();

export const searchTokens = (text: string): string[] => normalizeArabic(text).split(' ').filter(Boolean);

export interface IndexedVerse extends SearchVerse { tokens: string[] }
export interface WordSuggestion { word: string; normalized: string; occurrences: number }

export function buildVocabulary(entries: IndexedVerse[]): WordSuggestion[] {
  const vocabulary = new Map<string, WordSuggestion>();
  for (const entry of entries) {
    const seen = new Set<string>();
    for (const word of entry.text.split(/\s+/)) {
      const normalized = normalizeArabic(word);
      if (!/[\u0621-\u064a]/.test(normalized) || seen.has(normalized)) continue;
      seen.add(normalized);
      const existing = vocabulary.get(normalized);
      if (existing) existing.occurrences++;
      else vocabulary.set(normalized, { word, normalized, occurrences: 1 });
    }
  }
  return [...vocabulary.values()];
}

export function suggestWords(vocabulary: WordSuggestion[], query: string): WordSuggestion[] {
  const prefix = searchTokens(query).at(-1);
  if (!prefix) return [];
  return vocabulary.filter(item => item.normalized.startsWith(prefix))
    .sort((a, b) => Number(b.normalized === prefix) - Number(a.normalized === prefix)
      || b.occurrences - a.occurrences || a.normalized.localeCompare(b.normalized, 'ar'))
    .slice(0, 8);
}

export function matchesVerse(entry: IndexedVerse, query: string, exact: boolean): boolean {
  const words = searchTokens(query);
  if (!words.length) return false;
  return words.every((word, i) => entry.tokens.some(token =>
    exact || i < words.length - 1 ? token === word : token.startsWith(word)));
}

export const verseSearchUrl = (entry: SearchVerse): string =>
  `/surah/${entry.surah}?verse=${entry.verse}&page=${entry.page}`;