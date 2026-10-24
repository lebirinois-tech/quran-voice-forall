import { surahs } from '@/data/surahs';

export interface QuranLocation { surah: number; verse: number }
export interface RecitationSession {
  start: QuranLocation;
  end: QuranLocation;
  passageCount: number;
  completedPassages: number;
}

export const compareLocations = (a: QuranLocation, b: QuranLocation) =>
  a.surah - b.surah || a.verse - b.verse;

export const clampLocation = (location: QuranLocation): QuranLocation => {
  const surah = Math.max(1, Math.min(114, Math.trunc(location.surah) || 1));
  const max = surahs.find((s) => s.number === surah)?.versesCount ?? 1;
  return { surah, verse: Math.max(1, Math.min(max, Math.trunc(location.verse) || 1)) };
};

/** Called only after the current verse's repetitions have finished. */
export const advanceRecitation = (session: RecitationSession, current: QuranLocation) => {
  if (compareLocations(current, session.end) >= 0) {
    if (session.passageCount === 0 || session.completedPassages + 1 < session.passageCount) {
      return { next: session.start, completedPassages: session.completedPassages + 1 };
    }
    return { next: null, completedPassages: session.completedPassages };
  }
  const max = surahs.find((s) => s.number === current.surah)?.versesCount ?? 1;
  const next = current.verse < max
    ? { surah: current.surah, verse: current.verse + 1 }
    : current.surah < 114 ? { surah: current.surah + 1, verse: 1 } : null;
  return { next, completedPassages: session.completedPassages };
};