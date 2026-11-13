import { describe, it, expect } from 'vitest';
import { selectVerse, isVerseSelected, selectionSegments } from './verseSelection';

describe('touch verse selection', () => {
  it('first tap stores the start without completing a range', () => {
    expect(selectVerse(null, { surah: 2, verse: 5 })).toEqual({ start: { surah: 2, verse: 5 }, end: null });
  });
  it('second tap completes the inclusive range after a page change', () => {
    const pending = selectVerse(null, { surah: 2, verse: 5 });
    const complete = selectVerse(pending, { surah: 2, verse: 20 });
    expect(complete.end).toEqual({ surah: 2, verse: 20 });
    expect(isVerseSelected(complete, { surah: 2, verse: 12 })).toBe(true);
    expect(isVerseSelected(complete, { surah: 2, verse: 21 })).toBe(false);
  });
  it('retains exact references across surahs', () => {
    const complete = selectVerse(selectVerse(null, { surah: 1, verse: 6 }), { surah: 2, verse: 3 });
    expect(selectionSegments(complete)).toEqual([{ surah: 1, start: 6, end: 7 }, { surah: 2, start: 1, end: 3 }]);
  });
  it('normalizes backwards selection and allows a single verse', () => {
    expect(selectVerse(selectVerse(null, { surah: 2, verse: 20 }), { surah: 2, verse: 5 }).start.verse).toBe(5);
    expect(selectionSegments(selectVerse(selectVerse(null, { surah: 2, verse: 5 }), { surah: 2, verse: 5 })))
      .toEqual([{ surah: 2, start: 5, end: 5 }]);
  });
});