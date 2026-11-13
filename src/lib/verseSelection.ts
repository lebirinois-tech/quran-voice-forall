import { compareLocations, type QuranLocation } from './recitationSession';
import { surahs } from '@/data/surahs';

export interface VerseSelection { start: QuranLocation; end: QuranLocation | null }

export function selectVerse(current: VerseSelection | null, location: QuranLocation): VerseSelection {
  if (!current || current.end) return { start: location, end: null };
  return compareLocations(current.start, location) <= 0
    ? { start: current.start, end: location }
    : { start: location, end: current.start };
}

export function isVerseSelected(selection: VerseSelection | null, location: QuranLocation): boolean {
  return !!selection && compareLocations(location, selection.start) >= 0 &&
    compareLocations(location, selection.end ?? selection.start) <= 0;
}

export function selectionSegments(selection: VerseSelection) {
  if (!selection.end) return [];
  const end = selection.end;
  return surahs.filter(s => s.number >= selection.start.surah && s.number <= end.surah)
    .map(s => ({ surah: s.number, start: s.number === selection.start.surah ? selection.start.verse : 1,
      end: s.number === end.surah ? end.verse : s.versesCount }));
}