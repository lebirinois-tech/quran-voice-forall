import { describe, expect, it } from 'vitest';
import { advanceRecitation, clampLocation, compareLocations, type RecitationSession } from './recitationSession';

const session: RecitationSession = {
  start: { surah: 112, verse: 4 }, end: { surah: 113, verse: 2 }, passageCount: 1, completedPassages: 0,
};
describe('recitation stopping choices', () => {
  it('continues into another surah and stops after its selected verse', () => {
    expect(advanceRecitation(session, { surah: 112, verse: 4 }).next).toEqual({ surah: 113, verse: 1 });
    expect(advanceRecitation(session, { surah: 113, verse: 1 }).next).toEqual({ surah: 113, verse: 2 });
    expect(advanceRecitation(session, { surah: 113, verse: 2 }).next).toBeNull();
  });
  it('reads until the Quran ends at An-Nas verse 6, never a surah 115', () => {
    const all = { ...session, end: { surah: 114, verse: 6 } };
    expect(advanceRecitation(all, { surah: 113, verse: 5 }).next).toEqual({ surah: 114, verse: 1 });
    expect(advanceRecitation(all, { surah: 114, verse: 5 }).next).toEqual({ surah: 114, verse: 6 });
    expect(advanceRecitation(all, { surah: 114, verse: 6 }).next).toBeNull();
  });
  it('accepts a single verse but rejects an end before the start', () => {
    expect(compareLocations(session.start, session.start)).toBe(0);
    expect(compareLocations({ surah: 111, verse: 5 }, session.start)).toBeLessThan(0);
    expect(advanceRecitation({ ...session, end: session.start }, session.start).next).toBeNull();
  });
  it('clamps the stop verse to the chosen surah, not the displayed surah', () => {
    expect(clampLocation({ surah: 113, verse: 75 })).toEqual({ surah: 113, verse: 5 });
  });
  it('repeats the complete passage across surahs then stops', () => {
    const twice = { ...session, passageCount: 2 };
    expect(advanceRecitation(twice, session.end)).toEqual({ next: session.start, completedPassages: 1 });
    expect(advanceRecitation({ ...twice, completedPassages: 1 }, session.end).next).toBeNull();
    expect(advanceRecitation({ ...session, passageCount: 0, completedPassages: 20 }, session.end).next).toEqual(session.start);
  });
});